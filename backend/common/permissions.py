from rest_framework.permissions import BasePermission


class IsHospitalAdmin(BasePermission):
    """
    Allows access only to Super Admins and Hospital Admins.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ["SUPER_ADMIN", "HOSPITAL_ADMIN"]
        )


class IsDoctor(BasePermission):
    """
    Allows access only to Doctors.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "DOCTOR"
        )


class IsNurse(BasePermission):
    """
    Allows access only to Nurses.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "NURSE"
        )


class IsReceptionist(BasePermission):
    """
    Allows access only to Receptionists.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "RECEPTIONIST"
        )


class IsPatient(BasePermission):
    """
    Allows access only to Patients.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "PATIENT"
        )


class IsLabTechnician(BasePermission):
    """
    Allows access only to Lab Technicians.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "LAB_TECHNICIAN"
        )


class IsPharmacist(BasePermission):
    """
    Allows access only to Pharmacists.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "PHARMACIST"
        )


class IsAccountant(BasePermission):
    """
    Allows access only to Accountants.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "ACCOUNTANT"
        )
