from rest_framework import viewsets

from common.permissions import IsHospitalAdminOrReadOnly, IsStaffPersonnel
from .models import (
    Department,
    Doctor,
    Hospital,
    Staff,
)
from .serializers import (
    DepartmentSerializer,
    DoctorSerializer,
    HospitalSerializer,
    StaffSerializer,
)


class HospitalViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Hospital entities.
    Read: Authenticated users.
    Write: Super Admin & Hospital Admin.
    """

    queryset = Hospital.objects.all()
    serializer_class = HospitalSerializer
    permission_classes = [IsHospitalAdminOrReadOnly]
    filterset_fields = ["is_active", "city", "state"]
    search_fields = ["name", "registration_number", "city"]
    ordering_fields = ["name", "created_at"]


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Department entities.
    Read: Authenticated users.
    Write: Super Admin & Hospital Admin.
    """

    queryset = Department.objects.select_related("hospital").all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsHospitalAdminOrReadOnly]
    filterset_fields = ["hospital", "is_active", "code"]
    search_fields = ["name", "code", "description"]
    ordering_fields = ["name", "created_at"]


class DoctorViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Doctor profiles.
    Read: Authenticated users.
    Write: Super Admin & Hospital Admin.
    """

    queryset = Doctor.objects.select_related(
        "user",
        "hospital",
        "department",
    ).all()
    serializer_class = DoctorSerializer
    permission_classes = [IsHospitalAdminOrReadOnly]
    filterset_fields = ["hospital", "department", "is_available", "specialization"]
    search_fields = [
        "user__first_name",
        "user__last_name",
        "user__username",
        "specialization",
        "doctor_id",
        "license_number",
    ]
    ordering_fields = [
        "experience_years",
        "consultation_fee",
        "created_at",
    ]


class StaffViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Staff profiles.
    Read: Authenticated users.
    Write: Super Admin & Hospital Admin.
    """

    queryset = Staff.objects.select_related(
        "user",
        "hospital",
        "department",
    ).all()
    serializer_class = StaffSerializer
    permission_classes = [IsStaffPersonnel]
    filterset_fields = ["hospital", "department", "is_active", "designation"]
    search_fields = [
        "user__first_name",
        "user__last_name",
        "user__username",
        "employee_id",
        "designation",
    ]
    ordering_fields = [
        "joining_date",
        "created_at",
    ]
