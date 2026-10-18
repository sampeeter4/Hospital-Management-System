from datetime import date
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from .models import (
    BillingAuditLog,
    CreditNote,
    InsuranceClaim,
    InsurancePreAuthorization,
    Invoice,
    InvoiceLineItem,
    PatientInsurancePolicy,
    Payment,
    PaymentAllocation,
    Refund,
    ServiceItem,
)


def record_billing_audit(
    resource_type,
    resource_id,
    action,
    user,
    patient=None,
    description="",
    metadata=None,
):
    """
    Append-only audit trail logging for all financial events.
    """
    user_role = getattr(user, "role", "") if user else ""
    return BillingAuditLog.objects.create(
        resource_type=resource_type,
        resource_id=str(resource_id),
        action=action,
        user=user if user and user.is_authenticated else None,
        user_role=user_role,
        patient=patient,
        description=description,
        metadata=metadata or {},
    )


@transaction.atomic
def recalculate_invoice_totals(invoice):
    """
    Authoritative backend calculation of invoice line items, taxes, discounts,
    allocated confirmed payments, credit notes, and remaining balance due.
    """
    lines = invoice.line_items.all()

    subtotal = Decimal("0.00")
    total_discount = Decimal("0.00")
    total_tax = Decimal("0.00")
    total_amount = Decimal("0.00")

    for line in lines:
        gross = (line.quantity * line.unit_price).quantize(Decimal("0.01"))
        disc = line.discount.quantize(Decimal("0.01"))
        line_sub = (gross - disc).quantize(Decimal("0.01"))
        tax = (line_sub * (line.tax_rate / Decimal("100.00"))).quantize(Decimal("0.01"))
        line_tot = (line_sub + tax).quantize(Decimal("0.01"))

        subtotal += line_sub
        total_discount += disc
        total_tax += tax
        total_amount += line_tot

    invoice.subtotal = subtotal.quantize(Decimal("0.01"))
    invoice.total_discount = total_discount.quantize(Decimal("0.01"))
    invoice.total_tax = total_tax.quantize(Decimal("0.01"))
    invoice.total_amount = total_amount.quantize(Decimal("0.01"))

    # Confirmed, non-reversed payments allocated to this invoice
    confirmed_paid = invoice.allocations.filter(
        is_reversed=False,
        payment__status=Payment.Status.COMPLETED,
    ).aggregate(s=Sum("amount"))["s"] or Decimal("0.00")

    # Issued credit notes against this invoice
    credit_notes_total = invoice.credit_notes.aggregate(s=Sum("amount"))["s"] or Decimal("0.00")

    invoice.paid_amount = confirmed_paid.quantize(Decimal("0.01"))
    rem_balance = invoice.total_amount - confirmed_paid - credit_notes_total
    invoice.balance_due = max(Decimal("0.00"), rem_balance).quantize(Decimal("0.01"))

    # Status state management
    if invoice.status not in [Invoice.Status.DRAFT, Invoice.Status.VOID]:
        if invoice.balance_due == Decimal("0.00") and invoice.total_amount > Decimal("0.00"):
            invoice.status = Invoice.Status.PAID
        elif confirmed_paid > Decimal("0.00"):
            invoice.status = Invoice.Status.PARTIALLY_PAID
        elif invoice.due_date and invoice.due_date < timezone.now().date():
            invoice.status = Invoice.Status.OVERDUE
        else:
            invoice.status = Invoice.Status.ISSUED

    invoice.save()
    return invoice


@transaction.atomic
def issue_invoice(invoice, user):
    """
    Finalizes and officially issues a draft invoice to a patient.
    """
    if invoice.status != Invoice.Status.DRAFT:
        raise ValidationError({"invoice": f"Cannot issue an invoice with status {invoice.status}. Only DRAFT invoices can be issued."})

    if not invoice.line_items.exists():
        raise ValidationError({"invoice": "Cannot issue an empty invoice with no line items."})

    recalculate_invoice_totals(invoice)

    invoice.status = Invoice.Status.ISSUED
    invoice.issued_by = user
    invoice.issued_at = timezone.now()
    if not invoice.due_date:
        invoice.due_date = timezone.now().date()
    invoice.save()

    record_billing_audit(
        resource_type="INVOICE",
        resource_id=invoice.invoice_number,
        action="ISSUED",
        user=user,
        patient=invoice.patient,
        description=f"Invoice {invoice.invoice_number} finalized and issued by {user.username} for {invoice.currency} {invoice.total_amount}",
        metadata={"total_amount": str(invoice.total_amount), "balance_due": str(invoice.balance_due)},
    )
    return invoice


