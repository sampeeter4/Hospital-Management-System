import datetime
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from appointments.models import Appointment
from billing.models import Invoice, Payment
from hospitals.models import Department, Doctor, Hospital, Staff
from inpatient.models import Admission, Bed, Room, Ward
from laboratory.models import LabOrder
from patients.models import Patient
from pharmacy.models import Medicine, MedicineBatch, PharmacyLocation
from reports.exports import sanitize_csv_cell
from reports.models import ReportAuditLog

User = get_user_model()


class BaseReportsTestCase(APITestCase):

    def setUp(self):
        # 1. Hospitals
        self.hospital_a = Hospital.objects.create(
            name="Alpha Medical Center",
            registration_number="REG-ALPHA-01",
            phone="9876543201",
            email="alpha@hospital.local",
            address="1 Alpha Way",
            city="Metropolis",
            state="MetroState",
            postal_code="12345",
        )
        self.hospital_b = Hospital.objects.create(
            name="Beta Regional Hospital",
            registration_number="REG-BETA-02",
            phone="9876543202",
            email="beta@hospital.local",
            address="2 Beta Blvd",
            city="Metropolis",
            state="MetroState",
            postal_code="12345",
        )

        self.dept_cardio = Department.objects.create(
            hospital=self.hospital_a,
            name="Cardiology",
            code="CARDIO-A",
        )

        # 2. Users and Roles
        self.superadmin_user = User.objects.create_user(
            username="rep_superadmin",
            email="superadmin@hospital.local",
            password="AdminPassword123!",
            role=User.Role.SUPER_ADMIN,
        )
        self.admin_user = User.objects.create_user(
            username="rep_admin",
            email="admin@hospital.local",
            password="AdminPassword123!",
            role=User.Role.HOSPITAL_ADMIN,
        )
        self.admin_staff = Staff.objects.create(
            user=self.admin_user,
            hospital=self.hospital_a,
            department=self.dept_cardio,
            employee_id="EMP-ADMIN-01",
            designation="Hospital Administrator",
            joining_date=datetime.date(2020, 1, 1),
        )
        self.doctor_user = User.objects.create_user(
            username="rep_doctor",
            email="doc@hospital.local",
            password="DocPassword123!",
            role=User.Role.DOCTOR,
            first_name="Marcus",
            last_name="Welby",
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            hospital=self.hospital_a,
            department=self.dept_cardio,
            doctor_id="DOC-REP-01",
            license_number="LIC-REP-001",
            specialization="Cardiology",
            qualification="MD, FACC",
            consultation_fee=Decimal("750.00"),
        )

        self.nurse_user = User.objects.create_user(
            username="rep_nurse",
            email="nurse@hospital.local",
            password="NursePassword123!",
            role=User.Role.NURSE,
        )
        self.accountant_user = User.objects.create_user(
            username="rep_accountant",
            email="accountant@hospital.local",
            password="AccountantPassword123!",
            role=User.Role.ACCOUNTANT,
        )
        self.pharmacist_user = User.objects.create_user(
            username="rep_pharmacist",
            email="pharma@hospital.local",
            password="PharmacistPassword123!",
            role=User.Role.PHARMACIST,
        )
        self.lab_tech_user = User.objects.create_user(
            username="rep_labtech",
            email="lab@hospital.local",
            password="LabPassword123!",
            role=User.Role.LAB_TECHNICIAN,
        )
        self.receptionist_user = User.objects.create_user(
            username="rep_receptionist",
            email="reception@hospital.local",
            password="ReceptionPassword123!",
            role=User.Role.RECEPTIONIST,
        )
        self.patient_user = User.objects.create_user(
            username="rep_patient",
            email="patient@example.com",
            password="PatientPassword123!",
            role=User.Role.PATIENT,
        )

        # 3. Patients
        self.patient = Patient.objects.create(
            user=self.patient_user,
            hospital=self.hospital_a,
            date_of_birth=datetime.date(1990, 1, 1),
            gender="FEMALE",
            blood_group="A+",
            phone="9988776611",
            emergency_contact_name="Bob Patient",
            emergency_contact_phone="9988776622",
            emergency_contact_relationship="Brother",
        )

        # 4. Inpatient Ward & Beds
        self.ward = Ward.objects.create(
            hospital=self.hospital_a,
            department=self.dept_cardio,
            code="WARD-CRD",
            name="Cardiology Inpatient Ward",
            ward_type=Ward.WardType.GENERAL,
        )
        self.room = Room.objects.create(
            ward=self.ward,
            room_number="101",
            capacity=2,
        )
        self.bed1 = Bed.objects.create(
            room=self.room,
            bed_number="101-A",
            status=Bed.Status.OCCUPIED,
        )
        self.bed2 = Bed.objects.create(
            room=self.room,
            bed_number="101-B",
            status=Bed.Status.AVAILABLE,
        )

        # 5. Inpatient Admission
        self.admission = Admission.objects.create(
            patient=self.patient,
            hospital=self.hospital_a,
            department=self.dept_cardio,
            attending_doctor=self.doctor,
            admission_reason="Cardiac arrhythmia observation",
            status=Admission.Status.ADMITTED,
        )

        # 6. Appointment
        self.appointment = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            hospital=self.hospital_a,
            department=self.dept_cardio,
            appointment_date=timezone.now().date(),
            start_time=datetime.time(10, 0),
            end_time=datetime.time(10, 30),
            reason_for_visit="Routine arrhythmia followup",
            status=Appointment.Status.CONFIRMED,
        )

        # 7. Pharmacy Inventory
        self.med = Medicine.objects.create(
            code="MED-REP-01",
            brand_name="CardioCalm",
            generic_name="Atenolol",
            dosage_form="TABLET",
            low_stock_threshold=50,
        )
        self.pharma_loc = PharmacyLocation.objects.create(
            hospital=self.hospital_a,
            name="Main Pharmacy",
            location_code="PHARM-A-01",
        )
        self.batch = MedicineBatch.objects.create(
            medicine=self.med,
            pharmacy_location=self.pharma_loc,
            batch_number="BATCH-REP-99",
            received_quantity=200,
            available_quantity=200,
            purchase_cost=Decimal("5.00"),
            selling_price=Decimal("12.00"),
            expiry_date=timezone.now().date() + datetime.timedelta(days=180),
            batch_status=MedicineBatch.BatchStatus.ACTIVE,
        )

        # 8. Laboratory
        self.lab_order = LabOrder.objects.create(
            patient=self.patient,
            hospital=self.hospital_a,
            ordering_doctor=self.doctor,
            priority=LabOrder.Priority.ROUTINE,
        )

        # 9. Billing
        self.invoice = Invoice.objects.create(
            patient=self.patient,
            hospital=self.hospital_a,
            total_amount=Decimal("1500.00"),
            paid_amount=Decimal("1000.00"),
            balance_due=Decimal("500.00"),
            status=Invoice.Status.PARTIALLY_PAID,
        )
        self.payment = Payment.objects.create(
            patient=self.patient,
            hospital=self.hospital_a,
            amount=Decimal("1000.00"),
            payment_method=Payment.Method.UPI,
            status=Payment.Status.COMPLETED,
        )


