import datetime
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from hospitals.models import Department, Doctor, Hospital
from patients.models import Patient
from .models import (
    Admission,
    Bed,
    BedAssignment,
    BedReservation,
    InpatientAuditLog,
    Room,
    Ward,
)
from .services import (
    admit_patient,
    calculate_occupancy_report,
    cancel_bed_reservation,
    discharge_patient,
    reserve_bed,
    transfer_patient,
    update_bed_operational_status,
)

User = get_user_model()


class BaseInpatientTestCase(APITestCase):

    def setUp(self):
        # 1. Users
        self.super_admin = User.objects.create_superuser(
            username="inp_superadmin",
            email="superadmin@hospital.com",
            password="AdminPassword123",
            role="SUPER_ADMIN",
        )
        self.hospital_admin = User.objects.create_user(
            username="inp_hospadmin",
            email="hospadmin@hospital.com",
            password="AdminPassword123",
            role="HOSPITAL_ADMIN",
        )
        self.doctor_user = User.objects.create_user(
            username="dr_allison_cameron",
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
            username="receptionist_erin",
            email="erin@hospital.com",
            password="StaffPassword123",
            role="RECEPTIONIST",
        )
        self.lab_tech_user = User.objects.create_user(
            username="tech_vince",
            email="vince@hospital.com",
            password="TechPassword123",
            role="LAB_TECHNICIAN",
        )
        self.patient_user = User.objects.create_user(
            username="inpatient_alice",
            email="alice@patient.com",
            password="PatientPassword123",
            role="PATIENT",
            first_name="Alice",
            last_name="Walker",
        )
        self.other_patient_user = User.objects.create_user(
            username="inpatient_bob",
            email="bob@patient.com",
            password="PatientPassword123",
            role="PATIENT",
            first_name="Bob",
            last_name="Marley",
        )

        # 2. Hospital & Department
        self.hospital = Hospital.objects.create(
            name="St. Jude Memorial Hospital",
            registration_number="REG-INP-001",
            phone="1234567890",
            email="contact@stjude.org",
            address="100 Hospital Way",
        )
        self.department = Department.objects.create(
            hospital=self.hospital,
            name="Internal Medicine",
            code="MED-01",
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            hospital=self.hospital,
            department=self.department,
            doctor_id="DOC-CAMERON-01",
            specialization="Internal Medicine",
            license_number="LIC-MED-9900",
            qualification="MD",
            consultation_fee=Decimal("120.00"),
        )

        # Other hospital for cross-hospital testing
        self.other_hospital = Hospital.objects.create(
            name="Mercy General Hospital",
            registration_number="REG-INP-002",
            phone="9876543210",
            email="contact@mercy.org",
            address="200 West Ave",
        )

        # 3. Patients
        self.patient = Patient.objects.create(
            user=self.patient_user,
            date_of_birth=datetime.date(1985, 3, 10),
            gender="FEMALE",
            blood_group="A+",
            address="10 Main St",
            emergency_contact_name="Tom Walker",
            emergency_contact_phone="5551234",
            emergency_contact_relationship="Brother",
        )
        self.other_patient = Patient.objects.create(
            user=self.other_patient_user,
            date_of_birth=datetime.date(1975, 7, 22),
            gender="MALE",
            blood_group="B+",
            address="20 Pine St",
            emergency_contact_name="Rita Marley",
            emergency_contact_phone="5555678",
            emergency_contact_relationship="Spouse",
        )

        # 4. Wards, Rooms, and Beds
        self.ward = Ward.objects.create(
            hospital=self.hospital,
            department=self.department,
            code="WARD-GEN-01",
            name="General Medical Ward",
            ward_type=Ward.WardType.GENERAL,
            floor="2nd Floor",
        )
        self.icu_ward = Ward.objects.create(
            hospital=self.hospital,
            department=self.department,
            code="WARD-ICU-01",
            name="Intensive Care Unit",
            ward_type=Ward.WardType.ICU,
            floor="3rd Floor",
        )
        self.room_101 = Room.objects.create(
            ward=self.ward,
            room_number="201",
            room_type=Room.RoomType.DOUBLE,
            capacity=2,
        )
        self.bed_a = Bed.objects.create(
            room=self.room_101,
            bed_number="Bed-201A",
            bed_type=Bed.BedType.STANDARD,
            status=Bed.Status.AVAILABLE,
        )
        self.bed_b = Bed.objects.create(
            room=self.room_101,
            bed_number="Bed-201B",
            bed_type=Bed.BedType.STANDARD,
            status=Bed.Status.AVAILABLE,
        )

        # ICU Room & Bed
        self.room_icu = Room.objects.create(
            ward=self.icu_ward,
            room_number="ICU-1",
            room_type=Room.RoomType.ICU_SUITE,
            capacity=1,
        )
        self.bed_icu = Bed.objects.create(
            room=self.room_icu,
            bed_number="Bed-ICU-1",
            bed_type=Bed.BedType.ICU,
            status=Bed.Status.AVAILABLE,
        )


