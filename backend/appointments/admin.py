from django.contrib import admin

from .models import Appointment, AppointmentStatusHistory, DoctorAvailability


@admin.register(DoctorAvailability)
class DoctorAvailabilityAdmin(admin.ModelAdmin):
    list_display = (
        "doctor",
        "day_of_week",
        "start_time",
        "end_time",
        "slot_duration",
        "is_active",
        "effective_start_date",
        "effective_end_date",
    )
    list_filter = (
        "day_of_week",
        "is_active",
        "doctor__hospital",
    )
    search_fields = (
        "doctor__doctor_id",
        "doctor__user__username",
        "doctor__user__first_name",
        "doctor__user__last_name",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )


class AppointmentStatusHistoryInline(admin.TabularInline):
    model = AppointmentStatusHistory
    extra = 0
    readonly_fields = (
        "previous_status",
        "new_status",
        "changed_by",
        "reason",
        "created_at",
    )
    can_delete = False


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        "appointment_reference",
        "patient",
        "doctor",
        "appointment_date",
        "start_time",
        "end_time",
        "status",
        "appointment_type",
    )
    list_filter = (
        "status",
        "appointment_type",
        "appointment_date",
        "hospital",
        "department",
    )
    search_fields = (
        "appointment_reference",
        "patient__mrn",
        "patient__user__first_name",
        "patient__user__last_name",
        "doctor__doctor_id",
        "doctor__user__first_name",
        "doctor__user__last_name",
    )
    readonly_fields = (
        "appointment_reference",
        "cancelled_at",
        "cancelled_by",
        "created_at",
        "updated_at",
    )
    inlines = [AppointmentStatusHistoryInline]


@admin.register(AppointmentStatusHistory)
class AppointmentStatusHistoryAdmin(admin.ModelAdmin):
    list_display = (
        "appointment",
        "previous_status",
        "new_status",
        "changed_by",
        "created_at",
    )
    list_filter = (
        "new_status",
        "created_at",
    )
    search_fields = (
        "appointment__appointment_reference",
        "changed_by__username",
        "reason",
    )
    readonly_fields = (
        "appointment",
        "previous_status",
        "new_status",
        "changed_by",
        "reason",
        "created_at",
    )

