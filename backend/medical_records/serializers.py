from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import (
    ClinicalEncounter,
    ClinicalNote,
    ClinicalNoteAddendum,
    EncounterDiagnosis,
    MedicalHistoryEntry,
    VitalSigns,
)
from .services import record_clinical_audit


class ClinicalEncounterSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(
        source="patient.user.get_full_name",
        read_only=True,
    )
    patient_mrn = serializers.CharField(
        source="patient.mrn",
        read_only=True,
    )
    doctor_name = serializers.CharField(
        source="doctor.user.get_full_name",
        read_only=True,
    )
    doctor_id_code = serializers.CharField(
        source="doctor.doctor_id",
        read_only=True,
    )
    hospital_name = serializers.CharField(
        source="hospital.name",
        read_only=True,
    )
    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
    )
    closed_by_username = serializers.CharField(
        source="closed_by.username",
        read_only=True,
    )

    class Meta:
        model = ClinicalEncounter
        fields = [
            "id",
            "encounter_reference",
            "patient",
            "patient_name",
            "patient_mrn",
            "doctor",
            "doctor_name",
            "doctor_id_code",
            "hospital",
            "hospital_name",
            "department",
            "department_name",
            "appointment",
            "encounter_type",
            "status",
            "encounter_date",
            "start_time",
            "end_time",
            "chief_complaint",
            "history_of_present_illness",
            "clinical_notes_summary",
            "created_by",
            "created_by_username",
            "closed_by",
            "closed_by_username",
            "closed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "encounter_reference",
            "patient_name",
            "patient_mrn",
            "doctor_name",
            "doctor_id_code",
            "hospital_name",
            "department_name",
            "status",
            "created_by",
            "created_by_username",
            "closed_by",
            "closed_by_username",
            "closed_at",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "doctor": {"required": False},
            "hospital": {"required": False},
            "department": {"required": False},
        }

    def validate(self, data):
        request = self.context.get("request")
        user = request.user if request else None

        # If user is doctor, default doctor to current user's profile
        if user and user.role == "DOCTOR":
            if not hasattr(user, "doctor_profile"):
                raise serializers.ValidationError({"doctor": "Doctor profile not found for this user."})
            assigned_doctor = data.get("doctor") or getattr(self.instance, "doctor", None)
            if assigned_doctor and assigned_doctor.id != user.doctor_profile.id:
                raise serializers.ValidationError({"doctor": "Doctors can only create encounters for themselves."})
            data["doctor"] = user.doctor_profile

        doctor = data.get("doctor") or getattr(self.instance, "doctor", None)
        if not doctor:
            raise serializers.ValidationError({"doctor": "Doctor is required."})

        # Derive hospital and department from doctor if omitted
        if "hospital" not in data or not data.get("hospital"):
            data["hospital"] = doctor.hospital
        if "department" not in data or not data.get("department"):
            data["department"] = doctor.department

        # Appointment validation
        appointment = data.get("appointment") or getattr(self.instance, "appointment", None)
        patient = data.get("patient") or getattr(self.instance, "patient", None)

        if appointment:
            if appointment.status in ["CANCELLED", "NO_SHOW"]:
                raise serializers.ValidationError({
                    "appointment": f"Cannot link encounter to an appointment with status {appointment.status}."
                })
            if patient and appointment.patient_id != patient.id:
                raise serializers.ValidationError({
                    "appointment": "Encounter patient does not match appointment patient."
                })
            if appointment.doctor_id != doctor.id:
                raise serializers.ValidationError({
                    "appointment": "Encounter doctor does not match appointment doctor."
                })

        # When updating an already closed encounter
        if self.instance and self.instance.status == ClinicalEncounter.Status.CLOSED:
            if user and user.role not in ["SUPER_ADMIN"]:
                raise serializers.ValidationError("Closed clinical encounters are locked from ordinary edits.")

        return data

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user:
            validated_data["created_by"] = request.user

        instance = super().create(validated_data)
        record_clinical_audit(
            resource_type="ENCOUNTER",
            resource_id=instance.id,
            action="CREATED",
            user=request.user if request else None,
            patient=instance.patient,
            description=f"Encounter {instance.encounter_reference} created",
        )
        return instance


    def update(self, instance, validated_data):
        request = self.context.get("request")
        updated = super().update(instance, validated_data)
        record_clinical_audit(
            resource_type="ENCOUNTER",
            resource_id=updated.id,
            action="UPDATED",
            user=request.user if request else None,
            patient=updated.patient,
            description=f"Encounter {updated.encounter_reference} updated",
        )
        return updated


