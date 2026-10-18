import uuid
from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


def generate_invoice_number():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"INV-{date_str}-{unique_suffix}"


def generate_payment_reference():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"PAY-{date_str}-{unique_suffix}"


def generate_refund_reference():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"REF-{date_str}-{unique_suffix}"


def generate_credit_note_number():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"CN-{date_str}-{unique_suffix}"


def generate_preauth_reference():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"PA-{date_str}-{unique_suffix}"


def generate_claim_reference():
    date_str = timezone.now().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"CLM-{date_str}-{unique_suffix}"


class ServiceItem(models.Model):

    class Category(models.TextChoices):
        CONSULTATION = "CONSULTATION", "Doctor Consultation"
        LABORATORY = "LABORATORY", "Laboratory & Diagnostics"
        RADIOLOGY = "RADIOLOGY", "Radiology & Imaging"
        PHARMACY = "PHARMACY", "Pharmacy & Medications"
        ROOM_BED = "ROOM_BED", "Room & Bed Daily Charges"
        PROCEDURE = "PROCEDURE", "Surgical / Clinical Procedure"
        NURSING = "NURSING", "Nursing Care & Monitoring"
        OTHER = "OTHER", "Other Billable Service"

    hospital = models.ForeignKey(
        "hospitals.Hospital",
        on_delete=models.CASCADE,
        related_name="billable_services",
    )
    code = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Unique hospital service tariff code, e.g. SRV-CONS-01",
    )
    name = models.CharField(
        max_length=150,
        db_index=True,
    )
    description = models.TextField(
        blank=True,
    )
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.CONSULTATION,
        db_index=True,
    )
    unit = models.CharField(
        max_length=50,
        default="per unit",
        help_text="Billing basis, e.g. per consultation, per day, per test",
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    currency = models.CharField(
        max_length=10,
        default="INR",
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Applicable tax percentage (e.g. 5.00 for 5%)",
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
        constraints = [
            models.UniqueConstraint(
                fields=["hospital", "code"],
                name="unique_service_code_per_hospital",
            )
        ]
        indexes = [
            models.Index(fields=["hospital", "is_active"]),
            models.Index(fields=["category", "is_active"]),
        ]

    def clean(self):
        super().clean()
        if self.unit_price < Decimal("0.00"):
            raise ValidationError({"unit_price": "Service price cannot be negative."})
        if self.tax_rate < Decimal("0.00") or self.tax_rate > Decimal("100.00"):
            raise ValidationError({"tax_rate": "Tax rate must be between 0% and 100%."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} [{self.code}] - {self.currency} {self.unit_price}"


class Invoice(models.Model):

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ISSUED = "ISSUED", "Issued"
        PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"
        PAID = "PAID", "Paid"
        OVERDUE = "OVERDUE", "Overdue"
        VOID = "VOID", "Void"

    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_invoice_number,
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="invoices",
    )
    hospital = models.ForeignKey(
        "hospitals.Hospital",
        on_delete=models.CASCADE,
        related_name="invoices",
    )
    admission = models.ForeignKey(
        "inpatient.Admission",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    encounter = models.ForeignKey(
        "medical_records.ClinicalEncounter",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    invoice_date = models.DateField(
        default=timezone.now,
        db_index=True,
    )
    due_date = models.DateField(
        null=True,
        blank=True,
        db_index=True,
    )
    currency = models.CharField(
        max_length=10,
        default="INR",
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    total_discount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    total_tax = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    paid_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    balance_due = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_invoices",
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="issued_invoices",
    )
    issued_at = models.DateTimeField(
        null=True,
        blank=True,
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
        ordering = ["-invoice_date", "-created_at"]
        indexes = [
            models.Index(fields=["invoice_number"]),
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["hospital", "status"]),
            models.Index(fields=["status", "due_date"]),
        ]

    def clean(self):
        super().clean()
        if self.due_date and self.invoice_date and self.due_date < self.invoice_date:
            raise ValidationError({"due_date": "Due date cannot precede invoice date."})
        if self.total_amount < Decimal("0.00"):
            raise ValidationError({"total_amount": "Total invoice amount cannot be negative."})

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            while True:
                candidate = generate_invoice_number()
                if not Invoice.objects.filter(invoice_number=candidate).exists():
                    self.invoice_number = candidate
                    break
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_number} - {self.patient.mrn} ({self.currency} {self.total_amount}) [{self.get_status_display()}]"


class InvoiceLineItem(models.Model):
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="line_items",
    )
    service_item = models.ForeignKey(
        ServiceItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoice_line_items",
    )
    service_code = models.CharField(
        max_length=50,
        help_text="Immutable snapshot of service code",
    )
    description = models.CharField(
        max_length=255,
        help_text="Immutable snapshot of service line description",
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Immutable snapshot of unit price",
    )
    discount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        blank=True,
        help_text="Subtotal before tax: (quantity * unit_price) - discount",
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        blank=True,
        help_text="Total for line: subtotal + tax_amount",
    )
    source_module = models.CharField(
        max_length=50,
        blank=True,
        help_text="Originating clinical module, e.g. APPOINTMENTS, PHARMACY, LABORATORY, INPATIENT",
    )
    source_id = models.CharField(
        max_length=50,
        blank=True,
        help_text="Originating record reference/id",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["created_at"]

    def clean(self):
        super().clean()
        if self.quantity is not None and self.quantity <= Decimal("0.00"):
            raise ValidationError({"quantity": "Quantity must be greater than zero."})
        if self.unit_price is not None and self.unit_price < Decimal("0.00"):
            raise ValidationError({"unit_price": "Unit price cannot be negative."})
        if self.discount is not None and self.discount < Decimal("0.00"):
            raise ValidationError({"discount": "Discount cannot be negative."})

        # Calculate line economics
        if self.quantity is not None and self.unit_price is not None:
            gross = (self.quantity * self.unit_price).quantize(Decimal("0.01"))
            disc = self.discount or Decimal("0.00")
            if disc > gross:
                raise ValidationError({"discount": "Discount cannot exceed line gross amount."})

            self.subtotal = (gross - disc).quantize(Decimal("0.01"))
            tax_rate = self.tax_rate or Decimal("0.00")
            self.tax_amount = (self.subtotal * (tax_rate / Decimal("100.00"))).quantize(Decimal("0.01"))
            self.total_amount = (self.subtotal + self.tax_amount).quantize(Decimal("0.01"))

    def save(self, *args, **kwargs):
        if self.quantity is not None and self.unit_price is not None:
            gross = (self.quantity * self.unit_price).quantize(Decimal("0.01"))
            disc = (self.discount or Decimal("0.00")).quantize(Decimal("0.01"))
            self.subtotal = (gross - disc).quantize(Decimal("0.01"))
            tax_rate = self.tax_rate or Decimal("0.00")
            self.tax_amount = (self.subtotal * (tax_rate / Decimal("100.00"))).quantize(Decimal("0.01"))
            self.total_amount = (self.subtotal + self.tax_amount).quantize(Decimal("0.01"))
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.service_code}: {self.description} x{self.quantity} = {self.total_amount}"


class Payment(models.Model):

    class Method(models.TextChoices):
        CASH = "CASH", "Cash"
        UPI = "UPI", "UPI / Instant Transfer"
        BANK_TRANSFER = "BANK_TRANSFER", "Bank Transfer (NEFT/RTGS/IMPS)"
        CARD = "CARD", "Debit / Credit Card"
        INSURANCE = "INSURANCE", "Insurance Direct Settlement"
        OTHER = "OTHER", "Other Method"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Confirmation"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"
        REVERSED = "REVERSED", "Reversed"

    payment_reference = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_payment_reference,
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="payments",
    )
    hospital = models.ForeignKey(
        "hospitals.Hospital",
        on_delete=models.CASCADE,
        related_name="payments",
    )
    payment_date = models.DateTimeField(
        default=timezone.now,
        db_index=True,
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    currency = models.CharField(
        max_length=10,
        default="INR",
    )
    payment_method = models.CharField(
        max_length=30,
        choices=Method.choices,
        default=Method.CASH,
        db_index=True,
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.COMPLETED,
        db_index=True,
    )
    external_transaction_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Gateway / Bank transaction reference, UTR, or authorization code",
    )
    idempotency_key = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        help_text="Unique client-supplied key to prevent duplicate payment submissions",
    )
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="received_payments",
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
        ordering = ["-payment_date", "-created_at"]
        indexes = [
            models.Index(fields=["payment_reference"]),
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["hospital", "payment_date"]),
        ]

    def clean(self):
        super().clean()
        if self.amount <= Decimal("0.00"):
            raise ValidationError({"amount": "Payment amount must be strictly positive."})

    def save(self, *args, **kwargs):
        if not self.payment_reference:
            while True:
                candidate = generate_payment_reference()
                if not Payment.objects.filter(payment_reference=candidate).exists():
                    self.payment_reference = candidate
                    break
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.payment_reference} - {self.currency} {self.amount} ({self.get_payment_method_display()}) [{self.get_status_display()}]"


