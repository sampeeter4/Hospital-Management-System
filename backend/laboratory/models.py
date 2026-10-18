import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


def generate_lab_order_reference():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"LAB-{date_str}-{unique_suffix}"


def generate_specimen_barcode():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"SPEC-{date_str}-{unique_suffix}"


def generate_result_reference():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"RES-{date_str}-{unique_suffix}"


def generate_critical_notification_reference():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"CRIT-{date_str}-{unique_suffix}"


class LabTest(models.Model):

    class Category(models.TextChoices):
        HEMATOLOGY = "HEMATOLOGY", "Hematology"
        BIOCHEMISTRY = "BIOCHEMISTRY", "Biochemistry"
        MICROBIOLOGY = "MICROBIOLOGY", "Microbiology"
        IMMUNOLOGY = "IMMUNOLOGY", "Immunology / Serology"
        PATHOLOGY = "PATHOLOGY", "Histopathology / Cytology"
        MOLECULAR = "MOLECULAR", "Molecular Diagnostics"
        URINALYSIS = "URINALYSIS", "Urinalysis"
        RADIOLOGY = "RADIOLOGY", "Radiology / Imaging"
        OTHER = "OTHER", "Other Diagnostic"

    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique diagnostic test code, e.g. LAB-CBC-001",
    )
    name = models.CharField(
        max_length=150,
        db_index=True,
    )
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.BIOCHEMISTRY,
        db_index=True,
    )
    description = models.TextField(
        blank=True,
    )
    specimen_type = models.CharField(
        max_length=100,
        help_text="Required specimen matrix (e.g. Whole Blood, Serum, Plasma, Urine, Swab)",
    )
    collection_instructions = models.TextField(
        blank=True,
        help_text="Phlebotomy/collection notes (e.g. Lavender EDTA tube, 3ml volume)",
    )
    preparation_instructions = models.TextField(
        blank=True,
        help_text="Patient prep (e.g. 10-12 hr fasting required)",
    )
    methodology = models.CharField(
        max_length=150,
        blank=True,
        help_text="Diagnostic methodology (e.g. Automated Flow Cytometry, Spectrophotometry, RT-PCR)",
    )
    turnaround_time_hours = models.PositiveIntegerField(
        default=24,
        help_text="Expected standard turnaround time in hours",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["category", "name"]
        verbose_name_plural = "Lab Tests"
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["category", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} [{self.code}] ({self.get_category_display()})"


class LabTestParameter(models.Model):

    class DataType(models.TextChoices):
        NUMERIC = "NUMERIC", "Numeric Measurement"
        TEXT = "TEXT", "Textual Observation"
        QUALITATIVE = "QUALITATIVE", "Qualitative (Reactive/Non-reactive/Positive/Negative)"
        BOOLEAN = "BOOLEAN", "Boolean (Yes/No)"

    test = models.ForeignKey(
        LabTest,
        on_delete=models.CASCADE,
        related_name="parameters",
    )
    code = models.CharField(
        max_length=50,
        help_text="Parameter code within test, e.g. WBC, HGB, GLU",
    )
    name = models.CharField(
        max_length=150,
    )
    data_type = models.CharField(
        max_length=20,
        choices=DataType.choices,
        default=DataType.NUMERIC,
    )
    unit = models.CharField(
        max_length=50,
        blank=True,
        help_text="Measurement unit (e.g. 10^3/uL, g/dL, mg/dL)",
    )
    sort_order = models.PositiveIntegerField(
        default=0,
    )
    is_active = models.BooleanField(
        default=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["test", "code"],
                name="unique_parameter_per_lab_test",
            )
        ]

    def __str__(self):
        return f"{self.test.code} -> {self.name} ({self.code})"


