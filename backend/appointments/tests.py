import datetime
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from appointments.models import Appointment, AppointmentStatusHistory, DoctorAvailability
from appointments.services import get_available_slots, transition_appointment_status, validate_booking
from hospitals.models import Department, Doctor, Hospital
from patients.models import Patient


User = get_user_model()


class BaseAppointmentTestCase(APITestCase):

    def setUp(self):
        # 1. Create Users with different roles
        self.admin_user = User.objects.create_user(
            username="admin_user",
            email="admin@hospital.com",
            password="AdminPassword123",
            role="HOSPITAL_ADMIN",
            first_name="Hospital",
            last_name="Admin",
        )
        self.receptionist_user = User.objects.create_user(
            username="receptionist_user",
            email="receptionist@hospital.com",
            password="RecepPassword123",
            role="RECEPTIONIST",
            first_name="Rita",
            last_name="Reception",
        )
        self.doctor_user1 = User.objects.create_user(
            username="dr_john",
            email="john@hospital.com",
            password="DoctorPassword123",
            role="DOCTOR",
            first_name="John",
            last_name="Doe",
        )
        self.doctor_user2 = User.objects.create_user(
            username="dr_sarah",
            email="sarah@hospital.com",
            password="DoctorPassword123",
            role="DOCTOR",
            first_name="Sarah",
            last_name="Connor",
        )
        self.nurse_user = User.objects.create_user(
            username="nurse_nancy",
            email="nancy@hospital.com",
            password="NursePassword123",
            role="NURSE",
            first_name="Nancy",
            last_name="Nurse",
        )
        self.accountant_user = User.objects.create_user(
            username="accountant_alex",
            email="alex@hospital.com",
            password="AccountantPassword123",
            role="ACCOUNTANT",
            first_name="Alex",
            last_name="Accountant",
        )
        self.patient_user1 = User.objects.create_user(
            username="patient_alice",
            email="alice@patient.com",
            password="PatientPassword123",
            role="PATIENT",
            first_name="Alice",
            last_name="Wonderland",
        )
        self.patient_user2 = User.objects.create_user(
            username="patient_bob",
            email="bob@patient.com",
            password="PatientPassword123",
            role="PATIENT",
            first_name="Bob",
            last_name="Builder",
        )

        # 2. Hospital & Department
        self.hospital = Hospital.objects.create(
            name="General Medical Center",
            registration_number="HOSP-APT-001",
            address="100 Medical Blvd",
            city="Metropolis",
            state="State",
            postal_code="123456",
            phone="9876543210",
            email="contact@gmc.com",
            is_active=True,
        )
        self.department = Department.objects.create(
            hospital=self.hospital,
            name="Cardiology",
            code="CARD",
            is_active=True,
        )

        # 3. Doctors
        self.doctor1 = Doctor.objects.create(
            user=self.doctor_user1,
            hospital=self.hospital,
            department=self.department,
            doctor_id="DOC-CARD-001",
            specialization="Cardiologist",
            license_number="LIC-CARD-001",
            qualification="MD Cardiology",
            experience_years=10,
            consultation_fee=150.00,
            is_available=True,
        )
        self.doctor2 = Doctor.objects.create(
            user=self.doctor_user2,
            hospital=self.hospital,
            department=self.department,
            doctor_id="DOC-CARD-002",
            specialization="Cardiologist",
            license_number="LIC-CARD-002",
            qualification="MBBS, MD",
            experience_years=6,
            consultation_fee=120.00,
            is_available=True,
        )

        # 4. Patients
        self.patient1 = Patient.objects.create(
            user=self.patient_user1,
            hospital=self.hospital,
            date_of_birth="1990-01-01",
            gender="FEMALE",
            blood_group="O+",
            phone="9876543201",
            address="123 Wonderland Ave",
            emergency_contact_name="King of Hearts",
            emergency_contact_relationship="Father",
            emergency_contact_phone="9876543202",
        )
        self.patient2 = Patient.objects.create(
            user=self.patient_user2,
            hospital=self.hospital,
            date_of_birth="1985-06-15",
            gender="MALE",
            blood_group="A+",
            phone="9876543203",
            address="456 Builder Way",
            emergency_contact_name="Wendy",
            emergency_contact_relationship="Partner",
            emergency_contact_phone="9876543204",
        )

        # 5. Doctor 1 Availability (Every day from 09:00 to 13:00, 30 min slots)
        self.availabilities = []
        for day in range(7):
            avail = DoctorAvailability.objects.create(
                doctor=self.doctor1,
                day_of_week=day,
                start_time=datetime.time(9, 0),
                end_time=datetime.time(13, 0),
                slot_duration=30,
                is_active=True,
            )
            self.availabilities.append(avail)

        # Future target date (always a future date)
        self.target_date = (timezone.now() + datetime.timedelta(days=7)).date()


