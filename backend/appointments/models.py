import uuid
from datetime import datetime, time
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


def generate_appointment_reference():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"APT-{date_str}-{unique_suffix}"


class DoctorAvailability(models.Model):

    class DayOfWeek(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    SUPPORTED_DURATIONS = [10, 15, 20, 30, 45, 60]

    doctor = models.ForeignKey(
        "hospitals.Doctor",
        on_delete=models.CASCADE,
        related_name="availabilities",
    )
    day_of_week = models.IntegerField(
        choices=DayOfWeek.choices,
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_duration = models.PositiveIntegerField(
        default=30,
        help_text="Duration in minutes (e.g. 10, 15, 20, 30, 45, 60)",
    )
    is_active = models.BooleanField(
        default=True,
    )
    effective_start_date = models.DateField(
        null=True,
        blank=True,
    )
    effective_end_date = models.DateField(
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
        ordering = ["doctor", "day_of_week", "start_time"]
        verbose_name_plural = "Doctor Availabilities"
        indexes = [
            models.Index(fields=["doctor", "day_of_week", "is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError({
                "end_time": "Working end time must be later than start time."
            })

        if self.slot_duration not in self.SUPPORTED_DURATIONS:
            raise ValidationError({
                "slot_duration": f"Slot duration must be one of {self.SUPPORTED_DURATIONS} minutes."
            })

        if self.start_time and self.end_time:
            dummy_date = datetime.today().date()
            start_dt = datetime.combine(dummy_date, self.start_time)
            end_dt = datetime.combine(dummy_date, self.end_time)
            total_minutes = (end_dt - start_dt).total_seconds() / 60
            if total_minutes < self.slot_duration:
                raise ValidationError({
                    "slot_duration": "Working interval cannot accommodate the configured slot duration."
                })

        if (
            self.effective_start_date
            and self.effective_end_date
            and self.effective_start_date > self.effective_end_date
        ):
            raise ValidationError({
                "effective_end_date": "Effective end date cannot be earlier than start date."
            })

        # Overlap check for same doctor and day of week when active
        if self.is_active and self.doctor_id is not None and self.day_of_week is not None:
            existing_qs = DoctorAvailability.objects.filter(
                doctor_id=self.doctor_id,
                day_of_week=self.day_of_week,
                is_active=True,
            )
            if self.pk:
                existing_qs = existing_qs.exclude(pk=self.pk)

            for rule in existing_qs:
                # Check date range overlap
                dates_overlap = True
                if self.effective_end_date and rule.effective_start_date:
                    if self.effective_end_date < rule.effective_start_date:
                        dates_overlap = False
                if self.effective_start_date and rule.effective_end_date:
                    if self.effective_start_date > rule.effective_end_date:
                        dates_overlap = False

                if dates_overlap and self.start_time and self.end_time:
                    # Check time range overlap: start1 < end2 and end1 > start2
                    if self.start_time < rule.end_time and self.end_time > rule.start_time:
                        raise ValidationError(
                            "An overlapping availability schedule already exists for this doctor on this day."
                        )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        day_name = self.get_day_of_week_display()
        return f"{self.doctor.doctor_id} | {day_name} {self.start_time}-{self.end_time} ({self.slot_duration}m)"


class Appointment(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CHECKED_IN = "CHECKED_IN", "Checked In"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"
        NO_SHOW = "NO_SHOW", "No Show"

    class AppointmentType(models.TextChoices):
        IN_PERSON = "IN_PERSON", "In-Person"
        TELEHEALTH = "TELEHEALTH", "Telehealth"
        FOLLOW_UP = "FOLLOW_UP", "Follow-up"
        EMERGENCY = "EMERGENCY", "Emergency"

    VALID_TRANSITIONS = {
        Status.PENDING: [Status.CONFIRMED, Status.CANCELLED],
        Status.CONFIRMED: [Status.CHECKED_IN, Status.CANCELLED, Status.NO_SHOW],
        Status.CHECKED_IN: [Status.IN_PROGRESS, Status.CANCELLED, Status.NO_SHOW],
        Status.IN_PROGRESS: [Status.COMPLETED, Status.CANCELLED],
        Status.COMPLETED: [],
        Status.CANCELLED: [],
        Status.NO_SHOW: [],
    }

    TERMINAL_STATUSES = [Status.COMPLETED, Status.CANCELLED, Status.NO_SHOW]

    appointment_reference = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_appointment_reference,
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="appointments",
    )
    doctor = models.ForeignKey(
        "hospitals.Doctor",
        on_delete=models.CASCADE,
        related_name="appointments",
    )
    hospital = models.ForeignKey(
        "hospitals.Hospital",
        on_delete=models.CASCADE,
        related_name="appointments",
    )
    department = models.ForeignKey(
        "hospitals.Department",
        on_delete=models.CASCADE,
        related_name="appointments",
    )
    appointment_date = models.DateField(
        db_index=True,
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    appointment_type = models.CharField(
        max_length=20,
        choices=AppointmentType.choices,
        default=AppointmentType.IN_PERSON,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    reason_for_visit = models.TextField()
    patient_notes = models.TextField(
        blank=True,
    )
    staff_notes = models.TextField(
        blank=True,
    )
    cancellation_reason = models.TextField(
        blank=True,
    )
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_appointments",
    )
    booked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booked_appointments",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-appointment_date", "-start_time"]
        indexes = [
            models.Index(fields=["appointment_reference"]),
            models.Index(fields=["doctor", "appointment_date", "status"]),
            models.Index(fields=["patient", "appointment_date", "status"]),
            models.Index(fields=["hospital", "appointment_date"]),
        ]

    def can_transition_to(self, new_status):
        return new_status in self.VALID_TRANSITIONS.get(self.status, [])

    def clean(self):
        super().clean()
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError({
                "end_time": "Appointment end time must be later than start time."
            })

    def save(self, *args, **kwargs):
        # Automatically align hospital and department from the doctor if not set
        if self.doctor_id:
            if not self.hospital_id:
                self.hospital_id = self.doctor.hospital_id
            if not self.department_id:
                self.department_id = self.doctor.department_id

        if not self.appointment_reference:
            while True:
                candidate = generate_appointment_reference()
                if not Appointment.objects.filter(appointment_reference=candidate).exists():
                    self.appointment_reference = candidate
                    break

        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.appointment_reference} - {self.patient.mrn} with {self.doctor.doctor_id} on {self.appointment_date}"


class AppointmentStatusHistory(models.Model):
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name="status_history",
    )
    previous_status = models.CharField(
        max_length=20,
        choices=Appointment.Status.choices,
        blank=True,
    )
    new_status = models.CharField(
        max_length=20,
        choices=Appointment.Status.choices,
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    reason = models.TextField(
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Appointment Status Histories"

    def __str__(self):
        return f"{self.appointment.appointment_reference}: {self.previous_status} -> {self.new_status}"
