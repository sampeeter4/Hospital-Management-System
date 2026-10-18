from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import (
    DispenseRecord,
    DispensedItem,
    MedicineBatch,
    Prescription,
    PrescriptionItem,
    StockMovement,
)


def check_allergy_conflict(patient, medicine):
    """
    Checks patient recorded allergies against medicine generic name and active ingredients.
    Returns (has_conflict, warning_message).
    Transparently notes that negative results do not guarantee absolute safety.
    """
    if not patient or not patient.allergies:
        return False, ""

    patient_allergies = patient.allergies.lower()
    allergens = [a.strip() for a in patient_allergies.replace(";", ",").split(",") if a.strip()]

    target_tokens = []
    if medicine.generic_name:
        target_tokens.append(medicine.generic_name.lower())
    if medicine.brand_name:
        target_tokens.append(medicine.brand_name.lower())
    if medicine.active_ingredients:
        target_tokens.extend([ing.strip().lower() for ing in medicine.active_ingredients.replace(";", ",").split(",") if ing.strip()])

    matched_allergens = []
    for allergen in allergens:
        for token in target_tokens:
            if allergen in token or token in allergen:
                matched_allergens.append(allergen)
                break

    if matched_allergens:
        matched_str = ", ".join(set(matched_allergens))
        warning_msg = (
            f"ALLERGY WARNING: Patient has recorded allergy to '{matched_str}' which conflicts "
            f"with medicine '{medicine.generic_name}' (Active ingredients: {medicine.active_ingredients}). "
            f"Requires explicit documented prescriber override."
        )
        return True, warning_msg

    return False, ""


@transaction.atomic
def record_stock_movement(
    batch,
    movement_type,
    quantity,
    user,
    reason,
    reference_number="",
):
    """
    Applies signed stock delta atomically using row-level locking (select_for_update)
    and records an immutable StockMovement entry.
    """
    if quantity == 0:
        raise ValidationError({"quantity": "Stock movement quantity cannot be zero."})

    # Row-level lock on the batch
    locked_batch = MedicineBatch.objects.select_for_update().get(pk=batch.pk)

    previous_balance = locked_batch.available_quantity
    resulting_balance = previous_balance + quantity

    if resulting_balance < 0:
        raise ValidationError({
            "quantity": f"Insufficient stock in batch {locked_batch.batch_number}. "
                        f"Requested reduction {-quantity}, but only {previous_balance} available."
        })

    locked_batch.available_quantity = resulting_balance
    if locked_batch.is_expired():
        locked_batch.batch_status = MedicineBatch.BatchStatus.EXPIRED
    elif resulting_balance == 0:
        locked_batch.batch_status = MedicineBatch.BatchStatus.DEPLETED
    elif locked_batch.batch_status == MedicineBatch.BatchStatus.DEPLETED and resulting_balance > 0:
        locked_batch.batch_status = MedicineBatch.BatchStatus.ACTIVE

    locked_batch.save()

    movement = StockMovement.objects.create(
        batch=locked_batch,
        pharmacy_location=locked_batch.pharmacy_location,
        movement_type=movement_type,
        quantity=quantity,
        previous_balance=previous_balance,
        resulting_balance=resulting_balance,
        reference_number=reference_number,
        acting_user=user if user and user.is_authenticated else None,
        reason=reason,
    )

    return movement


