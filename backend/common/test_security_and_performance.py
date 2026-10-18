"""
Security Boundaries and Query Count Performance Profiling Test Suite.
Verifies role-based access control (RBAC), multi-tenant data isolation,
and bounded query execution (N+1 query detection) via assertNumQueries.
"""

from datetime import date, time, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from appointments.models import Appointment
from billing.models import Invoice, InvoiceLineItem, ServiceItem
from hospitals.models import Department, Doctor, Hospital, Staff
from laboratory.models import LabOrder, LabOrderItem, LabTest
from medical_records.models import ClinicalEncounter, ClinicalNote
from patients.models import Patient
from pharmacy.models import Medicine, MedicineBatch, PharmacyLocation, Prescription

User = get_user_model()


class SecurityBoundaryAndQueryPerformanceTests(TestCase):
    """
    Evaluates role authorization boundaries and profiles database query counts.
    """

    def setUp(self):
        self.client = APIClient()

        # Users
        self.admin = User.objects.create_user(
            username="sec_admin",
            email="admin@cityhospital.org",
            password="Password123",
            role=User.Role.HOSPITAL_ADMIN,
        )

        self.doctor_user = User.objects.create_user(
            username="sec_doctor",
            email="doctor@cityhospital.org",
            password="Password123",
            role=User.Role.DOCTOR,
        )

        self.receptionist = User.objects.create_user(
            username="sec_recep",
            email="recep@cityhospital.org",
            password="Password123",
            role=User.Role.RECEPTIONIST,
        )

        self.accountant = User.objects.create_user(
            username="sec_acct",
            email="acct@cityhospital.org",
            password="Password123",
            role=User.Role.ACCOUNTANT,
        )

        self.patient_a_user = User.objects.create_user(
            username="pat_alice",
            email="alice@gmail.com",
            password="Password123",
            role=User.Role.PATIENT,
        )

        self.patient_b_user = User.objects.create_user(
            username="pat_bob",
            email="bob@gmail.com",
            password="Password123",
            role=User.Role.PATIENT,
        )

        # Hospital & Doctor
        self.hospital = Hospital.objects.create(
            name="City Central Hospital",
            registration_number="HOSP-CITY-001",
            phone="011-44556677",
            email="info@cityhospital.org",
            address="50 MG Road",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560001",
            is_active=True,
        )

        self.dept = Department.objects.create(
            hospital=self.hospital,
            name="General Medicine",
            code="GENMED",
            is_active=True,
        )

        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            hospital=self.hospital,
            department=self.dept,
            doctor_id="DOC-GM-100",
            specialization="General Physician",
            license_number="KMC-9988-BLR",
            qualification="MBBS, MD",
            consultation_fee=Decimal("500.00"),
            is_available=True,
        )

        # Patients
        self.patient_a = Patient.objects.create(
            user=self.patient_a_user,
            hospital=self.hospital,
            mrn="MRN-ALICE-01",
            date_of_birth=date(1992, 4, 10),
            gender="FEMALE",
            phone="9811111111",
        )

        self.patient_b = Patient.objects.create(
            user=self.patient_b_user,
            hospital=self.hospital,
            mrn="MRN-BOB-02",
            date_of_birth=date(1988, 8, 20),
            gender="MALE",
            phone="9822222222",
        )

        # Data for Patient B
        self.encounter_b = ClinicalEncounter.objects.create(
            patient=self.patient_b,
            doctor=self.doctor,
            hospital=self.hospital,
            department=self.dept,
            encounter_date=timezone.now().date(),
            start_time=timezone.now(),
            encounter_type=ClinicalEncounter.EncounterType.OUTPATIENT,
            chief_complaint="Persistent dry cough",
            status=ClinicalEncounter.Status.OPEN,
            created_by=self.doctor_user,
        )

        self.note_b = ClinicalNote.objects.create(
            encounter=self.encounter_b,
            author=self.doctor_user,
            note_type=ClinicalNote.NoteType.SOAP,
            subjective="Bob describes nocturnal coughing spasms.",
            objective="Chest clear to auscultation.",
            assessment="Post-viral bronchospasm.",
            plan="Inhaler prescription.",
            is_patient_visible=True,
            status=ClinicalNote.Status.SIGNED,
            signed_by=self.doctor_user,
            signed_at=timezone.now(),
        )

        self.invoice_b = Invoice.objects.create(
            patient=self.patient_b,
            hospital=self.hospital,
            status=Invoice.Status.ISSUED,
            total_amount=Decimal("500.00"),
            balance_due=Decimal("500.00"),
        )

    # -----------------------------------------------------------------
    # NEGATIVE AUTHORIZATION TESTS
    # -----------------------------------------------------------------

    def test_patient_cannot_view_other_patient_encounter(self):
        """
        Patient A must be forbidden from accessing Patient B's clinical encounter.
        """
        self.client.force_authenticate(user=self.patient_a_user)
        url = reverse("encounter-detail", kwargs={"pk": self.encounter_b.pk})
        response = self.client.get(url)
        # Should be 404 (due to get_queryset isolation) or 403
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

    def test_patient_cannot_view_other_patient_invoice(self):
        """
        Patient A must be forbidden from accessing Patient B's invoice.
        """
        self.client.force_authenticate(user=self.patient_a_user)
        url = reverse("billing-invoice-detail", kwargs={"pk": self.invoice_b.pk})
        response = self.client.get(url)
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

    def test_receptionist_cannot_access_clinical_notes(self):
        """
        Receptionist must be denied access to detailed clinical SOAP notes.
        """
        self.client.force_authenticate(user=self.receptionist)
        url = reverse("clinical-note-detail", kwargs={"pk": self.note_b.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_accountant_cannot_void_invoice(self):
        """
        Doctor or receptionist attempting to void an invoice must be rejected (403).
        """
        self.client.force_authenticate(user=self.doctor_user)
        url = reverse("billing-invoice-void", kwargs={"pk": self.invoice_b.pk})
        response = self.client.post(url, {"reason": "Doctor trying to cancel invoice"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_accountant_can_void_invoice(self):
        """
        Authorized accountant can successfully void an unpaid invoice.
        """
        self.client.force_authenticate(user=self.accountant)
        url = reverse("billing-invoice-void", kwargs={"pk": self.invoice_b.pk})
        response = self.client.post(url, {"reason": "Incorrect billing item code entered"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.invoice_b.refresh_from_db()
        self.assertEqual(self.invoice_b.status, Invoice.Status.VOID)

    # -----------------------------------------------------------------
    # QUERY PERFORMANCE AND N+1 QUERY DETECTION
    # -----------------------------------------------------------------

    def test_query_count_listing_patients(self):
        """
        Verifies that listing patients executes a minimal, bounded number of queries
        with no N+1 query degradation across foreign keys (user, hospital).
        """
        # Create additional patients to test scaling
        for i in range(5):
            u = User.objects.create_user(
                username=f"perf_user_{i}",
                email=f"perf_{i}@example.com",
                password="Password123",
                role=User.Role.PATIENT,
            )
            Patient.objects.create(
                user=u,
                hospital=self.hospital,
                mrn=f"MRN-PERF-0{i}",
                date_of_birth=date(1990, 1, 1),
                gender="MALE",
                phone=f"900000000{i}",
            )

        self.client.force_authenticate(user=self.admin)
        url = reverse("patient-list")

        # Query budget:
        # 1: COUNT query for pagination
        # 2: SELECT patients with select_related('user', 'hospital')
        with self.assertNumQueries(2):
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertGreaterEqual(len(response.data["results"]), 5)

    def test_query_count_listing_appointments(self):
        """
        Verifies that listing appointments executes a minimal, bounded query count
        with select_related on patient, doctor, hospital, and department.
        """
        tomorrow = timezone.now().date() + timedelta(days=2)
        for i in range(5):
            Appointment.objects.create(
                patient=self.patient_a,
                doctor=self.doctor,
                hospital=self.hospital,
                department=self.dept,
                appointment_date=tomorrow,
                start_time=time(9 + i, 0),
                end_time=time(9 + i, 30),
                reason_for_visit="Routine appointment follow-up",
                status=Appointment.Status.CONFIRMED,
                booked_by=self.doctor_user,
            )

        self.client.force_authenticate(user=self.admin)
        url = reverse("appointment-list")

        # Query budget:
        # 1: COUNT query for pagination
        # 2: SELECT appointments with select_related
        with self.assertNumQueries(2):
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertGreaterEqual(len(response.data["results"]), 5)

    def test_query_count_listing_invoices(self):
        """
        Verifies that listing invoices with pre-fetched line items and allocations
        does not cause N+1 query explosions.
        """
        for i in range(4):
            inv = Invoice.objects.create(
                patient=self.patient_a,
                hospital=self.hospital,
                status=Invoice.Status.ISSUED,
                total_amount=Decimal("250.00"),
                balance_due=Decimal("250.00"),
            )
            InvoiceLineItem.objects.create(
                invoice=inv,
                service_code=f"SRV-{i}",
                description=f"Diagnostic Test {i}",
                quantity=Decimal("1.00"),
                unit_price=Decimal("250.00"),
                subtotal=Decimal("250.00"),
                total_amount=Decimal("250.00"),
            )

        self.client.force_authenticate(user=self.admin)
        url = reverse("billing-invoice-list")

        # Query budget:
        # 1: COUNT query for pagination
        # 2: SELECT invoices with select_related
        # 3: PREFETCH line items
        # 4: PREFETCH allocations
        with self.assertNumQueries(4):
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertGreaterEqual(len(response.data["results"]), 4)
