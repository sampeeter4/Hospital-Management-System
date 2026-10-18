from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import (
    DispenseRecord,
    DispensedItem,
    Medicine,
    MedicineBatch,
    PharmacyLocation,
    Prescription,
    PrescriptionItem,
    StockMovement,
)
from .services import check_allergy_conflict


class MedicineSerializer(serializers.ModelSerializer):

    class Meta:
        model = Medicine
        fields = [
            "id",
            "code",
            "generic_name",
            "brand_name",
            "active_ingredients",
            "strength",
            "dosage_form",
            "route_of_administration",
            "manufacturer",
            "description",
            "dispensing_unit",
            "requires_prescription",
            "low_stock_threshold",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PharmacyLocationSerializer(serializers.ModelSerializer):
    hospital_name = serializers.CharField(
        source="hospital.name",
        read_only=True,
    )

    class Meta:
        model = PharmacyLocation
        fields = [
            "id",
            "hospital",
            "hospital_name",
            "location_code",
            "name",
            "location_details",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "hospital_name", "created_at", "updated_at"]


class MedicineBatchSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(
        source="medicine.generic_name",
        read_only=True,
    )
    medicine_code = serializers.CharField(
        source="medicine.code",
        read_only=True,
    )
    location_name = serializers.CharField(
        source="pharmacy_location.name",
        read_only=True,
    )
    is_expired = serializers.BooleanField(
        read_only=True,
    )

    class Meta:
        model = MedicineBatch
        fields = [
            "id",
            "medicine",
            "medicine_name",
            "medicine_code",
            "pharmacy_location",
            "location_name",
            "batch_number",
            "supplier",
            "expiry_date",
            "received_date",
            "purchase_cost",
            "selling_price",
            "received_quantity",
            "available_quantity",
            "batch_status",
            "is_expired",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "medicine_name",
            "medicine_code",
            "location_name",
            "is_expired",
            "created_at",
            "updated_at",
        ]


class StockMovementSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(
        source="batch.medicine.generic_name",
        read_only=True,
    )
    batch_number = serializers.CharField(
        source="batch.batch_number",
        read_only=True,
    )
    location_name = serializers.CharField(
        source="pharmacy_location.name",
        read_only=True,
    )
    acting_username = serializers.CharField(
        source="acting_user.username",
        read_only=True,
    )

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "batch",
            "batch_number",
            "medicine_name",
            "pharmacy_location",
            "location_name",
            "movement_type",
            "quantity",
            "previous_balance",
            "resulting_balance",
            "reference_number",
            "acting_user",
            "acting_username",
            "reason",
            "created_at",
        ]
        read_only_fields = fields


class StockReceiptCreateSerializer(serializers.Serializer):
    medicine = serializers.PrimaryKeyRelatedField(queryset=Medicine.objects.all())
    pharmacy_location = serializers.PrimaryKeyRelatedField(queryset=PharmacyLocation.objects.all())
    batch_number = serializers.CharField(max_length=100)
    expiry_date = serializers.DateField()
    quantity = serializers.IntegerField(min_value=1)
    purchase_cost = serializers.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    selling_price = serializers.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    supplier = serializers.CharField(max_length=150, required=False, allow_blank=True)


class StockAdjustmentCreateSerializer(serializers.Serializer):
    batch = serializers.PrimaryKeyRelatedField(queryset=MedicineBatch.objects.all())
    adjustment_type = serializers.ChoiceField(choices=["INCREASE", "DECREASE", "WASTAGE", "EXPIRED"])
    quantity = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(min_length=5)


class PrescriptionItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(
        source="medicine.generic_name",
        read_only=True,
    )
    medicine_code = serializers.CharField(
        source="medicine.code",
        read_only=True,
    )
    remaining_quantity = serializers.IntegerField(
        read_only=True,
    )

    class Meta:
        model = PrescriptionItem
        fields = [
            "id",
            "prescription",
            "medicine",
            "medicine_name",
            "medicine_code",
            "dosage_instructions",
            "route",
            "frequency",
            "duration_value",
            "duration_unit",
            "quantity_prescribed",
            "quantity_dispensed",
            "remaining_quantity",
            "dispensing_unit",
            "refills_allowed",
            "refills_used",
            "patient_instructions",
            "allow_substitution",
            "status",
            "allergy_warning",
            "allergy_override",
            "allergy_override_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "prescription",
            "medicine_name",
            "medicine_code",
            "quantity_dispensed",
            "remaining_quantity",
            "status",
            "allergy_warning",
            "created_at",
            "updated_at",
        ]


