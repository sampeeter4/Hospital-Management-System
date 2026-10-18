from rest_framework.permissions import BasePermission, SAFE_METHODS


class PatientAccessPermission(BasePermission):
    """
    Role-Based Access Control for Patient records:
    - SUPER_ADMIN & HOSPITAL_ADMIN: Full CRUD access.
    - RECEPTIONIST: List, Retrieve, Create, Update (No Delete).
    - DOCTOR & NURSE: List, Retrieve (Read-only for clinical needs).
    - PATIENT: Can only view and update their own patient profile.
               Cannot list all patients. Cannot access other patients' records.
    - Other staff (LAB_TECHNICIAN, PHARMACIST, ACCOUNTANT): No access by default.
    """

    STAFF_MANAGE_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST"]
    STAFF_CLINICAL_ROLES = ["DOCTOR", "NURSE"]
    ADMIN_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        # Dedicated 'me' action is allowed for any authenticated user with PATIENT role or profile
        if getattr(view, "action", None) == "me":
            return True

        # Admins and Receptionists have full access to collection endpoints
        if user.role in self.STAFF_MANAGE_ROLES:
            if request.method == "DELETE":
                return user.role in self.ADMIN_ROLES
            return True

        # Clinical staff (Doctors & Nurses) have read-only access to collection endpoints
        if user.role in self.STAFF_CLINICAL_ROLES:
            return request.method in SAFE_METHODS

        # Patients cannot list the full collection or POST arbitrary patients
        if user.role == "PATIENT":
            # For detail view or me endpoint, object-level permission will verify ownership
            if view.detail:
                return request.method in ["GET", "PUT", "PATCH"]
            return False

        # All other staff roles rejected by default
        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        # Super Admin & Hospital Admin have full object permissions
        if user.role in self.ADMIN_ROLES:
            return True

        # Receptionists can read and update (no delete)
        if user.role == "RECEPTIONIST":
            return request.method != "DELETE"

        # Doctors & Nurses can read patient records
        if user.role in self.STAFF_CLINICAL_ROLES:
            return request.method in SAFE_METHODS

        # Patient can ONLY view or update their OWN profile
        if user.role == "PATIENT":
            if obj.user_id == user.id:
                return request.method in ["GET", "PUT", "PATCH"]
            return False

        return False
