import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone


def generate_prescription_reference():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"RX-{date_str}-{unique_suffix}"


def generate_dispense_reference():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"DISP-{date_str}-{unique_suffix}"


class Medicine(models.Model):

    class DosageForm(models.TextChoices):
        TABLET = "TABLET", "Tablet"
        CAPSULE = "CAPSULE", "Capsule"
        SYRUP = "SYRUP", "Syrup"
        SUSPENSION = "SUSPENSION", "Suspension"
        INJECTION = "INJECTION", "Injection"
        CREAM = "CREAM", "Cream"
        OINTMENT = "OINTMENT", "Ointment"
        DROPS = "DROPS", "Drops"
        INHALER = "INHALER", "Inhaler"
        OTHER = "OTHER", "Other"

    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique medicine code, e.g. MED-AMOX-500",
    )
    generic_name = models.CharField(
        max_length=150,
        db_index=True,
    )
    brand_name = models.CharField(
        max_length=150,
        db_index=True,
    )
    active_ingredients = models.TextField(
        help_text="Active pharmacological ingredient(s)",
    )
    strength = models.CharField(
        max_length=100,
        help_text="Strength with unit (e.g. 500 mg, 10 mg/5ml)",
    )
    dosage_form = models.CharField(
        max_length=30,
        choices=DosageForm.choices,
        default=DosageForm.TABLET,
    )
    route_of_administration = models.CharField(
        max_length=100,
        default="Oral",
        help_text="Administration route (e.g. Oral, IV, IM, Topical)",
    )
    manufacturer = models.CharField(
        max_length=150,
    )
    description = models.TextField(
        blank=True,
    )
    dispensing_unit = models.CharField(
        max_length=50,
        default="tablet",
        help_text="Dispensing package unit (e.g. tablet, capsule, bottle, vial, ampoule)",
    )
    requires_prescription = models.BooleanField(
        default=True,
        help_text="Flag indicating if a medical prescription is legally required",
    )
    low_stock_threshold = models.PositiveIntegerField(
        default=50,
        help_text="Inventory threshold for low stock alert",
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
        ordering = ["generic_name", "brand_name"]
        verbose_name_plural = "Medicines"
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["generic_name"]),
            models.Index(fields=["brand_name"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.generic_name} ({self.brand_name}) {self.strength} [{self.code}]"


class PharmacyLocation(models.Model):
    hospital = models.ForeignKey(
        "hospitals.Hospital",
        on_delete=models.CASCADE,
        related_name="pharmacy_locations",
    )
    location_code = models.CharField(
        max_length=50,
        help_text="Code within hospital, e.g. PHARM-MAIN",
    )
    name = models.CharField(
        max_length=150,
    )
    location_details = models.TextField(
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
        ordering = ["hospital", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["hospital", "location_code"],
                name="unique_pharmacy_location_per_hospital",
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.location_code}) - {self.hospital.name}"


class MedicineBatch(models.Model):

    class BatchStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        QUARANTINED = "QUARANTINED", "Quarantined"
        EXPIRED = "EXPIRED", "Expired"
        DEPLETED = "DEPLETED", "Depleted"

    medicine = models.ForeignKey(
        Medicine,
        on_delete=models.CASCADE,
        related_name="batches",
    )
    pharmacy_location = models.ForeignKey(
        PharmacyLocation,
        on_delete=models.CASCADE,
        related_name="batches",
    )
    batch_number = models.CharField(
        max_length=100,
        db_index=True,
    )
    supplier = models.CharField(
        max_length=150,
        blank=True,
    )
    expiry_date = models.DateField(
        db_index=True,
    )
    received_date = models.DateField(
        default=timezone.now,
    )
    purchase_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
    )
    selling_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
    )
    received_quantity = models.PositiveIntegerField()
    available_quantity = models.PositiveIntegerField()
    batch_status = models.CharField(
        max_length=20,
        choices=BatchStatus.choices,
        default=BatchStatus.ACTIVE,
        db_index=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["expiry_date", "created_at"]
        verbose_name_plural = "Medicine Batches"
        constraints = [
            models.UniqueConstraint(
                fields=["medicine", "pharmacy_location", "batch_number"],
                name="unique_batch_per_medicine_location",
            ),
            models.CheckConstraint(
                condition=Q(available_quantity__gte=0),
                name="medicine_batch_available_quantity_non_negative",
            ),
        ]
        indexes = [
            models.Index(fields=["medicine", "pharmacy_location", "batch_status"]),
            models.Index(fields=["expiry_date"]),
        ]

    def is_expired(self):
        return self.expiry_date < timezone.now().date()

    def clean(self):
        super().clean()
        if self.available_quantity is not None and self.received_quantity is not None:
            if self.available_quantity > self.received_quantity:
                raise ValidationError({
                    "available_quantity": "Available quantity cannot exceed received quantity."
                })

        if self.is_expired() and self.batch_status == self.BatchStatus.ACTIVE:
            self.batch_status = self.BatchStatus.EXPIRED

    def save(self, *args, **kwargs):
        if self.available_quantity == 0 and self.batch_status == self.BatchStatus.ACTIVE:
            self.batch_status = self.BatchStatus.DEPLETED
        elif self.is_expired():
            self.batch_status = self.BatchStatus.EXPIRED
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.medicine.generic_name} | Batch {self.batch_number} (Exp: {self.expiry_date}, Qty: {self.available_quantity})"


