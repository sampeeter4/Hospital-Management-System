import datetime
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from appointments.models import Appointment
from hospitals.models import Department, Doctor, Hospital
from inpatient.models import Admission
from patients.models import Patient
from .models import (
    BillingAuditLog,
    CreditNote,
    InsuranceClaim,
    InsurancePreAuthorization,
    InsuranceProvider,
    Invoice,
    InvoiceLineItem,
    PatientInsurancePolicy,
    Payment,
    PaymentAllocation,
    Refund,
    ServiceItem,
)
from .services import (
    allocate_payment,
    generate_financial_reports,
    generate_invoice_from_admission,
    generate_invoice_from_appointment,
    issue_credit_note,
    issue_invoice,
    process_refund,
    recalculate_invoice_totals,
    record_claim_decision,
    record_claim_payment,
    record_payment,
    reverse_payment_allocation,
    void_invoice,
)

User = get_user_model()


class BaseBillingTestCase(APITestCase):

    def setUp(self):
        # 1. Users
        self.super_admin = User.objects.create_superuser(
            username="bill_superadmin",
            email="superadmin@hospital.com",
            password="AdminPassword123",
            role="SUPER_ADMIN",
        )
        self.hospital_admin = User.objects.create_user(
            username="bill_hospadmin",
            email="hospadmin@hospital.com",
            password="AdminPassword123",
            role="HOSPITAL_ADMIN",
        )
        self.accountant_user = User.objects.create_user(
            username="acc_oscar",
            email="oscar@hospital.com",
            password="AccountantPassword123",
            role="ACCOUNTANT",
            first_name="Oscar",
            last_name="Martinez",
        )
        self.doctor_user = User.objects.create_user(
            username="dr_robert_chase",
            email="chase@hospital.com",
            password="DoctorPassword123",
            role="DOCTOR",
            first_name="Robert",
            last_name="Chase",
        )
        self.receptionist_user = User.objects.create_user(
            username="rec_kelly",
            email="kelly@hospital.com",
            password="StaffPassword123",
            role="RECEPTIONIST",
        )
        self.lab_tech_user = User.objects.create_user(
            username="tech_toby",
            email="toby@hospital.com",
            password="TechPassword123",
            role="LAB_TECHNICIAN",
        )
        self.patient_user = User.objects.create_user(
            username="patient_charlie",
            email="charlie@patient.com",
            password="PatientPassword123",
            role="PATIENT",
            first_name="Charlie",
            last_name="Brown",
        )
        self.other_patient_user = User.objects.create_user(
            username="patient_lucy",
            email="lucy@patient.com",
            password="PatientPassword123",
            role="PATIENT",
            first_name="Lucy",
            last_name="Van Pelt",
        )

        # 2. Hospital & Doctor
        self.hospital = Hospital.objects.create(
            name="Apollo Gleneagles Hospital",
            registration_number="REG-BILL-001",
            phone="1234567890",
            email="billing@apollo.org",
            address="58 Canal Circular Rd",
        )
        self.department = Department.objects.create(
            hospital=self.hospital,
            name="Cardiology & Surgery",
            code="CARD-01",
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            hospital=self.hospital,
            department=self.department,
            doctor_id="DOC-CHASE-01",
            specialization="Cardiology",
            license_number="LIC-CARD-1122",
            qualification="MD, DM",
            consultation_fee=Decimal("800.00"),
        )

        # 3. Patients
        self.patient = Patient.objects.create(
            user=self.patient_user,
            date_of_birth=datetime.date(1992, 4, 12),
            gender="MALE",
            blood_group="O+",
            address="15 Elm St",
            emergency_contact_name="Sally Brown",
            emergency_contact_phone="5559876",
            emergency_contact_relationship="Sister",
        )
        self.other_patient = Patient.objects.create(
            user=self.other_patient_user,
            date_of_birth=datetime.date(1994, 9, 5),
            gender="FEMALE",
            blood_group="B-",
            address="25 Oak St",
            emergency_contact_name="Linus Van Pelt",
            emergency_contact_phone="5559877",
            emergency_contact_relationship="Brother",
        )

        # 4. Service Items
        self.service_ecg = ServiceItem.objects.create(
            hospital=self.hospital,
            code="SRV-ECG-01",
            name="12-Lead Electrocardiogram (ECG)",
            category=ServiceItem.Category.CARDIOLOGY if hasattr(ServiceItem.Category, "CARDIOLOGY") else ServiceItem.Category.DIAGNOSTICS if hasattr(ServiceItem.Category, "DIAGNOSTICS") else ServiceItem.Category.OTHER,
            unit="per test",
            unit_price=Decimal("500.00"),
            currency="INR",
            tax_rate=Decimal("5.00"),
        )
        self.service_echo = ServiceItem.objects.create(
            hospital=self.hospital,
            code="SRV-ECHO-01",
            name="2D Echocardiography",
            category=ServiceItem.Category.OTHER,
            unit="per test",
            unit_price=Decimal("2500.00"),
            currency="INR",
            tax_rate=Decimal("12.00"),
        )

        # 5. Insurance Provider & Policy
        self.provider = InsuranceProvider.objects.create(
            code="INS-STAR-01",
            name="Star Health Insurance",
            contact_person="Anita Roy",
            email="claims@starhealth.in",
            phone="18004252255",
        )
        self.policy = PatientInsurancePolicy.objects.create(
            patient=self.patient,
            provider=self.provider,
            policy_number="POL-SH-998877",
            plan_name="Family Health Optima",
            effective_start_date=datetime.date(2026, 1, 1),
            effective_end_date=datetime.date(2027, 1, 1),
            coverage_limit=Decimal("500000.00"),
            copay_percentage=Decimal("10.00"),
            is_verified=True,
            verified_by=self.accountant_user,
            verified_at=timezone.now(),
        )