class DoctorAvailabilityTests(BaseAppointmentTestCase):

    def test_availability_end_time_must_be_later_than_start_time(self):
        avail = DoctorAvailability(
            doctor=self.doctor2,
            day_of_week=DoctorAvailability.DayOfWeek.MONDAY,
            start_time=datetime.time(14, 0),
            end_time=datetime.time(10, 0),
            slot_duration=30,
        )
        with self.assertRaises(ValidationError) as ctx:
            avail.clean()
        self.assertIn("end_time", ctx.exception.message_dict)

    def test_availability_slot_duration_validation(self):
        avail = DoctorAvailability(
            doctor=self.doctor2,
            day_of_week=DoctorAvailability.DayOfWeek.MONDAY,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(12, 0),
            slot_duration=25,  # 25 is not in [10, 15, 20, 30, 45, 60]
        )
        with self.assertRaises(ValidationError) as ctx:
            avail.clean()
        self.assertIn("slot_duration", ctx.exception.message_dict)

    def test_availability_interval_must_fit_slot_duration(self):
        avail = DoctorAvailability(
            doctor=self.doctor2,
            day_of_week=DoctorAvailability.DayOfWeek.MONDAY,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(9, 20),
            slot_duration=30,  # 20 min interval cannot fit 30 min slot
        )
        with self.assertRaises(ValidationError) as ctx:
            avail.clean()
        self.assertIn("slot_duration", ctx.exception.message_dict)

    def test_overlapping_availability_rejected(self):
        DoctorAvailability.objects.create(
            doctor=self.doctor2,
            day_of_week=DoctorAvailability.DayOfWeek.MONDAY,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(12, 0),
            slot_duration=30,
        )
        overlap = DoctorAvailability(
            doctor=self.doctor2,
            day_of_week=DoctorAvailability.DayOfWeek.MONDAY,
            start_time=datetime.time(11, 0),
            end_time=datetime.time(14, 0),
            slot_duration=30,
        )
        with self.assertRaises(ValidationError):
            overlap.clean()

    def test_doctor_can_create_own_availability_via_api(self):
        self.client.force_authenticate(user=self.doctor_user2)
        url = reverse("doctor-availability-list")
        payload = {
            "doctor": self.doctor2.id,
            "day_of_week": DoctorAvailability.DayOfWeek.WEDNESDAY,
            "start_time": "14:00:00",
            "end_time": "17:00:00",
            "slot_duration": 30,
            "is_active": True,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["doctor"], self.doctor2.id)

    def test_doctor_cannot_manage_another_doctors_availability(self):
        self.client.force_authenticate(user=self.doctor_user2)
        url = reverse("doctor-availability-list")
        payload = {
            "doctor": self.doctor1.id,  # Trying to set Doctor 1's schedule
            "day_of_week": DoctorAvailability.DayOfWeek.TUESDAY,
            "start_time": "10:00:00",
            "end_time": "12:00:00",
            "slot_duration": 30,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AppointmentBookingAndServiceTests(BaseAppointmentTestCase):

    def test_booking_auto_generates_reference_and_defaults(self):
        apt = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            appointment_date=self.target_date,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(9, 30),
            reason_for_visit="Routine cardiac checkup",
        )
        self.assertTrue(apt.appointment_reference.startswith("APT-"))
        self.assertEqual(apt.hospital, self.hospital)
        self.assertEqual(apt.department, self.department)
        self.assertEqual(apt.status, Appointment.Status.PENDING)

    def test_booking_in_the_past_rejected(self):
        past_date = (timezone.now() - datetime.timedelta(days=2)).date()
        with self.assertRaises(ValidationError) as ctx:
            validate_booking(
                doctor=self.doctor1,
                patient=self.patient1,
                appointment_date=past_date,
                start_time=datetime.time(9, 0),
                end_time=datetime.time(9, 30),
            )
        self.assertIn("appointment_date", ctx.exception.message_dict)

    def test_booking_outside_doctor_availability_rejected(self):
        with self.assertRaises(ValidationError) as ctx:
            validate_booking(
                doctor=self.doctor1,
                patient=self.patient1,
                appointment_date=self.target_date,
                start_time=datetime.time(14, 0),  # Doctor 1 works 09:00 - 13:00
                end_time=datetime.time(14, 30),
            )
        self.assertIn("time_slot", ctx.exception.message_dict)

    def test_booking_misaligned_slot_rejected(self):
        with self.assertRaises(ValidationError) as ctx:
            validate_booking(
                doctor=self.doctor1,
                patient=self.patient1,
                appointment_date=self.target_date,
                start_time=datetime.time(9, 15),  # 15m offset when slot duration is 30m
                end_time=datetime.time(9, 45),
            )
        self.assertIn("time_slot", ctx.exception.message_dict)

    def test_doctor_double_booking_rejected(self):
        Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            appointment_date=self.target_date,
            start_time=datetime.time(9, 30),
            end_time=datetime.time(10, 0),
            reason_for_visit="First visit",
        )
        # Attempt to book doctor 1 with patient 2 at same time
        with self.assertRaises(ValidationError) as ctx:
            validate_booking(
                doctor=self.doctor1,
                patient=self.patient2,
                appointment_date=self.target_date,
                start_time=datetime.time(9, 30),
                end_time=datetime.time(10, 0),
            )
        self.assertIn("time_slot", ctx.exception.message_dict)

    def test_patient_double_booking_rejected(self):
        # Patient 1 books with doctor 1
        Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            appointment_date=self.target_date,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(10, 30),
            reason_for_visit="Doctor 1 consultation",
        )
        # Also give Doctor 2 availability at that time
        weekday = self.target_date.weekday()
        DoctorAvailability.objects.create(
            doctor=self.doctor2,
            day_of_week=weekday,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(11, 0),
            slot_duration=30,
        )
        # Patient 1 attempts to book Doctor 2 at the same time
        with self.assertRaises(ValidationError) as ctx:
            validate_booking(
                doctor=self.doctor2,
                patient=self.patient1,
                appointment_date=self.target_date,
                start_time=datetime.time(10, 0),
                end_time=datetime.time(10, 30),
            )
        self.assertIn("patient", ctx.exception.message_dict)

    def test_cancelled_appointment_frees_slot_for_booking(self):
        cancelled_apt = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            appointment_date=self.target_date,
            start_time=datetime.time(11, 0),
            end_time=datetime.time(11, 30),
            status=Appointment.Status.CANCELLED,
            reason_for_visit="Cancelled consultation",
        )
        # Booking the same slot now succeeds because previous is CANCELLED
        validate_booking(
            doctor=self.doctor1,
            patient=self.patient2,
            appointment_date=self.target_date,
            start_time=datetime.time(11, 0),
            end_time=datetime.time(11, 30),
        )