class LabReferenceRange(models.Model):

    class Gender(models.TextChoices):
        ANY = "ANY", "Any Gender"
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"

    parameter = models.ForeignKey(
        LabTestParameter,
        on_delete=models.CASCADE,
        related_name="reference_ranges",
    )
    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
        default=Gender.ANY,
    )
    age_min_years = models.PositiveIntegerField(
        default=0,
    )
    age_max_years = models.PositiveIntegerField(
        default=120,
    )
    min_normal_value = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
    )
    max_normal_value = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
    )
    critical_low_value = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
    )
    critical_high_value = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
    )
    normal_text_value = models.CharField(
        max_length=100,
        blank=True,
        help_text="Expected normal qualitative result (e.g. Negative, Non-reactive)",
    )
    notes = models.TextField(
        blank=True,
    )
    is_active = models.BooleanField(
        default=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["parameter", "gender", "age_min_years"]

    def clean(self):
        super().clean()
        if self.min_normal_value is not None and self.max_normal_value is not None:
            if self.min_normal_value > self.max_normal_value:
                raise ValidationError({"max_normal_value": "Maximum normal value must be greater than minimum normal value."})

        if self.critical_low_value is not None and self.min_normal_value is not None:
            if self.critical_low_value >= self.min_normal_value:
                raise ValidationError({"critical_low_value": "Critical low threshold must be strictly below minimum normal value."})

        if self.critical_high_value is not None and self.max_normal_value is not None:
            if self.critical_high_value <= self.max_normal_value:
                raise ValidationError({"critical_high_value": "Critical high threshold must be strictly above maximum normal value."})

        if self.age_min_years > self.age_max_years:
            raise ValidationError({"age_max_years": "Maximum age cannot be less than minimum age."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        range_str = f"{self.min_normal_value} - {self.max_normal_value}" if (self.min_normal_value is not None and self.max_normal_value is not None) else self.normal_text_value
        return f"{self.parameter.name} [{self.get_gender_display()} {self.age_min_years}-{self.age_max_years}y]: {range_str} {self.parameter.unit}"


class LabOrder(models.Model):

    class Priority(models.TextChoices):
        ROUTINE = "ROUTINE", "Routine"
        URGENT = "URGENT", "Urgent"
        STAT = "STAT", "STAT / Immediate"

    class Status(models.TextChoices):
        ORDERED = "ORDERED", "Ordered"
        COLLECTED = "COLLECTED", "Specimen Collected"
        PROCESSING = "PROCESSING", "In Processing"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    order_reference = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_lab_order_reference,
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="lab_orders",
    )
    ordering_doctor = models.ForeignKey(
        "hospitals.Doctor",
        on_delete=models.CASCADE,
        related_name="lab_orders",
    )
    hospital = models.ForeignKey(
        "hospitals.Hospital",
        on_delete=models.CASCADE,
        related_name="lab_orders",
    )
    department = models.ForeignKey(
        "hospitals.Department",
        on_delete=models.CASCADE,
        related_name="lab_orders",
    )
    encounter = models.ForeignKey(
        "medical_records.ClinicalEncounter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_orders",
    )
    appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_orders",
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.ROUTINE,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ORDERED,
        db_index=True,
    )
    clinical_indication = models.TextField(
        blank=True,
        help_text="Clinical justification / Diagnosis / Symptoms prompting test order",
    )
    clinical_notes = models.TextField(
        blank=True,
    )
    ordered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordered_lab_orders",
    )
    ordered_at = models.DateTimeField(
        default=timezone.now,
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_lab_orders",
    )
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    cancellation_reason = models.TextField(
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-ordered_at", "-created_at"]
        indexes = [
            models.Index(fields=["order_reference"]),
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["ordering_doctor", "status"]),
            models.Index(fields=["hospital", "ordered_at"]),
        ]

    def clean(self):
        super().clean()
        if self.encounter_id:
            if self.encounter.patient_id != self.patient_id:
                raise ValidationError({"encounter": "Encounter patient does not match order patient."})
            if self.encounter.doctor_id != self.ordering_doctor_id:
                raise ValidationError({"encounter": "Encounter doctor does not match ordering doctor."})

        if self.appointment_id:
            if self.appointment.patient_id != self.patient_id:
                raise ValidationError({"appointment": "Appointment patient does not match order patient."})
            if self.appointment.doctor_id != self.ordering_doctor_id:
                raise ValidationError({"appointment": "Appointment doctor does not match ordering doctor."})

    def save(self, *args, **kwargs):
        if self.ordering_doctor_id:
            if not self.hospital_id:
                self.hospital_id = self.ordering_doctor.hospital_id
            if not self.department_id:
                self.department_id = self.ordering_doctor.department_id

        if not self.order_reference:
            while True:
                candidate = generate_lab_order_reference()
                if not LabOrder.objects.filter(order_reference=candidate).exists():
                    self.order_reference = candidate
                    break

        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order_reference} - {self.patient.mrn} by {self.ordering_doctor.doctor_id} ({self.get_status_display()})"


