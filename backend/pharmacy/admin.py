from django.contrib import admin

from .models import (
    DispensedItem,
    DispenseRecord,
    Medicine,
    MedicineBatch,
    PharmacyLocation,
    Prescription,
    PrescriptionItem,
    StockMovement,
)


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "generic_name",
        "brand_name",
        "dosage_form",
        "strength",
        "requires_prescription",
        "low_stock_threshold",
        "is_active",
    )
    list_filter = (
        "dosage_form",
        "requires_prescription",
        "is_active",
    )
    search_fields = (
        "code",
        "generic_name",
        "brand_name",
        "active_ingredients",
        "manufacturer",
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(PharmacyLocation)
class PharmacyLocationAdmin(admin.ModelAdmin):
    list_display = (
        "hospital",
        "location_code",
        "name",
        "is_active",
    )
    list_filter = (
        "hospital",
        "is_active",
    )
    search_fields = (
        "location_code",
        "name",
        "hospital__name",
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(MedicineBatch)
class MedicineBatchAdmin(admin.ModelAdmin):
    list_display = (
        "medicine",
        "pharmacy_location",
        "batch_number",
        "expiry_date",
        "received_quantity",
        "available_quantity",
        "batch_status",
    )
    list_filter = (
        "batch_status",
        "expiry_date",
        "pharmacy_location__hospital",
    )
    search_fields = (
        "batch_number",
        "medicine__generic_name",
        "medicine__code",
        "supplier",
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "movement_type",
        "batch",
        "pharmacy_location",
        "quantity",
        "previous_balance",
        "resulting_balance",
        "acting_user",
        "reference_number",
    )
    list_filter = (
        "movement_type",
        "created_at",
        "pharmacy_location__hospital",
    )
    search_fields = (
        "batch__batch_number",
        "batch__medicine__generic_name",
        "reference_number",
        "reason",
        "acting_user__username",
    )
    readonly_fields = (
        "batch",
        "pharmacy_location",
        "movement_type",
        "quantity",
        "previous_balance",
        "resulting_balance",
        "reference_number",
        "acting_user",
        "reason",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 0
    fields = (
        "medicine",
        "dosage_instructions",
        "frequency",
        "duration_value",
        "duration_unit",
        "quantity_prescribed",
        "quantity_dispensed",
        "status",
        "allow_substitution",
    )


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = (
        "prescription_reference",
        "patient",
        "doctor",
        "hospital",
        "status",
        "prescribed_date",
    )
    list_filter = (
        "status",
        "prescribed_date",
        "hospital",
    )
    search_fields = (
        "prescription_reference",
        "patient__mrn",
        "patient__user__first_name",
        "patient__user__last_name",
        "doctor__doctor_id",
        "clinical_indication",
    )
    readonly_fields = (
        "prescription_reference",
        "issued_by",
        "issued_at",
        "cancelled_by",
        "cancelled_at",
        "created_at",
        "updated_at",
    )
    inlines = [PrescriptionItemInline]


class DispensedItemInline(admin.TabularInline):
    model = DispensedItem
    extra = 0
    readonly_fields = (
        "prescription_item",
        "batch",
        "quantity",
        "unit_price",
        "total_price",
        "created_at",
    )
    can_delete = False


@admin.register(DispenseRecord)
class DispenseRecordAdmin(admin.ModelAdmin):
    list_display = (
        "dispense_reference",
        "prescription",
        "pharmacy_location",
        "dispensed_by",
        "dispensed_at",
        "is_reversed",
    )
    list_filter = (
        "is_reversed",
        "dispensed_at",
        "pharmacy_location__hospital",
    )
    search_fields = (
        "dispense_reference",
        "prescription__prescription_reference",
        "prescription__patient__mrn",
        "dispensed_by__username",
    )
    readonly_fields = (
        "dispense_reference",
        "dispensed_at",
        "reversed_by",
        "reversed_at",
        "created_at",
        "updated_at",
    )
    inlines = [DispensedItemInline]