class AppointmentWorkflowAndTransitionsTests(BaseAppointmentTestCase):

    def setUp(self):
        super().setUp()
        self.appointment = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            appointment_date=self.target_date,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(9, 30),
            reason_for_visit="Chest discomfort",
            status=Appointment.Status.PENDING,
        )

    def test_full_lifecycle_transitions_and_history(self):
        # 1. PENDING -> CONFIRMED
        apt = transition_appointment_status(
            appointment=self.appointment,
            new_status=Appointment.Status.CONFIRMED,
            user=self.receptionist_user,
            reason="Confirmed by front desk",
        )
        self.assertEqual(apt.status, Appointment.Status.CONFIRMED)

        # 2. CONFIRMED -> CHECKED_IN
        apt = transition_appointment_status(
            appointment=apt,
            new_status=Appointment.Status.CHECKED_IN,
            user=self.nurse_user,
            reason="Patient arrived at triage",
        )
        self.assertEqual(apt.status, Appointment.Status.CHECKED_IN)

        # 3. CHECKED_IN -> IN_PROGRESS
        apt = transition_appointment_status(
            appointment=apt,
            new_status=Appointment.Status.IN_PROGRESS,
            user=self.doctor_user1,
            reason="Consultation started",
        )
        self.assertEqual(apt.status, Appointment.Status.IN_PROGRESS)

        # 4. IN_PROGRESS -> COMPLETED
        apt = transition_appointment_status(
            appointment=apt,
            new_status=Appointment.Status.COMPLETED,
            user=self.doctor_user1,
            reason="Consultation finished with prescription",
        )
        self.assertEqual(apt.status, Appointment.Status.COMPLETED)

        # Verify audit history length and entries
        history = AppointmentStatusHistory.objects.filter(appointment=apt).order_by("created_at")
        self.assertEqual(history.count(), 4)
        self.assertEqual(history[0].previous_status, Appointment.Status.PENDING)
        self.assertEqual(history[0].new_status, Appointment.Status.CONFIRMED)
        self.assertEqual(history[3].previous_status, Appointment.Status.IN_PROGRESS)
        self.assertEqual(history[3].new_status, Appointment.Status.COMPLETED)

    def test_invalid_transition_rejected(self):
        # PENDING directly to COMPLETED is forbidden
        with self.assertRaises(ValidationError):
            transition_appointment_status(
                appointment=self.appointment,
                new_status=Appointment.Status.COMPLETED,
                user=self.doctor_user1,
            )

    def test_cancel_workflow_updates_metadata(self):
        apt = transition_appointment_status(
            appointment=self.appointment,
            new_status=Appointment.Status.CANCELLED,
            user=self.patient_user1,
            reason="Personal emergency",
        )
        self.assertEqual(apt.status, Appointment.Status.CANCELLED)
        self.assertIsNotNone(apt.cancelled_at)
        self.assertEqual(apt.cancelled_by, self.patient_user1)
        self.assertEqual(apt.cancellation_reason, "Personal emergency")


