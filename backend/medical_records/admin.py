from django.contrib import admin

from .models import (
    ClinicalAuditLog,
    ClinicalEncounter,
    ClinicalNote,
    ClinicalNoteAddendum,
    EncounterDiagnosis,
    MedicalHistoryEntry,
    VitalSigns,
)


class VitalSignsInline(admin.TabularInline):
    model = VitalSigns
    extra = 0
    fields = (
        "measured_at",
        "systolic_bp",
        "diastolic_bp",
        "heart_rate",
        "temperature",
        "temperature_unit",
        "oxygen_saturation",
        "bmi",
    )
    readonly_fields = fields
    can_delete = False


class EncounterDiagnosisInline(admin.TabularInline):
    model = EncounterDiagnosis
    extra = 0
    fields = (
        "diagnosis_description",
        "diagnosis_code",
        "is_primary",
        "diagnosis_type",
        "clinical_status",
    )


class ClinicalNoteAddendumInline(admin.StackedInline):
    model = ClinicalNoteAddendum
    extra = 0
    readonly_fields = ("author", "created_at")


@admin.register(ClinicalEncounter)
class ClinicalEncounterAdmin(admin.ModelAdmin):
    list_display = (
        "encounter_reference",
        "patient",
        "doctor",
        "encounter_type",
        "status",
        "encounter_date",
        "start_time",
    )
    list_filter = (
        "status",
        "encounter_type",
        "encounter_date",
        "hospital",
        "department",
    )
    search_fields = (
        "encounter_reference",
        "patient__mrn",
        "patient__user__first_name",
        "patient__user__last_name",
        "doctor__doctor_id",
        "doctor__user__first_name",
        "doctor__user__last_name",
        "chief_complaint",
    )
    readonly_fields = (
        "encounter_reference",
        "created_by",
        "closed_by",
        "closed_at",
        "created_at",
        "updated_at",
    )
    inlines = [VitalSignsInline, EncounterDiagnosisInline]


@admin.register(VitalSigns)
class VitalSignsAdmin(admin.ModelAdmin):
    list_display = (
        "encounter",
        "measured_at",
        "systolic_bp",
        "diastolic_bp",
        "heart_rate",
        "temperature",
        "oxygen_saturation",
        "bmi",
        "recorded_by",
    )
    list_filter = (
        "temperature_unit",
        "measured_at",
    )
    search_fields = (
        "encounter__encounter_reference",
        "encounter__patient__mrn",
        "recorded_by__username",
    )
    readonly_fields = ("bmi", "recorded_by", "created_at", "updated_at")


@admin.register(EncounterDiagnosis)
class EncounterDiagnosisAdmin(admin.ModelAdmin):
    list_display = (
        "encounter",
        "diagnosis_description",
        "diagnosis_code",
        "is_primary",
        "diagnosis_type",
        "clinical_status",
        "created_at",
    )
    list_filter = (
        "is_primary",
        "diagnosis_type",
        "clinical_status",
        "code_system",
    )
    search_fields = (
        "diagnosis_description",
        "diagnosis_code",
        "encounter__encounter_reference",
        "encounter__patient__mrn",
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(ClinicalNote)
class ClinicalNoteAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "encounter",
        "note_type",
        "status",
        "is_patient_visible",
        "author",
        "signed_by",
        "signed_at",
        "created_at",
    )
    list_filter = (
        "note_type",
        "status",
        "is_patient_visible",
    )
    search_fields = (
        "encounter__encounter_reference",
        "encounter__patient__mrn",
        "author__username",
        "assessment",
        "summary",
    )
    readonly_fields = (
        "author",
        "signed_by",
        "signed_at",
        "created_at",
        "updated_at",
    )
    inlines = [ClinicalNoteAddendumInline]


@admin.register(MedicalHistoryEntry)
class MedicalHistoryEntryAdmin(admin.ModelAdmin):
    list_display = (
        "patient",
        "category",
        "title",
        "status",
        "onset_date",
        "resolution_date",
        "recorded_by",
    )
    list_filter = (
        "category",
        "status",
    )
    search_fields = (
        "title",
        "description",
        "patient__mrn",
        "patient__user__first_name",
        "patient__user__last_name",
    )
    readonly_fields = ("recorded_by", "created_at", "updated_at")


@admin.register(ClinicalAuditLog)
class ClinicalAuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "action",
        "resource_type",
        "resource_id",
        "user",
        "user_role",
        "patient",
    )
    list_filter = (
        "action",
        "resource_type",
        "created_at",
    )
    search_fields = (
        "resource_type",
        "resource_id",
        "user__username",
        "description",
        "patient__mrn",
    )
    readonly_fields = (
        "resource_type",
        "resource_id",
        "action",
        "user",
        "user_role",
        "patient",
        "description",
        "metadata",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False
