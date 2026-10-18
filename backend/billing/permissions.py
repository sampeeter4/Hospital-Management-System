from rest_framework.permissions import BasePermission, SAFE_METHODS


class ServiceCataloguePermission(BasePermission):
    """
    Authorization for Service & Tariff Catalogue:
    - Read: Authenticated clinical and administrative staff.
    - Write / Configure: Super Admin, Hospital Admin, Accountant.
    """

    STAFF_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "ACCOUNTANT", "RECEPTIONIST", "DOCTOR", "NURSE"]
    ADMIN_BILLING_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "ACCOUNTANT"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return user.role in self.STAFF_READ_ROLES

        return user.role in self.ADMIN_BILLING_ROLES


class InvoicePermission(BasePermission):
    """
    Authorization for Patient Invoices:
    - Read: Billing staff, Clinicians, and Patient (for own invoices).
    - Create draft invoice: Accountant, Receptionist, Admins.
    - Issue / Void: Accountant, Admins.
    """

    STAFF_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "ACCOUNTANT", "RECEPTIONIST", "DOCTOR", "NURSE"]
    CREATE_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "ACCOUNTANT", "RECEPTIONIST"]
    FINAL_BILLING_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "ACCOUNTANT"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return user.role in self.STAFF_READ_ROLES or user.role == "PATIENT"

        action = getattr(view, "action", None)
        if action in ["issue", "void"]:
            return user.role in self.FINAL_BILLING_ROLES

        return user.role in self.CREATE_ROLES

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.STAFF_READ_ROLES:
            return True

        if user.role == "PATIENT":
            return obj.patient.user_id == user.id and request.method in SAFE_METHODS

        return False


class PaymentPermission(BasePermission):
    """
    Authorization for Payments and Allocations:
    - Read: Billing staff, Receptionists, and Patient (for own payment receipts).
    - Record payment: Accountant, Receptionist, Admins.
    - Allocate / Reverse: Accountant, Admins.
    """

    STAFF_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "ACCOUNTANT", "RECEPTIONIST"]
    RECORD_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "ACCOUNTANT", "RECEPTIONIST"]
    ALLOCATE_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "ACCOUNTANT"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return user.role in self.STAFF_READ_ROLES or user.role == "PATIENT"

        action = getattr(view, "action", None)
        if action in ["allocate", "reverse"]:
            return user.role in self.ALLOCATE_ROLES

        return user.role in self.RECORD_ROLES

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.STAFF_READ_ROLES:
            return True

        if user.role == "PATIENT":
            return obj.patient.user_id == user.id and request.method in SAFE_METHODS

        return False


class RefundCreditPermission(BasePermission):
    """
    Authorization for Refunds and Credit Notes:
    - Super Admin, Hospital Admin, and Accountant only.
    - Patients, Receptionists, and Clinicians: Denied.
    """

    MANAGE_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "ACCOUNTANT"]

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in self.MANAGE_ROLES)


class InsurancePermission(BasePermission):
    """
    Authorization for Insurance Providers, Policies, Pre-authorizations, and Claims:
    - Read: Billing staff, Receptionist, and Patient (for own policy & claims).
    - Write / Claims processing: Accountant, Hospital Admin, Super Admin.
    """

    STAFF_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "ACCOUNTANT", "RECEPTIONIST"]
    MANAGE_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "ACCOUNTANT"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return user.role in self.STAFF_READ_ROLES or user.role == "PATIENT"

        return user.role in self.MANAGE_ROLES

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.STAFF_READ_ROLES:
            return True

        if user.role == "PATIENT":
            return getattr(obj, "patient", None) and obj.patient.user_id == user.id and request.method in SAFE_METHODS

        return False


class FinancialReportPermission(BasePermission):
    """
    Authorization for Hospital Financial Reports & Summaries:
    - Accountant, Hospital Admin, Super Admin only.
    """

    ALLOWED_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "ACCOUNTANT"]

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in self.ALLOWED_ROLES)