class AppointmentAPIAndRBACTests(BaseAppointmentTestCase):

    def setUp(self):
        super().setUp()
        self.appointment = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            appointment_date=self.target_date,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(9, 30),
            reason_for_visit="Hypertension review",
            patient_notes="Feeling occasional dizziness",
            staff_notes="Patient is VIP",
            status=Appointment.Status.PENDING,
        )
        self.list_url = reverse("appointment-list")
        self.detail_url = reverse("appointment-detail", kwargs={"pk": self.appointment.pk})
        self.my_url = reverse("appointment-my")

    def test_patient_can_book_appointment_for_themselves(self):
        self.client.force_authenticate(user=self.patient_user1)
        payload = {
            "doctor": self.doctor1.id,
            "appointment_date": str(self.target_date),
            "start_time": "10:00:00",
            "end_time": "10:30:00",
            "reason_for_visit": "Annual checkup",
            "patient_notes": "None",
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["patient"], self.patient1.id)
        self.assertEqual(response.data["booked_by_username"], self.patient_user1.username)

    def test_patient_cannot_book_for_another_patient(self):
        self.client.force_authenticate(user=self.patient_user1)
        payload = {
            "patient": self.patient2.id,  # Other patient
            "doctor": self.doctor1.id,
            "appointment_date": str(self.target_date),
            "start_time": "10:30:00",
            "end_time": "11:00:00",
            "reason_for_visit": "Unauthorized booking",
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_notes_are_hidden_from_patient(self):
        self.client.force_authenticate(user=self.patient_user1)
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("staff_notes", response.data)

        # But visible to doctor
        self.client.force_authenticate(user=self.doctor_user1)
        doc_resp = self.client.get(self.detail_url)
        self.assertEqual(doc_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(doc_resp.data["staff_notes"], "Patient is VIP")

    def test_patient_can_view_own_appointments_only(self):
        other_apt = Appointment.objects.create(
            patient=self.patient2,
            doctor=self.doctor1,
            appointment_date=self.target_date,
            start_time=datetime.time(11, 30),
            end_time=datetime.time(12, 0),
            reason_for_visit="Patient 2 checkup",
        )
        self.client.force_authenticate(user=self.patient_user1)

        # GET detail of own
        resp_own = self.client.get(self.detail_url)
        self.assertEqual(resp_own.status_code, status.HTTP_200_OK)

        # GET detail of other patient
        other_url = reverse("appointment-detail", kwargs={"pk": other_apt.pk})
        resp_other = self.client.get(other_url)
        self.assertEqual(resp_other.status_code, status.HTTP_404_NOT_FOUND)

    def test_patient_can_cancel_own_appointment(self):
        self.client.force_authenticate(user=self.patient_user1)
        cancel_url = reverse("appointment-cancel", kwargs={"pk": self.appointment.pk})
        payload = {"cancellation_reason": "Unable to attend"}
        response = self.client.post(cancel_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Appointment.Status.CANCELLED)

    def test_patient_cannot_start_or_confirm_appointment(self):
        self.client.force_authenticate(user=self.patient_user1)
        confirm_url = reverse("appointment-confirm", kwargs={"pk": self.appointment.pk})
        resp = self.client.post(confirm_url, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_receptionist_workflow_confirm_and_reschedule(self):
        self.client.force_authenticate(user=self.receptionist_user)

        # Confirm
        confirm_url = reverse("appointment-confirm", kwargs={"pk": self.appointment.pk})
        resp_confirm = self.client.post(confirm_url, {}, format="json")
        self.assertEqual(resp_confirm.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_confirm.data["status"], Appointment.Status.CONFIRMED)

        # Reschedule
        reschedule_url = reverse("appointment-reschedule", kwargs={"pk": self.appointment.pk})
        payload = {
            "appointment_date": str(self.target_date),
            "start_time": "12:00:00",
            "end_time": "12:30:00",
        }
        resp_resched = self.client.post(reschedule_url, payload, format="json")
        self.assertEqual(resp_resched.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_resched.data["start_time"], "12:00:00")

    def test_nurse_can_check_in_patient(self):
        # Move to CONFIRMED first
        self.appointment.status = Appointment.Status.CONFIRMED
        self.appointment.save()

        self.client.force_authenticate(user=self.nurse_user)
        check_in_url = reverse("appointment-check-in", kwargs={"pk": self.appointment.pk})
        resp = self.client.post(check_in_url, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], Appointment.Status.CHECKED_IN)

    def test_doctor_clinical_workflow_start_and_complete(self):
        # Move to CHECKED_IN
        self.appointment.status = Appointment.Status.CHECKED_IN
        self.appointment.save()

        self.client.force_authenticate(user=self.doctor_user1)

        # Start
        start_url = reverse("appointment-start", kwargs={"pk": self.appointment.pk})
        resp_start = self.client.post(start_url, {}, format="json")
        self.assertEqual(resp_start.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_start.data["status"], Appointment.Status.IN_PROGRESS)

        # Complete
        complete_url = reverse("appointment-complete", kwargs={"pk": self.appointment.pk})
        resp_complete = self.client.post(complete_url, {}, format="json")
        self.assertEqual(resp_complete.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_complete.data["status"], Appointment.Status.COMPLETED)

    def test_unauthorized_role_denied_access(self):
        self.client.force_authenticate(user=self.accountant_user)
        resp = self.client.get(self.list_url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class AvailableSlotsAPITests(BaseAppointmentTestCase):

    def test_get_available_slots_returns_correct_intervals(self):
        # Target date doctor 1 availability is 09:00 - 13:00 (8 slots of 30 mins)
        # Pre-book 09:30 - 10:00
        Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            appointment_date=self.target_date,
            start_time=datetime.time(9, 30),
            end_time=datetime.time(10, 0),
            reason_for_visit="Checkup",
        )

        self.client.force_authenticate(user=self.patient_user1)
        url = reverse("appointment-available-slots")
        response = self.client.get(
            url,
            {"doctor_id": self.doctor1.id, "date": str(self.target_date)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slots = response.data
        self.assertEqual(len(slots), 7)  # 8 total slots - 1 booked = 7

        slot_starts = [s["start_time"] for s in slots]
        self.assertIn("09:00:00", slot_starts)
        self.assertNotIn("09:30:00", slot_starts)
        self.assertIn("10:00:00", slot_starts)

    def test_available_slots_missing_parameters_returns_400(self):
        self.client.force_authenticate(user=self.patient_user1)
        url = reverse("appointment-available-slots")
        resp = self.client.get(url, {"doctor_id": self.doctor1.id})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