@transaction.atomic
def receive_stock_batch(
    medicine,
    pharmacy_location,
    batch_number,
    expiry_date,
    quantity,
    purchase_cost,
    selling_price,
    user,
    supplier="",
):
    """
    Receives inventory into a batch and records a RECEIPT movement.
    """
    if quantity <= 0:
        raise ValidationError({"quantity": "Received quantity must be greater than zero."})

    if expiry_date < timezone.now().date():
        raise ValidationError({"expiry_date": "Cannot receive expired medicine batch into inventory."})

    batch = MedicineBatch.objects.filter(
        medicine=medicine,
        pharmacy_location=pharmacy_location,
        batch_number=batch_number,
    ).first()

    if batch:
        # Increase existing batch
        locked_batch = MedicineBatch.objects.select_for_update().get(pk=batch.pk)
        locked_batch.received_quantity += quantity
        locked_batch.purchase_cost = purchase_cost
        locked_batch.selling_price = selling_price
        locked_batch.expiry_date = expiry_date
        locked_batch.save()
        target_batch = locked_batch
    else:
        target_batch = MedicineBatch.objects.create(
            medicine=medicine,
            pharmacy_location=pharmacy_location,
            batch_number=batch_number,
            supplier=supplier,
            expiry_date=expiry_date,
            purchase_cost=purchase_cost,
            selling_price=selling_price,
            received_quantity=quantity,
            available_quantity=0,  # Will be increased by movement
            batch_status=MedicineBatch.BatchStatus.ACTIVE,
        )

    record_stock_movement(
        batch=target_batch,
        movement_type=StockMovement.MovementType.RECEIPT,
        quantity=quantity,
        user=user,
        reason=f"Stock receipt of {quantity} units from supplier '{supplier or 'Direct'}'",
        reference_number=batch_number,
    )

    target_batch.refresh_from_db()
    return target_batch


@transaction.atomic
def adjust_stock_batch(batch, adjustment_type, quantity, user, reason):
    """
    Audited manual adjustment or wastage of inventory.
    """
    if quantity <= 0:
        raise ValidationError({"quantity": "Adjustment quantity must be greater than zero."})

    if not reason or not reason.strip():
        raise ValidationError({"reason": "A documented reason is required for inventory adjustments."})

    if adjustment_type == "INCREASE":
        movement_type = StockMovement.MovementType.ADJUSTMENT
        delta = quantity
    elif adjustment_type == "DECREASE":
        movement_type = StockMovement.MovementType.ADJUSTMENT
        delta = -quantity
    elif adjustment_type == "WASTAGE":
        movement_type = StockMovement.MovementType.WASTAGE
        delta = -quantity
    elif adjustment_type == "EXPIRED":
        movement_type = StockMovement.MovementType.EXPIRED
        delta = -quantity
    else:
        raise ValidationError({"adjustment_type": f"Unsupported adjustment type '{adjustment_type}'."})

    movement = record_stock_movement(
        batch=batch,
        movement_type=movement_type,
        quantity=delta,
        user=user,
        reason=reason.strip(),
    )
    return movement


@transaction.atomic
def issue_prescription(prescription, user):
    """
    Transitions prescription from DRAFT to ISSUED.
    Ensures prescription has items and verifies allergy override requirements.
    """
    if prescription.status != Prescription.Status.DRAFT:
        raise ValidationError({"status": f"Cannot issue prescription with status {prescription.status}."})

    if not prescription.items.exists():
        raise ValidationError({"items": "Cannot issue prescription without prescription items."})

    for item in prescription.items.all():
        is_conflict, warning_msg = check_allergy_conflict(prescription.patient, item.medicine)
        if is_conflict:
            if not item.allergy_override:
                raise ValidationError({
                    "items": f"Allergy conflict detected on item {item.medicine.generic_name}. "
                             f"Prescriber override and justification reason required before issuing."
                })
            item.allergy_warning = warning_msg
            item.save()

    prescription.status = Prescription.Status.ISSUED
    prescription.issued_by = user
    prescription.issued_at = timezone.now()
    prescription.save()
    return prescription