class LabOrderItem(models.Model):

    class ItemStatus(models.TextChoices):
        PENDING = "PENDING", "Pending Collection"
        COLLECTED = "COLLECTED", "Specimen Collected"
        PROCESSING = "PROCESSING", "In Processing"
        RESULTED = "RESULTED", "Result Entered"
        VERIFIED = "VERIFIED", "Verified / Released"
        CANCELLED = "CANCELLED", "Cancelled"

    order = models.ForeignKey(
        LabOrder,
        on_delete=models.CASCADE,
        related_name="items",
    )
    test = models.ForeignKey(
        LabTest,
        on_delete=models.PROTECT,
        related_name="order_items",
    )
    priority = models.CharField(
        max_length=20,
        choices=LabOrder.Priority.choices,
        default=LabOrder.Priority.ROUTINE,
    )
    status = models.CharField(
        max_length=20,
        choices=ItemStatus.choices,
        default=ItemStatus.PENDING,
        db_index=True,
    )
    cancellation_reason = models.TextField(
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.order.order_reference} -> {self.test.name} ({self.get_status_display()})"


class LabSpecimen(models.Model):

    class Status(models.TextChoices):
        PENDING_COLLECTION = "PENDING_COLLECTION", "Pending Collection"
        COLLECTED = "COLLECTED", "Collected"
        RECEIVED = "RECEIVED", "Received in Lab"
        PROCESSING = "PROCESSING", "Processing"
        COMPLETED = "COMPLETED", "Completed"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"

    barcode = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_specimen_barcode,
    )
    order = models.ForeignKey(
        LabOrder,
        on_delete=models.CASCADE,
        related_name="specimens",
    )
    order_items = models.ManyToManyField(
        LabOrderItem,
        related_name="specimens",
        blank=True,
    )
    specimen_type = models.CharField(
        max_length=100,
        help_text="Specimen matrix (e.g. Whole Blood, Serum, Urine, Swab)",
    )
    collection_location = models.CharField(
        max_length=150,
        blank=True,
        help_text="Collection site/room (e.g. Phlebotomy Station 2, Ward 3 Bed 12)",
    )
    status = models.CharField(
        max_length=25,
        choices=Status.choices,
        default=Status.PENDING_COLLECTION,
        db_index=True,
    )
    collected_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    collected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="collected_specimens",
    )
    received_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="received_specimens",
    )
    rejection_reason = models.TextField(
        blank=True,
        help_text="Reason for rejection (e.g. Hemolyzed, Clotted, Insufficient volume, Improper tube)",
    )
    rejected_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rejected_specimens",
    )
    notes = models.TextField(
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
            models.Index(fields=["barcode"]),
            models.Index(fields=["order", "status"]),
        ]

    def save(self, *args, **kwargs):
        if not self.barcode:
            while True:
                candidate = generate_specimen_barcode()
                if not LabSpecimen.objects.filter(barcode=candidate).exists():
                    self.barcode = candidate
                    break
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.barcode} ({self.specimen_type}) - {self.get_status_display()}"


class LabResult(models.Model):

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ENTERED = "ENTERED", "Entered"
        PENDING_REVIEW = "PENDING_REVIEW", "Pending Review"
        VERIFIED = "VERIFIED", "Verified / Released"
        CORRECTED = "CORRECTED", "Corrected"
        CANCELLED = "CANCELLED", "Cancelled"

    result_reference = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_result_reference,
    )
    order_item = models.OneToOneField(
        LabOrderItem,
        on_delete=models.CASCADE,
        related_name="result",
    )
    specimen = models.ForeignKey(
        LabSpecimen,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="results",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    overall_interpretation = models.TextField(
        blank=True,
        help_text="Pathologist/Technician overall diagnostic summary",
    )
    clinical_comments = models.TextField(
        blank=True,
        help_text="Internal laboratory observations or methodology comments",
    )
    is_critical = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Flags presence of critical threshold values requiring immediate clinician notification",
    )
    is_abnormal = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Flags presence of out-of-range values",
    )
    entered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="entered_lab_results",
    )
    entered_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_lab_results",
    )
    verified_at = models.DateTimeField(
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
            models.Index(fields=["result_reference"]),
            models.Index(fields=["status"]),
            models.Index(fields=["is_critical"]),
        ]

    def save(self, *args, **kwargs):
        if not self.result_reference:
            while True:
                candidate = generate_result_reference()
                if not LabResult.objects.filter(result_reference=candidate).exists():
                    self.result_reference = candidate
                    break
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.result_reference} for {self.order_item.test.name} ({self.get_status_display()})"


