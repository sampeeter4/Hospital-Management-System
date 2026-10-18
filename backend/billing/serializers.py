from decimal import Decimal
from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from hospitals.models import Hospital
from patients.models import Patient
from .models import (
    BillingAuditLog,
    CreditNote,
    InsuranceClaim,
    InsurancePreAuthorization,
    InsuranceProvider,
    Invoice,
    InvoiceLineItem,
    PatientInsurancePolicy,
    Payment,
    PaymentAllocation,
    Refund,
    ServiceItem,
)
from .services import (
    allocate_payment,
    issue_credit_note,
    issue_invoice,
    process_refund,
    recalculate_invoice_totals,
    record_billing_audit,
    record_claim_decision,
    record_claim_payment,
    record_payment,
    reverse_payment_allocation,
    void_invoice,
)


class ServiceItemSerializer(serializers.ModelSerializer):
    hospital_name = serializers.CharField(source="hospital.name", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = ServiceItem
        fields = [
            "id",
            "hospital",
            "hospital_name",
            "code",
            "name",
            "description",
            "category",
            "category_display",
            "unit",
            "unit_price",
            "currency",
            "tax_rate",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        instance = ServiceItem(**attrs)
        if self.instance:
            for attr, val in attrs.items():
                setattr(self.instance, attr, val)
            instance = self.instance
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
        return attrs


class InvoiceLineItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = InvoiceLineItem
        fields = [
            "id",
            "invoice",
            "service_item",
            "service_code",
            "description",
            "quantity",
            "unit_price",
            "discount",
            "tax_rate",
            "tax_amount",
            "subtotal",
            "total_amount",
            "source_module",
            "source_id",
            "created_at",
        ]
        read_only_fields = ["id", "tax_amount", "subtotal", "total_amount", "created_at"]


class InvoiceLineItemInputSerializer(serializers.Serializer):
    service_item_id = serializers.IntegerField(required=False, allow_null=True)
    service_code = serializers.CharField(max_length=50)
    description = serializers.CharField(max_length=255)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal("0.00"))
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=Decimal("0.00"))
    source_module = serializers.CharField(max_length=50, required=False, allow_blank=True, default="MANUAL")
    source_id = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")


class InvoiceSerializer(serializers.ModelSerializer):
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    line_items_input = InvoiceLineItemInputSerializer(many=True, write_only=True, required=False)
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)
    patient_name = serializers.SerializerMethodField()
    hospital_name = serializers.CharField(source="hospital.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)
    issued_by_name = serializers.CharField(source="issued_by.username", read_only=True)
    admission_reference = serializers.CharField(source="admission.admission_reference", read_only=True, default=None)
    appointment_reference = serializers.CharField(source="appointment.appointment_reference", read_only=True, default=None)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "patient",
            "patient_mrn",
            "patient_name",
            "hospital",
            "hospital_name",
            "admission",
            "admission_reference",
            "appointment",
            "appointment_reference",
            "encounter",
            "invoice_date",
            "due_date",
            "currency",
            "status",
            "status_display",
            "subtotal",
            "total_discount",
            "total_tax",
            "total_amount",
            "paid_amount",
            "balance_due",
            "created_by",
            "created_by_name",
            "issued_by",
            "issued_by_name",
            "issued_at",
            "notes",
            "line_items",
            "line_items_input",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "invoice_number",
            "status",
            "subtotal",
            "total_discount",
            "total_tax",
            "total_amount",
            "paid_amount",
            "balance_due",
            "created_by",
            "issued_by",
            "issued_at",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.CharField())
    def get_patient_name(self, obj):
        if obj.patient and obj.patient.user:
            return obj.patient.user.get_full_name() or obj.patient.user.username
        return ""

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request else None

        line_items_input = validated_data.pop("line_items_input", [])
        validated_data["created_by"] = user
        validated_data["status"] = Invoice.Status.DRAFT

        invoice = Invoice.objects.create(**validated_data)

        for item_data in line_items_input:
            srv_item = None
            if item_data.get("service_item_id"):
                srv_item = ServiceItem.objects.filter(id=item_data["service_item_id"]).first()

            InvoiceLineItem.objects.create(
                invoice=invoice,
                service_item=srv_item,
                service_code=item_data["service_code"],
                description=item_data["description"],
                quantity=item_data.get("quantity", Decimal("1.00")),
                unit_price=item_data["unit_price"],
                discount=item_data.get("discount", Decimal("0.00")),
                tax_rate=item_data.get("tax_rate", Decimal("0.00")),
                source_module=item_data.get("source_module", "MANUAL"),
                source_id=item_data.get("source_id", ""),
            )

        recalculate_invoice_totals(invoice)

        record_billing_audit(
            resource_type="INVOICE",
            resource_id=invoice.invoice_number,
            action="CREATED_DRAFT",
            user=user,
            patient=invoice.patient,
            description=f"Draft invoice {invoice.invoice_number} created by {user.username if user else 'system'}",
        )
        return invoice


class InvoiceVoidSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=3, help_text="Reason for voiding the invoice")


class PaymentAllocationSerializer(serializers.ModelSerializer):
    payment_reference = serializers.CharField(source="payment.payment_reference", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    reversed_by_name = serializers.CharField(source="reversed_by.username", read_only=True)

    class Meta:
        model = PaymentAllocation
        fields = [
            "id",
            "payment",
            "payment_reference",
            "invoice",
            "invoice_number",
            "amount",
            "allocated_at",
            "is_reversed",
            "reversed_at",
            "reversed_by",
            "reversed_by_name",
            "reversal_reason",
        ]
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    allocations = PaymentAllocationSerializer(many=True, read_only=True)
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)
    patient_name = serializers.SerializerMethodField()
    hospital_name = serializers.CharField(source="hospital.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    received_by_name = serializers.CharField(source="received_by.username", read_only=True)
    allocated_amount = serializers.SerializerMethodField()
    unallocated_amount = serializers.SerializerMethodField()

    # Optional direct invoice allocation on payment receipt
    invoice_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "payment_reference",
            "patient",
            "patient_mrn",
            "patient_name",
            "hospital",
            "hospital_name",
            "payment_date",
            "amount",
            "currency",
            "payment_method",
            "payment_method_display",
            "status",
            "status_display",
            "external_transaction_id",
            "idempotency_key",
            "received_by",
            "received_by_name",
            "notes",
            "allocations",
            "allocated_amount",
            "unallocated_amount",
            "invoice_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "payment_reference",
            "status",
            "received_by",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.CharField())
    def get_patient_name(self, obj):
        if obj.patient and obj.patient.user:
            return obj.patient.user.get_full_name() or obj.patient.user.username
        return ""

    @extend_schema_field(serializers.DecimalField(max_digits=12, decimal_places=2))
    def get_allocated_amount(self, obj):
        from django.db.models import Sum
        return (obj.allocations.filter(is_reversed=False).aggregate(s=Sum("amount"))["s"] or Decimal("0.00")).quantize(Decimal("0.01"))

    @extend_schema_field(serializers.DecimalField(max_digits=12, decimal_places=2))
    def get_unallocated_amount(self, obj):
        allocated = self.get_allocated_amount(obj)
        return max(Decimal("0.00"), obj.amount - allocated).quantize(Decimal("0.01"))

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request else None

        invoice_id = validated_data.pop("invoice_id", None)
        invoice = None
        if invoice_id:
            invoice = Invoice.objects.filter(id=invoice_id).first()
            if not invoice:
                raise serializers.ValidationError({"invoice_id": "Specified invoice does not exist."})

        payment = record_payment(
            patient=validated_data["patient"],
            hospital=validated_data["hospital"],
            amount=validated_data["amount"],
            payment_method=validated_data.get("payment_method", Payment.Method.CASH),
            user=user,
            invoice=invoice,
            external_transaction_id=validated_data.get("external_transaction_id", ""),
            idempotency_key=validated_data.get("idempotency_key", ""),
            notes=validated_data.get("notes", ""),
        )
        return payment


class PaymentAllocationActionSerializer(serializers.Serializer):
    invoice_id = serializers.IntegerField(required=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)


class PaymentReverseActionSerializer(serializers.Serializer):
    allocation_id = serializers.IntegerField(required=True)
    reason = serializers.CharField(required=True, min_length=3)


