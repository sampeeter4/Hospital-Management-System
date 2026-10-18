from rest_framework.permissions import BasePermission, SAFE_METHODS


class DoctorAvailabilityPermission(BasePermission):
    """
    Permissions for DoctorAvailability:
    - Read (GET, HEAD, OPTIONS): Authenticated users (patients and staff can check availability).
    - Write (POST, PUT, PATCH, DELETE):
        - Super Admin & Hospital Admin.
        - Doctor for their OWN availability schedule only.
    """

    ADMIN_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return True

        if user.role in self.ADMIN_ROLES:
            return True

        if user.role == "DOCTOR":
            return True

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if request.method in SAFE_METHODS:
            return True

        if user.role in self.ADMIN_ROLES:
            return True

        if user.role == "DOCTOR" and hasattr(user, "doctor_profile"):
            return obj.doctor_id == user.doctor_profile.id

        return False


class AppointmentPermission(BasePermission):
    """
    Permissions for Appointments:
    - Super Admin & Hospital Admin: Full management.
    - Receptionist: Create, read, and manage operational transitions (confirm, check-in, cancel, reschedule, no-show).
    - Doctor: View their own appointments, clinical workflow transitions (confirm, start, complete, cancel, no-show).
    - Nurse: Read appointments, perform check-in.
    - Patient: View their own appointments, book for themselves, cancel/reschedule their own booking.
    - Other staff: Denied by default.
    """

    ADMIN_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN"]
    STAFF_ALLOWED_ROLES = [
        "SUPER_ADMIN",
        "HOSPITAL_ADMIN",
        "DOCTOR",
        "NURSE",
        "RECEPTIONIST",
    ]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        # Specific action endpoints
        if getattr(view, "action", None) in ["my", "available_slots"]:
            return True

        if user.role in self.ADMIN_ROLES or user.role == "RECEPTIONIST":
            if request.method == "DELETE":
                return user.role in self.ADMIN_ROLES
            return True

        if user.role in ["DOCTOR", "NURSE"]:
            # Doctors and Nurses read collection, no raw DELETE
            if request.method == "DELETE":
                return False
            return request.method in SAFE_METHODS or view.detail

        if user.role == "PATIENT":
            # Patients can book, view collection (scoped to own in get_queryset), or access detail
            if request.method == "DELETE":
                return False
            if view.detail:
                return True
            return request.method in SAFE_METHODS or request.method == "POST"

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.ADMIN_ROLES:
            return True

        if user.role == "RECEPTIONIST":
            return request.method != "DELETE"

        if user.role == "DOCTOR":
            is_assigned_doctor = (
                hasattr(user, "doctor_profile")
                and obj.doctor_id == user.doctor_profile.id
            )
            return is_assigned_doctor

        if user.role == "NURSE":
            return request.method in SAFE_METHODS or getattr(view, "action", None) == "check_in"

        if user.role == "PATIENT":
            is_own_patient = (
                hasattr(user, "patient_profile")
                and obj.patient_id == user.patient_profile.id
            )
            return is_own_patient

        return False
