import datetime
import decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from appointments.models import Appointment, DoctorAvailability
from hospitals.models import Department, Doctor, Hospital
from medical_records.models import (
    ClinicalAuditLog,
    ClinicalEncounter,
    ClinicalNote,
    ClinicalNoteAddendum,
    EncounterDiagnosis,
    MedicalHistoryEntry,
    VitalSigns,
)
from medical_records.services import (
    add_clinical_note_addendum,
    build_patient_timeline,
    close_clinical_encounter,
    sign_clinical_note,
)
from patients.models import Patient


User = get_user_model()


class BaseMedicalRecordsTestCase(APITestCase):

    def setUp(self):
        # 1. Users
        self.admin_user = User.objects.create_user(
            username="med_admin",
            email="admin@hospital.com",
            password="AdminPassword123",
            role="HOSPITAL_ADMIN",
            first_name="Admin",
            last_name="Staff",
        )
        self.doctor_user1 = User.objects.create_user(
            username="dr_house",
            email="house@hospital.com",
            password="DoctorPassword123",
            role="DOCTOR",
            first_name="Gregory",
            last_name="House",
        )
        self.doctor_user2 = User.objects.create_user(
            username="dr_cameron",
            email="cameron@hospital.com",
            password="DoctorPassword123",
            role="DOCTOR",
            first_name="Allison",
            last_name="Cameron",
        )
        self.nurse_user = User.objects.create_user(
            username="nurse_jackie",
            email="jackie@hospital.com",
            password="NursePassword123",
            role="NURSE",
            first_name="Jackie",
            last_name="Peyton",
        )
        self.receptionist_user = User.objects.create_user(
            username="receptionist_pam",
            email="pam@hospital.com",
            password="RecepPassword123",
            role="RECEPTIONIST",
            first_name="Pam",
            last_name="Beesly",
        )
        self.accountant_user = User.objects.create_user(
            username="accountant_oscar",
            email="oscar@hospital.com",
            password="AccountantPassword123",
            role="ACCOUNTANT",
            first_name="Oscar",
            last_name="Martinez",
        )
        self.patient_user1 = User.objects.create_user(
            username="patient_john",
            email="john@patient.com",
            password="PatientPassword123",
            role="PATIENT",
            first_name="John",
            last_name="Watson",
        )
        self.patient_user2 = User.objects.create_user(
            username="patient_sherlock",
            email="sherlock@patient.com",
            password="PatientPassword123",
            role="PATIENT",
            first_name="Sherlock",
            last_name="Holmes",
        )

        # 2. Hospital & Department
        self.hospital = Hospital.objects.create(
            name="Princeton Plainsboro Hospital",
            registration_number="HOSP-MR-001",
            address="1 Mercer St",
            city="Princeton",
            state="NJ",
            postal_code="08540",
            phone="9876543210",
            email="info@ppth.com",
            is_active=True,
        )
        self.department = Department.objects.create(
            hospital=self.hospital,
            name="Diagnostic Medicine",
            code="DIAG",
            is_active=True,
        )

        # 3. Doctors
        self.doctor1 = Doctor.objects.create(
            user=self.doctor_user1,
            hospital=self.hospital,
            department=self.department,
            doctor_id="DOC-DIAG-001",
            specialization="Diagnostics & Nephrology",
            license_number="LIC-MED-001",
            qualification="MD",
            experience_years=20,
            consultation_fee=250.00,
            is_available=True,
        )
        self.doctor2 = Doctor.objects.create(
            user=self.doctor_user2,
            hospital=self.hospital,
            department=self.department,
            doctor_id="DOC-DIAG-002",
            specialization="Immunology",
            license_number="LIC-MED-002",
            qualification="MD",
            experience_years=8,
            consultation_fee=180.00,
            is_available=True,
        )

        # 4. Patients
        self.patient1 = Patient.objects.create(
            user=self.patient_user1,
            hospital=self.hospital,
            date_of_birth="1980-07-07",
            gender="MALE",
            blood_group="A+",
            phone="9876543211",
            address="221B Baker St",
            emergency_contact_name="Mary Morstan",
            emergency_contact_relationship="Wife",
            emergency_contact_phone="9876543212",
        )
        self.patient2 = Patient.objects.create(
            user=self.patient_user2,
            hospital=self.hospital,
            date_of_birth="1978-01-06",
            gender="MALE",
            blood_group="O-",
            phone="9876543213",
            address="221B Baker St Apt 2",
            emergency_contact_name="Mycroft Holmes",
            emergency_contact_relationship="Brother",
            emergency_contact_phone="9876543214",
        )

        # 5. Scheduled Appointment
        self.appointment = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            hospital=self.hospital,
            department=self.department,
            appointment_date=timezone.now().date(),
            start_time=datetime.time(10, 0),
            end_time=datetime.time(10, 30),
            status=Appointment.Status.CONFIRMED,
            reason_for_visit="Severe recurring abdominal pain",
        )