class RefundSerializer(serializers.ModelSerializer):
    payment_reference = serializers.CharField(source="payment.payment_reference", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True, default=None)
    requested_by_name = serializers.CharField(source="requested_by.username", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.username", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Refund
        fields = [
            "id",
            "refund_reference",
            "payment",
            "payment_reference",
            "invoice",
            "invoice_number",
            "amount",
            "reason",
            "status",
            "status_display",
            "requested_by",
            "requested_by_name",
            "approved_by",
            "approved_by_name",
            "approved_at",
            "executed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "refund_reference",
            "status",
            "requested_by",
            "approved_by",
            "approved_at",
            "executed_at",
            "created_at",
            "updated_at",
        ]


class RefundCreateSerializer(serializers.Serializer):
    payment_id = serializers.IntegerField(required=True)
    invoice_id = serializers.IntegerField(required=False, allow_null=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    reason = serializers.CharField(required=True, min_length=5)


class CreditNoteSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    patient_mrn = serializers.CharField(source="invoice.patient.mrn", read_only=True)
    patient_name = serializers.SerializerMethodField()
    issued_by_name = serializers.CharField(source="issued_by.username", read_only=True)

    class Meta:
        model = CreditNote
        fields = [
            "id",
            "credit_note_number",
            "invoice",
            "invoice_number",
            "patient_mrn",
            "patient_name",
            "amount",
            "reason",
            "issued_by",
            "issued_by_name",
            "issued_at",
            "created_at",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.CharField())
    def get_patient_name(self, obj):
        if obj.invoice and obj.invoice.patient and obj.invoice.patient.user:
            return obj.invoice.patient.user.get_full_name() or obj.invoice.patient.user.username
        return ""


class CreditNoteCreateSerializer(serializers.Serializer):
    invoice_id = serializers.IntegerField(required=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    reason = serializers.CharField(required=True, min_length=5)


class InsuranceProviderSerializer(serializers.ModelSerializer):

    class Meta:
        model = InsuranceProvider
        fields = [
            "id",
            "code",
            "name",
            "contact_person",
            "email",
            "phone",
            "address",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PatientInsurancePolicySerializer(serializers.ModelSerializer):
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)
    patient_name = serializers.SerializerMethodField()
    provider_name = serializers.CharField(source="provider.name", read_only=True)
    provider_code = serializers.CharField(source="provider.code", read_only=True)
    masked_policy_number = serializers.SerializerMethodField()

    class Meta:
        model = PatientInsurancePolicy
        fields = [
            "id",
            "patient",
            "patient_mrn",
            "patient_name",
            "provider",
            "provider_code",
            "provider_name",
            "policy_number",
            "masked_policy_number",
            "plan_name",
            "effective_start_date",
            "effective_end_date",
            "coverage_limit",
            "copay_percentage",
            "is_verified",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_verified", "created_at", "updated_at"]

    @extend_schema_field(serializers.CharField())
    def get_patient_name(self, obj):
        if obj.patient and obj.patient.user:
            return obj.patient.user.get_full_name() or obj.patient.user.username
        return ""

    @extend_schema_field(serializers.CharField())
    def get_masked_policy_number(self, obj):
        num = obj.policy_number or ""
        if len(num) > 4:
            return f"{'*' * (len(num) - 4)}{num[-4:]}"
        return num


class InsurancePreAuthorizationSerializer(serializers.ModelSerializer):
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)
    patient_name = serializers.SerializerMethodField()
    hospital_name = serializers.CharField(source="hospital.name", read_only=True)
    policy_number = serializers.CharField(source="policy.policy_number", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = InsurancePreAuthorization
        fields = [
            "id",
            "preauth_reference",
            "patient",
            "patient_mrn",
            "patient_name",
            "policy",
            "policy_number",
            "hospital",
            "hospital_name",
            "admission",
            "requested_amount",
            "authorized_amount",
            "status",
            "status_display",
            "decision_date",
            "insurer_reference",
            "denial_reason",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "preauth_reference",
            "authorized_amount",
            "status",
            "decision_date",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.CharField())
    def get_patient_name(self, obj):
        if obj.patient and obj.patient.user:
            return obj.patient.user.get_full_name() or obj.patient.user.username
        return ""


class PreAuthDecisionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            InsurancePreAuthorization.Status.AUTHORIZED,
            InsurancePreAuthorization.Status.PARTIALLY_AUTHORIZED,
            InsurancePreAuthorization.Status.DENIED,
        ]
    )
    authorized_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    insurer_reference = serializers.CharField(required=False, allow_blank=True, default="")
    denial_reason = serializers.CharField(required=False, allow_blank=True, default="")


class InsuranceClaimSerializer(serializers.ModelSerializer):
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)
    patient_name = serializers.SerializerMethodField()
    hospital_name = serializers.CharField(source="hospital.name", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    preauth_reference = serializers.CharField(source="pre_authorization.preauth_reference", read_only=True, default=None)

    class Meta:
        model = InsuranceClaim
        fields = [
            "id",
            "claim_reference",
            "patient",
            "patient_mrn",
            "patient_name",
            "policy",
            "hospital",
            "hospital_name",
            "invoice",
            "invoice_number",
            "pre_authorization",
            "preauth_reference",
            "claim_amount",
            "approved_amount",
            "received_amount",
            "status",
            "status_display",
            "submission_date",
            "decision_date",
            "settlement_date",
            "insurer_reference",
            "denial_reason",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "claim_reference",
            "approved_amount",
            "received_amount",
            "status",
            "submission_date",
            "decision_date",
            "settlement_date",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.CharField())
    def get_patient_name(self, obj):
        if obj.patient and obj.patient.user:
            return obj.patient.user.get_full_name() or obj.patient.user.username
        return ""


class ClaimDecisionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            InsuranceClaim.Status.APPROVED,
            InsuranceClaim.Status.PARTIALLY_APPROVED,
            InsuranceClaim.Status.DENIED,
        ]
    )
    approved_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    insurer_reference = serializers.CharField(required=False, allow_blank=True, default="")
    denial_reason = serializers.CharField(required=False, allow_blank=True, default="")


class ClaimPaymentSerializer(serializers.Serializer):
    payment_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    external_reference = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class BillingAuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    patient_mrn = serializers.CharField(source="patient.mrn", read_only=True)

    class Meta:
        model = BillingAuditLog
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

