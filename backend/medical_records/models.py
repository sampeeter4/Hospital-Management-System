import decimal
import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


def generate_encounter_reference():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"ENC-{date_str}-{unique_suffix}"


class ClinicalEncounter(models.Model):

    class EncounterType(models.TextChoices):
        OUTPATIENT = "OUTPATIENT", "Outpatient Consultation"
        EMERGENCY = "EMERGENCY", "Emergency"
        INPATIENT = "INPATIENT", "Inpatient Round"
        TELEHEALTH = "TELEHEALTH", "Telehealth"
        FOLLOW_UP = "FOLLOW_UP", "Follow-up"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        CLOSED = "CLOSED", "Closed"

    encounter_reference = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_encounter_reference,
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="encounters",
    )
    doctor = models.ForeignKey(
        "hospitals.Doctor",
        on_delete=models.CASCADE,
        related_name="encounters",
    )
    hospital = models.ForeignKey(
        "hospitals.Hospital",
        on_delete=models.CASCADE,
        related_name="encounters",
    )
    department = models.ForeignKey(
        "hospitals.Department",
        on_delete=models.CASCADE,
        related_name="encounters",
    )
    appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="encounters",
    )
    encounter_type = models.CharField(
        max_length=20,
        choices=EncounterType.choices,
        default=EncounterType.OUTPATIENT,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    encounter_date = models.DateField(
        default=timezone.now,
        db_index=True,
    )
    start_time = models.DateTimeField(
        default=timezone.now,
    )
    end_time = models.DateTimeField(
        null=True,
        blank=True,
    )
    chief_complaint = models.TextField()
    history_of_present_illness = models.TextField(
        blank=True,
    )
    clinical_notes_summary = models.TextField(
        blank=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_encounters",
    )
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="closed_encounters",
    )
    closed_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-encounter_date", "-start_time"]
        indexes = [
            models.Index(fields=["encounter_reference"]),
            models.Index(fields=["patient", "encounter_date"]),
            models.Index(fields=["doctor", "encounter_date"]),
            models.Index(fields=["hospital", "encounter_date"]),
            models.Index(fields=["status"]),
        ]

    def clean(self):
        super().clean()

        # Prevent cancelled or no-show appointments from being used to create an encounter
        if self.appointment_id:
            apt = self.appointment
            if apt.status in ["CANCELLED", "NO_SHOW"]:
                raise ValidationError({
                    "appointment": f"Cannot create encounter for an appointment with status {apt.status}."
                })

            if self.patient_id and apt.patient_id != self.patient_id:
                raise ValidationError({
                    "appointment": "Encounter patient does not match appointment patient."
                })

            if self.doctor_id and apt.doctor_id != self.doctor_id:
                raise ValidationError({
                    "appointment": "Encounter doctor does not match appointment doctor."
                })

        if self.start_time and self.end_time and self.start_time > self.end_time:
            raise ValidationError({
                "end_time": "Encounter end time cannot be earlier than start time."
            })

    def save(self, *args, **kwargs):
        if self.doctor_id:
            if not self.hospital_id:
                self.hospital_id = self.doctor.hospital_id
            if not self.department_id:
                self.department_id = self.doctor.department_id

        if not self.encounter_reference:
            while True:
                candidate = generate_encounter_reference()
                if not ClinicalEncounter.objects.filter(encounter_reference=candidate).exists():
                    self.encounter_reference = candidate
                    break

        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.encounter_reference} - {self.patient.mrn} ({self.get_status_display()})"