class ServiceCatalogueAndInvoiceCalculationsTests(BaseBillingTestCase):

    def test_service_item_pricing_and_tax_validation(self):
        with self.assertRaises(ValidationError):
            # Negative price rejected
            ServiceItem.objects.create(
                hospital=self.hospital,
                code="SRV-NEG-01",
                name="Negative Service",
                unit_price=Decimal("-10.00"),
            )

        with self.assertRaises(ValidationError):
            # Tax rate > 100% rejected
            ServiceItem.objects.create(
                hospital=self.hospital,
                code="SRV-TAX-01",
                name="Excess Tax Service",
                unit_price=Decimal("100.00"),
                tax_rate=Decimal("110.00"),
            )

    def test_invoice_creation_and_precise_decimal_line_calculations(self):
        invoice = Invoice.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            currency="INR",
            status=Invoice.Status.DRAFT,
            created_by=self.accountant_user,
        )
        self.assertTrue(invoice.invoice_number.startswith("INV-"))

        # Add line 1: ECG x 2 @ 500 = 1000, discount 100, tax 5% -> subtotal 900, tax 45, line total 945
        line1 = InvoiceLineItem.objects.create(
            invoice=invoice,
            service_item=self.service_ecg,
            service_code=self.service_ecg.code,
            description=self.service_ecg.name,
            quantity=Decimal("2.00"),
            unit_price=Decimal("500.00"),
            discount=Decimal("100.00"),
            tax_rate=Decimal("5.00"),
        )
        self.assertEqual(line1.subtotal, Decimal("900.00"))
        self.assertEqual(line1.tax_amount, Decimal("45.00"))
        self.assertEqual(line1.total_amount, Decimal("945.00"))

        # Add line 2: Echo x 1 @ 2500 = 2500, discount 0, tax 12% -> subtotal 2500, tax 300, line total 2800
        line2 = InvoiceLineItem.objects.create(
            invoice=invoice,
            service_item=self.service_echo,
            service_code=self.service_echo.code,
            description=self.service_echo.name,
            quantity=Decimal("1.00"),
            unit_price=Decimal("2500.00"),
            discount=Decimal("0.00"),
            tax_rate=Decimal("12.00"),
        )
        self.assertEqual(line2.subtotal, Decimal("2500.00"))
        self.assertEqual(line2.tax_amount, Decimal("300.00"))
        self.assertEqual(line2.total_amount, Decimal("2800.00"))

        # Authoritative backend recalculation
        recalculate_invoice_totals(invoice)
        invoice.refresh_from_db()

        self.assertEqual(invoice.subtotal, Decimal("3400.00"))
        self.assertEqual(invoice.total_discount, Decimal("100.00"))
        self.assertEqual(invoice.total_tax, Decimal("345.00"))
        self.assertEqual(invoice.total_amount, Decimal("3745.00"))
        self.assertEqual(invoice.balance_due, Decimal("3745.00"))
        self.assertEqual(invoice.paid_amount, Decimal("0.00"))

    def test_invoice_issue_and_void_lifecycle(self):
        invoice = Invoice.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            status=Invoice.Status.DRAFT,
            created_by=self.accountant_user,
        )
        InvoiceLineItem.objects.create(
            invoice=invoice,
            service_code="SRV-TEST",
            description="Diagnostic test",
            quantity=Decimal("1.00"),
            unit_price=Decimal("1000.00"),
        )
        recalculate_invoice_totals(invoice)

        # 1. Issue invoice via API
        self.client.force_authenticate(user=self.accountant_user)
        url_issue = reverse("billing-invoice-issue", kwargs={"pk": invoice.id})
        res_issue = self.client.post(url_issue)
        self.assertEqual(res_issue.status_code, status.HTTP_200_OK)
        self.assertEqual(res_issue.data["status"], "ISSUED")

        # 2. Void invoice with reason
        url_void = reverse("billing-invoice-void", kwargs={"pk": invoice.id})
        res_void = self.client.post(url_void, {"reason": "Duplicate consultation entered by mistake"}, format="json")
        self.assertEqual(res_void.status_code, status.HTTP_200_OK)
        self.assertEqual(res_void.data["status"], "VOID")
        self.assertEqual(res_void.data["balance_due"], "0.00")

    def test_auto_generate_invoice_from_appointment(self):
        apt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            hospital=self.hospital,
            department=self.department,
            appointment_date=timezone.now().date(),
            start_time=datetime.time(10, 0),
            end_time=datetime.time(10, 30),
            reason_for_visit="Cardiac consultation",
            booked_by=self.receptionist_user,
        )
        inv = generate_invoice_from_appointment(apt, self.accountant_user)
        self.assertEqual(inv.total_amount, Decimal("800.00"))
        self.assertEqual(inv.line_items.first().service_code, "CONS-DOC")

        # Calling again returns same invoice (no duplicate billing)
        inv2 = generate_invoice_from_appointment(apt, self.accountant_user)
        self.assertEqual(inv.id, inv2.id)

    def test_auto_generate_invoice_from_admission(self):
        adm = Admission.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            attending_doctor=self.doctor,
            department=self.department,
            admission_reason="Monitoring",
            admission_date=timezone.now() - datetime.timedelta(days=3),
            actual_discharge_date=timezone.now(),
            admitted_by=self.doctor_user,
        )
        inv = generate_invoice_from_admission(adm, self.accountant_user, daily_room_rate=Decimal("2000.00"))
        # 3 days * 2000 = 6000
        self.assertEqual(inv.total_amount, Decimal("6000.00"))
        self.assertEqual(inv.line_items.first().service_code, "ROOM-STAY")