@transaction.atomic
def cancel_prescription(prescription, user, cancellation_reason):
    """
    Cancels an issued or draft prescription before it has been fully dispensed.
    """
    if prescription.status in [Prescription.Status.DISPENSED, Prescription.Status.CANCELLED]:
        raise ValidationError({"status": f"Cannot cancel prescription with status {prescription.status}."})

    if prescription.status == Prescription.Status.PARTIALLY_DISPENSED:
        raise ValidationError({"status": "Cannot cancel partially dispensed prescription. Process a return or completion instead."})

    if not cancellation_reason or not cancellation_reason.strip():
        raise ValidationError({"cancellation_reason": "Cancellation reason is required."})

    prescription.status = Prescription.Status.CANCELLED
    prescription.cancelled_by = user
    prescription.cancelled_at = timezone.now()
    prescription.cancellation_reason = cancellation_reason.strip()

    # Cancel all pending items
    prescription.items.filter(status=PrescriptionItem.ItemStatus.PENDING).update(
        status=PrescriptionItem.ItemStatus.CANCELLED
    )

    prescription.save()
    return prescription


@transaction.atomic
def dispense_prescription(prescription, pharmacy_location, items_data, user, notes=""):
    """
    Dispenses medicines against an issued prescription from a specific pharmacy location.
    items_data format:
    [
        {"prescription_item_id": 1, "batch_id": 2, "quantity": 10},
        ...
    ]
    """
    if prescription.status not in [Prescription.Status.ISSUED, Prescription.Status.PARTIALLY_DISPENSED]:
        raise ValidationError({
            "prescription": f"Prescription cannot be dispensed in status {prescription.status}."
        })

    if pharmacy_location.hospital_id != prescription.hospital_id:
        raise ValidationError({
            "pharmacy_location": "Pharmacy location does not belong to the prescription's hospital."
        })

    if not items_data:
        raise ValidationError({"items": "At least one item must be specified for dispensing."})

    dispense_record = DispenseRecord.objects.create(
        prescription=prescription,
        pharmacy_location=pharmacy_location,
        dispensed_by=user,
        dispensed_at=timezone.now(),
        notes=notes,
    )

    for entry in items_data:
        item_id = entry.get("prescription_item_id")
        batch_id = entry.get("batch_id")
        qty = entry.get("quantity")

        if not item_id or not batch_id or not qty or qty <= 0:
            raise ValidationError({"items": "Each item must have a valid prescription_item_id, batch_id, and positive quantity."})

        try:
            rx_item = prescription.items.select_for_update().get(pk=item_id)
        except PrescriptionItem.DoesNotExist:
            raise ValidationError({"items": f"Prescription item #{item_id} does not belong to this prescription."})

        if rx_item.status in [PrescriptionItem.ItemStatus.DISPENSED, PrescriptionItem.ItemStatus.CANCELLED]:
            raise ValidationError({"items": f"Item {rx_item.medicine.generic_name} is already {rx_item.status}."})

        if qty > rx_item.remaining_quantity:
            raise ValidationError({
                "items": f"Requested quantity ({qty}) exceeds remaining authorized quantity ({rx_item.remaining_quantity}) for {rx_item.medicine.generic_name}."
            })

        try:
            batch = MedicineBatch.objects.select_for_update().get(pk=batch_id)
        except MedicineBatch.DoesNotExist:
            raise ValidationError({"items": f"Medicine batch #{batch_id} not found."})

        if batch.pharmacy_location_id != pharmacy_location.id:
            raise ValidationError({"items": f"Batch {batch.batch_number} does not belong to location {pharmacy_location.name}."})

        if batch.medicine_id != rx_item.medicine_id:
            raise ValidationError({"items": f"Batch medicine '{batch.medicine.generic_name}' does not match prescribed medicine '{rx_item.medicine.generic_name}'."})

        if batch.is_expired():
            raise ValidationError({"items": f"Batch {batch.batch_number} expired on {batch.expiry_date} and cannot be dispensed."})

        if batch.batch_status != MedicineBatch.BatchStatus.ACTIVE:
            raise ValidationError({"items": f"Batch {batch.batch_number} is currently {batch.batch_status}."})

        if batch.available_quantity < qty:
            raise ValidationError({
                "items": f"Insufficient stock in batch {batch.batch_number}. Available: {batch.available_quantity}, Requested: {qty}."
            })

        # Deduct stock atomically and record StockMovement
        record_stock_movement(
            batch=batch,
            movement_type=StockMovement.MovementType.DISPENSE,
            quantity=-qty,
            user=user,
            reason=f"Dispensed for prescription {prescription.prescription_reference}",
            reference_number=prescription.prescription_reference,
        )

        # Update prescription item quantity dispensed
        rx_item.quantity_dispensed += qty
        rx_item.save()

        unit_price = batch.selling_price
        total_price = unit_price * qty

        DispensedItem.objects.create(
            dispense_record=dispense_record,
            prescription_item=rx_item,
            batch=batch,
            quantity=qty,
            unit_price=unit_price,
            total_price=total_price,
        )

    # Recompute overall prescription status
    prescription.refresh_from_db()
    all_items = list(prescription.items.all())
    all_completed = all(i.remaining_quantity == 0 for i in all_items)
    any_dispensed = any(i.quantity_dispensed > 0 for i in all_items)

    if all_completed:
        prescription.status = Prescription.Status.DISPENSED
    elif any_dispensed:
        prescription.status = Prescription.Status.PARTIALLY_DISPENSED
    prescription.save()

    return dispense_record