class VitalSigns(models.Model):

    class TempUnit(models.TextChoices):
        CELSIUS = "C", "Celsius"
        FAHRENHEIT = "F", "Fahrenheit"

    class HeightUnit(models.TextChoices):
        CENTIMETERS = "cm", "Centimeters"
        METERS = "m", "Meters"
        INCHES = "in", "Inches"

    class WeightUnit(models.TextChoices):
        KILOGRAMS = "kg", "Kilograms"
        POUNDS = "lb", "Pounds"

    encounter = models.ForeignKey(
        ClinicalEncounter,
        on_delete=models.CASCADE,
        related_name="vital_signs",
    )
    systolic_bp = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Systolic blood pressure in mmHg",
    )
    diastolic_bp = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Diastolic blood pressure in mmHg",
    )
    heart_rate = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Heart rate in beats per minute (bpm)",
    )
    temperature = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    temperature_unit = models.CharField(
        max_length=2,
        choices=TempUnit.choices,
        default=TempUnit.CELSIUS,
    )
    respiratory_rate = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Respiratory rate in breaths per minute",
    )
    oxygen_saturation = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="SpO2 percentage (0-100%)",
    )
    height = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    height_unit = models.CharField(
        max_length=2,
        choices=HeightUnit.choices,
        default=HeightUnit.CENTIMETERS,
    )
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    weight_unit = models.CharField(
        max_length=2,
        choices=WeightUnit.choices,
        default=WeightUnit.KILOGRAMS,
    )
    bmi = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        editable=False,
    )
    notes = models.TextField(
        blank=True,
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_vitals",
    )
    measured_at = models.DateTimeField(
        default=timezone.now,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-measured_at"]
        verbose_name_plural = "Vital Signs"

    def calculate_bmi(self):
        """
        Calculates BMI = weight(kg) / (height(m) ** 2)
        """
        if not self.height or not self.weight or self.height <= 0 or self.weight <= 0:
            return None

        # Convert height to meters
        h_val = float(self.height)
        if self.height_unit == self.HeightUnit.CENTIMETERS:
            height_m = h_val / 100.0
        elif self.height_unit == self.HeightUnit.INCHES:
            height_m = h_val * 0.0254
        else:
            height_m = h_val

        # Convert weight to kg
        w_val = float(self.weight)
        if self.weight_unit == self.WeightUnit.POUNDS:
            weight_kg = w_val * 0.45359237
        else:
            weight_kg = w_val

        if height_m <= 0:
            return None

        computed = weight_kg / (height_m ** 2)
        return decimal.Decimal(str(round(computed, 2)))

    def clean(self):
        super().clean()
        errors = {}

        # Paired blood pressure checks
        if self.systolic_bp is not None and self.diastolic_bp is not None:
            if self.systolic_bp <= self.diastolic_bp:
                errors["systolic_bp"] = "Systolic blood pressure must be greater than diastolic blood pressure."

        if self.systolic_bp is not None:
            if self.systolic_bp < 40 or self.systolic_bp > 300:
                errors["systolic_bp"] = "Systolic blood pressure must be within sensible range (40 - 300 mmHg)."

        if self.diastolic_bp is not None:
            if self.diastolic_bp < 20 or self.diastolic_bp > 200:
                errors["diastolic_bp"] = "Diastolic blood pressure must be within sensible range (20 - 200 mmHg)."

        if self.oxygen_saturation is not None:
            if self.oxygen_saturation < 0 or self.oxygen_saturation > 100:
                errors["oxygen_saturation"] = "Oxygen saturation (SpO2) must be between 0% and 100%."

        if self.heart_rate is not None:
            if self.heart_rate < 20 or self.heart_rate > 300:
                errors["heart_rate"] = "Heart rate must be within sensible range (20 - 300 bpm)."

        if self.respiratory_rate is not None:
            if self.respiratory_rate < 4 or self.respiratory_rate > 80:
                errors["respiratory_rate"] = "Respiratory rate must be within sensible range (4 - 80 breaths/min)."

        if self.temperature is not None:
            if self.temperature_unit == self.TempUnit.CELSIUS:
                if self.temperature < 25 or self.temperature > 45:
                    errors["temperature"] = "Temperature in Celsius must be between 25.0°C and 45.0°C."
            elif self.temperature_unit == self.TempUnit.FAHRENHEIT:
                if self.temperature < 77 or self.temperature > 113:
                    errors["temperature"] = "Temperature in Fahrenheit must be between 77.0°F and 113.0°F."

        if self.height is not None and self.height <= 0:
            errors["height"] = "Height must be greater than 0."

        if self.weight is not None and self.weight <= 0:
            errors["weight"] = "Weight must be greater than 0."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.temperature is not None:
            self.temperature = decimal.Decimal(str(self.temperature)).quantize(decimal.Decimal("0.01"))
        if self.height is not None:
            self.height = decimal.Decimal(str(self.height)).quantize(decimal.Decimal("0.01"))
        if self.weight is not None:
            self.weight = decimal.Decimal(str(self.weight)).quantize(decimal.Decimal("0.01"))
        if self.oxygen_saturation is not None:
            self.oxygen_saturation = decimal.Decimal(str(self.oxygen_saturation)).quantize(decimal.Decimal("0.01"))
        self.bmi = self.calculate_bmi()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Vitals for {self.encounter.encounter_reference} at {self.measured_at.strftime('%Y-%m-%d %H:%M')}"


class EncounterDiagnosis(models.Model):

    class DiagnosisType(models.TextChoices):
        PROVISIONAL = "PROVISIONAL", "Provisional"
        CONFIRMED = "CONFIRMED", "Confirmed"
        DIFFERENTIAL = "DIFFERENTIAL", "Differential"

    class ClinicalStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        RESOLVED = "RESOLVED", "Resolved"
        REMISSION = "REMISSION", "Remission"

    encounter = models.ForeignKey(
        ClinicalEncounter,
        on_delete=models.CASCADE,
        related_name="diagnoses",
    )
    diagnosis_description = models.TextField()
    diagnosis_code = models.CharField(
        max_length=50,
        blank=True,
        help_text="Standardized code, e.g. ICD-10 (I10)",
    )
    code_system = models.CharField(
        max_length=50,
        default="ICD-10",
        blank=True,
    )
    is_primary = models.BooleanField(
        default=False,
        help_text="Designates this diagnosis as the primary condition for the encounter.",
    )
    diagnosis_type = models.CharField(
        max_length=20,
        choices=DiagnosisType.choices,
        default=DiagnosisType.PROVISIONAL,
    )
    clinical_status = models.CharField(
        max_length=20,
        choices=ClinicalStatus.choices,
        default=ClinicalStatus.ACTIVE,
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_diagnoses",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-is_primary", "-created_at"]
        verbose_name_plural = "Encounter Diagnoses"
        indexes = [
            models.Index(fields=["encounter", "is_primary"]),
            models.Index(fields=["diagnosis_code"]),
        ]

    def clean(self):
        super().clean()
        # Enforce single primary diagnosis per encounter
        if self.is_primary and self.encounter_id:
            existing_primary = EncounterDiagnosis.objects.filter(
                encounter_id=self.encounter_id,
                is_primary=True,
            )
            if self.pk:
                existing_primary = existing_primary.exclude(pk=self.pk)
            if existing_primary.exists():
                raise ValidationError({
                    "is_primary": "An encounter can only have one primary diagnosis."
                })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        primary_tag = " [PRIMARY]" if self.is_primary else ""
        code_tag = f" ({self.diagnosis_code})" if self.diagnosis_code else ""
        return f"{self.diagnosis_description}{code_tag}{primary_tag}"


class ClinicalNote(models.Model):

    class NoteType(models.TextChoices):
        SOAP = "SOAP", "SOAP Note"
        CONSULTATION = "CONSULTATION", "Consultation Note"
        PROGRESS = "PROGRESS", "Progress Note"
        DISCHARGE = "DISCHARGE", "Discharge Summary"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SIGNED = "SIGNED", "Signed"

    encounter = models.ForeignKey(
        ClinicalEncounter,
        on_delete=models.CASCADE,
        related_name="clinical_notes",
    )
    note_type = models.CharField(
        max_length=20,
        choices=NoteType.choices,
        default=NoteType.SOAP,
    )
    # SOAP fields
    subjective = models.TextField(
        blank=True,
        help_text="Subjective findings / Patient narrative",
    )
    objective = models.TextField(
        blank=True,
        help_text="Objective examination / Laboratory & Vitals observations",
    )
    assessment = models.TextField(
        blank=True,
        help_text="Clinical assessment & Diagnosis rationale",
    )
    plan = models.TextField(
        blank=True,
        help_text="Treatment plan, orders, and follow-up",
    )
    summary = models.TextField(
        blank=True,
        help_text="General clinical note or discharge narrative",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    is_patient_visible = models.BooleanField(
        default=True,
        help_text="Whether this clinical note is visible in patient portal.",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="authored_notes",
    )
    signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="signed_clinical_notes",
    )
    signed_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["encounter", "status"]),
            models.Index(fields=["author"]),
        ]

    def clean(self):
        super().clean()
        if self.pk:
            original = ClinicalNote.objects.filter(pk=self.pk).first()
            if original and original.status == self.Status.SIGNED:
                # If note was already signed, verify that content fields were not silently modified
                content_changed = any([
                    original.subjective != self.subjective,
                    original.objective != self.objective,
                    original.assessment != self.assessment,
                    original.plan != self.plan,
                    original.summary != self.summary,
                    original.note_type != self.note_type,
                    original.is_patient_visible != self.is_patient_visible,
                ])
                if content_changed:
                    raise ValidationError(
                        "Signed clinical notes cannot be modified. Use the addendum endpoint to record corrections."
                    )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_note_type_display()} ({self.get_status_display()}) by {self.author}"