class PaymentAllocationRefundAndCreditTests(BaseBillingTestCase):

    def setUp(self):
        super().setUp()
        self.invoice = Invoice.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            status=Invoice.Status.DRAFT,
            created_by=self.accountant_user,
        )
        InvoiceLineItem.objects.create(
            invoice=self.invoice,
            service_code="SRV-TEST",
            description="Cardiac workup",
            quantity=Decimal("1.00"),
            unit_price=Decimal("5000.00"),
        )
        recalculate_invoice_totals(self.invoice)
        issue_invoice(self.invoice, self.accountant_user)

    def test_partial_payment_and_full_payment_balance_tracking(self):
        self.client.force_authenticate(user=self.accountant_user)

        # 1. Partial payment of 2000 against 5000 invoice
        url_pay = reverse("billing-payment-list")
        payload = {
            "patient": self.patient.id,
            "hospital": self.hospital.id,
            "amount": "2000.00",
            "payment_method": "UPI",
            "invoice_id": self.invoice.id,
            "external_transaction_id": "UPI-TXN-12345678",
        }
        res_pay = self.client.post(url_pay, payload, format="json")
        self.assertEqual(res_pay.status_code, status.HTTP_201_CREATED)

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.paid_amount, Decimal("2000.00"))
        self.assertEqual(self.invoice.balance_due, Decimal("3000.00"))
        self.assertEqual(self.invoice.status, Invoice.Status.PARTIALLY_PAID)

        # 2. Second payment of remaining 3000 -> status PAID
        payload2 = {
            "patient": self.patient.id,
            "hospital": self.hospital.id,
            "amount": "3000.00",
            "payment_method": "CASH",
            "invoice_id": self.invoice.id,
        }
        res_pay2 = self.client.post(url_pay, payload2, format="json")
        self.assertEqual(res_pay2.status_code, status.HTTP_201_CREATED)

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.paid_amount, Decimal("5000.00"))
        self.assertEqual(self.invoice.balance_due, Decimal("0.00"))
        self.assertEqual(self.invoice.status, Invoice.Status.PAID)

    def test_over_allocation_prevented(self):
        payment = record_payment(
            patient=self.patient,
            hospital=self.hospital,
            amount=Decimal("10000.00"),
            payment_method=Payment.Method.BANK_TRANSFER,
            user=self.accountant_user,
        )
        # Invoice balance is 5000. Attempting to allocate 6000 must fail
        with self.assertRaises(ValidationError):
            allocate_payment(payment, self.invoice, Decimal("6000.00"), self.accountant_user)

    def test_duplicate_payment_prevented_by_idempotency_key(self):
        p1 = record_payment(
            patient=self.patient,
            hospital=self.hospital,
            amount=Decimal("500.00"),
            payment_method=Payment.Method.CARD,
            user=self.accountant_user,
            idempotency_key="IDEMP-UNIQUE-KEY-001",
        )
        # Calling with exact same idempotency key returns existing payment without creating a duplicate
        p2 = record_payment(
            patient=self.patient,
            hospital=self.hospital,
            amount=Decimal("500.00"),
            payment_method=Payment.Method.CARD,
            user=self.accountant_user,
            idempotency_key="IDEMP-UNIQUE-KEY-001",
        )
        self.assertEqual(p1.id, p2.id)
        self.assertEqual(Payment.objects.filter(idempotency_key="IDEMP-UNIQUE-KEY-001").count(), 1)

    def test_payment_allocation_reversal(self):
        payment = record_payment(
            patient=self.patient,
            hospital=self.hospital,
            amount=Decimal("1500.00"),
            payment_method=Payment.Method.CASH,
            user=self.accountant_user,
            invoice=self.invoice,
        )
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.balance_due, Decimal("3500.00"))

        # Reverse allocation
        alloc = payment.allocations.first()
        self.client.force_authenticate(user=self.accountant_user)
        url_rev = reverse("billing-payment-reverse", kwargs={"pk": payment.id})
        res_rev = self.client.post(url_rev, {"allocation_id": alloc.id, "reason": "Check bounced / reversal"}, format="json")
        self.assertEqual(res_rev.status_code, status.HTTP_200_OK)

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.balance_due, Decimal("5000.00"))
        self.assertEqual(self.invoice.paid_amount, Decimal("0.00"))

    def test_refund_limits_and_audit(self):
        payment = record_payment(
            patient=self.patient,
            hospital=self.hospital,
            amount=Decimal("2000.00"),
            payment_method=Payment.Method.UPI,
            user=self.accountant_user,
        )
        # Attempting refund exceeding payment must fail
        with self.assertRaises(ValidationError):
            process_refund(payment, Decimal("2500.00"), "Excess refund test", self.accountant_user)

        # Valid refund of 1000
        refund = process_refund(payment, Decimal("1000.00"), "Patient overpaid on initial estimate", self.accountant_user)
        self.assertEqual(refund.status, Refund.Status.EXECUTED)
        self.assertEqual(refund.amount, Decimal("1000.00"))

    def test_credit_note_reduces_balance(self):
        cn = issue_credit_note(self.invoice, Decimal("1000.00"), "Hospital goodwill discount applied", self.accountant_user)
        self.assertEqual(cn.amount, Decimal("1000.00"))
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.balance_due, Decimal("4000.00"))


