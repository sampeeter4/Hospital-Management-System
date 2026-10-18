import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone


def generate_admission_reference():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"ADM-{date_str}-{unique_suffix}"


class Ward(models.Model):

    class WardType(models.TextChoices):
        GENERAL = "GENERAL", "General Ward"
        PRIVATE = "PRIVATE", "Private Ward"
        SEMI_PRIVATE = "SEMI_PRIVATE", "Semi-Private Ward"
        ICU = "ICU", "Intensive Care Unit (ICU)"
        NICU = "NICU", "Neonatal Intensive Care Unit (NICU)"
        PEDIATRIC = "PEDIATRIC", "Pediatric Ward"
        MATERNITY = "MATERNITY", "Maternity / Labor & Delivery"
        POST_OP = "POST_OP", "Post-Operative Recovery"
        ISOLATION = "ISOLATION", "Isolation Ward"
        EMERGENCY = "EMERGENCY", "Emergency Observation"

    class GenderPolicy(models.TextChoices):
        ANY = "ANY", "Any Gender / Co-ed"
        MALE_ONLY = "MALE_ONLY", "Male Only"
        FEMALE_ONLY = "FEMALE_ONLY", "Female Only"
        PEDIATRIC = "PEDIATRIC", "Pediatric (Children Only)"

    hospital = models.ForeignKey(
        "hospitals.Hospital",
        on_delete=models.CASCADE,
        related_name="wards",
    )
    department = models.ForeignKey(
        "hospitals.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wards",
    )
    code = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Unique ward identifier within hospital, e.g. WARD-ICU-01",
    )
    name = models.CharField(
        max_length=150,
        db_index=True,
    )
    ward_type = models.CharField(
        max_length=50,
        choices=WardType.choices,
        default=WardType.GENERAL,
        db_index=True,
    )
    gender_policy = models.CharField(
        max_length=20,
        choices=GenderPolicy.choices,
        default=GenderPolicy.ANY,
    )
    floor = models.CharField(
        max_length=50,
        blank=True,
        help_text="Floor or building location (e.g. 3rd Floor East Wing)",
    )
    description = models.TextField(
        blank=True,
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
        ordering = ["hospital", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["hospital", "code"],
                name="unique_ward_code_per_hospital",
            )
        ]
        indexes = [
            models.Index(fields=["hospital", "is_active"]),
            models.Index(fields=["ward_type", "is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.department_id and self.hospital_id:
            if self.department.hospital_id != self.hospital_id:
                raise ValidationError({"department": "Assigned department must belong to the ward's hospital."})

        # Safe deactivation rule: do not permit deactivation if active occupants exist
        if self.pk and not self.is_active:
            occupied_count = BedAssignment.objects.filter(
                bed__room__ward=self,
                is_active=True,
            ).count()
            if occupied_count > 0:
                raise ValidationError(
                    {"is_active": f"Cannot deactivate ward while {occupied_count} active bed assignment(s) exist. Transfer or discharge patients first."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} [{self.code}] - {self.hospital.name}"


class Room(models.Model):

    class RoomType(models.TextChoices):
        SINGLE = "SINGLE", "Single Private Room"
        DOUBLE = "DOUBLE", "Double Semi-Private Room"
        MULTI_BED = "MULTI_BED", "Multi-Bed Room"
        ICU_SUITE = "ICU_SUITE", "ICU Suite"
        ISOLATION = "ISOLATION", "Isolation Room"
        DELIVERY_ROOM = "DELIVERY_ROOM", "Labor & Delivery Suite"
        STANDARD = "STANDARD", "Standard Room"

    ward = models.ForeignKey(
        Ward,
        on_delete=models.CASCADE,
        related_name="rooms",
    )
    room_number = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Room number or designation within ward, e.g. 301, ICU-A",
    )
    room_type = models.CharField(
        max_length=50,
        choices=RoomType.choices,
        default=RoomType.STANDARD,
    )
    floor = models.CharField(
        max_length=50,
        blank=True,
    )
    capacity = models.PositiveIntegerField(
        default=1,
        help_text="Configured bed capacity for this room",
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
        ordering = ["ward", "room_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["ward", "room_number"],
                name="unique_room_number_per_ward",
            )
        ]
        indexes = [
            models.Index(fields=["ward", "is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.pk:
            current_beds = self.beds.count()
            if self.capacity < current_beds:
                raise ValidationError(
                    {"capacity": f"Capacity ({self.capacity}) cannot be lower than the {current_beds} existing bed(s) in this room."}
                )

            # Deactivation validation
            if not self.is_active:
                occupied_beds = BedAssignment.objects.filter(
                    bed__room=self,
                    is_active=True,
                ).count()
                if occupied_beds > 0:
                    raise ValidationError(
                        {"is_active": f"Cannot deactivate room while {occupied_beds} active bed assignment(s) exist."}
                    )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Room {self.room_number} ({self.ward.name})"


class Bed(models.Model):

    class BedType(models.TextChoices):
        STANDARD = "STANDARD", "Standard Hospital Bed"
        ICU = "ICU", "ICU / Critical Care Bed"
        PEDIATRIC = "PEDIATRIC", "Pediatric Bed / Crib"
        BARIATRIC = "BARIATRIC", "Bariatric Heavy-Duty Bed"
        ELECTRIC = "ELECTRIC", "Multi-Function Electric Bed"
        ISOLATION = "ISOLATION", "Isolation Bed"

    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        RESERVED = "RESERVED", "Reserved"
        OCCUPIED = "OCCUPIED", "Occupied"
        CLEANING = "CLEANING", "Under Cleaning / Sanitization"
        MAINTENANCE = "MAINTENANCE", "Under Maintenance"
        INACTIVE = "INACTIVE", "Inactive / Decommissioned"

    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="beds",
    )
    bed_number = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Bed identifier within room, e.g. Bed-A, 101-1",
    )
    bed_type = models.CharField(
        max_length=50,
        choices=BedType.choices,
        default=BedType.STANDARD,
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.AVAILABLE,
        db_index=True,
    )
    equipment_details = models.TextField(
        blank=True,
        help_text="Configured equipment (e.g. Oxygen Port, Ventilator, Telemetry Monitor)",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["room", "bed_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["room", "bed_number"],
                name="unique_bed_number_per_room",
            )
        ]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["room", "status"]),
        ]

    def clean(self):
        super().clean()
        # Enforce room capacity on creation
        if not self.pk and self.room_id:
            existing_count = self.room.beds.count()
            if existing_count >= self.room.capacity:
                raise ValidationError(
                    {"room": f"Room {self.room.room_number} has reached its configured bed capacity ({self.room.capacity})."}
                )

        # Integrity check: if active assignment exists, bed must be OCCUPIED
        if self.pk:
            has_active_assignment = self.assignments.filter(is_active=True).exists()
            if has_active_assignment and self.status != self.Status.OCCUPIED:
                raise ValidationError(
                    {"status": "Bed has an active inpatient assignment and must remain in OCCUPIED status until released."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.bed_number} ({self.room.ward.name} - Rm {self.room.room_number}) [{self.get_status_display()}]"


class Admission(models.Model):

    class AdmissionType(models.TextChoices):
        ELECTIVE = "ELECTIVE", "Elective / Planned"
        EMERGENCY = "EMERGENCY", "Emergency"
        TRANSFER = "TRANSFER", "Inpatient Transfer"
        NEWBORN = "NEWBORN", "Newborn Delivery"
        OBSERVATION = "OBSERVATION", "Short-Stay Observation"

    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Admission Requested"
        ADMITTED = "ADMITTED", "Admitted / Inpatient"
        DISCHARGED = "DISCHARGED", "Discharged"
        CANCELLED = "CANCELLED", "Cancelled"

    class DischargeDisposition(models.TextChoices):
        HOME_ROUTINE = "HOME_ROUTINE", "Discharged Home (Routine)"
        TRANSFERRED = "TRANSFERRED", "Transferred to Other Facility"
        AGAINST_ADVICE = "AGAINST_ADVICE", "Left Against Medical Advice (AMA)"
        EXPIRED = "EXPIRED", "Deceased / Expired"
        OTHER = "OTHER", "Other Disposition"

    admission_reference = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_admission_reference,
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="admissions",
    )
    hospital = models.ForeignKey(
        "hospitals.Hospital",
        on_delete=models.CASCADE,
        related_name="admissions",
    )
    attending_doctor = models.ForeignKey(
        "hospitals.Doctor",
        on_delete=models.CASCADE,
        related_name="admissions",
    )
    department = models.ForeignKey(
        "hospitals.Department",
        on_delete=models.CASCADE,
        related_name="admissions",
    )
    encounter = models.ForeignKey(
        "medical_records.ClinicalEncounter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admissions",
    )
    appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admissions",
    )
    admission_type = models.CharField(
        max_length=30,
        choices=AdmissionType.choices,
        default=AdmissionType.ELECTIVE,
        db_index=True,
    )
    admission_reason = models.TextField(
        help_text="Clinical indication / Reason prompting inpatient admission",
    )
    admission_date = models.DateTimeField(
        default=timezone.now,
        db_index=True,
    )
    expected_discharge_date = models.DateTimeField(
        null=True,
        blank=True,
    )
    actual_discharge_date = models.DateTimeField(
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.REQUESTED,
        db_index=True,
    )
    admitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admitted_admissions",
    )
    discharged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="discharged_admissions",
    )
    discharge_disposition = models.CharField(
        max_length=50,
        choices=DischargeDisposition.choices,
        blank=True,
    )
    discharge_instructions = models.TextField(
        blank=True,
    )
    discharge_summary = models.TextField(
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
        ordering = ["-admission_date", "-created_at"]
        indexes = [
            models.Index(fields=["admission_reference"]),
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["hospital", "status"]),
            models.Index(fields=["attending_doctor", "status"]),
        ]

    def clean(self):
        super().clean()

        # Date consistency checks
        if self.expected_discharge_date and self.expected_discharge_date < self.admission_date:
            raise ValidationError({"expected_discharge_date": "Expected discharge date cannot precede admission date."})

        if self.actual_discharge_date and self.actual_discharge_date < self.admission_date:
            raise ValidationError({"actual_discharge_date": "Actual discharge date cannot precede admission date."})

        # Single active inpatient admission rule
        if self.status == self.Status.ADMITTED:
            existing_active = Admission.objects.filter(
                patient=self.patient,
                status=self.Status.ADMITTED,
            ).exclude(pk=self.pk).exists()
            if existing_active:
                raise ValidationError({"patient": "Patient already has an active inpatient admission."})

        # Relational hospital checks
        if self.attending_doctor_id and self.hospital_id:
            if self.attending_doctor.hospital_id != self.hospital_id:
                raise ValidationError({"attending_doctor": "Attending doctor does not belong to this hospital."})

        if self.department_id and self.hospital_id:
            if self.department.hospital_id != self.hospital_id:
                raise ValidationError({"department": "Department does not belong to this hospital."})

        if self.encounter_id and self.patient_id:
            if self.encounter.patient_id != self.patient_id:
                raise ValidationError({"encounter": "Encounter patient does not match admission patient."})

        if self.appointment_id and self.patient_id:
            if self.appointment.patient_id != self.patient_id:
                raise ValidationError({"appointment": "Appointment patient does not match admission patient."})

    def save(self, *args, **kwargs):
        if self.attending_doctor_id:
            if not self.hospital_id:
                self.hospital_id = self.attending_doctor.hospital_id
            if not self.department_id:
                self.department_id = self.attending_doctor.department_id

        if not self.admission_reference:
            while True:
                candidate = generate_admission_reference()
                if not Admission.objects.filter(admission_reference=candidate).exists():
                    self.admission_reference = candidate
                    break

        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.admission_reference} - {self.patient.mrn} ({self.get_status_display()})"