class VitalSignsSerializer(serializers.ModelSerializer):
    encounter_reference = serializers.CharField(
        source="encounter.encounter_reference",
        read_only=True,
    )
    patient_name = serializers.CharField(
        source="encounter.patient.user.get_full_name",
        read_only=True,
    )
    recorded_by_username = serializers.CharField(
        source="recorded_by.username",
        read_only=True,
    )

    class Meta:
        model = VitalSigns
        fields = [
            "id",
            "encounter",
            "encounter_reference",
            "patient_name",
            "systolic_bp",
            "diastolic_bp",
            "heart_rate",
            "temperature",
            "temperature_unit",
            "respiratory_rate",
            "oxygen_saturation",
            "height",
            "height_unit",
            "weight",
            "weight_unit",
            "bmi",
            "notes",
            "recorded_by",
            "recorded_by_username",
            "measured_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "encounter_reference",
            "patient_name",
            "bmi",
            "recorded_by",
            "recorded_by_username",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        encounter = data.get("encounter") or getattr(self.instance, "encounter", None)
        if encounter and encounter.status == ClinicalEncounter.Status.CLOSED:
            request = self.context.get("request")
            if not (request and request.user and request.user.role == "SUPER_ADMIN"):
                raise serializers.ValidationError({
                    "encounter": "Cannot add or modify vital signs for a closed clinical encounter."
                })

        temp_instance = VitalSigns(**data)
        if self.instance:
            temp_instance.pk = self.instance.pk
            temp_instance.encounter = encounter
        try:
            temp_instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            )

        return data

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user:
            validated_data["recorded_by"] = request.user
        instance = super().create(validated_data)
        record_clinical_audit(
            resource_type="VITALS",
            resource_id=instance.id,
            action="CREATED",
            user=request.user if request else None,
            patient=instance.encounter.patient,
            description=f"Vital signs recorded for encounter {instance.encounter.encounter_reference}",
        )
        return instance

    def update(self, instance, validated_data):
        request = self.context.get("request")
        updated = super().update(instance, validated_data)
        record_clinical_audit(
            resource_type="VITALS",
            resource_id=updated.id,
            action="UPDATED",
            user=request.user if request else None,
            patient=updated.encounter.patient,
            description=f"Vital signs #{updated.id} updated",
        )
        return updated


class EncounterDiagnosisSerializer(serializers.ModelSerializer):
    encounter_reference = serializers.CharField(
        source="encounter.encounter_reference",
        read_only=True,
    )
    recorded_by_username = serializers.CharField(
        source="recorded_by.username",
        read_only=True,
    )

    class Meta:
        model = EncounterDiagnosis
        fields = [
            "id",
            "encounter",
            "encounter_reference",
            "diagnosis_description",
            "diagnosis_code",
            "code_system",
            "is_primary",
            "diagnosis_type",
            "clinical_status",
            "recorded_by",
            "recorded_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "encounter_reference",
            "recorded_by",
            "recorded_by_username",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        encounter = data.get("encounter") or getattr(self.instance, "encounter", None)
        if encounter and encounter.status == ClinicalEncounter.Status.CLOSED:
            request = self.context.get("request")
            if not (request and request.user and request.user.role == "SUPER_ADMIN"):
                raise serializers.ValidationError({
                    "encounter": "Cannot add or modify diagnoses on a closed encounter."
                })

        temp_instance = EncounterDiagnosis(**data)
        if self.instance:
            temp_instance.pk = self.instance.pk
            temp_instance.encounter = encounter
        try:
            temp_instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            )

        return data

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user:
            validated_data["recorded_by"] = request.user
        instance = super().create(validated_data)
        record_clinical_audit(
            resource_type="DIAGNOSIS",
            resource_id=instance.id,
            action="CREATED",
            user=request.user if request else None,
            patient=instance.encounter.patient,
            description=f"Diagnosis '{instance.diagnosis_description}' recorded",
        )
        return instance

    def update(self, instance, validated_data):
        request = self.context.get("request")
        updated = super().update(instance, validated_data)
        record_clinical_audit(
            resource_type="DIAGNOSIS",
            resource_id=updated.id,
            action="UPDATED",
            user=request.user if request else None,
            patient=updated.encounter.patient,
            description=f"Diagnosis #{updated.id} updated",
        )
        return updated


class ClinicalNoteAddendumSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(
        source="author.username",
        read_only=True,
    )

    class Meta:
        model = ClinicalNoteAddendum
        fields = [
            "id",
            "clinical_note",
            "reason",
            "addendum_content",
            "author",
            "author_username",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "author",
            "author_username",
            "created_at",
        ]


class ClinicalNoteSerializer(serializers.ModelSerializer):
    encounter_reference = serializers.CharField(
        source="encounter.encounter_reference",
        read_only=True,
    )
    author_username = serializers.CharField(
        source="author.username",
        read_only=True,
    )
    signed_by_username = serializers.CharField(
        source="signed_by.username",
        read_only=True,
    )
    addenda = ClinicalNoteAddendumSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = ClinicalNote
        fields = [
            "id",
            "encounter",
            "encounter_reference",
            "note_type",
            "subjective",
            "objective",
            "assessment",
            "plan",
            "summary",
            "status",
            "is_patient_visible",
            "author",
            "author_username",
            "signed_by",
            "signed_by_username",
            "signed_at",
            "addenda",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "encounter_reference",
            "status",
            "author",
            "author_username",
            "signed_by",
            "signed_by_username",
            "signed_at",
            "addenda",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        if self.instance and self.instance.status == ClinicalNote.Status.SIGNED:
            raise serializers.ValidationError(
                "Signed clinical notes cannot be modified. Use the addendum endpoint to record corrections."
            )
        return data

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user:
            validated_data["author"] = request.user
        instance = super().create(validated_data)
        record_clinical_audit(
            resource_type="CLINICAL_NOTE",
            resource_id=instance.id,
            action="CREATED",
            user=request.user if request else None,
            patient=instance.encounter.patient,
            description=f"Clinical note #{instance.id} ({instance.get_note_type_display()}) created",
        )
        return instance

    def update(self, instance, validated_data):
        request = self.context.get("request")
        updated = super().update(instance, validated_data)
        record_clinical_audit(
            resource_type="CLINICAL_NOTE",
            resource_id=updated.id,
            action="UPDATED",
            user=request.user if request else None,
            patient=updated.encounter.patient,
            description=f"Clinical note #{updated.id} updated",
        )
        return updated


class AddendumCreateSerializer(serializers.Serializer):
    reason = serializers.CharField(
        required=True,
        min_length=5,
        help_text="Clinical justification for addendum",
    )
    addendum_content = serializers.CharField(
        required=True,
        min_length=5,
        help_text="Additional or corrective clinical narrative",
    )


class MedicalHistoryEntrySerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(
        source="patient.user.get_full_name",
        read_only=True,
    )
    patient_mrn = serializers.CharField(
        source="patient.mrn",
        read_only=True,
    )
    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True,
    )
    recorded_by_username = serializers.CharField(
        source="recorded_by.username",
        read_only=True,
    )

    class Meta:
        model = MedicalHistoryEntry
        fields = [
            "id",
            "patient",
            "patient_name",
            "patient_mrn",
            "category",
            "category_display",
            "title",
            "description",
            "onset_date",
            "resolution_date",
            "status",
            "recorded_by",
            "recorded_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "patient_name",
            "patient_mrn",
            "category_display",
            "recorded_by",
            "recorded_by_username",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user:
            validated_data["recorded_by"] = request.user
        instance = super().create(validated_data)
        record_clinical_audit(
            resource_type="MEDICAL_HISTORY",
            resource_id=instance.id,
            action="CREATED",
            user=request.user if request else None,
            patient=instance.patient,
            description=f"Medical history '{instance.title}' recorded for {instance.patient.mrn}",
        )
        return instance

    def update(self, instance, validated_data):
        request = self.context.get("request")
        updated = super().update(instance, validated_data)
        record_clinical_audit(
            resource_type="MEDICAL_HISTORY",
            resource_id=updated.id,
            action="UPDATED",
            user=request.user if request else None,
            patient=updated.patient,
            description=f"Medical history #{updated.id} updated",
        )
        return updated


class PatientTimelineEventSerializer(serializers.Serializer):
    category = serializers.CharField()
    timestamp = serializers.CharField()
    reference_id = serializers.CharField()
    title = serializers.CharField()
    summary = serializers.CharField()
    details = serializers.DictField()