@transaction.atomic
def void_invoice(invoice, user, reason):
    """
    Marks an invoice as VOID. Requires that no un-reversed payments exist on the invoice.
    """
    if invoice.status == Invoice.Status.VOID:
        raise ValidationError({"invoice": "Invoice is already VOID."})

    if invoice.paid_amount > Decimal("0.00"):
        raise ValidationError({"invoice": "Cannot void an invoice with allocated payments. Reverse or refund payments first."})

    if not reason or not reason.strip():
        raise ValidationError({"reason": "A documented reason is required to void an invoice."})

    invoice.status = Invoice.Status.VOID
    invoice.notes = f"{invoice.notes}\nVoided: {reason.strip()}".strip()
    invoice.balance_due = Decimal("0.00")
    invoice.save()

    record_billing_audit(
        resource_type="INVOICE",
        resource_id=invoice.invoice_number,
        action="VOIDED",
        user=user,
        patient=invoice.patient,
        description=f"Invoice {invoice.invoice_number} voided by {user.username}: {reason.strip()}",
        metadata={"reason": reason.strip()},
    )
    return invoice


@transaction.atomic
def generate_invoice_from_appointment(appointment, user):
    """
    Generates an itemized invoice for a completed or confirmed doctor consultation.
    Prevents duplicate billing for the same appointment.
    """
    existing = Invoice.objects.filter(appointment=appointment).exclude(status=Invoice.Status.VOID).first()
    if existing:
        return existing

    doctor = appointment.doctor
    patient = appointment.patient
    fee = doctor.consultation_fee or Decimal("0.00")

    invoice = Invoice.objects.create(
        patient=patient,
        hospital=appointment.hospital,
        appointment=appointment,
        currency="INR",
        status=Invoice.Status.DRAFT,
        created_by=user,
        notes=f"Consultation billing for appointment {appointment.appointment_reference}",
    )

    InvoiceLineItem.objects.create(
        invoice=invoice,
        service_code="CONS-DOC",
        description=f"Consultation with Dr. {doctor.doctor_id} ({doctor.specialization})",
        quantity=Decimal("1.00"),
        unit_price=fee,
        discount=Decimal("0.00"),
        tax_rate=Decimal("0.00"),
        tax_amount=Decimal("0.00"),
        subtotal=fee,
        total_amount=fee,
        source_module="APPOINTMENTS",
        source_id=appointment.appointment_reference,
    )

    recalculate_invoice_totals(invoice)
    return invoice


@transaction.atomic
def generate_invoice_from_admission(admission, user, daily_room_rate=Decimal("1500.00")):
    """
    Generates an itemized invoice for an inpatient admission and daily room/bed stay.
    Calculates actual days stayed from admission to discharge.
    """
    existing = Invoice.objects.filter(admission=admission).exclude(status=Invoice.Status.VOID).first()
    if existing:
        return existing

    patient = admission.patient
    hospital = admission.hospital

    # Calculate days stayed (minimum 1 day)
    start_dt = admission.admission_date
    end_dt = admission.actual_discharge_date or timezone.now()
    days_stayed = max(1, (end_dt.date() - start_dt.date()).days)

    invoice = Invoice.objects.create(
        patient=patient,
        hospital=hospital,
        admission=admission,
        currency="INR",
        status=Invoice.Status.DRAFT,
        created_by=user,
        notes=f"Inpatient hospitalization billing for {admission.admission_reference}",
    )

    line_gross = (Decimal(str(days_stayed)) * daily_room_rate).quantize(Decimal("0.01"))
    InvoiceLineItem.objects.create(
        invoice=invoice,
        service_code="ROOM-STAY",
        description=f"Hospital Bed Stay Accommodation ({days_stayed} day(s))",
        quantity=Decimal(str(days_stayed)),
        unit_price=daily_room_rate,
        discount=Decimal("0.00"),
        tax_rate=Decimal("0.00"),
        tax_amount=Decimal("0.00"),
        subtotal=line_gross,
        total_amount=line_gross,
        source_module="INPATIENT",
        source_id=admission.admission_reference,
    )

    recalculate_invoice_totals(invoice)
    return invoice