class StockMovement(models.Model):

    class MovementType(models.TextChoices):
        RECEIPT = "RECEIPT", "Stock Receipt"
        DISPENSE = "DISPENSE", "Prescription Dispense"
        RETURN = "RETURN", "Dispense Return"
        ADJUSTMENT = "ADJUSTMENT", "Inventory Adjustment"
        EXPIRED = "EXPIRED", "Marked Expired"
        WASTAGE = "WASTAGE", "Damaged / Wastage"

    batch = models.ForeignKey(
        MedicineBatch,
        on_delete=models.CASCADE,
        related_name="movements",
    )
    pharmacy_location = models.ForeignKey(
        PharmacyLocation,
        on_delete=models.CASCADE,
        related_name="stock_movements",
    )
    movement_type = models.CharField(
        max_length=20,
        choices=MovementType.choices,
    )
    quantity = models.IntegerField(
        help_text="Signed quantity delta (+ for additions, - for deductions)",
    )
    previous_balance = models.PositiveIntegerField()
    resulting_balance = models.PositiveIntegerField()
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="Reference to order, prescription, receipt, or transaction ID",
    )
    acting_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_movements",
    )
    reason = models.TextField()
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Stock Movements"

    def clean(self):
        super().clean()
        if self.pk:
            raise ValidationError("Stock movements are immutable and cannot be edited.")

    def delete(self, *args, **kwargs):
        raise ValidationError("Stock movements cannot be deleted.")

    def __str__(self):
        return f"[{self.movement_type}] {self.batch.batch_number}: {self.quantity:+d} ({self.previous_balance} -> {self.resulting_balance})"


