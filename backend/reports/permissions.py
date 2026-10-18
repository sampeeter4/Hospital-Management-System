from rest_framework import permissions


class StaffReportPermission(permissions.BasePermission):
    """
    Base permission for reports: Any authenticated hospital staff member.
    Patients are explicitly blocked from all hospital dashboard and operational reports.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "role", None) == "PATIENT":
            return False
        return True


class FinancialReportPermission(permissions.BasePermission):
    """
    Financial reports (Billing, Collections, Insurance):
    Allowed: SUPER_ADMIN, HOSPITAL_ADMIN, ACCOUNTANT.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        role = getattr(user, "role", None)
        if role in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "ACCOUNTANT"] or user.is_superuser:
            return True
        return False


class ClinicalReportPermission(permissions.BasePermission):
    """
    Clinical / Workload reports (Appointments, Inpatient, Laboratory):
    Allowed: SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, NURSE, LAB_TECHNICIAN, RECEPTIONIST depending on module.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        role = getattr(user, "role", None)
        if role in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"] or user.is_superuser:
            return True
        return False


class PharmacyReportPermission(permissions.BasePermission):
    """
    Pharmacy reports:
    Allowed: SUPER_ADMIN, HOSPITAL_ADMIN, PHARMACIST.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        role = getattr(user, "role", None)
        if role in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "PHARMACIST"] or user.is_superuser:
            return True
        return False


class LaboratoryReportPermission(permissions.BasePermission):
    """
    Laboratory reports:
    Allowed: SUPER_ADMIN, HOSPITAL_ADMIN, LAB_TECHNICIAN, DOCTOR.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        role = getattr(user, "role", None)
        if role in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "LAB_TECHNICIAN", "DOCTOR"] or user.is_superuser:
            return True
        return False


class ReportAuditLogPermission(permissions.BasePermission):
    """
    Report Audit Logs inspection:
    Allowed: SUPER_ADMIN, HOSPITAL_ADMIN.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        role = getattr(user, "role", None)
        if role in ["SUPER_ADMIN", "HOSPITAL_ADMIN"] or user.is_superuser:
            return True
        return False

