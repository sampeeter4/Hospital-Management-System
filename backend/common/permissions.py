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


class IsHospitalAdminOrReadOnly(BasePermission):
    """
    Allows read access to any authenticated user, but write access only to Super Admins and Hospital Admins.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return True
        return request.user.role in ["SUPER_ADMIN", "HOSPITAL_ADMIN"]


class IsStaffPersonnel(BasePermission):
    """
    Allows read access only to hospital staff and administrative personnel (blocks patients).
    Write access is restricted to Super Admins and Hospital Admins.
    """

    STAFF_ROLES = [
        "SUPER_ADMIN",
        "HOSPITAL_ADMIN",
        "DOCTOR",
        "NURSE",
        "RECEPTIONIST",
        "LAB_TECHNICIAN",
        "PHARMACIST",
        "ACCOUNTANT",
    ]

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role not in self.STAFF_ROLES:
            return False
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return True
        return request.user.role in ["SUPER_ADMIN", "HOSPITAL_ADMIN"]


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