class ClinicalNoteAddendum(models.Model):
    clinical_note = models.ForeignKey(
        ClinicalNote,
        on_delete=models.CASCADE,
        related_name="addenda",
    )
    reason = models.TextField(
        help_text="Clinical justification for addendum/correction",
    )
    addendum_content = models.TextField(
        help_text="Additional or corrective clinical narrative",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="note_addenda",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Addendum to note #{self.clinical_note_id} by {self.author} at {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class MedicalHistoryEntry(models.Model):

    class Category(models.TextChoices):
        PAST_MEDICAL = "PAST_MEDICAL", "Past Medical History"
        SURGICAL = "SURGICAL", "Surgical History"
        FAMILY = "FAMILY", "Family History"
        SOCIAL = "SOCIAL", "Social History"
        CHRONIC_CONDITION = "CHRONIC_CONDITION", "Chronic Condition"
        MEDICATION_HISTORY = "MEDICATION_HISTORY", "Medication History"
        OTHER = "OTHER", "Other Clinical History"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        RESOLVED = "RESOLVED", "Resolved"
        INACTIVE = "INACTIVE", "Inactive"

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="medical_history_entries",
    )
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.PAST_MEDICAL,
        db_index=True,
    )
    title = models.CharField(
        max_length=200,
        help_text="Condition, procedure, or family disease title",
    )
    description = models.TextField()
    onset_date = models.DateField(
        null=True,
        blank=True,
    )
    resolution_date = models.DateField(
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_medical_histories",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-onset_date", "-created_at"]
        verbose_name_plural = "Medical History Entries"
        indexes = [
            models.Index(fields=["patient", "category"]),
            models.Index(fields=["patient", "status"]),
        ]

    def clean(self):
        super().clean()
        if self.onset_date and self.resolution_date and self.onset_date > self.resolution_date:
            raise ValidationError({
                "resolution_date": "Resolution date cannot be earlier than onset date."
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.patient.mrn} - {self.get_category_display()}: {self.title}"


class ClinicalAuditLog(models.Model):
    resource_type = models.CharField(
        max_length=50,
        db_index=True,
    )
    resource_id = models.CharField(
        max_length=50,
        db_index=True,
    )
    action = models.CharField(
        max_length=50,
        db_index=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="clinical_audit_logs",
    )
    user_role = models.CharField(
        max_length=50,
        blank=True,
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="clinical_audit_logs",
    )
    description = models.TextField(
        blank=True,
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Clinical Audit Logs"

    def clean(self):
        super().clean()
        if self.pk:
            raise ValidationError("Clinical audit logs are immutable and cannot be edited.")

    def delete(self, *args, **kwargs):
        raise ValidationError("Clinical audit logs cannot be deleted.")

    def __str__(self):
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M:%S')}] {self.action} on {self.resource_type}:{self.resource_id} by {self.user}"