class PaymentAllocation(models.Model):
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name="allocations",
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.PROTECT,
        related_name="allocations",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    allocated_at = models.DateTimeField(
        default=timezone.now,
    )
    is_reversed = models.BooleanField(
        default=False,
        db_index=True,
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
        related_name="reversed_allocations",
    )
    reversal_reason = models.TextField(
        blank=True,
    )

    class Meta:
        ordering = ["-allocated_at"]

    def clean(self):
        super().clean()
        if self.amount <= Decimal("0.00"):
            raise ValidationError({"amount": "Allocated amount must be strictly positive."})
        if self.payment.currency != self.invoice.currency:
            raise ValidationError({"currency": "Payment currency does not match invoice currency."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        rev_str = " (REVERSED)" if self.is_reversed else ""
        return f"{self.payment.payment_reference} -> {self.invoice.invoice_number}: {self.amount}{rev_str}"


class Refund(models.Model):

    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Requested"
        APPROVED = "APPROVED", "Approved"
        EXECUTED = "EXECUTED", "Executed / Processed"
        REJECTED = "REJECTED", "Rejected"

    refund_reference = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_refund_reference,
    )
    payment = models.ForeignKey(
        Payment,
        on_delete=models.PROTECT,
        related_name="refunds",
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="refunds",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    reason = models.TextField(
        help_text="Clinical or financial justification for refund",
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.REQUESTED,
        db_index=True,
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requested_refunds",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_refunds",
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    executed_at = models.DateTimeField(
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

    def clean(self):
        super().clean()
        if self.amount <= Decimal("0.00"):
            raise ValidationError({"amount": "Refund amount must be strictly positive."})
        if self.amount > self.payment.amount:
            raise ValidationError({"amount": "Refund cannot exceed the original payment amount."})

    def save(self, *args, **kwargs):
        if not self.refund_reference:
            while True:
                candidate = generate_refund_reference()
                if not Refund.objects.filter(refund_reference=candidate).exists():
                    self.refund_reference = candidate
                    break
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.refund_reference} for {self.payment.payment_reference}: {self.amount} [{self.get_status_display()}]"


class CreditNote(models.Model):
    credit_note_number = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_credit_note_number,
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.PROTECT,
        related_name="credit_notes",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    reason = models.TextField(
        help_text="Financial rationale / Billing error correction justification",
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="issued_credit_notes",
    )
    issued_at = models.DateTimeField(
        default=timezone.now,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-issued_at"]

    def clean(self):
        super().clean()
        if self.amount <= Decimal("0.00"):
            raise ValidationError({"amount": "Credit note amount must be strictly positive."})
        if self.amount > self.invoice.total_amount:
            raise ValidationError({"amount": "Credit note amount cannot exceed invoice total."})

    def save(self, *args, **kwargs):
        if not self.credit_note_number:
            while True:
                candidate = generate_credit_note_number()
                if not CreditNote.objects.filter(credit_note_number=candidate).exists():
                    self.credit_note_number = candidate
                    break
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.credit_note_number} against {self.invoice.invoice_number}: {self.amount}"


class InsuranceProvider(models.Model):
    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique insurance company / TPA identifier, e.g. INS-STAR-01",
    )
    name = models.CharField(
        max_length=150,
        db_index=True,
    )
    contact_person = models.CharField(
        max_length=100,
        blank=True,
    )
    email = models.EmailField(
        blank=True,
    )
    phone = models.CharField(
        max_length=25,
        blank=True,
    )
    address = models.TextField(
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
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} [{self.code}]"


class PatientInsurancePolicy(models.Model):
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="billing_insurance_policies",
    )
    provider = models.ForeignKey(
        InsuranceProvider,
        on_delete=models.PROTECT,
        related_name="policies",
    )
    policy_number = models.CharField(
        max_length=100,
        db_index=True,
    )
    plan_name = models.CharField(
        max_length=150,
        blank=True,
    )
    effective_start_date = models.DateField()
    effective_end_date = models.DateField()
    coverage_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    copay_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Patient copay responsibility percentage, e.g. 10.00 for 10%",
    )
    is_verified = models.BooleanField(
        default=False,
        db_index=True,
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_policies",
    )
    verified_at = models.DateTimeField(
        null=True,
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
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "is_active"]),
            models.Index(fields=["policy_number"]),
        ]

    def clean(self):
        super().clean()
        if self.effective_end_date < self.effective_start_date:
            raise ValidationError({"effective_end_date": "Policy end date cannot precede start date."})
        if self.copay_percentage < Decimal("0.00") or self.copay_percentage > Decimal("100.00"):
            raise ValidationError({"copay_percentage": "Copay percentage must be between 0% and 100%."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.patient.mrn} - {self.provider.name} ({self.policy_number})"


class InsurancePreAuthorization(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Decision"
        AUTHORIZED = "AUTHORIZED", "Fully Authorized"
        PARTIALLY_AUTHORIZED = "PARTIALLY_AUTHORIZED", "Partially Authorized"
        DENIED = "DENIED", "Denied"
        CANCELLED = "CANCELLED", "Cancelled"

    preauth_reference = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_preauth_reference,
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="pre_authorizations",
    )
    policy = models.ForeignKey(
        PatientInsurancePolicy,
        on_delete=models.PROTECT,
        related_name="pre_authorizations",
    )
    hospital = models.ForeignKey(
        "hospitals.Hospital",
        on_delete=models.CASCADE,
        related_name="pre_authorizations",
    )
    admission = models.ForeignKey(
        "inpatient.Admission",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pre_authorizations",
    )
    requested_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    authorized_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    decision_date = models.DateTimeField(
        null=True,
        blank=True,
    )
    insurer_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text="Insurer's external pre-authorization number",
    )
    denial_reason = models.TextField(
        blank=True,
    )
    notes = models.TextField(
        blank=True,
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requested_preauths",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def clean(self):
        super().clean()
        if self.requested_amount <= Decimal("0.00"):
            raise ValidationError({"requested_amount": "Requested amount must be strictly positive."})
        if self.authorized_amount < Decimal("0.00"):
            raise ValidationError({"authorized_amount": "Authorized amount cannot be negative."})

    def save(self, *args, **kwargs):
        if not self.preauth_reference:
            while True:
                candidate = generate_preauth_reference()
                if not InsurancePreAuthorization.objects.filter(preauth_reference=candidate).exists():
                    self.preauth_reference = candidate
                    break
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.preauth_reference} - {self.patient.mrn} (Req: {self.requested_amount}) [{self.get_status_display()}]"