class WardRoomBedManagementTests(BaseInpatientTestCase):

    def test_duplicate_ward_code_per_hospital_rejected(self):
        with self.assertRaises((IntegrityError, ValidationError)):
            Ward.objects.create(
                hospital=self.hospital,
                code="WARD-GEN-01",
                name="Duplicate Code Ward",
            )

    def test_ward_department_must_match_hospital(self):
        other_dept = Department.objects.create(
            hospital=self.other_hospital,
            name="Other Hospital Dept",
            code="OTH-01",
        )
        with self.assertRaises(ValidationError):
            Ward.objects.create(
                hospital=self.hospital,
                department=other_dept,
                code="WARD-INVALID",
                name="Invalid Dept Ward",
            )

    def test_room_capacity_constraint(self):
        # Room 201 has capacity 2 and currently 2 beds. Attempting to add 3rd bed violates capacity
        with self.assertRaises(ValidationError):
            Bed.objects.create(
                room=self.room_101,
                bed_number="Bed-201C",
            )

    def test_room_capacity_cannot_be_reduced_below_existing_bed_count(self):
        self.room_101.capacity = 1
        with self.assertRaises(ValidationError):
            self.room_101.save()

    def test_bed_operational_status_update(self):
        self.client.force_authenticate(user=self.nurse_user)
        url = reverse("inpatient-bed-update-status", kwargs={"pk": self.bed_a.id})
        res = self.client.post(url, {"status": "CLEANING", "notes": "Disinfection scheduled"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.bed_a.refresh_from_db()
        self.assertEqual(self.bed_a.status, Bed.Status.CLEANING)

    def test_list_available_beds_endpoint(self):
        self.client.force_authenticate(user=self.doctor_user)
        url = reverse("inpatient-bed-available-beds")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # We have at least bed_a, bed_b, bed_icu available
        bed_numbers = [b["bed_number"] for b in res.data["results"]]
        self.assertIn("Bed-201A", bed_numbers)
        self.assertIn("Bed-201B", bed_numbers)
        self.assertIn("Bed-ICU-1", bed_numbers)


class AdmissionAndBedAllocationWorkflowTests(BaseInpatientTestCase):

    def test_create_admission_and_allocate_bed_safely(self):
        self.client.force_authenticate(user=self.doctor_user)
        url = reverse("inpatient-admission-list")
        payload = {
            "patient": self.patient.id,
            "attending_doctor": self.doctor.id,
            "admission_type": "ELECTIVE",
            "admission_reason": "Scheduled laparoscopic cholecystectomy post-op recovery",
            "initial_bed_id": self.bed_a.id,
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        adm_ref = res.data["admission_reference"]
        self.assertTrue(adm_ref.startswith("ADM-"))
        self.assertEqual(res.data["status"], "ADMITTED")
        self.assertEqual(res.data["current_bed"], "Bed-201A")

        # Verify bed is now OCCUPIED
        self.bed_a.refresh_from_db()
        self.assertEqual(self.bed_a.status, Bed.Status.OCCUPIED)

        # Verify audit log was recorded
        audit = InpatientAuditLog.objects.filter(resource_id=adm_ref, action="ADMITTED").first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.user, self.doctor_user)

    def test_double_allocation_prevented(self):
        # 1. Admit patient 1 to bed_a
        adm1 = Admission.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            attending_doctor=self.doctor,
            department=self.department,
            admission_reason="Pneumonia treatment",
            admitted_by=self.doctor_user,
        )
        admit_patient(adm1, self.bed_a, self.doctor_user)

        # 2. Attempt to admit patient 2 to the same bed_a -> must fail
        adm2 = Admission.objects.create(
            patient=self.other_patient,
            hospital=self.hospital,
            attending_doctor=self.doctor,
            department=self.department,
            admission_reason="Acute bronchitis",
            admitted_by=self.doctor_user,
        )
        with self.assertRaises(ValidationError):
            admit_patient(adm2, self.bed_a, self.doctor_user)

    def test_patient_cannot_have_multiple_active_admissions(self):
        adm1 = Admission.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            attending_doctor=self.doctor,
            department=self.department,
            admission_reason="First admission",
            admitted_by=self.doctor_user,
        )
        admit_patient(adm1, self.bed_a, self.doctor_user)

        # Attempt to admit same patient to another bed
        adm2 = Admission.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            attending_doctor=self.doctor,
            department=self.department,
            admission_reason="Second admission attempt",
            admitted_by=self.doctor_user,
        )
        with self.assertRaises(ValidationError):
            admit_patient(adm2, self.bed_b, self.doctor_user)


