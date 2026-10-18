from rest_framework.permissions import BasePermission, SAFE_METHODS


class ClinicalEncounterPermission(BasePermission):
    """
    Authorization for Clinical Encounters:
    - Super Admin & Hospital Admin: Full management.
    - Doctor: Create, read, and manage assigned patient encounters.
    - Nurse: Read-only access to encounters for patient care.
    - Receptionist: Read-only access to encounters for operational coordination.
    - Patient: View their own encounters only.
    - Other roles: Denied by default.
    """

    STAFF_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]
    CLINICAL_WRITE_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.STAFF_READ_ROLES:
            if request.method in SAFE_METHODS:
                return True
            return user.role in self.CLINICAL_WRITE_ROLES

        if user.role == "PATIENT":
            # Patients can only read their own encounters
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
            # For writes, doctor must be assigned to encounter or author
            if hasattr(user, "doctor_profile"):
                return obj.doctor_id == user.doctor_profile.id
            return False

        if user.role in ["NURSE", "RECEPTIONIST"]:
            return request.method in SAFE_METHODS

        if user.role == "PATIENT":
            return request.method in SAFE_METHODS and hasattr(user, "patient_profile") and obj.patient_id == user.patient_profile.id

        return False


class VitalSignsPermission(BasePermission):
    """
    Authorization for Vital Signs:
    - Doctor & Nurse: Can record and read vital signs.
    - Super Admin & Hospital Admin: Can read and manage vitals.
    - Patient: Read-only access to vitals for their own encounters.
    - Other roles: Denied.
    """

    VITALS_WRITE_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE"]
    VITALS_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.VITALS_WRITE_ROLES:
            return True

        if user.role == "PATIENT":
            return request.method in SAFE_METHODS

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.VITALS_WRITE_ROLES:
            # If encounter is closed, vitals are locked from modifications
            if request.method not in SAFE_METHODS and obj.encounter.status == "CLOSED":
                return user.role in ["SUPER_ADMIN"]
            return True

        if user.role == "PATIENT":
            return request.method in SAFE_METHODS and hasattr(user, "patient_profile") and obj.encounter.patient_id == user.patient_profile.id

        return False


class EncounterDiagnosisPermission(BasePermission):
    """
    Authorization for Encounter Diagnoses:
    - Doctor: Can create, read, and manage diagnoses.
    - Super Admin & Hospital Admin: Clinical diagnosis oversight.
    - Nurse: Read-only clinical context for patient care.
    - Patient: Read-only access to diagnoses on their own encounters.
    - Receptionists & Non-clinical staff: Strictly denied.
    """

    DIAGNOSIS_WRITE_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"]
    DIAGNOSIS_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.DIAGNOSIS_WRITE_ROLES:
            return True

        if user.role == "NURSE":
            return request.method in SAFE_METHODS

        if user.role == "PATIENT":
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
            return obj.encounter.status != "CLOSED"

        if user.role == "NURSE":
            return request.method in SAFE_METHODS

        if user.role == "PATIENT":
            return request.method in SAFE_METHODS and hasattr(user, "patient_profile") and obj.encounter.patient_id == user.patient_profile.id

        return False


class ClinicalNotePermission(BasePermission):
    """
    Authorization for Clinical Notes (SOAP, Progress, Consultation, Discharge):
    - Doctor: Can author, edit draft, sign, and add addenda.
    - Super Admin: Clinical system oversight.
    - Nurse: Read-only access to necessary clinical notes for care delivery.
    - Hospital Admin: Read-only administrative oversight; cannot author or sign notes.
    - Patient: Can ONLY view notes that are marked `is_patient_visible=True` AND `status=SIGNED`.
    - Receptionists & Other staff: Strictly denied.
    """

    NOTE_AUTHOR_ROLES = ["SUPER_ADMIN", "DOCTOR"]
    NOTE_STAFF_READ_ROLES = ["SUPER_ADMIN", "DOCTOR", "NURSE", "HOSPITAL_ADMIN"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.NOTE_AUTHOR_ROLES:
            return True

        if user.role in ["NURSE", "HOSPITAL_ADMIN"]:
            return request.method in SAFE_METHODS

        if user.role == "PATIENT":
            return request.method in SAFE_METHODS

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role == "SUPER_ADMIN":
            return True

        if user.role == "DOCTOR":
            if request.method in SAFE_METHODS:
                return True
            # Editing draft note requires authorship or assigned doctor
            if obj.status == "DRAFT":
                return obj.author_id == user.id or (hasattr(user, "doctor_profile") and obj.encounter.doctor_id == user.doctor_profile.id)
            # Signed notes cannot be directly edited via PUT/PATCH
            return False

        if user.role in ["NURSE", "HOSPITAL_ADMIN"]:
            return request.method in SAFE_METHODS

        if user.role == "PATIENT":
            # Patients can only see patient-visible, signed notes for their own encounters
            return (
                request.method in SAFE_METHODS
                and obj.is_patient_visible
                and obj.status == "SIGNED"
                and hasattr(user, "patient_profile")
                and obj.encounter.patient_id == user.patient_profile.id
            )

        return False


class MedicalHistoryPermission(BasePermission):
    """
    Authorization for Medical History entries:
    - Super Admin & Hospital Admin & Doctor: Manage longitudinal medical history.
    - Nurse: Read-only access to medical history.
    - Patient: Read-only access to their own medical history.
    - Other staff: Denied.
    """

    HISTORY_WRITE_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"]
    HISTORY_READ_ROLES = ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE"]

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.HISTORY_WRITE_ROLES:
            return True

        if user.role == "NURSE":
            return request.method in SAFE_METHODS

        if user.role == "PATIENT":
            return request.method in SAFE_METHODS

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        if user.role in self.HISTORY_WRITE_ROLES:
            return True

        if user.role == "NURSE":
            return request.method in SAFE_METHODS

        if user.role == "PATIENT":
            return request.method in SAFE_METHODS and hasattr(user, "patient_profile") and obj.patient_id == user.patient_profile.id

        return False