class Prescription(models.Model):

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ISSUED = "ISSUED", "Issued"
        PARTIALLY_DISPENSED = "PARTIALLY_DISPENSED", "Partially Dispensed"
        DISPENSED = "DISPENSED", "Fully Dispensed"
        CANCELLED = "CANCELLED", "Cancelled"

    VALID_TRANSITIONS = {
        Status.DRAFT: [Status.ISSUED, Status.CANCELLED],
        Status.ISSUED: [Status.PARTIALLY_DISPENSED, Status.DISPENSED, Status.CANCELLED],
        Status.PARTIALLY_DISPENSED: [Status.DISPENSED],
        Status.DISPENSED: [],
        Status.CANCELLED: [],
    }

    prescription_reference = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_prescription_reference,
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="prescriptions",
    )
    doctor = models.ForeignKey(
        "hospitals.Doctor",
        on_delete=models.CASCADE,
        related_name="prescriptions",
    )
    hospital = models.ForeignKey(
        "hospitals.Hospital",
        on_delete=models.CASCADE,
        related_name="prescriptions",
    )
    encounter = models.ForeignKey(
        "medical_records.ClinicalEncounter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescriptions",
    )
    appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescriptions",
    )
    status = models.CharField(
        max_length=25,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    prescribed_date = models.DateTimeField(
        default=timezone.now,
    )
    clinical_indication = models.TextField(
        blank=True,
        help_text="Clinical reason, condition, or diagnosis for prescription",
    )
    general_instructions = models.TextField(
        blank=True,
        help_text="General instructions for the patient or dispensing pharmacist",
    )
    cancellation_reason = models.TextField(
        blank=True,
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_prescriptions",
    )
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="issued_prescriptions",
    )
    issued_at = models.DateTimeField(
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
        ordering = ["-prescribed_date", "-created_at"]
        indexes = [
            models.Index(fields=["prescription_reference"]),
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["doctor", "status"]),
            models.Index(fields=["hospital", "prescribed_date"]),
        ]

    def can_transition_to(self, new_status):
        return new_status in self.VALID_TRANSITIONS.get(self.status, [])

    def clean(self):
        super().clean()
        if self.encounter_id:
            if self.encounter.patient_id != self.patient_id:
                raise ValidationError({"encounter": "Encounter patient does not match prescription patient."})
            if self.encounter.doctor_id != self.doctor_id:
                raise ValidationError({"encounter": "Encounter doctor does not match prescription doctor."})

        if self.appointment_id:
            if self.appointment.patient_id != self.patient_id:
                raise ValidationError({"appointment": "Appointment patient does not match prescription patient."})
            if self.appointment.doctor_id != self.doctor_id:
                raise ValidationError({"appointment": "Appointment doctor does not match prescription doctor."})

    def save(self, *args, **kwargs):
        if self.doctor_id and not self.hospital_id:
            self.hospital_id = self.doctor.hospital_id

        if not self.prescription_reference:
            while True:
                candidate = generate_prescription_reference()
                if not Prescription.objects.filter(prescription_reference=candidate).exists():
                    self.prescription_reference = candidate
                    break

        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.prescription_reference} - {self.patient.mrn} by {self.doctor.doctor_id} ({self.get_status_display()})"


class PrescriptionItem(models.Model):

    class ItemStatus(models.TextChoices):
        PENDING = "PENDING", "Pending Dispense"
        PARTIAL = "PARTIAL", "Partially Dispensed"
        DISPENSED = "DISPENSED", "Fully Dispensed"
        CANCELLED = "CANCELLED", "Cancelled"

    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.CASCADE,
        related_name="items",
    )
    medicine = models.ForeignKey(
        Medicine,
        on_delete=models.PROTECT,
        related_name="prescription_items",
    )
    dosage_instructions = models.CharField(
        max_length=255,
        help_text="Dosage instruction (e.g. 1 tablet, 5 ml)",
    )
    route = models.CharField(
        max_length=50,
        blank=True,
        default="Oral",
    )
    frequency = models.CharField(
        max_length=50,
        help_text="Frequency (e.g. Once daily, Twice daily, Every 8 hours)",
    )
    duration_value = models.PositiveIntegerField(
        default=7,
        help_text="Course duration quantity",
    )
    duration_unit = models.CharField(
        max_length=20,
        choices=[("DAYS", "Days"), ("WEEKS", "Weeks"), ("MONTHS", "Months")],
        default="DAYS",
    )
    quantity_prescribed = models.PositiveIntegerField(
        help_text="Total prescribed units",
    )
    quantity_dispensed = models.PositiveIntegerField(
        default=0,
    )
    dispensing_unit = models.CharField(
        max_length=50,
        blank=True,
    )
    refills_allowed = models.PositiveIntegerField(
        default=0,
    )
    refills_used = models.PositiveIntegerField(
        default=0,
    )
    patient_instructions = models.TextField(
        blank=True,
        help_text="Special instructions for patient (e.g. Take with food)",
    )
    allow_substitution = models.BooleanField(
        default=True,
        help_text="Allow generic substitution by dispensing pharmacist",
    )
    status = models.CharField(
        max_length=20,
        choices=ItemStatus.choices,
        default=ItemStatus.PENDING,
    )
    allergy_warning = models.TextField(
        blank=True,
        help_text="Clinical warning if patient is allergic to medicine/ingredients",
    )
    allergy_override = models.BooleanField(
        default=False,
        help_text="Explicit prescriber override for allergy warning",
    )
    allergy_override_reason = models.TextField(
        blank=True,
        help_text="Documented clinical justification for allergy override",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["created_at"]

    @property
    def remaining_quantity(self):
        return max(0, self.quantity_prescribed - self.quantity_dispensed)

    def clean(self):
        super().clean()
        if self.quantity_prescribed is not None and self.quantity_prescribed <= 0:
            raise ValidationError({"quantity_prescribed": "Quantity prescribed must be greater than zero."})

        if self.quantity_dispensed > self.quantity_prescribed:
            raise ValidationError({"quantity_dispensed": "Dispensed quantity cannot exceed prescribed quantity."})

        if not self.dispensing_unit and self.medicine_id:
            self.dispensing_unit = self.medicine.dispensing_unit

    def save(self, *args, **kwargs):
        if self.quantity_dispensed >= self.quantity_prescribed and self.quantity_prescribed > 0:
            self.status = self.ItemStatus.DISPENSED
        elif self.quantity_dispensed > 0:
            self.status = self.ItemStatus.PARTIAL
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.medicine.generic_name} ({self.quantity_dispensed}/{self.quantity_prescribed} {self.dispensing_unit})"


