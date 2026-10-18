from django.contrib import admin

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


class LabTestParameterInline(admin.TabularInline):
    model = LabTestParameter
    extra = 1
    fields = ["code", "name", "data_type", "unit", "sort_order", "is_active"]


@admin.register(LabTest)
class LabTestAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "category", "specimen_type", "turnaround_time_hours", "is_active"]
    list_filter = ["category", "is_active", "specimen_type"]
    search_fields = ["code", "name", "description", "methodology"]
    inlines = [LabTestParameterInline]


class LabReferenceRangeInline(admin.TabularInline):
    model = LabReferenceRange
    extra = 1


@admin.register(LabTestParameter)
class LabTestParameterAdmin(admin.ModelAdmin):
    list_display = ["test", "code", "name", "data_type", "unit", "sort_order", "is_active"]
    list_filter = ["data_type", "is_active"]
    search_fields = ["code", "name", "test__name"]
    inlines = [LabReferenceRangeInline]


@admin.register(LabReferenceRange)
class LabReferenceRangeAdmin(admin.ModelAdmin):
    list_display = [
        "parameter",
        "gender",
        "age_min_years",
        "age_max_years",
        "min_normal_value",
        "max_normal_value",
        "critical_low_value",
        "critical_high_value",
        "is_active",
    ]
    list_filter = ["gender", "is_active"]
    search_fields = ["parameter__name", "parameter__code"]


class LabOrderItemInline(admin.TabularInline):
    model = LabOrderItem
    extra = 0
    readonly_fields = ["test", "priority", "status", "cancellation_reason"]
    can_delete = False


@admin.register(LabOrder)
class LabOrderAdmin(admin.ModelAdmin):
    list_display = ["order_reference", "patient", "ordering_doctor", "priority", "status", "ordered_at"]
    list_filter = ["status", "priority", "hospital", "ordered_at"]
    search_fields = ["order_reference", "patient__mrn", "patient__user__first_name", "patient__user__last_name"]
    readonly_fields = ["order_reference", "ordered_at", "cancelled_at", "created_at", "updated_at"]
    inlines = [LabOrderItemInline]


@admin.register(LabSpecimen)
class LabSpecimenAdmin(admin.ModelAdmin):
    list_display = ["barcode", "order", "specimen_type", "collection_location", "status", "collected_at", "received_at"]
    list_filter = ["status", "specimen_type"]
    search_fields = ["barcode", "order__order_reference", "order__patient__mrn"]
    readonly_fields = ["barcode", "created_at", "updated_at"]


class LabResultParameterInline(admin.TabularInline):
    model = LabResultParameter
    extra = 0
    readonly_fields = [
        "parameter",
        "numeric_value",
        "text_value",
        "unit",
        "reference_range_display",
        "abnormality_flag",
        "is_critical",
        "critical_flag",
    ]
    can_delete = False


class LabResultCorrectionInline(admin.TabularInline):
    model = LabResultCorrection
    extra = 0
    readonly_fields = [
        "parameter",
        "previous_numeric_value",
        "previous_text_value",
        "new_numeric_value",
        "new_text_value",
        "correction_reason",
        "corrected_by",
        "corrected_at",
    ]
    can_delete = False


@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = [
        "result_reference",
        "order_item",
        "status",
        "is_critical",
        "is_abnormal",
        "entered_at",
        "verified_at",
    ]
    list_filter = ["status", "is_critical", "is_abnormal"]
    search_fields = ["result_reference", "order_item__order__order_reference", "order_item__test__name"]
    readonly_fields = ["result_reference", "created_at", "updated_at"]
    inlines = [LabResultParameterInline, LabResultCorrectionInline]


@admin.register(CriticalResultNotification)
class CriticalResultNotificationAdmin(admin.ModelAdmin):
    list_display = [
        "notification_reference",
        "patient",
        "order",
        "status",
        "generated_at",
        "acknowledged_at",
        "acknowledged_by",
    ]
    list_filter = ["status"]
    search_fields = ["notification_reference", "patient__mrn", "order__order_reference"]
    readonly_fields = ["notification_reference", "generated_at"]


@admin.register(LabAuditLog)
class LabAuditLogAdmin(admin.ModelAdmin):
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