class PrescriptionSerializer(serializers.ModelSerializer):
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
    issued_by_username = serializers.CharField(
        source="issued_by.username",
        read_only=True,
    )
    cancelled_by_username = serializers.CharField(
        source="cancelled_by.username",
        read_only=True,
    )
    items = PrescriptionItemSerializer(
        many=True,
        required=False,
    )

    class Meta:
        model = Prescription
        fields = [
            "id",
            "prescription_reference",
            "patient",
            "patient_name",
            "patient_mrn",
            "doctor",
            "doctor_name",
            "doctor_id_code",
            "hospital",
            "hospital_name",
            "encounter",
            "appointment",
            "status",
            "prescribed_date",
            "clinical_indication",
            "general_instructions",
            "items",
            "cancellation_reason",
            "cancelled_by_username",
            "cancelled_at",
            "issued_by_username",
            "issued_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "prescription_reference",
            "patient_name",
            "patient_mrn",
            "doctor_name",
            "doctor_id_code",
            "hospital_name",
            "status",
            "cancellation_reason",
            "cancelled_by_username",
            "cancelled_at",
            "issued_by_username",
            "issued_at",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "doctor": {"required": False},
            "hospital": {"required": False},
        }

    def validate(self, data):
        request = self.context.get("request")
        user = request.user if request else None

        # Doctor profile assignment
        if user and user.role == "DOCTOR":
            if not hasattr(user, "doctor_profile"):
                raise serializers.ValidationError({"doctor": "Doctor profile not found for user."})
            data["doctor"] = user.doctor_profile

        doctor = data.get("doctor") or getattr(self.instance, "doctor", None)
        if not doctor:
            raise serializers.ValidationError({"doctor": "Doctor is required."})

        if "hospital" not in data or not data.get("hospital"):
            data["hospital"] = doctor.hospital

        # Lock editing if not in DRAFT
        if self.instance and self.instance.status != Prescription.Status.DRAFT:
            raise serializers.ValidationError({"status": f"Prescription in status {self.instance.status} cannot be edited."})

        return data

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        prescription = Prescription.objects.create(**validated_data)

        patient = prescription.patient
        for item_data in items_data:
            med = item_data.get("medicine")
            is_conflict, warning_msg = check_allergy_conflict(patient, med)
            if is_conflict:
                item_data["allergy_warning"] = warning_msg
            PrescriptionItem.objects.create(prescription=prescription, **item_data)

        return prescription


class PrescriptionCancelSerializer(serializers.Serializer):
    cancellation_reason = serializers.CharField(
        required=True,
        min_length=5,
        help_text="Clinical justification for prescription cancellation",
    )


class DispensedItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(
        source="prescription_item.medicine.generic_name",
        read_only=True,
    )
    batch_number = serializers.CharField(
        source="batch.batch_number",
        read_only=True,
    )

    class Meta:
        model = DispensedItem
        fields = [
            "id",
            "prescription_item",
            "medicine_name",
            "batch",
            "batch_number",
            "quantity",
            "unit_price",
            "total_price",
            "created_at",
        ]
        read_only_fields = fields


class DispenseRecordSerializer(serializers.ModelSerializer):
    prescription_reference = serializers.CharField(
        source="prescription.prescription_reference",
        read_only=True,
    )
    patient_name = serializers.CharField(
        source="prescription.patient.user.get_full_name",
        read_only=True,
    )
    location_name = serializers.CharField(
        source="pharmacy_location.name",
        read_only=True,
    )
    dispensed_by_username = serializers.CharField(
        source="dispensed_by.username",
        read_only=True,
    )
    reversed_by_username = serializers.CharField(
        source="reversed_by.username",
        read_only=True,
    )
    items = DispensedItemSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = DispenseRecord
        fields = [
            "id",
            "dispense_reference",
            "prescription",
            "prescription_reference",
            "patient_name",
            "pharmacy_location",
            "location_name",
            "dispensed_by_username",
            "dispensed_at",
            "notes",
            "is_reversed",
            "reversal_reason",
            "reversed_by_username",
            "reversed_at",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class DispenseCreateItemSerializer(serializers.Serializer):
    prescription_item_id = serializers.IntegerField(min_value=1)
    batch_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)


class DispenseCreateSerializer(serializers.Serializer):
    prescription = serializers.PrimaryKeyRelatedField(queryset=Prescription.objects.all())
    pharmacy_location = serializers.PrimaryKeyRelatedField(queryset=PharmacyLocation.objects.all())
    notes = serializers.CharField(required=False, allow_blank=True)
    items = DispenseCreateItemSerializer(many=True, allow_empty=False)


class DispenseReturnSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=5, help_text="Reason for dispense return/reversal")
    return_to_stock = serializers.BooleanField(default=True, help_text="If True, stock is restored to batch; if False, recorded as wastage")