class InsuranceClaim(models.Model):

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft Claim"
        SUBMITTED = "SUBMITTED", "Submitted to Insurer"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        APPROVED = "APPROVED", "Approved"
        PARTIALLY_APPROVED = "PARTIALLY_APPROVED", "Partially Approved"
        SETTLED = "SETTLED", "Settled / Paid by Insurer"
        DENIED = "DENIED", "Denied"
        CANCELLED = "CANCELLED", "Cancelled"

    claim_reference = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        db_index=True,
        default=generate_claim_reference,
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="billing_claims",
    )
    policy = models.ForeignKey(
        PatientInsurancePolicy,
        on_delete=models.PROTECT,
        related_name="claims",
    )
    hospital = models.ForeignKey(
        "hospitals.Hospital",
        on_delete=models.CASCADE,
        related_name="billing_claims",
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="claims",
    )
    pre_authorization = models.ForeignKey(
        InsurancePreAuthorization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="claims",
    )
    claim_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    approved_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    received_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    submission_date = models.DateTimeField(
        null=True,
        blank=True,
    )
    decision_date = models.DateTimeField(
        null=True,
        blank=True,
    )
    settlement_date = models.DateTimeField(
        null=True,
        blank=True,
    )
    insurer_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text="Insurer's internal claim acknowledgement number",
    )
    denial_reason = models.TextField(
        blank=True,
    )
    notes = models.TextField(
        blank=True,
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_claims",
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
            models.Index(fields=["claim_reference"]),
            models.Index(fields=["invoice", "status"]),
            models.Index(fields=["patient", "status"]),
        ]

    def clean(self):
        super().clean()
        if self.claim_amount <= Decimal("0.00"):
            raise ValidationError({"claim_amount": "Claim amount must be strictly positive."})
        if self.claim_amount > self.invoice.total_amount:
            raise ValidationError({"claim_amount": "Claim amount cannot exceed invoice total."})

    def save(self, *args, **kwargs):
        if not self.claim_reference:
            while True:
                candidate = generate_claim_reference()
                if not InsuranceClaim.objects.filter(claim_reference=candidate).exists():
                    self.claim_reference = candidate
                    break
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.claim_reference} on {self.invoice.invoice_number}: Claim {self.claim_amount} (Rcvd: {self.received_amount}) [{self.get_status_display()}]"


class BillingAuditLog(models.Model):
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
        related_name="billing_audit_logs",
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
        related_name="billing_audit_logs",
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
        verbose_name_plural = "Billing Audit Logs"

    def clean(self):
        super().clean()
        if self.pk:
            raise ValidationError("Billing audit logs are immutable and cannot be updated.")

    def delete(self, *args, **kwargs):
        raise ValidationError("Billing audit logs cannot be deleted.")

    def __str__(self):
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M:%S')}] {self.action} on {self.resource_type}:{self.resource_id} by {self.user}"