class DispenseRecord(models.Model):
    dispense_reference = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_dispense_reference,
    )
    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.PROTECT,
        related_name="dispenses",
    )
    pharmacy_location = models.ForeignKey(
        PharmacyLocation,
        on_delete=models.PROTECT,
        related_name="dispenses",
    )
    dispensed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dispensed_records",
    )
    dispensed_at = models.DateTimeField(
        default=timezone.now,
    )
    notes = models.TextField(
        blank=True,
    )
    is_reversed = models.BooleanField(
        default=False,
        help_text="Flag indicating if this dispense was officially returned/reversed",
    )
    reversal_reason = models.TextField(
        blank=True,
    )
    reversed_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    reversed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reversed_dispenses",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-dispensed_at"]
        indexes = [
            models.Index(fields=["dispense_reference"]),
            models.Index(fields=["prescription", "dispensed_at"]),
        ]

    def save(self, *args, **kwargs):
        if not self.dispense_reference:
            while True:
                candidate = generate_dispense_reference()
                if not DispenseRecord.objects.filter(dispense_reference=candidate).exists():
                    self.dispense_reference = candidate
                    break
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.dispense_reference} for {self.prescription.prescription_reference} at {self.pharmacy_location.location_code}"


class DispensedItem(models.Model):
    dispense_record = models.ForeignKey(
        DispenseRecord,
        on_delete=models.CASCADE,
        related_name="items",
    )
    prescription_item = models.ForeignKey(
        PrescriptionItem,
        on_delete=models.PROTECT,
        related_name="dispensed_items",
    )
    batch = models.ForeignKey(
        MedicineBatch,
        on_delete=models.PROTECT,
        related_name="dispensed_items",
    )
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
    )
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["created_at"]

    def clean(self):
        super().clean()
        if self.quantity <= 0:
            raise ValidationError({"quantity": "Dispensed quantity must be greater than zero."})

        if self.batch_id and self.prescription_item_id:
            if self.batch.medicine_id != self.prescription_item.medicine_id:
                raise ValidationError({"batch": "Selected batch medicine does not match prescription item medicine."})

    def save(self, *args, **kwargs):
        if self.unit_price and self.quantity and not self.total_price:
            self.total_price = self.unit_price * self.quantity
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.prescription_item.medicine.generic_name} x {self.quantity} (Batch {self.batch.batch_number})"
