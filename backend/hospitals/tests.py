from decimal import Decimal
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Department,
    Doctor,
    Hospital,
    Staff,
)


User = get_user_model()


class HospitalStructureTests(APITestCase):

    def setUp(self):
        # Create users with different roles
        self.admin_user = User.objects.create_user(
            username="admin_user",
            email="admin@hospital.com",
            password="AdminPassword123",
            role="HOSPITAL_ADMIN",
        )
        self.doctor_user = User.objects.create_user(
            username="doctor_user",
            email="doctor@hospital.com",
            password="DoctorPassword123",
            role="DOCTOR",
            first_name="Gregory",
            last_name="House",
        )
        self.nurse_user = User.objects.create_user(
            username="nurse_user",
            email="nurse@hospital.com",
            password="NursePassword123",
            role="NURSE",
            first_name="Florence",
            last_name="Nightingale",
        )
        self.patient_user = User.objects.create_user(
            username="patient_user",
            email="patient@hospital.com",
            password="PatientPassword123",
            role="PATIENT",
        )

        # Hospital data
        self.hospital_data = {
            "name": "City Care Hospital",
            "registration_number": "HOSP-2026-001",
            "address": "MG Road",
            "city": "Kochi",
            "state": "Kerala",
            "postal_code": "682016",
            "phone": "9876543210",
            "email": "info@citycare.com",
            "website": "https://citycare.com",
            "is_active": True,
        }

    # ==================== HOSPITAL TESTS ====================

    def test_create_hospital_by_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("hospital-list")
        response = self.client.post(url, self.hospital_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "City Care Hospital")
        self.assertTrue(
            Hospital.objects.filter(registration_number="HOSP-2026-001").exists()
        )

    def test_create_hospital_by_patient_forbidden(self):
        self.client.force_authenticate(user=self.patient_user)
        url = reverse("hospital-list")
        response = self.client.post(url, self.hospital_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_hospital_by_doctor_forbidden(self):
        self.client.force_authenticate(user=self.doctor_user)
        url = reverse("hospital-list")
        response = self.client.post(url, self.hospital_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_hospital_by_authenticated_user(self):
        hospital = Hospital.objects.create(**self.hospital_data)
        self.client.force_authenticate(user=self.patient_user)
        url = reverse("hospital-detail", args=[hospital.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "City Care Hospital")

    def test_update_hospital_by_admin(self):
        hospital = Hospital.objects.create(**self.hospital_data)
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("hospital-detail", args=[hospital.id])
        response = self.client.patch(url, {"city": "Ernakulam"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["city"], "Ernakulam")

    def test_delete_hospital_by_admin(self):
        hospital = Hospital.objects.create(**self.hospital_data)
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("hospital-detail", args=[hospital.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Hospital.objects.filter(id=hospital.id).exists())

    # ==================== DEPARTMENT TESTS ====================

    def test_create_department_success(self):
        hospital = Hospital.objects.create(**self.hospital_data)
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("department-list")
        dept_data = {
            "hospital": hospital.id,
            "name": "Cardiology",
            "code": "CARD",
            "description": "Cardiovascular care.",
            "phone": "9876543211",
            "location": "Block A",
            "is_active": True,
        }
        response = self.client.post(url, dept_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["hospital_name"], "City Care Hospital")

    def test_duplicate_department_code_per_hospital_fails(self):
        hospital = Hospital.objects.create(**self.hospital_data)
        Department.objects.create(
            hospital=hospital,
            name="Cardiology",
            code="CARD",
        )
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("department-list")
        duplicate_data = {
            "hospital": hospital.id,
            "name": "Cardiac Surgery",
            "code": "CARD",
        }
        response = self.client.post(url, duplicate_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ==================== DOCTOR TESTS ====================

    def test_create_doctor_profile_success(self):
        hospital = Hospital.objects.create(**self.hospital_data)
        department = Department.objects.create(
            hospital=hospital,
            name="Cardiology",
            code="CARD",
        )
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("doctor-list")
        doctor_payload = {
            "user": self.doctor_user.id,
            "hospital": hospital.id,
            "department": department.id,
            "doctor_id": "DOC-2026-0001",
            "specialization": "Cardiology",
            "license_number": "KER-MED-10001",
            "qualification": "MBBS, MD Cardiology",
            "experience_years": 8,
            "consultation_fee": "700.00",
            "bio": "Experienced cardiologist.",
            "is_available": True,
        }
        response = self.client.post(url, doctor_payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["doctor_name"], "Gregory House")
        self.assertEqual(response.data["email"], "doctor@hospital.com")
        self.assertEqual(response.data["department_name"], "Cardiology")

    def test_duplicate_doctor_id_fails(self):
        hospital = Hospital.objects.create(**self.hospital_data)
        department = Department.objects.create(
            hospital=hospital,
            name="Cardiology",
            code="CARD",
        )
        Doctor.objects.create(
            user=self.doctor_user,
            hospital=hospital,
            department=department,
            doctor_id="DOC-2026-0001",
            specialization="Cardiology",
            license_number="LIC-001",
            qualification="MBBS",
            consultation_fee=Decimal("500.00"),
        )
        second_doc_user = User.objects.create_user(
            username="doc2",
            email="doc2@hospital.com",
            password="DocPassword123",
            role="DOCTOR",
        )
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("doctor-list")
        payload = {
            "user": second_doc_user.id,
            "hospital": hospital.id,
            "department": department.id,
            "doctor_id": "DOC-2026-0001",  # duplicate doctor_id
            "specialization": "Neurology",
            "license_number": "LIC-002",
            "qualification": "MBBS",
            "consultation_fee": "600.00",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_doctor_license_fails(self):
        hospital = Hospital.objects.create(**self.hospital_data)
        department = Department.objects.create(
            hospital=hospital,
            name="Cardiology",
            code="CARD",
        )
        Doctor.objects.create(
            user=self.doctor_user,
            hospital=hospital,
            department=department,
            doctor_id="DOC-2026-0001",
            specialization="Cardiology",
            license_number="LIC-UNIQUE-01",
            qualification="MBBS",
            consultation_fee=Decimal("500.00"),
        )
        second_doc_user = User.objects.create_user(
            username="doc3",
            email="doc3@hospital.com",
            password="DocPassword123",
            role="DOCTOR",
        )
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("doctor-list")
        payload = {
            "user": second_doc_user.id,
            "hospital": hospital.id,
            "department": department.id,
            "doctor_id": "DOC-2026-0002",
            "specialization": "Neurology",
            "license_number": "LIC-UNIQUE-01",  # duplicate license
            "qualification": "MBBS",
            "consultation_fee": "600.00",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ==================== STAFF TESTS ====================

    def test_create_staff_success(self):
        hospital = Hospital.objects.create(**self.hospital_data)
        department = Department.objects.create(
            hospital=hospital,
            name="General",
            code="GEN",
        )
        self.client.force_authenticate(user=self.admin_user)
        url = reverse("staff-list")
        staff_payload = {
            "user": self.nurse_user.id,
            "hospital": hospital.id,
            "department": department.id,
            "employee_id": "EMP-2026-0001",
            "designation": "Head Nurse",
            "joining_date": "2026-10-06",
            "is_active": True,
        }
        response = self.client.post(url, staff_payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["staff_name"], "Florence Nightingale")
        self.assertEqual(response.data["employee_id"], "EMP-2026-0001")

    # ==================== FILTERING & SEARCH TESTS ====================

    def test_doctor_filtering_search_and_ordering(self):
        hospital = Hospital.objects.create(**self.hospital_data)
        cardio = Department.objects.create(
            hospital=hospital,
            name="Cardiology",
            code="CARD",
        )
        neuro = Department.objects.create(
            hospital=hospital,
            name="Neurology",
            code="NEUR",
        )
        Doctor.objects.create(
            user=self.doctor_user,
            hospital=hospital,
            department=cardio,
            doctor_id="DOC-CARD-01",
            specialization="Cardiology",
            license_number="LIC-CARD-01",
            qualification="MBBS, MD",
            experience_years=10,
            consultation_fee=Decimal("1000.00"),
        )
        doc2 = User.objects.create_user(
            username="doc_neuro",
            email="neuro@hospital.com",
            password="DocPassword123",
            role="DOCTOR",
            first_name="Derek",
            last_name="Shepherd",
        )
        Doctor.objects.create(
            user=doc2,
            hospital=hospital,
            department=neuro,
            doctor_id="DOC-NEUR-01",
            specialization="Neurology",
            license_number="LIC-NEUR-01",
            qualification="MBBS, MCh",
            experience_years=5,
            consultation_fee=Decimal("500.00"),
        )

        self.client.force_authenticate(user=self.patient_user)

        # 1. Filter by department
        url = f"{reverse('doctor-list')}?department={cardio.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["doctor_id"], "DOC-CARD-01")

        # 2. Search by specialization
        search_url = f"{reverse('doctor-list')}?search=Neurology"
        search_resp = self.client.get(search_url)
        self.assertEqual(search_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(search_resp.data), 1)
        self.assertEqual(search_resp.data[0]["doctor_id"], "DOC-NEUR-01")

        # 3. Order by consultation_fee ascending
        order_url = f"{reverse('doctor-list')}?ordering=consultation_fee"
        order_resp = self.client.get(order_url)
        self.assertEqual(order_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(order_resp.data), 2)
        self.assertEqual(order_resp.data[0]["doctor_id"], "DOC-NEUR-01")  # 500.00
        self.assertEqual(order_resp.data[1]["doctor_id"], "DOC-CARD-01")  # 1000.00
