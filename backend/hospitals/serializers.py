from rest_framework import serializers

from .models import (
    Department,
    Doctor,
    Hospital,
    Staff,
)


class HospitalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hospital
        fields = [
            "id",
            "name",
            "registration_number",
            "address",
            "city",
            "state",
            "postal_code",
            "phone",
            "email",
            "website",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


class DepartmentSerializer(serializers.ModelSerializer):
    hospital_name = serializers.CharField(
        source="hospital.name",
        read_only=True,
    )

    class Meta:
        model = Department
        fields = [
            "id",
            "hospital",
            "hospital_name",
            "name",
            "code",
            "description",
            "phone",
            "location",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "hospital_name",
            "created_at",
            "updated_at",
        ]


class DoctorSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(
        source="user.get_full_name",
        read_only=True,
    )
    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )
    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )
    hospital_name = serializers.CharField(
        source="hospital.name",
        read_only=True,
    )

    class Meta:
        model = Doctor
        fields = [
            "id",
            "user",
            "doctor_id",
            "doctor_name",
            "email",
            "hospital",
            "hospital_name",
            "department",
            "department_name",
            "specialization",
            "license_number",
            "qualification",
            "experience_years",
            "consultation_fee",
            "bio",
            "is_available",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "doctor_name",
            "email",
            "hospital_name",
            "department_name",
            "created_at",
            "updated_at",
        ]


class StaffSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(
        source="user.get_full_name",
        read_only=True,
    )
    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )
    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )
    hospital_name = serializers.CharField(
        source="hospital.name",
        read_only=True,
    )

    class Meta:
        model = Staff
        fields = [
            "id",
            "user",
            "employee_id",
            "staff_name",
            "email",
            "hospital",
            "hospital_name",
            "department",
            "department_name",
            "designation",
            "joining_date",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "staff_name",
            "email",
            "hospital_name",
            "department_name",
            "created_at",
            "updated_at",
        ]

