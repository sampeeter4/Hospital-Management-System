from rest_framework.permissions import BasePermission, SAFE_METHODS


class LabCataloguePermission(BasePermission):
    """
    Authorization for Diagnostic Test Catalogue and Reference Ranges:
    - Read: Authenticated users.
    - Write: Super Admin, Hospital Admin, Lab Technician.
    """

    ADMIN_LAB_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "LAB_TECHNICIAN"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return True

        return user.role in self.ADMIN_LAB_ROLES


class LabOrderPermission(BasePermission):
    """
    Authorization for Laboratory Orders:
    - Read: Clinicians (Doctor, Nurse, Lab Tech), Admins, and Patient (for their own orders).
    - Create: Doctor, Super Admin.
    - Edit/Cancel: Doctor, Super Admin, Hospital Admin.
    - Non-clinical staff (Receptionist, Pharmacist, Accountant): Denied.
    """

    CLINICAL_STAFF = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE", "LAB_TECHNICIAN"]
    CREATOR_ROLES = ["SUPER_ADMIN", "DOCTOR"]
    CANCEL_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.CREATOR_ROLES:
            return True

        if user.role in ["HOSPITAL_ADMIN", "NURSE", "LAB_TECHNICIAN"]:
            if request.method in SAFE_METHODS:
                return True
            # Allow cancel action if in CANCEL_ROLES
            if getattr(view, "action", None) == "cancel" and user.role in self.CANCEL_ROLES:
                return True
            return False

        if user.role == "PATIENT":
            return request.method in SAFE_METHODS

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "LAB_TECHNICIAN", "NURSE"]:
            return True

        if user.role == "DOCTOR":
            return True

        if user.role == "PATIENT":
            return obj.patient.user_id == user.id and request.method in SAFE_METHODS

        return False


class LabSpecimenPermission(BasePermission):
    """
    Authorization for Specimen Accessioning and Handling:
    - Read: Clinical staff (Doctor, Nurse, Lab Tech, Admins).
    - Collect action: Nurse, Lab Tech, Super Admin, Hospital Admin.
    - Receive / Reject actions: Lab Tech, Super Admin, Hospital Admin.
    - Patients & non-clinical staff: Denied.
    """

    STAFF_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE", "LAB_TECHNICIAN"]
    COLLECT_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "NURSE", "LAB_TECHNICIAN"]
    LAB_PROCESSING_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "LAB_TECHNICIAN"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role not in self.STAFF_READ_ROLES:
            return False

        if request.method in SAFE_METHODS:
            return True

        action = getattr(view, "action", None)
        if action == "collect":
            return user.role in self.COLLECT_ROLES
        if action in ["receive", "reject"]:
            return user.role in self.LAB_PROCESSING_ROLES

        return user.role in self.LAB_PROCESSING_ROLES


class LabResultPermission(BasePermission):
    """
    Authorization for Diagnostic Results:
    - Read: Clinical staff (Doctor, Nurse, Lab Tech, Admins) and Patient (released results only).
    - Enter results: Lab Tech, Super Admin, Hospital Admin.
    - Verify / Correct: Lab Tech, Doctor, Super Admin, Hospital Admin.
    - Non-clinical staff: Denied.
    """

    STAFF_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE", "LAB_TECHNICIAN"]
    ENTRY_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "LAB_TECHNICIAN"]
    VERIFY_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "LAB_TECHNICIAN", "DOCTOR"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return user.role in self.STAFF_READ_ROLES or user.role == "PATIENT"

        action = getattr(view, "action", None)
        if action in ["enter_results", "create"]:
            return user.role in self.ENTRY_ROLES
        if action in ["verify", "correct"]:
            return user.role in self.VERIFY_ROLES

        return user.role in self.ENTRY_ROLES

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.STAFF_READ_ROLES:
            return True

        if user.role == "PATIENT":
            # Patients may only view their own released (VERIFIED / CORRECTED) results
            is_own = obj.order_item.order.patient.user_id == user.id
            is_released = obj.status in ["VERIFIED", "CORRECTED"]
            return is_own and is_released and request.method in SAFE_METHODS

        return False


class CriticalNotificationPermission(BasePermission):
    """
    Authorization for Critical Laboratory Notifications:
    - Read: Clinical staff (Doctor, Nurse, Lab Tech, Admins).
    - Acknowledge: Clinicians (Doctor, Super Admin, Hospital Admin).
    - Patients & non-clinical staff: Denied.
    """

    READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE", "LAB_TECHNICIAN"]
    ACKNOWLEDGE_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role not in self.READ_ROLES:
            return False

        if request.method in SAFE_METHODS:
            return True

        action = getattr(view, "action", None)
        if action == "acknowledge":
            return user.role in self.ACKNOWLEDGE_ROLES

        return user.role in self.ACKNOWLEDGE_ROLES