@transaction.atomic
def record_payment(
    patient,
    hospital,
    amount,
    payment_method,
    user,
    invoice=None,
    external_transaction_id="",
    idempotency_key="",
    notes="",
):
    """
    Safely records a confirmed patient or insurer payment with idempotency protection.
    If invoice is provided, automatically creates PaymentAllocation.
    """
    amount = Decimal(str(amount)).quantize(Decimal("0.01"))
    if amount <= Decimal("0.00"):
        raise ValidationError({"amount": "Payment amount must be strictly greater than zero."})

    # Idempotency check: if key provided, return existing transaction
    if idempotency_key:
        existing = Payment.objects.filter(idempotency_key=idempotency_key.strip()).first()
        if existing:
            return existing

    payment = Payment.objects.create(
        patient=patient,
        hospital=hospital,
        amount=amount,
        currency="INR",
        payment_method=payment_method,
        status=Payment.Status.COMPLETED,
        external_transaction_id=external_transaction_id.strip() if external_transaction_id else "",
        idempotency_key=idempotency_key.strip() if idempotency_key else "",
        received_by=user,
        notes=notes.strip() if notes else "",
    )

    record_billing_audit(
        resource_type="PAYMENT",
        resource_id=payment.payment_reference,
        action="RECORDED",
        user=user,
        patient=patient,
        description=f"Payment {payment.payment_reference} of INR {amount} recorded via {payment_method} by {user.username}",
        metadata={"amount": str(amount), "method": payment_method},
    )

    # Optional immediate invoice allocation
    if invoice:
        allocate_payment(payment=payment, invoice=invoice, amount=amount, user=user)

    return payment


@transaction.atomic
def allocate_payment(payment, invoice, amount, user):
    """
    Allocates an unallocated portion of a completed payment to an invoice.
    Uses concurrency row locking on both payment and invoice to prevent over-allocation.
    """
    amount = Decimal(str(amount)).quantize(Decimal("0.01"))
    if amount <= Decimal("0.00"):
        raise ValidationError({"amount": "Allocated amount must be strictly greater than zero."})

    locked_payment = Payment.objects.select_for_update().get(pk=payment.pk)
    locked_invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)

    if locked_payment.status != Payment.Status.COMPLETED:
        raise ValidationError({"payment": f"Cannot allocate payment with status {locked_payment.status}."})

    if locked_invoice.status in [Invoice.Status.VOID]:
        raise ValidationError({"invoice": "Cannot allocate payment to a VOID invoice."})

    # Calculate remaining unallocated payment balance
    used_amount = locked_payment.allocations.filter(is_reversed=False).aggregate(s=Sum("amount"))["s"] or Decimal("0.00")
    unallocated_payment = locked_payment.amount - used_amount

    if amount > unallocated_payment:
        raise ValidationError({"amount": f"Requested allocation (INR {amount}) exceeds available unallocated payment balance (INR {unallocated_payment})."})

    recalculate_invoice_totals(locked_invoice)
    if amount > locked_invoice.balance_due:
        raise ValidationError({"amount": f"Requested allocation (INR {amount}) exceeds invoice remaining balance due (INR {locked_invoice.balance_due})."})

    allocation = PaymentAllocation.objects.create(
        payment=locked_payment,
        invoice=locked_invoice,
        amount=amount,
        allocated_at=timezone.now(),
    )

    recalculate_invoice_totals(locked_invoice)

    record_billing_audit(
        resource_type="ALLOCATION",
        resource_id=allocation.id,
        action="ALLOCATED",
        user=user,
        patient=locked_invoice.patient,
        description=f"Allocated INR {amount} from payment {locked_payment.payment_reference} to invoice {locked_invoice.invoice_number}",
        metadata={"payment": locked_payment.payment_reference, "invoice": locked_invoice.invoice_number, "amount": str(amount)},
    )

    return allocation