class InpatientTransferAndDischargeTests(BaseInpatientTestCase):

    def setUp(self):
        super().setUp()
        self.admission = Admission.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            attending_doctor=self.doctor,
            department=self.department,
            admission_reason="Severe respiratory distress requiring ICU admission",
            admitted_by=self.doctor_user,
        )
        admit_patient(self.admission, self.bed_icu, self.doctor_user)

    def test_inpatient_transfer_preserves_history_and_moves_old_bed_to_cleaning(self):
        # Transfer from ICU bed to General bed_b
        self.client.force_authenticate(user=self.doctor_user)
        transfer_url = reverse("inpatient-admission-transfer", kwargs={"pk": self.admission.id})
        payload = {
            "destination_bed_id": self.bed_b.id,
            "reason": "Patient clinically stabilized; step-down transfer to general ward",
        }
        res = self.client.post(transfer_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # 1. Source bed (bed_icu) must be in CLEANING
        self.bed_icu.refresh_from_db()
        self.assertEqual(self.bed_icu.status, Bed.Status.CLEANING)

        # 2. Destination bed (bed_b) must be in OCCUPIED
        self.bed_b.refresh_from_db()
        self.assertEqual(self.bed_b.status, Bed.Status.OCCUPIED)

        # 3. Admission bed history must have 2 assignments
        history = list(self.admission.bed_assignments.all().order_by("start_time"))
        self.assertEqual(len(history), 2)
        self.assertFalse(history[0].is_active)
        self.assertEqual(history[0].bed, self.bed_icu)
        self.assertTrue(history[1].is_active)
        self.assertEqual(history[1].bed, self.bed_b)

    def test_reject_transfer_to_occupied_bed(self):
        # Put bed_b into OCCUPIED
        self.bed_b.status = Bed.Status.OCCUPIED
        self.bed_b.save()

        self.client.force_authenticate(user=self.doctor_user)
        transfer_url = reverse("inpatient-admission-transfer", kwargs={"pk": self.admission.id})
        res = self.client.post(transfer_url, {"destination_bed_id": self.bed_b.id, "reason": "Transfer attempt"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_discharge_workflow(self):
        self.client.force_authenticate(user=self.doctor_user)
        discharge_url = reverse("inpatient-admission-discharge", kwargs={"pk": self.admission.id})
        payload = {
            "discharge_disposition": "HOME_ROUTINE",
            "discharge_instructions": "Prescribed oral antibiotics. Follow up in outpatient clinic in 7 days.",
            "discharge_summary": "Patient recovered smoothly from acute respiratory distress.",
        }
        res = self.client.post(discharge_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "DISCHARGED")

        # Bed must be released and moved to CLEANING
        self.bed_icu.refresh_from_db()
        self.assertEqual(self.bed_icu.status, Bed.Status.CLEANING)

        # No active assignments remain for admission
        self.assertFalse(self.admission.bed_assignments.filter(is_active=True).exists())

        # Attempting duplicate discharge must fail
        res_dup = self.client.post(discharge_url, payload, format="json")
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)


class InpatientOccupancyReportAndRBACTests(BaseInpatientTestCase):

    def test_occupancy_report_calculation(self):
        # Total active beds = 3 (bed_a, bed_b, bed_icu)
        # Let's occupy 1 bed
        adm = Admission.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            attending_doctor=self.doctor,
            department=self.department,
            admission_reason="Monitoring",
            admitted_by=self.doctor_user,
        )
        admit_patient(adm, self.bed_a, self.doctor_user)

        self.client.force_authenticate(user=self.doctor_user)
        url = reverse("inpatient-occupancy")
        res = self.client.get(url, {"hospital": self.hospital.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_active_beds"], 3)
        self.assertEqual(res.data["occupied_beds"], 1)
        self.assertEqual(res.data["available_beds"], 2)
        self.assertEqual(res.data["active_admissions"], 1)
        self.assertAlmostEqual(res.data["occupancy_rate"], 33.33, places=1)

    def test_patient_can_view_only_own_admission(self):
        adm = Admission.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            attending_doctor=self.doctor,
            department=self.department,
            admission_reason="Routine monitoring",
            admitted_by=self.doctor_user,
        )

        # Alice views her own admission
        self.client.force_authenticate(user=self.patient_user)
        url = reverse("inpatient-admission-detail", kwargs={"pk": adm.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Bob attempts to view Alice's admission -> 404
        self.client.force_authenticate(user=self.other_patient_user)
        res_other = self.client.get(url)
        self.assertEqual(res_other.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthorized_roles_cannot_discharge_or_manage_beds(self):
        adm = Admission.objects.create(
            patient=self.patient,
            hospital=self.hospital,
            attending_doctor=self.doctor,
            department=self.department,
            admission_reason="Inpatient care",
            admitted_by=self.doctor_user,
        )
        admit_patient(adm, self.bed_a, self.doctor_user)

        # Receptionist cannot discharge (only Doctors & Admins)
        self.client.force_authenticate(user=self.receptionist_user)
        url_discharge = reverse("inpatient-admission-discharge", kwargs={"pk": adm.id})
        res = self.client.post(url_discharge, {"discharge_disposition": "HOME_ROUTINE"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Lab tech cannot create wards or manage admissions
        self.client.force_authenticate(user=self.lab_tech_user)
        res_ward = self.client.post(reverse("inpatient-ward-list"), {"code": "W-X", "name": "Test Ward", "hospital": self.hospital.id}, format="json")
        self.assertEqual(res_ward.status_code, status.HTTP_403_FORBIDDEN)

    def test_inpatient_audit_log_immutability(self):
        log = InpatientAuditLog.objects.create(
            resource_type="ADMISSION",
            resource_id="ADM-TEST-001",
            action="ADMITTED",
            user=self.doctor_user,
            description="Testing inpatient audit log",
        )
        with self.assertRaises(ValidationError):
            log.description = "Tampered description"
            log.clean()

        with self.assertRaises(ValidationError):
            log.delete()