class ClinicalEncounterTests(BaseMedicalRecordsTestCase):

    def test_encounter_auto_reference_generation(self):
        enc = ClinicalEncounter.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            chief_complaint="Chest tightness on exertion",
        )
        self.assertTrue(enc.encounter_reference.startswith("ENC-"))
        self.assertEqual(enc.status, ClinicalEncounter.Status.OPEN)
        self.assertEqual(enc.hospital, self.hospital)
        self.assertEqual(enc.department, self.department)

    def test_encounter_cannot_link_to_cancelled_or_no_show_appointment(self):
        self.appointment.status = Appointment.Status.CANCELLED
        self.appointment.save()

        enc = ClinicalEncounter(
            patient=self.patient1,
            doctor=self.doctor1,
            appointment=self.appointment,
            chief_complaint="Post-cancellation follow-up",
        )
        with self.assertRaises(ValidationError) as ctx:
            enc.clean()
        self.assertIn("appointment", ctx.exception.message_dict)

    def test_encounter_patient_and_doctor_must_match_appointment(self):
        # Appointment is for patient 1, attempt to link encounter of patient 2
        enc = ClinicalEncounter(
            patient=self.patient2,
            doctor=self.doctor1,
            appointment=self.appointment,
            chief_complaint="Wrong patient test",
        )
        with self.assertRaises(ValidationError) as ctx:
            enc.clean()
        self.assertIn("appointment", ctx.exception.message_dict)

    def test_close_clinical_encounter(self):
        enc = ClinicalEncounter.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            chief_complaint="Migraine with aura",
        )
        closed = close_clinical_encounter(encounter=enc, user=self.doctor_user1)
        self.assertEqual(closed.status, ClinicalEncounter.Status.CLOSED)
        self.assertEqual(closed.closed_by, self.doctor_user1)
        self.assertIsNotNone(closed.closed_at)
        self.assertIsNotNone(closed.end_time)

        # Cannot close already closed encounter
        with self.assertRaises(ValidationError):
            close_clinical_encounter(encounter=closed, user=self.doctor_user1)

    def test_doctor_creates_encounter_via_api(self):
        self.client.force_authenticate(user=self.doctor_user1)
        url = reverse("encounter-list")
        payload = {
            "patient": self.patient1.id,
            "appointment": self.appointment.id,
            "encounter_type": "OUTPATIENT",
            "chief_complaint": "Persistent fatigue and joint pain",
            "history_of_present_illness": "Symptoms started 3 weeks ago after viral illness",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["doctor"], self.doctor1.id)
        self.assertEqual(response.data["status"], "OPEN")

    def test_patient_cannot_create_encounter(self):
        self.client.force_authenticate(user=self.patient_user1)
        url = reverse("encounter-list")
        payload = {
            "patient": self.patient1.id,
            "doctor": self.doctor1.id,
            "chief_complaint": "Unauthorized encounter",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class VitalSignsTests(BaseMedicalRecordsTestCase):

    def setUp(self):
        super().setUp()
        self.encounter = ClinicalEncounter.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            chief_complaint="Hypertension evaluation",
        )

    def test_vitals_bmi_calculation_metric(self):
        # 180 cm and 81 kg -> BMI = 81 / (1.8 ** 2) = 25.0
        vitals = VitalSigns.objects.create(
            encounter=self.encounter,
            systolic_bp=120,
            diastolic_bp=80,
            heart_rate=72,
            temperature=36.8,
            temperature_unit="C",
            height=180,
            height_unit="cm",
            weight=81,
            weight_unit="kg",
        )
        self.assertEqual(vitals.bmi, decimal.Decimal("25.00"))

    def test_vitals_bmi_calculation_imperial(self):
        # 70 inches (~1.778 m) and 170 lbs (~77.11 kg) -> BMI ~ 24.39
        vitals = VitalSigns.objects.create(
            encounter=self.encounter,
            height=70,
            height_unit="in",
            weight=170,
            weight_unit="lb",
        )
        self.assertAlmostEqual(float(vitals.bmi), 24.39, places=1)

    def test_vitals_validation_systolic_greater_than_diastolic(self):
        vitals = VitalSigns(
            encounter=self.encounter,
            systolic_bp=80,
            diastolic_bp=120,  # Invalid: systolic <= diastolic
        )
        with self.assertRaises(ValidationError) as ctx:
            vitals.clean()
        self.assertIn("systolic_bp", ctx.exception.message_dict)

    def test_vitals_validation_oxygen_saturation(self):
        vitals = VitalSigns(
            encounter=self.encounter,
            oxygen_saturation=105,  # SpO2 cannot exceed 100%
        )
        with self.assertRaises(ValidationError) as ctx:
            vitals.clean()
        self.assertIn("oxygen_saturation", ctx.exception.message_dict)

    def test_nurse_records_vitals_via_api(self):
        self.client.force_authenticate(user=self.nurse_user)
        url = reverse("vitals-list")
        payload = {
            "encounter": self.encounter.id,
            "systolic_bp": 135,
            "diastolic_bp": 88,
            "heart_rate": 78,
            "temperature": "37.2",
            "temperature_unit": "C",
            "oxygen_saturation": "98.5",
            "respiratory_rate": 18,
            "height": "175.0",
            "height_unit": "cm",
            "weight": "74.0",
            "weight_unit": "kg",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["recorded_by_username"], self.nurse_user.username)
        self.assertIsNotNone(response.data["bmi"])

    def test_patient_cannot_record_vitals(self):
        self.client.force_authenticate(user=self.patient_user1)
        url = reverse("vitals-list")
        payload = {
            "encounter": self.encounter.id,
            "systolic_bp": 120,
            "diastolic_bp": 80,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class EncounterDiagnosisTests(BaseMedicalRecordsTestCase):

    def setUp(self):
        super().setUp()
        self.encounter = ClinicalEncounter.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            chief_complaint="Dizziness and palpitations",
        )

    def test_single_primary_diagnosis_constraint(self):
        EncounterDiagnosis.objects.create(
            encounter=self.encounter,
            diagnosis_description="Essential (primary) hypertension",
            diagnosis_code="I10",
            is_primary=True,
        )

        second_primary = EncounterDiagnosis(
            encounter=self.encounter,
            diagnosis_description="Atrial fibrillation",
            diagnosis_code="I48.91",
            is_primary=True,  # Disallowed second primary
        )
        with self.assertRaises(ValidationError) as ctx:
            second_primary.clean()
        self.assertIn("is_primary", ctx.exception.message_dict)

    def test_secondary_diagnoses_allowed(self):
        EncounterDiagnosis.objects.create(
            encounter=self.encounter,
            diagnosis_description="Type 2 Diabetes Mellitus",
            diagnosis_code="E11",
            is_primary=True,
        )
        secondary = EncounterDiagnosis.objects.create(
            encounter=self.encounter,
            diagnosis_description="Diabetic neuropathy",
            diagnosis_code="E11.40",
            is_primary=False,
        )
        self.assertEqual(self.encounter.diagnoses.count(), 2)
        self.assertFalse(secondary.is_primary)

    def test_doctor_creates_diagnosis_via_api(self):
        self.client.force_authenticate(user=self.doctor_user1)
        url = reverse("diagnosis-list")
        payload = {
            "encounter": self.encounter.id,
            "diagnosis_description": "Acute Bronchitis",
            "diagnosis_code": "J20.9",
            "is_primary": True,
            "diagnosis_type": "CONFIRMED",
            "clinical_status": "ACTIVE",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["recorded_by_username"], self.doctor_user1.username)

    def test_nurse_cannot_create_diagnosis(self):
        self.client.force_authenticate(user=self.nurse_user)
        url = reverse("diagnosis-list")
        payload = {
            "encounter": self.encounter.id,
            "diagnosis_description": "Unauthorized nurse diagnosis",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ClinicalNoteAndAddendaTests(BaseMedicalRecordsTestCase):

    def setUp(self):
        super().setUp()
        self.encounter = ClinicalEncounter.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            chief_complaint="Chest pain consultation",
        )

    def test_draft_note_creation_and_signing(self):
        note = ClinicalNote.objects.create(
            encounter=self.encounter,
            note_type=ClinicalNote.NoteType.SOAP,
            subjective="Patient reports intermittent retrosternal pain.",
            objective="BP 130/85, HR 76. S1/S2 normal.",
            assessment="Likely non-cardiac chest pain; rule out GERD.",
            plan="Start PPI trial. Schedule stress test if pain persists.",
            author=self.doctor_user1,
            status=ClinicalNote.Status.DRAFT,
        )
        self.assertEqual(note.status, ClinicalNote.Status.DRAFT)

        # Sign note
        signed_note = sign_clinical_note(clinical_note=note, user=self.doctor_user1)
        self.assertEqual(signed_note.status, ClinicalNote.Status.SIGNED)
        self.assertEqual(signed_note.signed_by, self.doctor_user1)
        self.assertIsNotNone(signed_note.signed_at)

    def test_signed_note_cannot_be_directly_modified(self):
        note = ClinicalNote.objects.create(
            encounter=self.encounter,
            subjective="Original narrative",
            author=self.doctor_user1,
            status=ClinicalNote.Status.SIGNED,
            signed_by=self.doctor_user1,
            signed_at=timezone.now(),
        )
        note.subjective = "Tampered narrative"
        with self.assertRaises(ValidationError):
            note.clean()

    def test_add_addendum_to_signed_note(self):
        note = ClinicalNote.objects.create(
            encounter=self.encounter,
            subjective="Initial notes",
            author=self.doctor_user1,
            status=ClinicalNote.Status.SIGNED,
            signed_by=self.doctor_user1,
            signed_at=timezone.now(),
        )
        addendum = add_clinical_note_addendum(
            clinical_note=note,
            user=self.doctor_user1,
            reason="Laboratory review update",
            addendum_content="Troponin I came back negative (<0.01 ng/mL).",
        )
        self.assertEqual(note.addenda.count(), 1)
        self.assertEqual(addendum.author, self.doctor_user1)

    def test_patient_can_only_view_patient_visible_signed_notes(self):
        # 1. Internal signed note
        ClinicalNote.objects.create(
            encounter=self.encounter,
            subjective="Physician internal observations",
            is_patient_visible=False,
            status=ClinicalNote.Status.SIGNED,
            author=self.doctor_user1,
            signed_by=self.doctor_user1,
            signed_at=timezone.now(),
        )
        # 2. Draft note
        ClinicalNote.objects.create(
            encounter=self.encounter,
            subjective="Draft incomplete observations",
            is_patient_visible=True,
            status=ClinicalNote.Status.DRAFT,
            author=self.doctor_user1,
        )
        # 3. Patient visible signed note
        visible_note = ClinicalNote.objects.create(
            encounter=self.encounter,
            subjective="Finalized consultation summary for patient review",
            is_patient_visible=True,
            status=ClinicalNote.Status.SIGNED,
            author=self.doctor_user1,
            signed_by=self.doctor_user1,
            signed_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.patient_user1)
        url = reverse("clinical-note-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Patient only sees note 3
        note_ids = [n["id"] for n in response.data.get("results", response.data)]
        self.assertIn(visible_note.id, note_ids)
        self.assertEqual(len(note_ids), 1)


class MedicalHistoryTests(BaseMedicalRecordsTestCase):

    def test_medical_history_onset_and_resolution_validation(self):
        entry = MedicalHistoryEntry(
            patient=self.patient1,
            category=MedicalHistoryEntry.Category.PAST_MEDICAL,
            title="Asthma",
            description="Childhood asthma",
            onset_date=datetime.date(2020, 1, 1),
            resolution_date=datetime.date(2018, 1, 1),  # Resolution before onset
        )
        with self.assertRaises(ValidationError) as ctx:
            entry.clean()
        self.assertIn("resolution_date", ctx.exception.message_dict)

    def test_doctor_records_medical_history_via_api(self):
        self.client.force_authenticate(user=self.doctor_user1)
        url = reverse("medical-history-list")
        payload = {
            "patient": self.patient1.id,
            "category": "SURGICAL",
            "title": "Appendectomy",
            "description": "Laparoscopic appendectomy performed without complications",
            "onset_date": "2015-04-12",
            "status": "RESOLVED",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["recorded_by_username"], self.doctor_user1.username)

    def test_patient_can_view_own_medical_history(self):
        MedicalHistoryEntry.objects.create(
            patient=self.patient1,
            category=MedicalHistoryEntry.Category.FAMILY,
            title="Coronary Artery Disease",
            description="Paternal grandfather had MI at age 55",
            recorded_by=self.doctor_user1,
        )
        self.client.force_authenticate(user=self.patient_user1)
        url = reverse("medical-history-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        entries = response.data.get("results", response.data)
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["title"], "Coronary Artery Disease")


class PatientTimelineTests(BaseMedicalRecordsTestCase):

    def setUp(self):
        super().setUp()
        self.encounter = ClinicalEncounter.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            chief_complaint="Annual cardiac and metabolic review",
        )
        self.vitals = VitalSigns.objects.create(
            encounter=self.encounter,
            systolic_bp=125,
            diastolic_bp=82,
            heart_rate=70,
            temperature=36.7,
            height=180,
            weight=78,
        )
        self.diagnosis = EncounterDiagnosis.objects.create(
            encounter=self.encounter,
            diagnosis_description="Hyperlipidemia",
            diagnosis_code="E78.5",
            is_primary=True,
        )
        self.history = MedicalHistoryEntry.objects.create(
            patient=self.patient1,
            category=MedicalHistoryEntry.Category.CHRONIC_CONDITION,
            title="Mild Asthma",
            description="Intermittent exercise-induced asthma",
        )

    def test_timeline_service_aggregates_events(self):
        timeline = build_patient_timeline(patient=self.patient1, user=self.doctor_user1)
        categories = {item["category"] for item in timeline}
        self.assertIn("ENCOUNTER", categories)
        self.assertIn("VITALS", categories)
        self.assertIn("DIAGNOSIS", categories)
        self.assertIn("MEDICAL_HISTORY", categories)

    def test_patient_me_timeline_api(self):
        self.client.force_authenticate(user=self.patient_user1)
        url = reverse("patient-timeline-me")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 4)

    def test_patient_cannot_access_other_patient_timeline(self):
        self.client.force_authenticate(user=self.patient_user1)
        url = reverse("patient-timeline", kwargs={"patient_id": self.patient2.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AuditTrailAndSecurityTests(BaseMedicalRecordsTestCase):

    def test_audit_log_created_for_encounter_closure(self):
        enc = ClinicalEncounter.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            chief_complaint="Post-op review",
        )
        close_clinical_encounter(encounter=enc, user=self.doctor_user1)
        log = ClinicalAuditLog.objects.filter(
            resource_type="ENCOUNTER",
            resource_id=str(enc.id),
            action="CLOSED",
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.user, self.doctor_user1)

    def test_audit_logs_cannot_be_modified_or_deleted(self):
        log = ClinicalAuditLog.objects.create(
            resource_type="ENCOUNTER",
            resource_id="123",
            action="TEST_ACTION",
            user=self.admin_user,
        )
        log.action = "TAMPERED"
        with self.assertRaises(ValidationError):
            log.clean()

        with self.assertRaises(ValidationError):
            log.delete()

    def test_unauthorized_staff_blocked_from_clinical_records(self):
        self.client.force_authenticate(user=self.accountant_user)
        url = reverse("encounter-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        diag_url = reverse("diagnosis-list")
        resp_diag = self.client.get(diag_url)
        self.assertEqual(resp_diag.status_code, status.HTTP_403_FORBIDDEN)

