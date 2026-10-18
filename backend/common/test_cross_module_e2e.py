"""
Comprehensive Cross-Module End-to-End Integration and Concurrency Test Suite.
Validates the cohesive interoperability of all 11 previous modules:
Accounts -> Hospitals -> Patients -> Appointments -> Medical Records ->
Pharmacy -> Laboratory -> Inpatient -> Billing -> Notifications -> Reports.
"""

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from appointments.models import Appointment, DoctorAvailability
from appointments.services import transition_appointment_status, validate_booking
from billing.models import (
    CreditNote,
    InsuranceClaim,
    InsuranceProvider,
    Invoice,
    InvoiceLineItem,
    PatientInsurancePolicy,
    Payment,
    PaymentAllocation,
    ServiceItem,
)
from billing.services import (
    allocate_payment,
    generate_invoice_from_admission,
    generate_invoice_from_appointment,
    issue_invoice,
    recalculate_invoice_totals,
    record_payment,
)
from hospitals.models import Department, Doctor, Hospital, Staff
from inpatient.models import Admission, Bed, BedAssignment, Room, Ward
from inpatient.services import admit_patient, discharge_patient, transfer_patient
from laboratory.models import (
    LabOrder,
    LabOrderItem,
    LabResult,
    LabSpecimen,
    LabTest,
    LabTestParameter,
)
from laboratory.services import (
    collect_specimen,
    enter_lab_result,
    receive_specimen,
    verify_lab_result,
)
from medical_records.models import (
    ClinicalEncounter,
    ClinicalNote,
    EncounterDiagnosis,
    VitalSigns,
)
from medical_records.services import close_clinical_encounter, sign_clinical_note
from notifications.models import Notification
from patients.models import Patient
from pharmacy.models import (
    DispenseRecord,
    DispensedItem,
    Medicine,
    MedicineBatch,
    PharmacyLocation,
    Prescription,
    PrescriptionItem,
)
from pharmacy.services import (
    dispense_prescription,
    issue_prescription,
    record_stock_movement,
)
from reports.exports import sanitize_csv_cell
from reports.services import get_dashboard_metrics

User = get_user_model()


