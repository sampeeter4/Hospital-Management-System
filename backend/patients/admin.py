from django.contrib import admin

from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        "mrn",
        "user",
        "gender",
        "blood_group",
        "date_of_birth",
        "phone",
        "hospital",
    )
    search_fields = (
        "mrn",
        "user__username",
        "user__email",
        "user__first_name",
        "user__last_name",
        "phone",
        "emergency_contact_name",
    )
    list_filter = (
        "gender",
        "blood_group",
        "hospital",
    )
    readonly_fields = (
        "mrn",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (
            "Account & Identity",
            {
                "fields": (
                    "user",
                    "hospital",
                    "mrn",
                )
            },
        ),
        (
            "Demographics & Contact",
            {
                "fields": (
                    "date_of_birth",
                    "gender",
                    "blood_group",
                    "phone",
                    "address",
                    "city",
                    "state",
                    "postal_code",
                )
            },
        ),
        (
            "Emergency Contact",
            {
                "fields": (
                    "emergency_contact_name",
                    "emergency_contact_relationship",
                    "emergency_contact_phone",
                )
            },
        ),
        (
            "Medical Information",
            {
                "fields": (
                    "allergies",
                    "medical_history",
                )
            },
        ),
        (
            "Insurance Information",
            {
                "fields": (
                    "insurance_provider",
                    "insurance_policy_number",
                    "insurance_member_id",
                    "insurance_expiry_date",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

