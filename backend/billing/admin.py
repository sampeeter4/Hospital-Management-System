from django.contrib import admin

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


@admin.register(ServiceItem)
class ServiceItemAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "category", "unit_price", "currency", "tax_rate", "is_active", "hospital"]
    list_filter = ["category", "is_active", "hospital"]
    search_fields = ["code", "name"]


class InvoiceLineItemInline(admin.TabularInline):
    model = InvoiceLineItem
    extra = 0
    readonly_fields = [
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
    ]
    can_delete = False


class PaymentAllocationInline(admin.TabularInline):
    model = PaymentAllocation
    extra = 0
    readonly_fields = ["payment", "amount", "allocated_at", "is_reversed", "reversed_at"]
    can_delete = False


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        "invoice_number",
        "patient",
        "total_amount",
        "paid_amount",
        "balance_due",
        "currency",
        "status",
        "invoice_date",
        "due_date",
    ]
    list_filter = ["status", "hospital", "invoice_date"]
    search_fields = ["invoice_number", "patient__mrn", "patient__user__first_name", "patient__user__last_name"]
    readonly_fields = [
        "invoice_number",
        "subtotal",
        "total_discount",
        "total_tax",
        "total_amount",
        "paid_amount",
        "balance_due",
        "created_at",
        "updated_at",
    ]
    inlines = [InvoiceLineItemInline, PaymentAllocationInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["payment_reference", "patient", "amount", "currency", "payment_method", "status", "payment_date"]
    list_filter = ["status", "payment_method", "hospital", "payment_date"]
    search_fields = ["payment_reference", "patient__mrn", "external_transaction_id"]
    readonly_fields = ["payment_reference", "created_at", "updated_at"]


@admin.register(PaymentAllocation)
class PaymentAllocationAdmin(admin.ModelAdmin):
    list_display = ["payment", "invoice", "amount", "allocated_at", "is_reversed"]
    list_filter = ["is_reversed"]
    search_fields = ["payment__payment_reference", "invoice__invoice_number"]


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ["refund_reference", "payment", "amount", "status", "requested_by", "approved_by"]
    list_filter = ["status"]
    search_fields = ["refund_reference", "payment__payment_reference", "reason"]
    readonly_fields = ["refund_reference", "created_at", "updated_at"]


@admin.register(CreditNote)
class CreditNoteAdmin(admin.ModelAdmin):
    list_display = ["credit_note_number", "invoice", "amount", "issued_by", "issued_at"]
    search_fields = ["credit_note_number", "invoice__invoice_number", "reason"]
    readonly_fields = ["credit_note_number", "created_at"]


@admin.register(InsuranceProvider)
class InsuranceProviderAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "contact_person", "phone", "email", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["code", "name"]


@admin.register(PatientInsurancePolicy)
class PatientInsurancePolicyAdmin(admin.ModelAdmin):
    list_display = [
        "patient",
        "provider",
        "policy_number",
        "plan_name",
        "effective_start_date",
        "effective_end_date",
        "is_verified",
        "is_active",
    ]
    list_filter = ["is_verified", "is_active", "provider"]
    search_fields = ["patient__mrn", "policy_number"]


@admin.register(InsurancePreAuthorization)
class InsurancePreAuthorizationAdmin(admin.ModelAdmin):
    list_display = ["preauth_reference", "patient", "policy", "requested_amount", "authorized_amount", "status", "decision_date"]
    list_filter = ["status"]
    search_fields = ["preauth_reference", "patient__mrn", "insurer_reference"]
    readonly_fields = ["preauth_reference", "created_at", "updated_at"]


@admin.register(InsuranceClaim)
class InsuranceClaimAdmin(admin.ModelAdmin):
    list_display = ["claim_reference", "patient", "invoice", "claim_amount", "approved_amount", "received_amount", "status"]
    list_filter = ["status"]
    search_fields = ["claim_reference", "invoice__invoice_number", "patient__mrn"]
    readonly_fields = ["claim_reference", "created_at", "updated_at"]


@admin.register(BillingAuditLog)
class BillingAuditLogAdmin(admin.ModelAdmin):
    list_display = ["created_at", "action", "resource_type", "resource_id", "user", "patient"]
    list_filter = ["resource_type", "action"]
    search_fields = ["resource_id", "description", "patient__mrn"]
    readonly_fields = [
        "resource_type",
        "resource_id",
        "action",
        "user",
        "user_role",
        "patient",
        "description",
        "metadata",
        "created_at",
    ]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