@transaction.atomic
def reverse_dispense_record(dispense_record, user, reason, return_to_stock=True):
    """
    Reverses an existing dispense record, restoring remaining quantities and returning stock if eligible.
    """
    if dispense_record.is_reversed:
        raise ValidationError({"detail": "This dispense record has already been reversed."})

    if not reason or not reason.strip():
        raise ValidationError({"reason": "A documented reason is required to reverse a dispensing record."})

    dispense_record.is_reversed = True
    dispense_record.reversal_reason = reason.strip()
    dispense_record.reversed_by = user
    dispense_record.reversed_at = timezone.now()
    dispense_record.save()

    prescription = dispense_record.prescription

    for item in dispense_record.items.select_related("batch", "prescription_item").all():
        rx_item = item.prescription_item
        rx_item.quantity_dispensed = max(0, rx_item.quantity_dispensed - item.quantity)
        rx_item.save()

        if return_to_stock:
            record_stock_movement(
                batch=item.batch,
                movement_type=StockMovement.MovementType.RETURN,
                quantity=item.quantity,
                user=user,
                reason=f"Dispensing return reversal for {prescription.prescription_reference}: {reason.strip()}",
                reference_number=dispense_record.dispense_reference,
            )
        else:
            # Mark as wastage / damaged return
            record_stock_movement(
                batch=item.batch,
                movement_type=StockMovement.MovementType.WASTAGE,
                quantity=0,
                user=user,
                reason=f"Dispensing return marked as unusable: {reason.strip()}",
                reference_number=dispense_record.dispense_reference,
            )

    # Recompute prescription status
    prescription.refresh_from_db()
    all_items = list(prescription.items.all())
    any_dispensed = any(i.quantity_dispensed > 0 for i in all_items)
    if any_dispensed:
        prescription.status = Prescription.Status.PARTIALLY_DISPENSED
    else:
        prescription.status = Prescription.Status.ISSUED
    prescription.save()

    return dispense_record


@transaction.atomic
def mark_expired_batches(acting_user=None):
    """
    Finds unexpired-marked batches past their expiry date and zeroes their stock to EXPIRED.
    """
    today = timezone.now().date()
    expired_batches = MedicineBatch.objects.filter(
        expiry_date__lt=today,
        available_quantity__gt=0,
    )
    count = 0
    for batch in expired_batches:
        qty = batch.available_quantity
        record_stock_movement(
            batch=batch,
            movement_type=StockMovement.MovementType.EXPIRED,
            quantity=-qty,
            user=acting_user,
            reason=f"Automatic expiry quarantine for date {batch.expiry_date}",
        )
        count += 1
    return count