class DashboardRoleAccessTestCase(BaseReportsTestCase):

    def test_patients_are_forbidden_from_dashboard(self):
        self.client.force_authenticate(user=self.patient_user)
        url = reverse("reports-dashboard")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_dashboard_workload_metrics(self):
        self.client.force_authenticate(user=self.doctor_user)
        url = reverse("reports-dashboard")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["user_role"], "DOCTOR")
        self.assertIn("workload", res.data)
        self.assertEqual(res.data["workload"]["today_appointments_count"], 1)
        self.assertEqual(res.data["workload"]["assigned_active_inpatients_count"], 1)

    def test_nurse_dashboard_inpatient_occupancy(self):
        self.client.force_authenticate(user=self.nurse_user)
        url = reverse("reports-dashboard")
        res = self.client.get(url, {"hospital": self.hospital_a.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["user_role"], "NURSE")
        self.assertIn("inpatient_overview", res.data)
        self.assertEqual(res.data["inpatient_overview"]["total_beds"], 2)
        self.assertEqual(res.data["inpatient_overview"]["occupied_beds"], 1)
        self.assertEqual(res.data["inpatient_overview"]["occupancy_rate_percent"], 50.0)

    def test_accountant_dashboard_financial_aggregates(self):
        self.client.force_authenticate(user=self.accountant_user)
        url = reverse("reports-dashboard")
        res = self.client.get(url, {"hospital": self.hospital_a.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["user_role"], "ACCOUNTANT")
        self.assertIn("financial_summary", res.data)
        self.assertEqual(Decimal(str(res.data["financial_summary"]["total_invoiced"])), Decimal("1500.00"))
        self.assertEqual(Decimal(str(res.data["financial_summary"]["total_collected"])), Decimal("1000.00"))
        self.assertEqual(Decimal(str(res.data["financial_summary"]["total_outstanding_balance"])), Decimal("500.00"))

    def test_admin_holistic_hospital_dashboard(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("reports-dashboard")
        res = self.client.get(url, {"hospital": self.hospital_a.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("patients", res.data)
        self.assertIn("appointments", res.data)
        self.assertIn("inpatient", res.data)
        self.assertIn("pharmacy", res.data)
        self.assertIn("billing", res.data)


class OperationalReportsAndCSVTestCase(BaseReportsTestCase):

    def test_patients_report_json_and_csv(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("reports-patients")

        # 1. JSON report
        res_json = self.client.get(url, {"hospital": self.hospital_a.id})
        self.assertEqual(res_json.status_code, status.HTTP_200_OK)
        self.assertIn("summary", res_json.data)
        self.assertEqual(res_json.data["summary"]["total_patients"], 1)

        # 2. CSV Export
        res_csv = self.client.get(url, {"hospital": self.hospital_a.id, "export": "csv"})
        self.assertEqual(res_csv.status_code, status.HTTP_200_OK)
        self.assertEqual(res_csv["Content-Type"], "text/csv; charset=utf-8")
        self.assertIn("attachment; filename=", res_csv["Content-Disposition"])
        content = res_csv.content.decode("utf-8")
        self.assertIn("MRN", content)
        self.assertIn(self.patient.mrn, content)

    def test_billing_report_unauthorized_role_blocked(self):
        # Doctor cannot view hospital-wide billing report
        self.client.force_authenticate(user=self.doctor_user)
        url = reverse("reports-billing")
        res = self.client.get(url, {"hospital": self.hospital_a.id})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Accountant can view
        self.client.force_authenticate(user=self.accountant_user)
        res_acc = self.client.get(url, {"hospital": self.hospital_a.id})
        self.assertEqual(res_acc.status_code, status.HTTP_200_OK)
        self.assertIn("summary", res_acc.data)
        self.assertEqual(Decimal(str(res_acc.data["summary"]["total_invoiced"])), Decimal("1500.00"))

    def test_date_range_validation(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("reports-appointments")

        # Invalid date format
        res_invalid = self.client.get(url, {"start_date": "not-a-date"})
        self.assertEqual(res_invalid.status_code, status.HTTP_400_BAD_REQUEST)

        # Start date after end date
        res_inverted = self.client.get(url, {"start_date": "2026-12-31", "end_date": "2026-01-01"})
        self.assertEqual(res_inverted.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cross_hospital_data_leakage_prevented(self):
        # Doctor from Hospital A attempting to view Hospital B reports is rejected
        self.client.force_authenticate(user=self.doctor_user)
        url = reverse("reports-appointments")
        res = self.client.get(url, {"hospital": self.hospital_b.id})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_csv_formula_injection_defense(self):
        # Direct unit test of sanitize_csv_cell
        self.assertEqual(sanitize_csv_cell("=1+1"), "'=1+1")
        self.assertEqual(sanitize_csv_cell("@SUM(A1:A10)"), "'@SUM(A1:A10)")
        self.assertEqual(sanitize_csv_cell("+441234567"), "'+441234567")
        self.assertEqual(sanitize_csv_cell("-50"), "'-50")
        self.assertEqual(sanitize_csv_cell("Normal Text"), "Normal Text")
        self.assertEqual(sanitize_csv_cell(None), "")

    def test_report_audit_logging_and_immutability(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("reports-patients")
        self.client.get(url, {"hospital": self.hospital_a.id, "export": "csv"})

        audit = ReportAuditLog.objects.filter(
            user=self.admin_user,
            report_type=ReportAuditLog.ReportType.PATIENTS,
            action=ReportAuditLog.Action.EXPORT_CSV,
        ).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.records_count, 1)

        # Immutability checks: cannot edit or delete audit logs
        with self.assertRaises(ValidationError):
            audit.action = ReportAuditLog.Action.VIEW
            audit.clean()

        with self.assertRaises(ValidationError):
            audit.delete()