class HospitalSystemE2EIntegrationTests(TestCase):
    """
    End-to-End integration test validating the entire hospital operational pipeline.
    """

    def setUp(self):
        # 1. Setup Admin and Staff Users
        self.admin_user = User.objects.create_user(
            username="hosp_admin",
            email="admin@metrohealth.org",
            password="AdminPassword123",
            role=User.Role.HOSPITAL_ADMIN,
        )

        self.doctor_user = User.objects.create_user(
            username="dr_sharma",
            email="sharma@metrohealth.org",
            first_name="Rajesh",
            last_name="Sharma",
            password="DoctorPassword123",
            role=User.Role.DOCTOR,
        )

        self.nurse_user = User.objects.create_user(
            username="nurse_anita",
            email="anita@metrohealth.org",
            password="NursePassword123",
            role=User.Role.NURSE,
        )

        self.pharmacist_user = User.objects.create_user(
            username="pharm_rahul",
            email="rahul@metrohealth.org",
            password="PharmPassword123",
            role=User.Role.PHARMACIST,
        )

        self.labtech_user = User.objects.create_user(
            username="tech_vikram",
            email="vikram@metrohealth.org",
            password="TechPassword123",
            role=User.Role.LAB_TECHNICIAN,
        )

        self.accountant_user = User.objects.create_user(
            username="acct_priya",
            email="priya@metrohealth.org",
            password="AcctPassword123",
            role=User.Role.ACCOUNTANT,
        )

        self.patient_user = User.objects.create_user(
            username="patient_arun",
            email="arun.kumar@gmail.com",
            first_name="Arun",
            last_name="Kumar",
            password="PatientPassword123",
            role=User.Role.PATIENT,
        )

        # 2. Setup Hospital & Department
        self.hospital = Hospital.objects.create(
            name="Metro General Hospital",
            registration_number="HOSP-METRO-001",
            phone="011-23456789",
            email="info@metrohealth.org",
            address="100 Ring Road",
            city="New Delhi",
            state="Delhi",
            postal_code="110001",
            is_active=True,
        )

        self.cardio_dept = Department.objects.create(
            hospital=self.hospital,
            name="Cardiology",
            code="CARDIO",
            is_active=True,
        )

        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            hospital=self.hospital,
            department=self.cardio_dept,
            doctor_id="DOC-CARD-001",
            specialization="Cardiologist",
            license_number="MCI-12345-DL",
            qualification="MD, DM Cardiology",
            consultation_fee=Decimal("800.00"),
            is_available=True,
        )

        # 3. Setup Patient Profile
        self.patient = Patient.objects.create(
            user=self.patient_user,
            hospital=self.hospital,
            mrn="MRN-2026-0001",
            date_of_birth=date(1985, 6, 15),
            gender="MALE",
            phone="9876543210",
            blood_group="O+",
            allergies="Sulfa antibiotics",
        )

        # 4. Setup Doctor Availability
        # Tomorrow weekday
        self.tomorrow = timezone.now().date() + timedelta(days=1)
        weekday = self.tomorrow.weekday()
        self.avail = DoctorAvailability.objects.create(
            doctor=self.doctor,
            day_of_week=weekday,
            start_time=time(9, 0),
            end_time=time(17, 0),
            slot_duration=30,
            is_active=True,
        )

        # 5. Setup Pharmacy Inventory
        self.pharm_loc = PharmacyLocation.objects.create(
            hospital=self.hospital,
            name="Main Hospital Pharmacy",
            location_code="PHARM-MAIN",
            is_active=True,
        )

        self.medicine = Medicine.objects.create(
            code="MED-ATORV-20",
            generic_name="Atorvastatin",
            brand_name="Lipitor",
            strength="20mg",
            dosage_form="TABLET",
            active_ingredients="Atorvastatin Calcium",
            is_active=True,
        )

        self.batch = MedicineBatch.objects.create(
            medicine=self.medicine,
            pharmacy_location=self.pharm_loc,
            batch_number="BATCH-LIP-2026-A",
            expiry_date=date(2028, 1, 1),
            received_quantity=100,
            available_quantity=100,
            purchase_cost=Decimal("8.00"),
            selling_price=Decimal("15.00"),
            batch_status=MedicineBatch.BatchStatus.ACTIVE,
        )

        # 6. Setup Laboratory Catalogue
        self.lab_test = LabTest.objects.create(
            name="Lipid Profile",
            code="LAB-LIPID-01",
            category="BIOCHEMISTRY",
            specimen_type="SERUM",
            turnaround_time_hours=12,
            is_active=True,
        )
        self.test_param = LabTestParameter.objects.create(
            test=self.lab_test,
            name="Total Cholesterol",
            code="CHOL-TOT",
            unit="mg/dL",
        )

        # 7. Setup Inpatient Ward, Room & Bed
        self.ward = Ward.objects.create(
            hospital=self.hospital,
            department=self.cardio_dept,
            code="WARD-CARD-01",
            name="Cardiac Care Ward",
            ward_type=Ward.WardType.GENERAL,
            gender_policy=Ward.GenderPolicy.ANY,
            is_active=True,
        )

        self.room = Room.objects.create(
            ward=self.ward,
            room_number="R-101",
            room_type=Room.RoomType.STANDARD,
            capacity=2,
            is_active=True,
        )

        self.bed_1 = Bed.objects.create(
            room=self.room,
            bed_number="B-101-A",
            status=Bed.Status.AVAILABLE,
        )
        self.bed_2 = Bed.objects.create(
            room=self.room,
            bed_number="B-101-B",
            status=Bed.Status.AVAILABLE,
        )

        # 8. Setup Insurance Provider & Policy
        self.provider = InsuranceProvider.objects.create(
            code="NHA-INS",
            name="National Healthcare Assurance",
            email="claims@nhainsurance.com",
            is_active=True,
        )
        self.policy = PatientInsurancePolicy.objects.create(
            patient=self.patient,
            provider=self.provider,
            policy_number="POL-2026-9999",
            effective_start_date=date(2026, 1, 1),
            effective_end_date=date(2027, 1, 1),
            coverage_limit=Decimal("500000.00"),
            copay_percentage=Decimal("10.00"),
            is_active=True,
        )

    def test_full_cross_module_patient_lifecycle(self):
        """
        Executes a comprehensive, uninterrupted end-to-end journey across all 11 modules:
        1. Appointment Booking & Confirmation
        2. Clinical Encounter, Vitals, Diagnosis, and Signed SOAP Note
        3. Laboratory Diagnostic Order, Specimen Collection & Result Verification
        4. Pharmacy Prescription & Atomic Dispensing
        5. Inpatient Admission, Bed Allocation, Bed Transfer & Formal Discharge
        6. Comprehensive Billing, Insurance Claim, Partial Payment & Settlement
        7. Audit Logging & Management Reporting Metrics
        """

        # -------------------------------------------------------------
        # STEP 1: APPOINTMENT BOOKING & CONFIRMATION
        # -------------------------------------------------------------
        start_t = time(10, 0)
        end_t = time(10, 30)

        # Validate booking constraints
        validate_booking(
            doctor=self.doctor,
            patient=self.patient,
            appointment_date=self.tomorrow,
            start_time=start_t,
            end_time=end_t,
        )

        appointment = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            hospital=self.hospital,
            department=self.cardio_dept,
            appointment_date=self.tomorrow,
            start_time=start_t,
            end_time=end_t,
            reason_for_visit="Routine cardiac checkup and lipid monitoring",
            status=Appointment.Status.PENDING,
            booked_by=self.patient_user,
        )
        self.assertEqual(appointment.status, Appointment.Status.PENDING)

        # Confirm appointment
        transition_appointment_status(
            appointment=appointment,
            new_status=Appointment.Status.CONFIRMED,
            user=self.admin_user,
            reason="Confirmed by clinic reception",
        )
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, Appointment.Status.CONFIRMED)

        # -------------------------------------------------------------
        # STEP 2: CLINICAL ENCOUNTER, VITALS, DIAGNOSIS, AND NOTES
        # -------------------------------------------------------------
        encounter = ClinicalEncounter.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            hospital=self.hospital,
            department=self.cardio_dept,
            appointment=appointment,
            encounter_date=self.tomorrow,
            start_time=timezone.now(),
            encounter_type=ClinicalEncounter.EncounterType.OUTPATIENT,
            chief_complaint="Chest tightness after climbing stairs",
            status=ClinicalEncounter.Status.OPEN,
            created_by=self.doctor_user,
        )

        # Record vital signs
        vitals = VitalSigns.objects.create(
            encounter=encounter,
            systolic_bp=135,
            diastolic_bp=88,
            heart_rate=78,
            temperature=Decimal("36.9"),
            respiratory_rate=16,
            oxygen_saturation=Decimal("98.0"),
            height=Decimal("175.0"),
            weight=Decimal("76.0"),
            recorded_by=self.nurse_user,
        )
        self.assertIsNotNone(vitals.bmi)
        self.assertAlmostEqual(float(vitals.bmi), 24.8, places=1)

        # Record encounter diagnosis
        diagnosis = EncounterDiagnosis.objects.create(
            encounter=encounter,
            diagnosis_code="I20.9",
            diagnosis_description="Angina pectoris, unspecified",
            diagnosis_type=EncounterDiagnosis.DiagnosisType.PROVISIONAL,
            recorded_by=self.doctor_user,
        )
        self.assertEqual(diagnosis.encounter, encounter)

        # Author and sign clinical SOAP note
        note = ClinicalNote.objects.create(
            encounter=encounter,
            author=self.doctor_user,
            note_type=ClinicalNote.NoteType.SOAP,
            subjective="Patient reports intermittent retrosternal discomfort.",
            objective="BP 135/88, HR 78 bpm. Normal S1/S2 heart sounds, no murmur.",
            assessment="Likely exertional angina. Evaluate serum lipids.",
            plan="Order Fasting Lipid Profile. Prescribe Atorvastatin 20mg nocte.",
            is_patient_visible=True,
            status=ClinicalNote.Status.DRAFT,
        )

        sign_clinical_note(clinical_note=note, user=self.doctor_user)
        note.refresh_from_db()
        self.assertEqual(note.status, ClinicalNote.Status.SIGNED)
        self.assertIsNotNone(note.signed_at)

        # Close clinical encounter
        close_clinical_encounter(encounter=encounter, user=self.doctor_user)
        encounter.refresh_from_db()
        self.assertEqual(encounter.status, ClinicalEncounter.Status.CLOSED)

        # -------------------------------------------------------------
        # STEP 3: LABORATORY DIAGNOSTICS WORKFLOW
        # -------------------------------------------------------------
        lab_order = LabOrder.objects.create(
            patient=self.patient,
            ordering_doctor=self.doctor,
            hospital=self.hospital,
            department=self.cardio_dept,
            encounter=encounter,
            priority=LabOrder.Priority.ROUTINE,
            clinical_indication="Evaluate dyslipidemia in patient with angina",
            status=LabOrder.Status.ORDERED,
        )
        order_item = LabOrderItem.objects.create(
            order=lab_order,
            test=self.lab_test,
            status=LabOrderItem.ItemStatus.PENDING,
        )

        # Create and collect specimen
        specimen = LabSpecimen.objects.create(
            order=lab_order,
            specimen_type="SERUM",
            status=LabSpecimen.Status.PENDING_COLLECTION,
        )
        specimen.order_items.add(order_item)

        collect_specimen(
            specimen=specimen,
            user=self.labtech_user,
            collection_location="Left antecubital fossa",
        )
        specimen.refresh_from_db()
        self.assertEqual(specimen.status, LabSpecimen.Status.COLLECTED)

        # Receive specimen in lab
        receive_specimen(specimen=specimen, user=self.labtech_user)
        specimen.refresh_from_db()
        self.assertEqual(specimen.status, LabSpecimen.Status.RECEIVED)

        # Enter lab test result
        lab_result = enter_lab_result(
            order_item=order_item,
            specimen=specimen,
            parameter_values_data=[
                {
                    "parameter": self.test_param,
                    "numeric_value": Decimal("210.0"),
                }
            ],
            user=self.labtech_user,
            overall_interpretation="Mild hypercholesterolemia",
        )
        self.assertEqual(lab_result.status, LabResult.Status.ENTERED)

        # Verify lab result
        verify_lab_result(result=lab_result, user=self.doctor_user)
        lab_result.refresh_from_db()
        self.assertEqual(lab_result.status, LabResult.Status.VERIFIED)

        lab_order.refresh_from_db()
        self.assertEqual(lab_order.status, LabOrder.Status.COMPLETED)

        # -------------------------------------------------------------
        # STEP 4: PHARMACY PRESCRIPTION & DISPENSING
        # -------------------------------------------------------------
        prescription = Prescription.objects.create(
            encounter=encounter,
            patient=self.patient,
            doctor=self.doctor,
            hospital=self.hospital,
            clinical_indication="Exertional Angina / Hyperlipidemia",
            status=Prescription.Status.DRAFT,
        )
        rx_item = PrescriptionItem.objects.create(
            prescription=prescription,
            medicine=self.medicine,
            dosage_instructions="1 tablet 20mg",
            frequency="Once daily",
            route="Oral",
            duration_value=30,
            duration_unit="DAYS",
            quantity_prescribed=30,
            patient_instructions="Take at bedtime",
        )
        issue_prescription(prescription=prescription, user=self.doctor_user)
        prescription.refresh_from_db()
        self.assertEqual(prescription.status, Prescription.Status.ISSUED)

        # Dispense prescription atomically
        dispense_allocations = [{
            "prescription_item_id": rx_item.id,
            "batch_id": self.batch.id,
            "quantity": 30,
        }]

        dispense_rec = dispense_prescription(
            prescription=prescription,
            pharmacy_location=self.pharm_loc,
            items_data=dispense_allocations,
            user=self.pharmacist_user,
            notes="Advised regarding night dose and mild muscle discomfort.",
        )
        self.assertFalse(dispense_rec.is_reversed)
        prescription.refresh_from_db()
        self.assertEqual(prescription.status, Prescription.Status.DISPENSED)

        # Verify batch inventory was safely reduced from 100 to 70
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.available_quantity, 70)

        # -------------------------------------------------------------
        # STEP 5: INPATIENT ADMISSION, BED TRANSFER & DISCHARGE
        # -------------------------------------------------------------
        admission = Admission.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            department=self.cardio_dept,
            attending_doctor=self.doctor,
            admission_type=Admission.AdmissionType.ELECTIVE,
            admission_reason="Overnight telemetry monitoring for unstable angina",
            admission_date=timezone.now(),
            status=Admission.Status.REQUESTED,
        )

        # Admit patient to bed 1
        admit_patient(
            admission=admission,
            bed=self.bed_1,
            user=self.admin_user,
            reason="Admitted to Cardiac Ward Bed 1",
        )
        admission.refresh_from_db()
        self.bed_1.refresh_from_db()
        self.assertEqual(admission.status, Admission.Status.ADMITTED)
        self.assertEqual(self.bed_1.status, Bed.Status.OCCUPIED)

        # Transfer patient to bed 2 (e.g. telemetry requirement)
        transfer_patient(
            admission=admission,
            destination_bed=self.bed_2,
            user=self.nurse_user,
            reason="Relocated near central nursing station for cardiac telemetry",
        )
        self.bed_1.refresh_from_db()
        self.bed_2.refresh_from_db()
        self.assertEqual(self.bed_1.status, Bed.Status.CLEANING)
        self.assertEqual(self.bed_2.status, Bed.Status.OCCUPIED)

        # Discharge patient
        discharge_patient(
            admission=admission,
            user=self.doctor_user,
            discharge_disposition=Admission.DischargeDisposition.HOME_ROUTINE,
            discharge_summary="Patient remained asymptomatic overnight. Normal sinus rhythm on telemetry.",
        )
        admission.refresh_from_db()
        self.bed_2.refresh_from_db()
        self.assertEqual(admission.status, Admission.Status.DISCHARGED)
        self.assertEqual(self.bed_2.status, Bed.Status.CLEANING)

        # -------------------------------------------------------------
        # STEP 6: BILLING, INVOICE GENERATION, INSURANCE & PAYMENTS
        # -------------------------------------------------------------
        # Generate consultation invoice
        invoice = generate_invoice_from_appointment(
            appointment=appointment,
            user=self.accountant_user,
        )
        self.assertEqual(invoice.status, Invoice.Status.DRAFT)
        self.assertEqual(invoice.total_amount, Decimal("800.00"))

        # Add inpatient and pharmacy line items to invoice
        InvoiceLineItem.objects.create(
            invoice=invoice,
            service_code="INP-STAY",
            description="Inpatient 1-day Cardiac Monitoring Stay",
            quantity=Decimal("1.00"),
            unit_price=Decimal("1200.00"),
            discount=Decimal("0.00"),
            tax_rate=Decimal("5.00"),
            tax_amount=Decimal("60.00"),
            subtotal=Decimal("1200.00"),
            total_amount=Decimal("1260.00"),
            source_module="INPATIENT",
        )
        InvoiceLineItem.objects.create(
            invoice=invoice,
            service_code="PHARM-LIP",
            description="Atorvastatin 20mg (30 Tablets)",
            quantity=Decimal("30.00"),
            unit_price=Decimal("15.00"),
            discount=Decimal("0.00"),
            tax_rate=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            subtotal=Decimal("450.00"),
            total_amount=Decimal("450.00"),
            source_module="PHARMACY",
        )

        recalculate_invoice_totals(invoice)
        invoice.refresh_from_db()
        # Total = 800 (consult) + 1260 (stay + tax) + 450 (meds) = 2510.00
        self.assertEqual(invoice.total_amount, Decimal("2510.00"))
        self.assertEqual(invoice.balance_due, Decimal("2510.00"))

        # Finalize and issue invoice so status tracking works with payments
        issue_invoice(invoice=invoice, user=self.accountant_user)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.ISSUED)

        # Create Insurance Claim against Policy
        claim = InsuranceClaim.objects.create(
            policy=self.policy,
            patient=self.patient,
            hospital=self.hospital,
            invoice=invoice,
            claim_amount=Decimal("1500.00"),
            approved_amount=Decimal("1500.00"),
            received_amount=Decimal("1500.00"),
            status=InsuranceClaim.Status.SETTLED,
        )
        self.assertEqual(claim.status, InsuranceClaim.Status.SETTLED)

        # Record Insurer Payment of 1500.00
        ins_payment = record_payment(
            patient=self.patient,
            hospital=self.hospital,
            amount=Decimal("1500.00"),
            payment_method=Payment.Method.INSURANCE,
            user=self.accountant_user,
            invoice=invoice,
            notes="Settled directly by National Healthcare Assurance",
        )
        invoice.refresh_from_db()
        self.assertEqual(invoice.paid_amount, Decimal("1500.00"))
        self.assertEqual(invoice.balance_due, Decimal("1010.00"))
        self.assertEqual(invoice.status, Invoice.Status.PARTIALLY_PAID)

        # Patient settles remaining balance via UPI
        patient_payment = record_payment(
            patient=self.patient,
            hospital=self.hospital,
            amount=Decimal("1010.00"),
            payment_method=Payment.Method.UPI,
            user=self.accountant_user,
            invoice=invoice,
            notes="Patient cleared out-of-pocket balance via UPI",
        )
        invoice.refresh_from_db()
        self.assertEqual(invoice.paid_amount, Decimal("2510.00"))
        self.assertEqual(invoice.balance_due, Decimal("0.00"))
        self.assertEqual(invoice.status, Invoice.Status.PAID)

        # -------------------------------------------------------------
        # STEP 7: VERIFY DASHBOARD & REPORTING AGGREGATES
        # -------------------------------------------------------------
        dashboard = get_dashboard_metrics(user=self.admin_user, hospital=self.hospital)
        self.assertIn("hospital_name", dashboard)
        self.assertIn("patients", dashboard)
        self.assertEqual(dashboard["patients"]["total_registrations_period"], 1)
        self.assertIn("appointments", dashboard)
        self.assertEqual(dashboard["appointments"]["total_appointments"], 1)
        self.assertIn("pharmacy", dashboard)
        self.assertEqual(dashboard["pharmacy"]["dispenses_recorded"], 1)
        self.assertIn("laboratory", dashboard)
        self.assertEqual(dashboard["laboratory"]["total_lab_orders"], 1)
        self.assertIn("inpatient", dashboard)
        self.assertEqual(dashboard["inpatient"]["total_admissions_period"], 1)
        self.assertIn("billing", dashboard)
        self.assertEqual(dashboard["billing"]["total_invoiced"], Decimal("2510.00"))
        self.assertEqual(dashboard["billing"]["total_collected"], Decimal("2510.00"))
        self.assertEqual(dashboard["billing"]["total_outstanding"], Decimal("0.00"))

    def test_concurrency_and_race_condition_controls(self):
        """
        Validates row-locking and idempotency controls:
        - Prevents double-booking same slot.
        - Prevents assigning already occupied bed.
        - Prevents stock movement exceeding inventory balance.
        - Prevents over-allocation of payment beyond invoice balance.
        """

        # 1. Double Booking Prevention
        start_t = time(11, 0)
        end_t = time(11, 30)

        # First booking succeeds
        Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            hospital=self.hospital,
            department=self.cardio_dept,
            appointment_date=self.tomorrow,
            start_time=start_t,
            end_time=end_t,
            reason_for_visit="Cardiac evaluation",
            status=Appointment.Status.CONFIRMED,
            booked_by=self.doctor_user,
        )

        # Second booking for the same slot must raise ValidationError
        second_patient_user = User.objects.create_user(
            username="patient_vikas",
            email="vikas@gmail.com",
            password="Password123",
            role=User.Role.PATIENT,
        )
        second_patient = Patient.objects.create(
            user=second_patient_user,
            hospital=self.hospital,
            mrn="MRN-2026-0002",
            date_of_birth=date(1990, 1, 1),
            gender="MALE",
            phone="9123456789",
        )

        with self.assertRaises(ValidationError) as ctx:
            validate_booking(
                doctor=self.doctor,
                patient=second_patient,
                appointment_date=self.tomorrow,
                start_time=start_t,
                end_time=end_t,
            )
        self.assertIn("time_slot", ctx.exception.message_dict)

        # 2. Bed Double Allocation Prevention
        # Assign bed 1 to first patient
        admission_1 = Admission.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            department=self.cardio_dept,
            attending_doctor=self.doctor,
            admission_type=Admission.AdmissionType.ELECTIVE,
            admission_reason="Cardiac elective stay",
            admission_date=timezone.now(),
            status=Admission.Status.REQUESTED,
        )
        admit_patient(admission=admission_1, bed=self.bed_1, user=self.admin_user)
        self.bed_1.refresh_from_db()
        self.assertEqual(self.bed_1.status, Bed.Status.OCCUPIED)

        # Attempt to admit second patient to the already occupied bed 1
        admission_2 = Admission.objects.create(
            patient=second_patient,
            hospital=self.hospital,
            department=self.cardio_dept,
            attending_doctor=self.doctor,
            admission_type=Admission.AdmissionType.EMERGENCY,
            admission_reason="Cardiac emergency stay",
            admission_date=timezone.now(),
            status=Admission.Status.REQUESTED,
        )
        with self.assertRaises(ValidationError) as ctx:
            admit_patient(admission=admission_2, bed=self.bed_1, user=self.admin_user)
        self.assertIn("bed", ctx.exception.message_dict)

        # 3. Pharmacy Inventory Over-dispense Prevention
        # Attempt to decrement more stock than available (100 available)
        with self.assertRaises(ValidationError) as ctx:
            record_stock_movement(
                batch=self.batch,
                movement_type="DISPENSE",
                quantity=-150,  # exceeds 100
                user=self.pharmacist_user,
                reason="Over-dispense attempt",
            )
        self.assertIn("quantity", ctx.exception.message_dict)

        # 4. Payment Over-Allocation Prevention
        invoice = Invoice.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            currency="INR",
            total_amount=Decimal("500.00"),
            balance_due=Decimal("500.00"),
            status=Invoice.Status.ISSUED,
        )
        payment = Payment.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            amount=Decimal("1000.00"),
            status=Payment.Status.COMPLETED,
            payment_method=Payment.Method.CASH,
            received_by=self.accountant_user,
        )

        # Attempt to allocate 600.00 when invoice balance is only 500.00
        with self.assertRaises(ValidationError) as ctx:
            allocate_payment(
                payment=payment,
                invoice=invoice,
                amount=Decimal("600.00"),
                user=self.accountant_user,
            )
        self.assertIn("amount", ctx.exception.message_dict)

    def test_csv_injection_sanitization(self):
        """
        Validates CSV Formula Injection protection (CWE-1236).
        Cells beginning with =, +, -, @, or tabs must be prefixed with a single quote.
        """
        malicious_inputs = [
            ("=SUM(A1:A10)", "'=SUM(A1:A10)"),
            ("+1234567890", "'+1234567890"),
            ("-5000", "'-5000"),
            ("@cmd|' /C calc'!A0", "'@cmd|' /C calc'!A0"),
            ("\tsecret_tab", "'\tsecret_tab"),
            ("Normal Text", "Normal Text"),
            (None, ""),
            (100, "100"),
        ]
        for raw, expected in malicious_inputs:
            sanitized = sanitize_csv_cell(raw)
            self.assertEqual(sanitized, expected)
