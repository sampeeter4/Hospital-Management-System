import datetime
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from hospitals.models import Hospital
from patients.models import Patient


User = get_user_model()


class PatientManagementTests(APITestCase):

    def setUp(self):
        # Create users with different roles
        self.admin_user = User.objects.create_user(
            username="admin_user",
            email="admin@hospital.com",
            password="AdminPassword123",
            role="HOSPITAL_ADMIN",
        )
        self.receptionist_user = User.objects.create_user(
            username="receptionist_user",
            email="receptionist@hospital.com",
            password="RecepPassword123",
            role="RECEPTIONIST",
        )
        self.doctor_user = User.objects.create_user(
            username="doctor_user",
            email="doctor@hospital.com",
            password="DoctorPassword123",
            role="DOCTOR",
        )
        self.nurse_user = User.objects.create_user(
            username="nurse_user",
            email="nurse@hospital.com",
            password="NursePassword123",
            role="NURSE",
        )
        self.accountant_user = User.objects.create_user(
            username="accountant_user",
            email="accountant@hospital.com",
            password="AccountantPassword123",
            role="ACCOUNTANT",
        )
        self.patient_user1 = User.objects.create_user(
            username="patient_one",
            email="patient1@hospital.com",
            password="PatientPassword123",
            role="PATIENT",
            first_name="Alice",
            last_name="Smith",
        )
        self.patient_user2 = User.objects.create_user(
            username="patient_two",
            email="patient2@hospital.com",
            password="PatientPassword123",
            role="PATIENT",
            first_name="Bob",
            last_name="Jones",
        )

        # Create Hospital
        self.hospital = Hospital.objects.create(
            name="City Care Hospital",
            registration_number="HOSP-PAT-001",
            address="Central Avenue",
            city="Metropolis",
            state="State",
            postal_code="123456",
            phone="9876543210",
            email="info@citycare.com",
        )

        self.patient_list_url = reverse("patient-list")
        self.patient_me_url = reverse("patient-me")

    # ==================== CREATION & MRN ====================

    def test_create_patient_by_admin_auto_generates_mrn(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "user": self.patient_user1.id,
            "hospital": self.hospital.id,
            "date_of_birth": "1990-05-15",
            "gender": "FEMALE",
            "blood_group": "A+",
            "phone": "9876543211",
            "address": "123 Main St",
            "city": "Metropolis",
            "emergency_contact_name": "Bob Smith",
            "emergency_contact_relationship": "Spouse",
            "emergency_contact_phone": "9876543212",
            "allergies": "Penicillin",
            "insurance_provider": "HealthCare Plus",
            "insurance_policy_number": "POL-12345",
            "insurance_member_id": "MEM-67890",
            "insurance_expiry_date": "2028-12-31",
        }
        response = self.client.post(self.patient_list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["mrn"].startswith("MRN-"))
        self.assertEqual(response.data["patient_name"], "Alice Smith")
        self.assertEqual(response.data["hospital_name"], "City Care Hospital")

    def test_create_patient_by_receptionist_success(self):
        self.client.force_authenticate(user=self.receptionist_user)
        payload = {
            "user": self.patient_user1.id,
            "hospital": self.hospital.id,
            "date_of_birth": "1992-08-20",
            "gender": "FEMALE",
            "blood_group": "O+",
        }
        response = self.client.post(self.patient_list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["mrn"].startswith("MRN-"))

    def test_future_date_of_birth_rejected(self):
        self.client.force_authenticate(user=self.admin_user)
        future_date = (timezone.now() + datetime.timedelta(days=10)).date().isoformat()
        payload = {
            "user": self.patient_user1.id,
            "date_of_birth": future_date,
            "gender": "FEMALE",
            "blood_group": "B+",
        }
        response = self.client.post(self.patient_list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date_of_birth", response.data)

    def test_missing_required_fields_rejected(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "user": self.patient_user1.id,
            # date_of_birth and gender missing
        }
        response = self.client.post(self.patient_list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date_of_birth", response.data)
        self.assertIn("gender", response.data)

    def test_duplicate_patient_profile_for_same_user_prevented(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "user": self.patient_user1.id,
            "date_of_birth": "1990-05-15",
            "gender": "FEMALE",
            "blood_group": "A+",
        }
        first_resp = self.client.post(self.patient_list_url, payload)
        self.assertEqual(first_resp.status_code, status.HTTP_201_CREATED)

        # Second attempt for same user
        second_resp = self.client.post(self.patient_list_url, payload)
        self.assertEqual(second_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("user", second_resp.data)

    # ==================== PERMISSIONS & ACCESS CONTROL ====================

    def test_unauthenticated_request_rejected(self):
        response = self.client.get(self.patient_list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patient_cannot_list_all_patients(self):
        self.client.force_authenticate(user=self.patient_user1)
        response = self.client.get(self.patient_list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_cannot_access_other_patient_record(self):
        patient2 = Patient.objects.create(
            user=self.patient_user2,
            hospital=self.hospital,
            date_of_birth="1985-03-20",
            gender="MALE",
            blood_group="B+",
        )
        # Authenticate as patient_one
        self.client.force_authenticate(user=self.patient_user1)
        detail_url = reverse("patient-detail", args=[patient2.id])
        response = self.client.get(detail_url)
        self.assertIn(
            response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND],
        )

    def test_patient_can_access_and_update_own_profile_via_me(self):
        Patient.objects.create(
            user=self.patient_user1,
            hospital=self.hospital,
            date_of_birth="1990-05-15",
            gender="FEMALE",
            blood_group="A+",
            phone="9876543210",
            address="Old Address",
        )
        self.client.force_authenticate(user=self.patient_user1)

        # GET /patients/me/
        get_resp = self.client.get(self.patient_me_url)
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(get_resp.data["username"], "patient_one")
        self.assertEqual(get_resp.data["address"], "Old Address")

        # PATCH /patients/me/
        patch_resp = self.client.patch(
            self.patient_me_url,
            {"address": "New Address", "allergies": "Sulfa drugs"},
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["address"], "New Address")
        self.assertEqual(patch_resp.data["allergies"], "Sulfa drugs")

    def test_doctor_and_nurse_can_view_patients_but_cannot_delete(self):
        patient = Patient.objects.create(
            user=self.patient_user1,
            hospital=self.hospital,
            date_of_birth="1990-05-15",
            gender="FEMALE",
            blood_group="A+",
        )
        detail_url = reverse("patient-detail", args=[patient.id])

        # Doctor read
        self.client.force_authenticate(user=self.doctor_user)
        list_resp = self.client.get(self.patient_list_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        detail_resp = self.client.get(detail_url)
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)

        # Doctor cannot delete
        delete_resp = self.client.delete(detail_url)
        self.assertEqual(delete_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Nurse read
        self.client.force_authenticate(user=self.nurse_user)
        nurse_resp = self.client.get(detail_url)
        self.assertEqual(nurse_resp.status_code, status.HTTP_200_OK)

        # Nurse cannot delete
        nurse_del = self.client.delete(detail_url)
        self.assertEqual(nurse_del.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthorized_staff_rejected(self):
        self.client.force_authenticate(user=self.accountant_user)
        response = self.client.get(self.patient_list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_delete_patient(self):
        patient = Patient.objects.create(
            user=self.patient_user1,
            hospital=self.hospital,
            date_of_birth="1990-05-15",
            gender="FEMALE",
            blood_group="A+",
        )
        detail_url = reverse("patient-detail", args=[patient.id])
        self.client.force_authenticate(user=self.admin_user)
        del_resp = self.client.delete(detail_url)
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Patient.objects.filter(id=patient.id).exists())

    # ==================== SEARCH & FILTERING ====================

    def test_search_and_filtering(self):
        p1 = Patient.objects.create(
            user=self.patient_user1,
            hospital=self.hospital,
            date_of_birth="1990-05-15",
            gender="FEMALE",
            blood_group="A+",
        )
        p2 = Patient.objects.create(
            user=self.patient_user2,
            hospital=self.hospital,
            date_of_birth="1985-03-20",
            gender="MALE",
            blood_group="O+",
        )
        self.client.force_authenticate(user=self.admin_user)

        # Filter by gender
        filter_gender = f"{self.patient_list_url}?gender=FEMALE"
        gender_resp = self.client.get(filter_gender)
        self.assertEqual(gender_resp.status_code, status.HTTP_200_OK)
        results = gender_resp.data.get("results", gender_resp.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["mrn"], p1.mrn)

        # Filter by blood_group
        filter_bg = f"{self.patient_list_url}?blood_group=O%2B"
        bg_resp = self.client.get(filter_bg)
        self.assertEqual(bg_resp.status_code, status.HTTP_200_OK)
        results = bg_resp.data.get("results", bg_resp.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["mrn"], p2.mrn)

        # Search by patient first name
        search_url = f"{self.patient_list_url}?search=Alice"
        search_resp = self.client.get(search_url)
        self.assertEqual(search_resp.status_code, status.HTTP_200_OK)
        results = search_resp.data.get("results", search_resp.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["mrn"], p1.mrn)
