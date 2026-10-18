from django.contrib import admin

from .models import (
    Admission,
    Bed,
    BedAssignment,
    BedReservation,
    InpatientAuditLog,
    Room,
    Ward,
)


class RoomInline(admin.TabularInline):
    model = Room
    extra = 1
    fields = ["room_number", "room_type", "capacity", "floor", "is_active"]


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "hospital", "ward_type", "gender_policy", "floor", "is_active"]
    list_filter = ["ward_type", "gender_policy", "is_active", "hospital"]
    search_fields = ["code", "name", "floor", "description"]
    inlines = [RoomInline]


class BedInline(admin.TabularInline):
    model = Bed
    extra = 1
    fields = ["bed_number", "bed_type", "status", "equipment_details"]


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ["room_number", "ward", "room_type", "capacity", "floor", "is_active"]
    list_filter = ["room_type", "is_active", "ward__hospital"]
    search_fields = ["room_number", "ward__name", "ward__code"]
    inlines = [BedInline]


@admin.register(Bed)
class BedAdmin(admin.ModelAdmin):
    list_display = ["bed_number", "room", "bed_type", "status", "created_at"]
    list_filter = ["status", "bed_type", "room__ward__hospital"]
    search_fields = ["bed_number", "room__room_number", "room__ward__name"]
    readonly_fields = ["created_at", "updated_at"]


class BedAssignmentInline(admin.TabularInline):
    model = BedAssignment
    extra = 0
    readonly_fields = ["bed", "start_time", "end_time", "is_active", "assigned_by", "released_by", "reason"]
    can_delete = False


@admin.register(Admission)
class AdmissionAdmin(admin.ModelAdmin):
    list_display = [
        "admission_reference",
        "patient",
        "attending_doctor",
        "admission_type",
        "status",
        "admission_date",
        "actual_discharge_date",
    ]
    list_filter = ["status", "admission_type", "hospital", "admission_date"]
    search_fields = ["admission_reference", "patient__mrn", "patient__user__first_name", "patient__user__last_name"]
    readonly_fields = ["admission_reference", "created_at", "updated_at"]
    inlines = [BedAssignmentInline]


@admin.register(BedAssignment)
class BedAssignmentAdmin(admin.ModelAdmin):
    list_display = ["admission", "bed", "start_time", "end_time", "is_active", "assigned_by", "released_by"]
    list_filter = ["is_active", "bed__room__ward__hospital"]
    search_fields = ["admission__admission_reference", "bed__bed_number", "admission__patient__mrn"]
    readonly_fields = ["admission", "bed", "start_time", "end_time", "is_active", "assigned_by", "released_by", "reason", "created_at"]


@admin.register(BedReservation)
class BedReservationAdmin(admin.ModelAdmin):
    list_display = ["bed", "patient", "reserved_by", "reserved_from", "reserved_until", "status"]
    list_filter = ["status", "bed__room__ward__hospital"]
    search_fields = ["bed__bed_number", "patient__mrn"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(InpatientAuditLog)
class InpatientAuditLogAdmin(admin.ModelAdmin):
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

