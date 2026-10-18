from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from hospitals.models import Department, Doctor, Hospital
from patients.models import Patient
from .models import (
    Admission,
    Bed,
    BedAssignment,
    BedReservation,
    InpatientAuditLog,
    Room,
    Ward,
)
from .services import (
    admit_patient,
    cancel_bed_reservation,
    discharge_patient,
    record_inpatient_audit,
    reserve_bed,
    transfer_patient,
    update_bed_operational_status,
)


class WardSerializer(serializers.ModelSerializer):
    hospital_name = serializers.CharField(source="hospital.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    ward_type_display = serializers.CharField(source="get_ward_type_display", read_only=True)
    gender_policy_display = serializers.CharField(source="get_gender_policy_display", read_only=True)
    total_rooms = serializers.SerializerMethodField()
    total_beds = serializers.SerializerMethodField()
    occupied_beds = serializers.SerializerMethodField()
    available_beds = serializers.SerializerMethodField()

    class Meta:
        model = Ward
        fields = [
            "id",
            "hospital",
            "hospital_name",
            "department",
            "department_name",
            "code",
            "name",
            "ward_type",
            "ward_type_display",
            "gender_policy",
            "gender_policy_display",
            "floor",
            "description",
            "is_active",
            "total_rooms",
            "total_beds",
            "occupied_beds",
            "available_beds",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    @extend_schema_field(serializers.IntegerField())
    def get_total_rooms(self, obj):
        return obj.rooms.filter(is_active=True).count()

    @extend_schema_field(serializers.IntegerField())
    def get_total_beds(self, obj):
        return Bed.objects.filter(room__ward=obj, room__is_active=True).exclude(status=Bed.Status.INACTIVE).count()

    @extend_schema_field(serializers.IntegerField())
    def get_occupied_beds(self, obj):
        return Bed.objects.filter(room__ward=obj, status=Bed.Status.OCCUPIED).count()

    @extend_schema_field(serializers.IntegerField())
    def get_available_beds(self, obj):
        return Bed.objects.filter(room__ward=obj, status=Bed.Status.AVAILABLE, room__is_active=True).count()

    def validate(self, attrs):
        instance = Ward(**attrs)
        if self.instance:
            for attr, val in attrs.items():
                setattr(self.instance, attr, val)
            instance = self.instance
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
        return attrs


class RoomSerializer(serializers.ModelSerializer):
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    ward_code = serializers.CharField(source="ward.code", read_only=True)
    hospital_name = serializers.CharField(source="ward.hospital.name", read_only=True)
    room_type_display = serializers.CharField(source="get_room_type_display", read_only=True)
    current_bed_count = serializers.SerializerMethodField()
    available_bed_count = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            "id",
            "ward",
            "ward_name",
            "ward_code",
            "hospital_name",
            "room_number",
            "room_type",
            "room_type_display",
            "floor",
            "capacity",
            "is_active",
            "current_bed_count",
            "available_bed_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    @extend_schema_field(serializers.IntegerField())
    def get_current_bed_count(self, obj):
        return obj.beds.count()

    @extend_schema_field(serializers.IntegerField())
    def get_available_bed_count(self, obj):
        return obj.beds.filter(status=Bed.Status.AVAILABLE).count()

    def validate(self, attrs):
        instance = Room(**attrs)
        if self.instance:
            for attr, val in attrs.items():
                setattr(self.instance, attr, val)
            instance = self.instance
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
        return attrs


class BedSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    ward_id = serializers.IntegerField(source="room.ward.id", read_only=True)
    ward_name = serializers.CharField(source="room.ward.name", read_only=True)
    hospital_id = serializers.IntegerField(source="room.ward.hospital.id", read_only=True)
    hospital_name = serializers.CharField(source="room.ward.hospital.name", read_only=True)
    bed_type_display = serializers.CharField(source="get_bed_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    current_patient_mrn = serializers.SerializerMethodField()
    current_patient_name = serializers.SerializerMethodField()

    class Meta:
        model = Bed
        fields = [
            "id",
            "room",
            "room_number",
            "ward_id",
            "ward_name",
            "hospital_id",
            "hospital_name",
            "bed_number",
            "bed_type",
            "bed_type_display",
            "status",
            "status_display",
            "equipment_details",
            "current_patient_mrn",
            "current_patient_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_current_patient_mrn(self, obj):
        active = obj.assignments.filter(is_active=True).select_related("admission__patient").first()
        return active.admission.patient.mrn if active else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_current_patient_name(self, obj):
        active = obj.assignments.filter(is_active=True).select_related("admission__patient__user").first()
        if active and active.admission.patient.user:
            return active.admission.patient.user.get_full_name() or active.admission.patient.user.username
        return None

    def validate(self, attrs):
        instance = Bed(**attrs)
        if self.instance:
            for attr, val in attrs.items():
                setattr(self.instance, attr, val)
            instance = self.instance
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
        return attrs


class BedStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Bed.Status.choices)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class BedAssignmentSerializer(serializers.ModelSerializer):
    admission_reference = serializers.CharField(source="admission.admission_reference", read_only=True)
    bed_number = serializers.CharField(source="bed.bed_number", read_only=True)
    room_number = serializers.CharField(source="bed.room.room_number", read_only=True)
    ward_name = serializers.CharField(source="bed.room.ward.name", read_only=True)
    patient_mrn = serializers.CharField(source="admission.patient.mrn", read_only=True)
    patient_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.CharField(source="assigned_by.username", read_only=True)
    released_by_name = serializers.CharField(source="released_by.username", read_only=True)

    class Meta:
        model = BedAssignment
        fields = [
            "id",
            "admission",
            "admission_reference",
            "bed",
            "bed_number",
            "room_number",
            "ward_name",
            "patient_mrn",
            "patient_name",
            "start_time",
            "end_time",
            "is_active",
            "assigned_by",
            "assigned_by_name",
            "released_by",
            "released_by_name",
            "reason",
            "created_at",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.CharField())
    def get_patient_name(self, obj):
        patient = obj.admission.patient
        if patient and patient.user:
            return patient.user.get_full_name() or patient.user.username
        return ""


class BedReservationSerializer(serializers.ModelSerializer):
    bed_number = serializers.CharField(source="bed.bed_number", read_only=True)
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)
    patient_name = serializers.SerializerMethodField()
    reserved_by_name = serializers.CharField(source="reserved_by.username", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = BedReservation
        fields = [
            "id",
            "bed",
            "bed_number",
            "patient",
            "patient_mrn",
            "patient_name",
            "admission",
            "reserved_by",
            "reserved_by_name",
            "reserved_from",
            "reserved_until",
            "status",
            "status_display",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "reserved_by",
            "status",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.CharField())
    def get_patient_name(self, obj):
        if obj.patient and obj.patient.user:
            return obj.patient.user.get_full_name() or obj.patient.user.username
        return ""


class AdmissionSerializer(serializers.ModelSerializer):
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    hospital_name = serializers.CharField(source="hospital.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    admission_type_display = serializers.CharField(source="get_admission_type_display", read_only=True)
    admitted_by_name = serializers.CharField(source="admitted_by.username", read_only=True)
    discharged_by_name = serializers.CharField(source="discharged_by.username", read_only=True)
    discharge_disposition_display = serializers.CharField(source="get_discharge_disposition_display", read_only=True)

    # Current bed assignment info
    current_bed = serializers.SerializerMethodField()
    current_bed_id = serializers.SerializerMethodField()
    current_ward_name = serializers.SerializerMethodField()
    current_room_number = serializers.SerializerMethodField()
    bed_assignments = BedAssignmentSerializer(many=True, read_only=True)

    # Optional initial bed to admit directly on creation
    initial_bed_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Admission
        fields = [
            "id",
            "admission_reference",
            "patient",
            "patient_mrn",
            "patient_name",
            "hospital",
            "hospital_name",
            "attending_doctor",
            "doctor_name",
            "department",
            "department_name",
            "encounter",
            "appointment",
            "admission_type",
            "admission_type_display",
            "admission_reason",
            "admission_date",
            "expected_discharge_date",
            "actual_discharge_date",
            "status",
            "status_display",
            "admitted_by",
            "admitted_by_name",
            "discharged_by",
            "discharged_by_name",
            "discharge_disposition",
            "discharge_disposition_display",
            "discharge_instructions",
            "discharge_summary",
            "cancellation_reason",
            "current_bed",
            "current_bed_id",
            "current_ward_name",
            "current_room_number",
            "bed_assignments",
            "initial_bed_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "admission_reference",
            "hospital",
            "department",
            "status",
            "actual_discharge_date",
            "admitted_by",
            "discharged_by",
            "discharge_disposition",
            "discharge_instructions",
            "discharge_summary",
            "cancellation_reason",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.CharField())
    def get_patient_name(self, obj):
        if obj.patient and obj.patient.user:
            return obj.patient.user.get_full_name() or obj.patient.user.username
        return ""

    @extend_schema_field(serializers.CharField())
    def get_doctor_name(self, obj):
        if obj.attending_doctor and obj.attending_doctor.user:
            return obj.attending_doctor.user.get_full_name() or obj.attending_doctor.user.username
        return ""

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_current_bed(self, obj):
        active = obj.bed_assignments.filter(is_active=True).select_related("bed").first()
        return active.bed.bed_number if active else None

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_current_bed_id(self, obj):
        active = obj.bed_assignments.filter(is_active=True).first()
        return active.bed_id if active else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_current_ward_name(self, obj):
        active = obj.bed_assignments.filter(is_active=True).select_related("bed__room__ward").first()
        return active.bed.room.ward.name if active else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_current_room_number(self, obj):
        active = obj.bed_assignments.filter(is_active=True).select_related("bed__room").first()
        return active.bed.room.room_number if active else None

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None

        # Resolve attending doctor if not specified and user is doctor
        if "attending_doctor" not in attrs:
            if user and hasattr(user, "doctor_profile"):
                attrs["attending_doctor"] = user.doctor_profile
            else:
                raise serializers.ValidationError({"attending_doctor": "Attending doctor must be specified."})

        # Inherit hospital and department from attending doctor
        doctor = attrs["attending_doctor"]
        attrs["hospital"] = doctor.hospital
        attrs["department"] = doctor.department

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request else None

        initial_bed_id = validated_data.pop("initial_bed_id", None)
        admission = Admission.objects.create(**validated_data)

        record_inpatient_audit(
            resource_type="ADMISSION",
            resource_id=admission.admission_reference,
            action="REQUESTED",
            user=user,
            patient=admission.patient,
            description=f"Inpatient admission requested for {admission.patient.mrn} under Dr. {admission.attending_doctor.doctor_id}",
        )

        # If initial bed provided, admit immediately
        if initial_bed_id:
            try:
                bed = Bed.objects.get(id=initial_bed_id)
                admit_patient(
                    admission=admission,
                    bed=bed,
                    user=user,
                    reason="Initial admission on creation",
                )
            except Bed.DoesNotExist:
                raise serializers.ValidationError({"initial_bed_id": "Specified bed does not exist."})
            except DjangoValidationError as exc:
                raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)

        return admission


class AdmitActionSerializer(serializers.Serializer):
    bed_id = serializers.IntegerField(required=True, help_text="ID of the available Bed to allocate")
    reason = serializers.CharField(required=False, allow_blank=True, default="Inpatient bed allocation")


class TransferActionSerializer(serializers.Serializer):
    destination_bed_id = serializers.IntegerField(required=True, help_text="ID of the target available Bed")
    reason = serializers.CharField(required=True, min_length=3, help_text="Clinical justification / Reason for bed transfer")


class DischargeActionSerializer(serializers.Serializer):
    discharge_disposition = serializers.ChoiceField(
        choices=Admission.DischargeDisposition.choices,
        default=Admission.DischargeDisposition.HOME_ROUTINE,
    )
    discharge_instructions = serializers.CharField(required=False, allow_blank=True, default="")
    discharge_summary = serializers.CharField(required=False, allow_blank=True, default="")
    discharge_date = serializers.DateTimeField(required=False, allow_null=True)


class AdmissionCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, min_length=3, help_text="Reason for cancelling the admission request")


class BedReserveActionSerializer(serializers.Serializer):
    bed_id = serializers.IntegerField()
    patient_id = serializers.IntegerField(required=False, allow_null=True)
    admission_id = serializers.IntegerField(required=False, allow_null=True)
    reserved_until = serializers.DateTimeField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class InpatientAuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)

    class Meta:
        model = InpatientAuditLog
        fields = [
            "id",
            "resource_type",
            "resource_id",
            "action",
            "user",
            "user_name",
            "user_role",
            "patient",
            "patient_mrn",
            "description",
            "metadata",
            "created_at",
        ]
        read_only_fields = fields

