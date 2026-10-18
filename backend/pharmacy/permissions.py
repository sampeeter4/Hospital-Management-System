from rest_framework.permissions import BasePermission, SAFE_METHODS


class MedicinePermission(BasePermission):
    """
    Authorization for Medicine Catalogue:
    - Read: Authenticated users.
    - Write: Super Admin, Hospital Admin, Pharmacist.
    """

    ADMIN_PHARMACY_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "PHARMACIST"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return True

        return user.role in self.ADMIN_PHARMACY_ROLES


class PharmacyLocationPermission(BasePermission):
    """
    Authorization for Pharmacy Locations:
    - Read: Authenticated staff and clinicians.
    - Write: Super Admin, Hospital Admin.
    """

    STAFF_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "PHARMACIST", "DOCTOR", "NURSE"]
    ADMIN_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return user.role in self.STAFF_READ_ROLES

        return user.role in self.ADMIN_ROLES


class InventoryPermission(BasePermission):
    """
    Authorization for Pharmacy Stock Batches, Receipts, Adjustments, and Movements:
    - Read: Super Admin, Hospital Admin, Pharmacist, Doctor (stock availability).
    - Write: Super Admin, Hospital Admin, Pharmacist.
    - Patients & Non-clinical staff: Denied.
    """

    INVENTORY_MANAGE_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "PHARMACIST"]
    INVENTORY_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "PHARMACIST", "DOCTOR"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return user.role in self.INVENTORY_READ_ROLES

        return user.role in self.INVENTORY_MANAGE_ROLES


class PrescriptionPermission(BasePermission):
    """
    Authorization for Prescriptions:
    - Read: Prescribing Doctor, Pharmacist, Admins, and Patient (for their own).
    - Create / Edit: Prescribing Doctor, Super Admin.
    - Pharmacists, Nurses, Patients: Cannot author prescriptions.
    - Non-clinical staff: Denied.
    """

    PRESCRIBER_ROLES = ["SUPER_ADMIN", "DOCTOR"]
    STAFF_ALLOWED_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "PHARMACIST"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.PRESCRIBER_ROLES:
            return True

        if user.role in ["PHARMACIST", "HOSPITAL_ADMIN"]:
            return request.method in SAFE_METHODS

        if user.role == "PATIENT":
            # Patients can read collection (scoped in get_queryset) and view detail of their own
            return request.method in SAFE_METHODS

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in ["SUPER_ADMIN", "HOSPITAL_ADMIN"]:
            return True

        if user.role == "DOCTOR":
            if request.method in SAFE_METHODS:
                return True
            # Doctor can only manage prescriptions authored by themselves
            return hasattr(user, "doctor_profile") and obj.doctor_id == user.doctor_profile.id

        if user.role == "PHARMACIST":
            return request.method in SAFE_METHODS

        if user.role == "PATIENT":
            return request.method in SAFE_METHODS and hasattr(user, "patient_profile") and obj.patient_id == user.patient_profile.id

        return False


class DispensePermission(BasePermission):
    """
    Authorization for Dispensing:
    - Pharmacist & Super Admin: Full dispensing and returns.
    - Hospital Admin: Read-only oversight.
    - Patient: View their own prescription dispenses.
    - Doctors & Nurses: Read-only access to dispense history.
    - Others: Denied.
    """

    DISPENSE_WRITE_ROLES = ["SUPER_ADMIN", "PHARMACIST"]
    DISPENSE_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "PHARMACIST", "DOCTOR", "NURSE"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.DISPENSE_WRITE_ROLES:
            return True

        if user.role in self.DISPENSE_READ_ROLES or user.role == "PATIENT":
            return request.method in SAFE_METHODS

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.DISPENSE_WRITE_ROLES or user.role in ["HOSPITAL_ADMIN", "DOCTOR", "NURSE"]:
            return True

        if user.role == "PATIENT":
            return request.method in SAFE_METHODS and hasattr(user, "patient_profile") and obj.prescription.patient_id == user.patient_profile.id

        return False
