from rest_framework.permissions import BasePermission, SAFE_METHODS


class WardRoomBedPermission(BasePermission):
    """
    Authorization for Wards, Rooms, and Bed configuration:
    - Read: Clinical and administrative staff (Doctor, Nurse, Receptionist, Admins).
    - Write / Configure / Deactivate: Super Admin, Hospital Admin.
    - Patients & Non-clinical staff (Lab Tech, Pharmacist, Accountant): Denied.
    """

    STAFF_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]
    ADMIN_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return user.role in self.STAFF_READ_ROLES

        # Updating bed status action (e.g. cleaning complete -> available) can also be done by Nurses
        action = getattr(view, "action", None)
        if action == "update_status" and user.role in ["NURSE", "SUPER_ADMIN", "HOSPITAL_ADMIN"]:
            return True

        return user.role in self.ADMIN_ROLES


class AdmissionPermission(BasePermission):
    """
    Authorization for Patient Inpatient Admissions:
    - Read: Clinicians and Admins; Patients can view only their own records.
    - Create (Request admission): Doctor, Receptionist, Admins.
    - Admit action: Doctor, Nurse, Receptionist, Admins.
    - Transfer action: Doctor, Nurse, Admins.
    - Discharge action: Doctor, Super Admin, Hospital Admin only (clinical workflow).
    - Cancel action: Doctor, Receptionist, Admins.
    - Non-clinical staff (Pharmacist, Lab Tech, Accountant): Denied.
    """

    STAFF_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]
    ADMIT_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]
    TRANSFER_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE"]
    DISCHARGE_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"]
    CANCEL_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return user.role in self.STAFF_READ_ROLES or user.role == "PATIENT"

        action = getattr(view, "action", None)

        if action == "admit":
            return user.role in self.ADMIT_ROLES

        if action == "transfer":
            return user.role in self.TRANSFER_ROLES

        if action == "discharge":
            return user.role in self.DISCHARGE_ROLES

        if action == "cancel":
            return user.role in self.CANCEL_ROLES

        # Standard POST (create admission request)
        if request.method == "POST":
            return user.role in self.ADMIT_ROLES

        return user.role in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"]

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.STAFF_READ_ROLES:
            return True

        if user.role == "PATIENT":
            return obj.patient.user_id == user.id and request.method in SAFE_METHODS

        return False


class BedAssignmentPermission(BasePermission):
    """
    Authorization for Bed Assignment history:
    - Read: Clinical staff, Admins, and Patient for own admission.
    - Write: Only through transactional service endpoints.
    """

    STAFF_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return user.role in self.STAFF_READ_ROLES or user.role == "PATIENT"

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.STAFF_READ_ROLES:
            return True

        if user.role == "PATIENT":
            return obj.admission.patient.user_id == user.id and request.method in SAFE_METHODS

        return False


class OccupancyReportPermission(BasePermission):
    """
    Authorization for Ward and Hospital Occupancy Metrics & Dashboards:
    - Read: Clinicians and hospital administration.
    - Patients & non-clinical staff: Denied.
    """

    REPORT_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in self.REPORT_ROLES)