@transaction.atomic
def reverse_payment_allocation(allocation, user, reason):
    """
    Reverses a specific payment allocation and restores the invoice balance.
    """
    if allocation.is_reversed:
        raise ValidationError({"allocation": "This payment allocation has already been reversed."})

    if not reason or not reason.strip():
        raise ValidationError({"reason": "A documented reason is required to reverse an allocation."})

    locked_invoice = Invoice.objects.select_for_update().get(pk=allocation.invoice_id)

    allocation.is_reversed = True
    allocation.reversed_at = timezone.now()
    allocation.reversed_by = user
    allocation.reversal_reason = reason.strip()
    allocation.save()

    recalculate_invoice_totals(locked_invoice)

    record_billing_audit(
        resource_type="ALLOCATION",
        resource_id=allocation.id,
        action="REVERSED",
        user=user,
        patient=locked_invoice.patient,
        description=f"Payment allocation {allocation.id} of INR {allocation.amount} reversed by {user.username}: {reason.strip()}",
        metadata={"reason": reason.strip()},
    )

    return allocation


@transaction.atomic
def process_refund(payment, amount, reason, user, invoice=None):
    """
    Processes a refund against a completed payment.
    Enforces that cumulative refunds do not exceed the payment amount.
    """
    amount = Decimal(str(amount)).quantize(Decimal("0.01"))
    if amount <= Decimal("0.00"):
        raise ValidationError({"amount": "Refund amount must be strictly greater than zero."})

    if not reason or not reason.strip():
        raise ValidationError({"reason": "A documented reason is required to process a refund."})

    locked_payment = Payment.objects.select_for_update().get(pk=payment.pk)

    if locked_payment.status != Payment.Status.COMPLETED:
        raise ValidationError({"payment": f"Cannot refund a payment with status {locked_payment.status}."})

    existing_refunds = locked_payment.refunds.filter(
        status__in=[Refund.Status.APPROVED, Refund.Status.EXECUTED]
    ).aggregate(s=Sum("amount"))["s"] or Decimal("0.00")

    available_to_refund = locked_payment.amount - existing_refunds
    if amount > available_to_refund:
        raise ValidationError({"amount": f"Requested refund (INR {amount}) exceeds remaining refundable amount (INR {available_to_refund})."})

    now = timezone.now()
    refund = Refund.objects.create(
        payment=locked_payment,
        invoice=invoice,
        amount=amount,
        reason=reason.strip(),
        status=Refund.Status.EXECUTED,
        requested_by=user,
        approved_by=user,
        approved_at=now,
        executed_at=now,
    )

    if invoice:
        recalculate_invoice_totals(invoice)

    record_billing_audit(
        resource_type="REFUND",
        resource_id=refund.refund_reference,
        action="EXECUTED",
        user=user,
        patient=locked_payment.patient,
        description=f"Refund {refund.refund_reference} of INR {amount} executed by {user.username} for payment {locked_payment.payment_reference}: {reason.strip()}",
        metadata={"amount": str(amount), "reason": reason.strip()},
    )

    return refund


@transaction.atomic
def issue_credit_note(invoice, amount, reason, user):
    """
    Issues a credit note against an invoice, reducing the balance due.
    """
    amount = Decimal(str(amount)).quantize(Decimal("0.01"))
    if amount <= Decimal("0.00"):
        raise ValidationError({"amount": "Credit note amount must be strictly greater than zero."})

    if not reason or not reason.strip():
        raise ValidationError({"reason": "A documented reason is required to issue a credit note."})

    locked_invoice = Invoice.objects.select_for_update().get(pk=invoice.pk)
    recalculate_invoice_totals(locked_invoice)

    if amount > locked_invoice.balance_due:
        raise ValidationError({"amount": f"Credit note amount (INR {amount}) cannot exceed remaining balance due (INR {locked_invoice.balance_due})."})

    credit_note = CreditNote.objects.create(
        invoice=locked_invoice,
        amount=amount,
        reason=reason.strip(),
        issued_by=user,
        issued_at=timezone.now(),
    )

    recalculate_invoice_totals(locked_invoice)

    record_billing_audit(
        resource_type="CREDIT_NOTE",
        resource_id=credit_note.credit_note_number,
        action="ISSUED",
        user=user,
        patient=locked_invoice.patient,
        description=f"Credit note {credit_note.credit_note_number} of INR {amount} issued against {locked_invoice.invoice_number} by {user.username}: {reason.strip()}",
        metadata={"amount": str(amount), "reason": reason.strip()},
    )

    return credit_note


