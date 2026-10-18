import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


def validate_not_future_date(value):
    if value and value > timezone.now().date():
        raise ValidationError("Date of birth cannot be in the future.")


def generate_mrn():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"MRN-{date_str}-{unique_suffix}"


class Patient(models.Model):

    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"
        OTHER = "OTHER", "Other"

    class BloodGroup(models.TextChoices):
        A_POSITIVE = "A+", "A Positive"
        A_NEGATIVE = "A-", "A Negative"
        B_POSITIVE = "B+", "B Positive"
        B_NEGATIVE = "B-", "B Negative"
        AB_POSITIVE = "AB+", "AB Positive"
        AB_NEGATIVE = "AB-", "AB Negative"
        O_POSITIVE = "O+", "O Positive"
        O_NEGATIVE = "O-", "O Negative"
        UNKNOWN = "UNKNOWN", "Unknown"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="patient_profile",
    )

    hospital = models.ForeignKey(
        "hospitals.Hospital",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patients",
    )

    mrn = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_mrn,
    )

    date_of_birth = models.DateField(
        validators=[validate_not_future_date],
    )

    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
    )

    blood_group = models.CharField(
        max_length=10,
        choices=BloodGroup.choices,
        default=BloodGroup.UNKNOWN,
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
    )

    address = models.TextField(
        blank=True,
    )

    city = models.CharField(
        max_length=100,
        blank=True,
    )

    state = models.CharField(
        max_length=100,
        blank=True,
    )

    postal_code = models.CharField(
        max_length=20,
        blank=True,
    )

    # Emergency Contact
    emergency_contact_name = models.CharField(
        max_length=150,
        blank=True,
    )

    emergency_contact_relationship = models.CharField(
        max_length=100,
        blank=True,
    )

    emergency_contact_phone = models.CharField(
        max_length=20,
        blank=True,
    )

    # Medical Info
    allergies = models.TextField(
        blank=True,
    )

    medical_history = models.TextField(
        blank=True,
    )

    # Insurance Information
    insurance_provider = models.CharField(
        max_length=150,
        blank=True,
    )

    insurance_policy_number = models.CharField(
        max_length=100,
        blank=True,
    )

    insurance_member_id = models.CharField(
        max_length=100,
        blank=True,
    )

    insurance_expiry_date = models.DateField(
        null=True,
        blank=True,
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["mrn"]),
            models.Index(fields=["date_of_birth"]),
            models.Index(fields=["gender"]),
            models.Index(fields=["blood_group"]),
        ]

    def clean(self):
        super().clean()
        if self.date_of_birth and self.date_of_birth > timezone.now().date():
            raise ValidationError({
                "date_of_birth": "Date of birth cannot be in the future."
            })

    def save(self, *args, **kwargs):
        if not self.mrn:
            # Ensure unique MRN generation
            while True:
                candidate = generate_mrn()
                if not Patient.objects.filter(mrn=candidate).exists():
                    self.mrn = candidate
                    break
        # Fall back to user's phone if patient phone is empty
        if not self.phone and self.user and hasattr(self.user, "phone"):
            self.phone = self.user.phone
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        user_name = self.user.get_full_name() if self.user else ""
        return f"{self.mrn} - {user_name or self.user.username}"