class InsuranceClaimsAndReconciliationTests(BaseBillingTestCase):

    def setUp(self):
        super().setUp()
        self.invoice = Invoice.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            status=Invoice.Status.DRAFT,
            created_by=self.accountant_user,
        )
        InvoiceLineItem.objects.create(
            invoice=self.invoice,
            service_code="SURG-01",
            description="Coronary Angioplasty",
            quantity=Decimal("1.00"),
            unit_price=Decimal("80000.00"),
        )
        recalculate_invoice_totals(self.invoice)
        issue_invoice(self.invoice, self.accountant_user)

    def test_pre_authorization_workflow(self):
        preauth = InsurancePreAuthorization.objects.create(
            patient=self.patient,
            policy=self.policy,
            hospital=self.hospital,
            requested_amount=Decimal("80000.00"),
            requested_by=self.accountant_user,
        )
        self.client.force_authenticate(user=self.accountant_user)
        url_dec = reverse("billing-pre-authorization-record-decision", kwargs={"pk": preauth.id})
        res = self.client.post(url_dec, {
            "status": "PARTIALLY_AUTHORIZED",
            "authorized_amount": "60000.00",
            "insurer_reference": "TPA-AUTH-7890",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        preauth.refresh_from_db()
        self.assertEqual(preauth.authorized_amount, Decimal("60000.00"))
        self.assertEqual(preauth.status, InsurancePreAuthorization.Status.PARTIALLY_AUTHORIZED)

    def test_claim_adjudication_and_insurer_payment_settlement(self):
        # 1. Create claim
        claim = InsuranceClaim.objects.create(
            patient=self.patient,
            policy=self.policy,
            hospital=self.hospital,
            invoice=self.invoice,
            claim_amount=Decimal("80000.00"),
            submitted_by=self.accountant_user,
        )

        # 2. Record insurer decision: Approved 60000 (20000 patient responsibility)
        record_claim_decision(
            claim=claim,
            approved_amount=Decimal("60000.00"),
            decision_status=InsuranceClaim.Status.PARTIALLY_APPROVED,
            user=self.accountant_user,
            insurer_reference="CLM-ACK-9999",
        )
        claim.refresh_from_db()
        self.assertEqual(claim.approved_amount, Decimal("60000.00"))

        # Crucial check: Approval is NOT money received yet! Invoice balance is still 80000
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.balance_due, Decimal("80000.00"))
        self.assertEqual(self.invoice.paid_amount, Decimal("0.00"))

        # 3. Insurer sends EFT payment of 60000
        record_claim_payment(
            claim=claim,
            payment_amount=Decimal("60000.00"),
            user=self.accountant_user,
            external_reference="NEFT-INS-987654",
        )
        claim.refresh_from_db()
        self.assertEqual(claim.received_amount, Decimal("60000.00"))
        self.assertEqual(claim.status, InsuranceClaim.Status.SETTLED)

        # Now invoice balance due is reduced to remaining 20000 (patient responsibility)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.paid_amount, Decimal("60000.00"))
        self.assertEqual(self.invoice.balance_due, Decimal("20000.00"))
        self.assertEqual(self.invoice.status, Invoice.Status.PARTIALLY_PAID)


class BillingRBACTestCase(BaseBillingTestCase):

    def setUp(self):
        super().setUp()
        self.invoice = Invoice.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            status=Invoice.Status.DRAFT,
            created_by=self.accountant_user,
        )
        InvoiceLineItem.objects.create(
            invoice=self.invoice,
            service_code="SRV-TEST",
            description="Test line",
            quantity=Decimal("1.00"),
            unit_price=Decimal("1200.00"),
        )
        recalculate_invoice_totals(self.invoice)
        issue_invoice(self.invoice, self.accountant_user)

    def test_patient_can_view_only_own_invoice_and_receipt(self):
        self.client.force_authenticate(user=self.patient_user)
        url = reverse("billing-invoice-detail", kwargs={"pk": self.invoice.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Receipt endpoint
        url_receipt = reverse("billing-invoice-receipt", kwargs={"pk": self.invoice.id})
        res_rcpt = self.client.get(url_receipt)
        self.assertEqual(res_rcpt.status_code, status.HTTP_200_OK)

        # Other patient cannot view
        self.client.force_authenticate(user=self.other_patient_user)
        res_other = self.client.get(url)
        self.assertEqual(res_other.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthorized_roles_cannot_issue_or_void_invoices(self):
        self.client.force_authenticate(user=self.lab_tech_user)
        url_void = reverse("billing-invoice-void", kwargs={"pk": self.invoice.id})
        res = self.client.post(url_void, {"reason": "Unauthorized void attempt"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_financial_reports_endpoint(self):
        self.client.force_authenticate(user=self.accountant_user)
        url = reverse("billing-reports-summary")
        res = self.client.get(url, {"hospital": self.hospital.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(res.data["total_invoiced"])), Decimal("1200.00"))
        self.assertEqual(Decimal(str(res.data["total_outstanding"])), Decimal("1200.00"))

    def test_billing_audit_log_immutability(self):
        log = BillingAuditLog.objects.create(
            resource_type="INVOICE",
            resource_id="INV-001",
            action="ISSUED",
            user=self.accountant_user,
            description="Audit log test",
        )
        with self.assertRaises(ValidationError):
            log.description = "Tampered description"
            log.clean()

        with self.assertRaises(ValidationError):
            log.delete()