class LabResultParameter(models.Model):

    class AbnormalityFlag(models.TextChoices):
        NORMAL = "NORMAL", "Normal"
        LOW = "LOW", "Low"
        HIGH = "HIGH", "High"
        ABNORMAL = "ABNORMAL", "Abnormal"

    class CriticalFlag(models.TextChoices):
        NONE = "NONE", "None"
        CRITICAL_LOW = "CRITICAL_LOW", "Critical Low"
        CRITICAL_HIGH = "CRITICAL_HIGH", "Critical High"

    result = models.ForeignKey(
        LabResult,
        on_delete=models.CASCADE,
        related_name="parameter_values",
    )
    parameter = models.ForeignKey(
        LabTestParameter,
        on_delete=models.PROTECT,
        related_name="result_values",
    )
    numeric_value = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        null=True,
        blank=True,
    )
    text_value = models.CharField(
        max_length=255,
        blank=True,
    )
    unit = models.CharField(
        max_length=50,
        blank=True,
    )
    reference_range_display = models.CharField(
        max_length=150,
        blank=True,
        help_text="Snapshot of the applicable reference range at entry",
    )
    abnormality_flag = models.CharField(
        max_length=20,
        choices=AbnormalityFlag.choices,
        default=AbnormalityFlag.NORMAL,
    )
    is_critical = models.BooleanField(
        default=False,
    )
    critical_flag = models.CharField(
        max_length=20,
        choices=CriticalFlag.choices,
        default=CriticalFlag.NONE,
    )

    class Meta:
        ordering = ["parameter__sort_order", "id"]

    def __str__(self):
        val = str(self.numeric_value) if self.numeric_value is not None else self.text_value
        return f"{self.parameter.name}: {val} {self.unit} [{self.abnormality_flag}]"


class LabResultCorrection(models.Model):
    result = models.ForeignKey(
        LabResult,
        on_delete=models.CASCADE,
        related_name="corrections",
    )
    parameter = models.ForeignKey(
        LabTestParameter,
        on_delete=models.PROTECT,
        related_name="corrections",
    )
    previous_numeric_value = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        null=True,
        blank=True,
    )
    previous_text_value = models.CharField(
        max_length=255,
        blank=True,
    )
    new_numeric_value = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        null=True,
        blank=True,
    )
    new_text_value = models.CharField(
        max_length=255,
        blank=True,
    )
    correction_reason = models.TextField(
        help_text="Clinical justification for correcting verified result",
    )
    corrected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="lab_corrections",
    )
    corrected_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-corrected_at"]

    def __str__(self):
        return f"Correction on #{self.result_id} ({self.parameter.name}) by {self.corrected_by}"


class CriticalResultNotification(models.Model):

    class Status(models.TextChoices):
        PENDING_ACKNOWLEDGEMENT = "PENDING_ACKNOWLEDGEMENT", "Pending Acknowledgement"
        ACKNOWLEDGED = "ACKNOWLEDGED", "Acknowledged"

    notification_reference = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_critical_notification_reference,
    )
    result = models.ForeignKey(
        LabResult,
        on_delete=models.CASCADE,
        related_name="critical_notifications",
    )
    order = models.ForeignKey(
        LabOrder,
        on_delete=models.CASCADE,
        related_name="critical_notifications",
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="critical_notifications",
    )
    critical_details = models.TextField(
        help_text="Summary of critical parameters and values",
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING_ACKNOWLEDGEMENT,
        db_index=True,
    )
    generated_at = models.DateTimeField(
        auto_now_add=True,
    )
    acknowledged_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acknowledged_lab_notifications",
    )
    acknowledgement_notes = models.TextField(
        blank=True,
    )

    class Meta:
        ordering = ["-generated_at"]
        indexes = [
            models.Index(fields=["notification_reference"]),
            models.Index(fields=["status"]),
        ]

    def save(self, *args, **kwargs):
        if not self.notification_reference:
            while True:
                candidate = generate_critical_notification_reference()
                if not CriticalResultNotification.objects.filter(notification_reference=candidate).exists():
                    self.notification_reference = candidate
                    break
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.notification_reference} for {self.patient.mrn} ({self.get_status_display()})"


class LabAuditLog(models.Model):
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
        related_name="lab_audit_logs",
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
        related_name="lab_audit_logs",
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
        verbose_name_plural = "Lab Audit Logs"

    def clean(self):
        super().clean()
        if self.pk:
            raise ValidationError("Lab audit logs are immutable and cannot be edited.")

    def delete(self, *args, **kwargs):
        raise ValidationError("Lab audit logs cannot be deleted.")

    def __str__(self):
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M:%S')}] {self.action} on {self.resource_type}:{self.resource_id} by {self.user}"

