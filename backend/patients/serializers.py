from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import Patient


User = get_user_model()


class PatientSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )
    patient_name = serializers.CharField(
        source="user.get_full_name",
        read_only=True,
    )
    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )
    hospital_name = serializers.CharField(
        source="hospital.name",
        read_only=True,
    )

    class Meta:
        model = Patient
        fields = [
            "id",
            "user",
            "username",
            "patient_name",
            "email",
            "mrn",
            "date_of_birth",
            "gender",
            "blood_group",
            "phone",
            "address",
            "city",
            "state",
            "postal_code",
            "emergency_contact_name",
            "emergency_contact_relationship",
            "emergency_contact_phone",
            "allergies",
            "medical_history",
            "insurance_provider",
            "insurance_policy_number",
            "insurance_member_id",
            "insurance_expiry_date",
            "hospital",
            "hospital_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "mrn",
            "username",
            "patient_name",
            "email",
            "hospital_name",
            "created_at",
            "updated_at",
        ]

    def validate_date_of_birth(self, value):
        if value and value > timezone.now().date():
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value

    def validate_user(self, value):
        # Prevent creating multiple patient profiles for the same user
        instance = getattr(self, "instance", None)
        existing = Patient.objects.filter(user=value)
        if instance:
            existing = existing.exclude(pk=instance.pk)
        if existing.exists():
            raise serializers.ValidationError("A patient profile already exists for this user.")
        return value


class PatientMeSerializer(serializers.ModelSerializer):
    """
    Self-service serializer for authenticated patients accessing their own profile.
    Critical identity fields (user, MRN, hospital) are strictly read-only.
    """
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )
    patient_name = serializers.CharField(
        source="user.get_full_name",
        read_only=True,
    )
    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )
    hospital_name = serializers.CharField(
        source="hospital.name",
        read_only=True,
    )

    class Meta:
        model = Patient
        fields = [
            "id",
            "user",
            "username",
            "patient_name",
            "email",
            "mrn",
            "date_of_birth",
            "gender",
            "blood_group",
            "phone",
            "address",
            "city",
            "state",
            "postal_code",
            "emergency_contact_name",
            "emergency_contact_relationship",
            "emergency_contact_phone",
            "allergies",
            "medical_history",
            "insurance_provider",
            "insurance_policy_number",
            "insurance_member_id",
            "insurance_expiry_date",
            "hospital",
            "hospital_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "username",
            "patient_name",
            "email",
            "mrn",
            "hospital",
            "hospital_name",
            "created_at",
            "updated_at",
        ]

    def validate_date_of_birth(self, value):
        if value and value > timezone.now().date():
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value