@transaction.atomic
def record_claim_decision(
    claim,
    approved_amount,
    decision_status,
    user,
    denial_reason="",
    insurer_reference="",
):
    """
    Records an insurer's decision on a submitted claim (approval, partial approval, or denial).
    Distinguishes approved insurance amount from actual received cash.
    """
    approved_amount = Decimal(str(approved_amount)).quantize(Decimal("0.01"))

    if decision_status not in [
        InsuranceClaim.Status.APPROVED,
        InsuranceClaim.Status.PARTIALLY_APPROVED,
        InsuranceClaim.Status.DENIED,
    ]:
        raise ValidationError({"status": f"Invalid claim decision status {decision_status}."})

    if decision_status == InsuranceClaim.Status.DENIED and not denial_reason:
        raise ValidationError({"denial_reason": "A reason is required when a claim is denied."})

    claim.status = decision_status
    claim.approved_amount = approved_amount if decision_status != InsuranceClaim.Status.DENIED else Decimal("0.00")
    claim.decision_date = timezone.now()
    if denial_reason:
        claim.denial_reason = denial_reason.strip()
    if insurer_reference:
        claim.insurer_reference = insurer_reference.strip()
    claim.save()

    record_billing_audit(
        resource_type="CLAIM",
        resource_id=claim.claim_reference,
        action=f"DECISION_{decision_status}",
        user=user,
        patient=claim.patient,
        description=f"Claim {claim.claim_reference} decision recorded: {decision_status} (Approved: INR {claim.approved_amount}) by {user.username}",
        metadata={"approved_amount": str(claim.approved_amount), "status": decision_status},
    )

    return claim


@transaction.atomic
def record_claim_payment(
    claim,
    payment_amount,
    user,
    external_reference="",
    notes="",
):
    """
    Records receipt of insurer settlement funds for an approved claim.
    Automatically creates a Payment record with method INSURANCE and allocates to the invoice.
    """
    payment_amount = Decimal(str(payment_amount)).quantize(Decimal("0.01"))
    if payment_amount <= Decimal("0.00"):
        raise ValidationError({"payment_amount": "Settlement amount must be strictly positive."})

    locked_claim = InsuranceClaim.objects.select_for_update().get(pk=claim.pk)

    if locked_claim.status not in [
        InsuranceClaim.Status.APPROVED,
        InsuranceClaim.Status.PARTIALLY_APPROVED,
        InsuranceClaim.Status.SETTLED,
    ]:
        raise ValidationError({"claim": f"Cannot record settlement payment for claim with status {locked_claim.status}."})

    # Create insurance payment
    payment = record_payment(
        patient=locked_claim.patient,
        hospital=locked_claim.hospital,
        amount=payment_amount,
        payment_method=Payment.Method.INSURANCE,
        user=user,
        invoice=locked_claim.invoice,
        external_transaction_id=external_reference or locked_claim.insurer_reference,
        notes=f"Insurance settlement for claim {locked_claim.claim_reference}. {notes}".strip(),
    )

    locked_claim.received_amount += payment_amount
    if locked_claim.received_amount >= locked_claim.approved_amount:
        locked_claim.status = InsuranceClaim.Status.SETTLED
    locked_claim.settlement_date = timezone.now()
    locked_claim.save()

    record_billing_audit(
        resource_type="CLAIM",
        resource_id=locked_claim.claim_reference,
        action="SETTLED_PAYMENT",
        user=user,
        patient=locked_claim.patient,
        description=f"Received INR {payment_amount} insurer settlement for claim {locked_claim.claim_reference}",
        metadata={"payment_id": payment.id, "amount": str(payment_amount)},
    )

    return locked_claim


