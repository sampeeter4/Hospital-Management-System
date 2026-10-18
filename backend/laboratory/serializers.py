from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from hospitals.models import Doctor
from patients.models import Patient
from .models import (
    CriticalResultNotification,
    LabAuditLog,
    LabOrder,
    LabOrderItem,
    LabReferenceRange,
    LabResult,
    LabResultCorrection,
    LabResultParameter,
    LabSpecimen,
    LabTest,
    LabTestParameter,
)
from .services import (
    acknowledge_critical_notification,
    collect_specimen,
    correct_verified_result,
    enter_lab_result,
    receive_specimen,
    record_lab_audit,
    reject_specimen,
    verify_lab_result,
)


class LabReferenceRangeSerializer(serializers.ModelSerializer):
    parameter_code = serializers.CharField(source="parameter.code", read_only=True)
    parameter_name = serializers.CharField(source="parameter.name", read_only=True)
    gender_display = serializers.CharField(source="get_gender_display", read_only=True)

    class Meta:
        model = LabReferenceRange
        fields = [
            "id",
            "parameter",
            "parameter_code",
            "parameter_name",
            "gender",
            "gender_display",
            "age_min_years",
            "age_max_years",
            "min_normal_value",
            "max_normal_value",
            "critical_low_value",
            "critical_high_value",
            "normal_text_value",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        instance = LabReferenceRange(**attrs)
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
        return attrs


class LabTestParameterSerializer(serializers.ModelSerializer):
    reference_ranges = LabReferenceRangeSerializer(many=True, read_only=True)
    data_type_display = serializers.CharField(source="get_data_type_display", read_only=True)

    class Meta:
        model = LabTestParameter
        fields = [
            "id",
            "test",
            "code",
            "name",
            "data_type",
            "data_type_display",
            "unit",
            "sort_order",
            "is_active",
            "reference_ranges",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class LabTestSerializer(serializers.ModelSerializer):
    parameters = LabTestParameterSerializer(many=True, read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    parameter_count = serializers.IntegerField(source="parameters.count", read_only=True)

    class Meta:
        model = LabTest
        fields = [
            "id",
            "code",
            "name",
            "category",
            "category_display",
            "description",
            "specimen_type",
            "collection_instructions",
            "preparation_instructions",
            "methodology",
            "turnaround_time_hours",
            "is_active",
            "parameters",
            "parameter_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class LabOrderItemSerializer(serializers.ModelSerializer):
    test_code = serializers.CharField(source="test.code", read_only=True)
    test_name = serializers.CharField(source="test.name", read_only=True)
    specimen_type = serializers.CharField(source="test.specimen_type", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    has_result = serializers.SerializerMethodField()
    result_id = serializers.SerializerMethodField()

    class Meta:
        model = LabOrderItem
        fields = [
            "id",
            "order",
            "test",
            "test_code",
            "test_name",
            "specimen_type",
            "priority",
            "priority_display",
            "status",
            "status_display",
            "cancellation_reason",
            "has_result",
            "result_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    @extend_schema_field(serializers.BooleanField())
    def get_has_result(self, obj):
        return hasattr(obj, "result") and obj.result is not None

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_result_id(self, obj):
        return obj.result.id if (hasattr(obj, "result") and obj.result is not None) else None


class LabOrderItemCreateInputSerializer(serializers.Serializer):
    test_id = serializers.IntegerField()
    priority = serializers.ChoiceField(
        choices=LabOrder.Priority.choices,
        default=LabOrder.Priority.ROUTINE,
        required=False,
    )


class LabOrderSerializer(serializers.ModelSerializer):
    items = LabOrderItemSerializer(many=True, read_only=True)
    test_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of active LabTest IDs to include in this order",
    )
    items_input = LabOrderItemCreateInputSerializer(
        many=True,
        write_only=True,
        required=False,
        help_text="Detailed item options with specific priorities per test",
    )
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    hospital_name = serializers.CharField(source="hospital.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    ordered_by_name = serializers.CharField(source="ordered_by.username", read_only=True)

    class Meta:
        model = LabOrder
        fields = [
            "id",
            "order_reference",
            "patient",
            "patient_mrn",
            "patient_name",
            "ordering_doctor",
            "doctor_name",
            "hospital",
            "hospital_name",
            "department",
            "department_name",
            "encounter",
            "appointment",
            "priority",
            "priority_display",
            "status",
            "status_display",
            "clinical_indication",
            "clinical_notes",
            "ordered_by",
            "ordered_by_name",
            "ordered_at",
            "cancelled_by",
            "cancelled_at",
            "cancellation_reason",
            "items",
            "test_ids",
            "items_input",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "order_reference",
            "hospital",
            "department",
            "status",
            "ordered_by",
            "ordered_at",
            "cancelled_by",
            "cancelled_at",
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
        if obj.ordering_doctor and obj.ordering_doctor.user:
            return obj.ordering_doctor.user.get_full_name() or obj.ordering_doctor.user.username
        return ""

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None

        # Resolve ordering doctor if not explicitly supplied
        if "ordering_doctor" not in attrs:
            if user and hasattr(user, "doctor_profile"):
                attrs["ordering_doctor"] = user.doctor_profile
            else:
                raise serializers.ValidationError({"ordering_doctor": "Ordering doctor must be specified."})

        # Inherit hospital and department from doctor
        doctor = attrs["ordering_doctor"]
        attrs["hospital"] = doctor.hospital
        attrs["department"] = doctor.department

        # Require at least one test to order
        test_ids = attrs.get("test_ids")
        items_input = attrs.get("items_input")
        if not test_ids and not items_input:
            raise serializers.ValidationError({"tests": "At least one test must be specified via test_ids or items_input."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request else None

        test_ids = validated_data.pop("test_ids", None)
        items_input = validated_data.pop("items_input", None)

        validated_data["ordered_by"] = user
        order = LabOrder.objects.create(**validated_data)

        # Collect target tests and priorities
        tests_to_create = []
        if items_input:
            for itm in items_input:
                t = LabTest.objects.filter(id=itm["test_id"], is_active=True).first()
                if not t:
                    raise serializers.ValidationError({"items_input": f"Test with id {itm['test_id']} does not exist or is inactive."})
                tests_to_create.append((t, itm.get("priority", order.priority)))
        elif test_ids:
            for tid in test_ids:
                t = LabTest.objects.filter(id=tid, is_active=True).first()
                if not t:
                    raise serializers.ValidationError({"test_ids": f"Test with id {tid} does not exist or is inactive."})
                tests_to_create.append((t, order.priority))

        # Create order items and group by specimen type
        specimen_items_map = {}
        for test_obj, prio in tests_to_create:
            order_item = LabOrderItem.objects.create(
                order=order,
                test=test_obj,
                priority=prio,
                status=LabOrderItem.ItemStatus.PENDING,
            )
            spec_type = test_obj.specimen_type or "General Matrix"
            specimen_items_map.setdefault(spec_type, []).append(order_item)

        # Auto-accession specimen records for collection
        for spec_type, items_list in specimen_items_map.items():
            specimen = LabSpecimen.objects.create(
                order=order,
                specimen_type=spec_type,
                status=LabSpecimen.Status.PENDING_COLLECTION,
            )
            specimen.order_items.set(items_list)

        record_lab_audit(
            resource_type="ORDER",
            resource_id=order.order_reference,
            action="CREATED",
            user=user,
            patient=order.patient,
            description=f"Lab order {order.order_reference} created with {len(tests_to_create)} test(s)",
            metadata={"test_ids": [t.id for t, _ in tests_to_create]},
        )

        return order


class LabOrderCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(
        required=True,
        min_length=3,
        help_text="Clinical justification for cancelling this laboratory order",
    )


class LabSpecimenSerializer(serializers.ModelSerializer):
    order_reference = serializers.CharField(source="order.order_reference", read_only=True)
    patient_mrn = serializers.CharField(source="order.patient.mrn", read_only=True)
    patient_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    collected_by_name = serializers.CharField(source="collected_by.username", read_only=True)
    received_by_name = serializers.CharField(source="received_by.username", read_only=True)
    rejected_by_name = serializers.CharField(source="rejected_by.username", read_only=True)
    item_count = serializers.IntegerField(source="order_items.count", read_only=True)

    class Meta:
        model = LabSpecimen
        fields = [
            "id",
            "barcode",
            "order",
            "order_reference",
            "patient_mrn",
            "patient_name",
            "specimen_type",
            "collection_location",
            "status",
            "status_display",
            "collected_at",
            "collected_by",
            "collected_by_name",
            "received_at",
            "received_by",
            "received_by_name",
            "rejected_at",
            "rejected_by",
            "rejected_by_name",
            "rejection_reason",
            "notes",
            "item_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "barcode",
            "order",
            "status",
            "collected_at",
            "collected_by",
            "received_at",
            "received_by",
            "rejected_at",
            "rejected_by",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.CharField())
    def get_patient_name(self, obj):
        if obj.order and obj.order.patient and obj.order.patient.user:
            return obj.order.patient.user.get_full_name() or obj.order.patient.user.username
        return ""


class SpecimenCollectSerializer(serializers.Serializer):
    collection_location = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Collection site/room, e.g. Phlebotomy Station 1",
    )


class SpecimenRejectSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(
        required=True,
        min_length=3,
        help_text="Reason for specimen rejection (e.g. Hemolyzed sample, Clotted EDTA, Insufficient quantity)",
    )


class LabResultParameterSerializer(serializers.ModelSerializer):
    parameter_code = serializers.CharField(source="parameter.code", read_only=True)
    parameter_name = serializers.CharField(source="parameter.name", read_only=True)
    data_type = serializers.CharField(source="parameter.data_type", read_only=True)
    abnormality_display = serializers.CharField(source="get_abnormality_flag_display", read_only=True)
    critical_display = serializers.CharField(source="get_critical_flag_display", read_only=True)

    class Meta:
        model = LabResultParameter
        fields = [
            "id",
            "result",
            "parameter",
            "parameter_code",
            "parameter_name",
            "data_type",
            "numeric_value",
            "text_value",
            "unit",
            "reference_range_display",
            "abnormality_flag",
            "abnormality_display",
            "is_critical",
            "critical_flag",
            "critical_display",
        ]
        read_only_fields = [
            "id",
            "result",
            "reference_range_display",
            "abnormality_flag",
            "is_critical",
            "critical_flag",
        ]


class LabResultCorrectionSerializer(serializers.ModelSerializer):
    parameter_name = serializers.CharField(source="parameter.name", read_only=True)
    parameter_code = serializers.CharField(source="parameter.code", read_only=True)
    corrected_by_name = serializers.CharField(source="corrected_by.username", read_only=True)

    class Meta:
        model = LabResultCorrection
        fields = [
            "id",
            "result",
            "parameter",
            "parameter_code",
            "parameter_name",
            "previous_numeric_value",
            "previous_text_value",
            "new_numeric_value",
            "new_text_value",
            "correction_reason",
            "corrected_by",
            "corrected_by_name",
            "corrected_at",
        ]
        read_only_fields = fields


class LabResultSerializer(serializers.ModelSerializer):
    parameter_values = LabResultParameterSerializer(many=True, read_only=True)
    corrections = LabResultCorrectionSerializer(many=True, read_only=True)
    order_reference = serializers.CharField(source="order_item.order.order_reference", read_only=True)
    patient_mrn = serializers.CharField(source="order_item.order.patient.mrn", read_only=True)
    patient_name = serializers.SerializerMethodField()
    test_name = serializers.CharField(source="order_item.test.name", read_only=True)
    test_code = serializers.CharField(source="order_item.test.code", read_only=True)
    specimen_barcode = serializers.CharField(source="specimen.barcode", read_only=True, default=None)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    entered_by_name = serializers.CharField(source="entered_by.username", read_only=True)
    verified_by_name = serializers.CharField(source="verified_by.username", read_only=True)

    class Meta:
        model = LabResult
        fields = [
            "id",
            "result_reference",
            "order_item",
            "order_reference",
            "patient_mrn",
            "patient_name",
            "test_code",
            "test_name",
            "specimen",
            "specimen_barcode",
            "status",
            "status_display",
            "overall_interpretation",
            "clinical_comments",
            "is_critical",
            "is_abnormal",
            "entered_by",
            "entered_by_name",
            "entered_at",
            "verified_by",
            "verified_by_name",
            "verified_at",
            "parameter_values",
            "corrections",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "result_reference",
            "order_item",
            "status",
            "is_critical",
            "is_abnormal",
            "entered_by",
            "entered_at",
            "verified_by",
            "verified_at",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.CharField())
    def get_patient_name(self, obj):
        patient = obj.order_item.order.patient
        if patient and patient.user:
            return patient.user.get_full_name() or patient.user.username
        return ""


class ParameterValueEntryInputSerializer(serializers.Serializer):
    parameter_id = serializers.IntegerField()
    numeric_value = serializers.DecimalField(max_digits=12, decimal_places=3, required=False, allow_null=True)
    text_value = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class LabResultEntrySerializer(serializers.Serializer):
    order_item_id = serializers.IntegerField()
    specimen_id = serializers.IntegerField(required=False, allow_null=True)
    parameter_values = ParameterValueEntryInputSerializer(many=True)
    overall_interpretation = serializers.CharField(required=False, allow_blank=True, default="")
    clinical_comments = serializers.CharField(required=False, allow_blank=True, default="")


class ParameterCorrectionInputSerializer(serializers.Serializer):
    parameter_id = serializers.IntegerField()
    new_numeric_value = serializers.DecimalField(max_digits=12, decimal_places=3, required=False, allow_null=True)
    new_text_value = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class LabResultCorrectionActionSerializer(serializers.Serializer):
    corrections = ParameterCorrectionInputSerializer(many=True)
    correction_reason = serializers.CharField(min_length=5, help_text="Clinical justification for correcting released result")


class CriticalResultNotificationSerializer(serializers.ModelSerializer):
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)
    patient_name = serializers.SerializerMethodField()
    order_reference = serializers.CharField(source="order.order_reference", read_only=True)
    result_reference = serializers.CharField(source="result.result_reference", read_only=True)
    test_name = serializers.CharField(source="result.order_item.test.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    acknowledged_by_name = serializers.CharField(source="acknowledged_by.username", read_only=True)

    class Meta:
        model = CriticalResultNotification
        fields = [
            "id",
            "notification_reference",
            "result",
            "result_reference",
            "order",
            "order_reference",
            "test_name",
            "patient",
            "patient_mrn",
            "patient_name",
            "critical_details",
            "status",
            "status_display",
            "generated_at",
            "acknowledged_at",
            "acknowledged_by",
            "acknowledged_by_name",
            "acknowledgement_notes",
        ]
        read_only_fields = [
            "id",
            "notification_reference",
            "result",
            "order",
            "patient",
            "critical_details",
            "status",
            "generated_at",
            "acknowledged_at",
            "acknowledged_by",
        ]

    @extend_schema_field(serializers.CharField())
    def get_patient_name(self, obj):
        if obj.patient and obj.patient.user:
            return obj.patient.user.get_full_name() or obj.patient.user.username
        return ""


class CriticalNotificationAcknowledgeSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class LabAuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)

    class Meta:
        model = LabAuditLog
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
