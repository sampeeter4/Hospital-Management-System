from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    class Role(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
        HOSPITAL_ADMIN = "HOSPITAL_ADMIN", "Hospital Admin"
        DOCTOR = "DOCTOR", "Doctor"
        NURSE = "NURSE", "Nurse"
        RECEPTIONIST = "RECEPTIONIST", "Receptionist"
        LAB_TECHNICIAN = "LAB_TECHNICIAN", "Lab Technician"
        PHARMACIST = "PHARMACIST", "Pharmacist"
        ACCOUNTANT = "ACCOUNTANT", "Accountant"
        PATIENT = "PATIENT", "Patient"

    email = models.EmailField(
        unique=True
    )

    phone = models.CharField(
        max_length=15,
        blank=True
    )

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.PATIENT
    )

    is_verified = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.username} - {self.role}"