def generate_financial_reports(hospital, start_date=None, end_date=None):
    """
    Calculates hospital-wide collections, outstanding balances, refunds, and insurance metrics.
    """
    invoices_qs = Invoice.objects.filter(hospital=hospital).exclude(status=Invoice.Status.VOID)
    payments_qs = Payment.objects.filter(hospital=hospital, status=Payment.Status.COMPLETED)
    refunds_qs = Refund.objects.filter(payment__hospital=hospital, status=Refund.Status.EXECUTED)
    credit_notes_qs = CreditNote.objects.filter(invoice__hospital=hospital)
    claims_qs = InsuranceClaim.objects.filter(hospital=hospital).exclude(status=InsuranceClaim.Status.CANCELLED)

    if start_date:
        invoices_qs = invoices_qs.filter(invoice_date__gte=start_date)
        payments_qs = payments_qs.filter(payment_date__date__gte=start_date)
        refunds_qs = refunds_qs.filter(executed_at__date__gte=start_date)
        credit_notes_qs = credit_notes_qs.filter(issued_at__date__gte=start_date)
        claims_qs = claims_qs.filter(created_at__date__gte=start_date)

    if end_date:
        invoices_qs = invoices_qs.filter(invoice_date__lte=end_date)
        payments_qs = payments_qs.filter(payment_date__date__lte=end_date)
        refunds_qs = refunds_qs.filter(executed_at__date__lte=end_date)
        credit_notes_qs = credit_notes_qs.filter(issued_at__date__lte=end_date)
        claims_qs = claims_qs.filter(created_at__date__lte=end_date)

    total_invoiced = invoices_qs.aggregate(s=Sum("total_amount"))["s"] or Decimal("0.00")
    total_outstanding = invoices_qs.aggregate(s=Sum("balance_due"))["s"] or Decimal("0.00")
    total_collected = payments_qs.aggregate(s=Sum("amount"))["s"] or Decimal("0.00")
    total_refunded = refunds_qs.aggregate(s=Sum("amount"))["s"] or Decimal("0.00")
    total_credit_notes = credit_notes_qs.aggregate(s=Sum("amount"))["s"] or Decimal("0.00")

    # Payment collections by payment method
    collections_by_method = {}
    for method_choice in Payment.Method.values:
        amt = payments_qs.filter(payment_method=method_choice).aggregate(s=Sum("amount"))["s"] or Decimal("0.00")
        collections_by_method[method_choice] = amt

    # Claims breakdown
    claims_requested = claims_qs.aggregate(s=Sum("claim_amount"))["s"] or Decimal("0.00")
    claims_approved = claims_qs.aggregate(s=Sum("approved_amount"))["s"] or Decimal("0.00")
    claims_received = claims_qs.aggregate(s=Sum("received_amount"))["s"] or Decimal("0.00")

    return {
        "hospital_id": hospital.id,
        "hospital_name": hospital.name,
        "currency": "INR",
        "total_invoiced": total_invoiced,
        "total_collected": total_collected,
        "net_collected": (total_collected - total_refunded).quantize(Decimal("0.01")),
        "total_outstanding": total_outstanding,
        "total_refunded": total_refunded,
        "total_credit_notes": total_credit_notes,
        "invoice_count": invoices_qs.count(),
        "paid_invoices_count": invoices_qs.filter(status=Invoice.Status.PAID).count(),
        "unpaid_invoices_count": invoices_qs.filter(status__in=[Invoice.Status.ISSUED, Invoice.Status.PARTIALLY_PAID, Invoice.Status.OVERDUE]).count(),
        "collections_by_method": collections_by_method,
        "claims_summary": {
            "total_claims_count": claims_qs.count(),
            "claims_requested_amount": claims_requested,
            "claims_approved_amount": claims_approved,
            "claims_received_amount": claims_received,
        },
    }