class BedAssignment(models.Model):
    admission = models.ForeignKey(
        Admission,
        on_delete=models.CASCADE,
        related_name="bed_assignments",
    )
    bed = models.ForeignKey(
        Bed,
        on_delete=models.PROTECT,
        related_name="assignments",
    )
    start_time = models.DateTimeField(
        default=timezone.now,
        db_index=True,
    )
    end_time = models.DateTimeField(
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inpatient_bed_assignments",
    )
    released_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inpatient_bed_releases",
    )
    reason = models.CharField(
        max_length=255,
        blank=True,
        help_text="Reason for initial assignment or transfer",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-start_time", "-created_at"]
        constraints = [
            # A bed can have at most ONE active assignment at any moment
            models.UniqueConstraint(
                fields=["bed"],
                condition=Q(is_active=True),
                name="unique_active_assignment_per_bed",
            ),
            # An admission can have at most ONE current bed assignment
            models.UniqueConstraint(
                fields=["admission"],
                condition=Q(is_active=True),
                name="unique_active_assignment_per_admission",
            ),
        ]
        indexes = [
            models.Index(fields=["admission", "is_active"]),
            models.Index(fields=["bed", "is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.end_time and self.end_time < self.start_time:
            raise ValidationError({"end_time": "Assignment end time cannot precede start time."})

        if self.is_active and self.admission.status != Admission.Status.ADMITTED:
            raise ValidationError({"admission": "Active bed assignments require an ADMITTED admission status."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        status_str = "ACTIVE" if self.is_active else "RELEASED"
        return f"{self.admission.admission_reference} -> {self.bed.bed_number} [{status_str}]"


class BedReservation(models.Model):

    class Status(models.TextChoices):
        CONFIRMED = "CONFIRMED", "Confirmed"
        FULFILLED = "FULFILLED", "Fulfilled (Admitted)"
        CANCELLED = "CANCELLED", "Cancelled"
        EXPIRED = "EXPIRED", "Expired"

    bed = models.ForeignKey(
        Bed,
        on_delete=models.PROTECT,
        related_name="reservations",
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="bed_reservations",
    )
    admission = models.ForeignKey(
        Admission,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bed_reservations",
    )
    reserved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inpatient_reservations",
    )
    reserved_from = models.DateTimeField(
        default=timezone.now,
    )
    reserved_until = models.DateTimeField(
        help_text="Scheduled reservation expiration timestamp",
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.CONFIRMED,
        db_index=True,
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
        ordering = ["-reserved_from"]
        indexes = [
            models.Index(fields=["bed", "status"]),
            models.Index(fields=["status", "reserved_until"]),
        ]

    def clean(self):
        super().clean()
        if self.reserved_until <= self.reserved_from:
            raise ValidationError({"reserved_until": "Reservation end time must be strictly after start time."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Reservation on {self.bed.bed_number} until {self.reserved_until} ({self.get_status_display()})"


class InpatientAuditLog(models.Model):
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
        related_name="inpatient_audit_logs",
    )
    user_role = models.CharField(
        max_length=50,
        blank=True,
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inpatient_audit_logs",
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
        verbose_name_plural = "Inpatient Audit Logs"

    def clean(self):
        super().clean()
        if self.pk:
            raise ValidationError("Inpatient audit logs are immutable and cannot be updated.")

    def delete(self, *args, **kwargs):
        raise ValidationError("Inpatient audit logs cannot be deleted.")

    def __str__(self):
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M:%S')}] {self.action} on {self.resource_type}:{self.resource_id} by {self.user}"

