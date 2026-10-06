from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from common.permissions import (
    IsDoctor,
    IsHospitalAdmin,
    IsNurse,
    IsPatient,
    IsReceptionist,
)


User = get_user_model()


class AccountsAuthenticationTests(APITestCase):

    def setUp(self):
        self.register_url = reverse("register")
        self.login_url = reverse("token_obtain_pair")
        self.refresh_url = reverse("token_refresh")
        self.profile_url = reverse("profile")
        self.change_password_url = reverse("change-password")

        self.user_data = {
            "username": "john",
            "email": "john@example.com",
            "password": "StrongPassword123",
            "password_confirm": "StrongPassword123",
            "phone": "9876543210",
            "role": "PATIENT",
        }

    def test_user_registration_success(self):
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], "User registered successfully.")
        self.assertEqual(response.data["user"]["username"], "john")
        self.assertEqual(response.data["user"]["role"], "PATIENT")
        self.assertTrue(User.objects.filter(username="john").exists())

    def test_user_registration_password_mismatch(self):
        invalid_data = self.user_data.copy()
        invalid_data["password_confirm"] = "DifferentPassword123"
        response = self.client.post(self.register_url, invalid_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_jwt_login_success(self):
        self.client.post(self.register_url, self.user_data)
        login_payload = {
            "username": "john",
            "password": "StrongPassword123",
        }
        response = self.client.post(self.login_url, login_payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_jwt_login_invalid_credentials(self):
        self.client.post(self.register_url, self.user_data)
        login_payload = {
            "username": "john",
            "password": "WrongPassword",
        }
        response = self.client.post(self.login_url, login_payload)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_jwt_token_refresh(self):
        self.client.post(self.register_url, self.user_data)
        login_payload = {
            "username": "john",
            "password": "StrongPassword123",
        }
        login_resp = self.client.post(self.login_url, login_payload)
        refresh_token = login_resp.data["refresh"]

        refresh_resp = self.client.post(self.refresh_url, {"refresh": refresh_token})
        self.assertEqual(refresh_resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_resp.data)

    def test_profile_unauthenticated(self):
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_authenticated(self):
        self.client.post(self.register_url, self.user_data)
        login_resp = self.client.post(
            self.login_url,
            {"username": "john", "password": "StrongPassword123"},
        )
        access_token = login_resp.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "john")
        self.assertEqual(response.data["email"], "john@example.com")
        self.assertEqual(response.data["role"], "PATIENT")

    def test_profile_update(self):
        self.client.post(self.register_url, self.user_data)
        login_resp = self.client.post(
            self.login_url,
            {"username": "john", "password": "StrongPassword123"},
        )
        access_token = login_resp.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        patch_resp = self.client.patch(
            self.profile_url,
            {"phone": "1234567890"},
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["phone"], "1234567890")

    def test_change_password(self):
        self.client.post(self.register_url, self.user_data)
        login_resp = self.client.post(
            self.login_url,
            {"username": "john", "password": "StrongPassword123"},
        )
        access_token = login_resp.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        change_payload = {
            "old_password": "StrongPassword123",
            "new_password": "NewStrongPassword456",
            "new_password_confirm": "NewStrongPassword456",
        }
        response = self.client.post(self.change_password_url, change_payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Login with old password fails
        self.client.credentials()
        fail_login = self.client.post(
            self.login_url,
            {"username": "john", "password": "StrongPassword123"},
        )
        self.assertEqual(fail_login.status_code, status.HTTP_401_UNAUTHORIZED)

        # Login with new password succeeds
        success_login = self.client.post(
            self.login_url,
            {"username": "john", "password": "NewStrongPassword456"},
        )
        self.assertEqual(success_login.status_code, status.HTTP_200_OK)


class RolePermissionTests(APITestCase):

    def test_role_based_permissions(self):
        admin = User.objects.create_user(
            username="admin",
            email="admin@hospital.com",
            password="Password123",
            role="HOSPITAL_ADMIN",
        )
        doctor = User.objects.create_user(
            username="doctor",
            email="doctor@hospital.com",
            password="Password123",
            role="DOCTOR",
        )
        nurse = User.objects.create_user(
            username="nurse",
            email="nurse@hospital.com",
            password="Password123",
            role="NURSE",
        )
        receptionist = User.objects.create_user(
            username="recep",
            email="recep@hospital.com",
            password="Password123",
            role="RECEPTIONIST",
        )
        patient = User.objects.create_user(
            username="pat",
            email="patient@hospital.com",
            password="Password123",
            role="PATIENT",
        )

        class DummyRequest:
            def __init__(self, user):
                self.user = user

        # Test IsHospitalAdmin
        self.assertTrue(IsHospitalAdmin().has_permission(DummyRequest(admin), None))
        self.assertFalse(IsHospitalAdmin().has_permission(DummyRequest(doctor), None))

        # Test IsDoctor
        self.assertTrue(IsDoctor().has_permission(DummyRequest(doctor), None))
        self.assertFalse(IsDoctor().has_permission(DummyRequest(nurse), None))

        # Test IsNurse
        self.assertTrue(IsNurse().has_permission(DummyRequest(nurse), None))
        self.assertFalse(IsNurse().has_permission(DummyRequest(patient), None))

        # Test IsReceptionist
        self.assertTrue(IsReceptionist().has_permission(DummyRequest(receptionist), None))
        self.assertFalse(IsReceptionist().has_permission(DummyRequest(doctor), None))

        # Test IsPatient
        self.assertTrue(IsPatient().has_permission(DummyRequest(patient), None))
        self.assertFalse(IsPatient().has_permission(DummyRequest(admin), None))
