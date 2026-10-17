from django.contrib import admin

from .models import (
    Department,
    Doctor,
    Hospital,
    Staff,
)


@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "registration_number",
        "city",
        "phone",
        "is_active",
    )
    search_fields = (
        "name",
        "registration_number",
        "city",
    )
    list_filter = (
        "is_active",
        "state",
    )


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "code",
        "hospital",
        "is_active",
    )
    search_fields = (
        "name",
        "code",
    )
    list_filter = (
        "hospital",
        "is_active",
    )


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = (
        "doctor_id",
        "user",
        "specialization",
        "department",
        "hospital",
        "is_available",
    )
    search_fields = (
        "doctor_id",
        "license_number",
        "user__username",
        "user__email",
    )
    list_filter = (
        "hospital",
        "department",
        "is_available",
    )


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = (
        "employee_id",
        "user",
        "designation",
        "department",
        "hospital",
        "is_active",
    )
    search_fields = (
        "employee_id",
        "user__username",
        "user__email",
    )
    list_filter = (
        "hospital",
        "department",
        "is_active",
    )
