from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import (
    Admission,
    Bed,
    BedAssignment,
    BedReservation,
    InpatientAuditLog,
    Room,
    Ward,
)


def record_inpatient_audit(
    resource_type,
    resource_id,
    action,
    user,
    patient=None,
    description="",
    metadata=None,
):
    """
    Append-only audit trail logging for inpatient admissions and bed operations.
    """
    user_role = getattr(user, "role", "") if user else ""
    return InpatientAuditLog.objects.create(
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
def admit_patient(
    admission,
    bed,
    user,
    reason="Initial inpatient bed allocation",
):
    """
    Formally admits a patient to an active inpatient bed assignment.
    Performs concurrency-safe row locking on the bed to guarantee zero double allocations.
    """
    if admission.status not in [Admission.Status.REQUESTED, Admission.Status.ADMITTED]:
        raise ValidationError({"admission": f"Cannot admit patient with admission status {admission.status}."})

    # If admission is already ADMITTED with an active assignment, reject duplicate admission
    if admission.bed_assignments.filter(is_active=True).exists():
        raise ValidationError({"admission": "Patient is already actively admitted to a bed."})

    # Lock bed row for update
    locked_bed = Bed.objects.select_for_update().select_related("room", "room__ward").get(pk=bed.pk)

    if not locked_bed.room.ward.is_active:
        raise ValidationError({"bed": f"Ward {locked_bed.room.ward.name} is currently inactive."})

    if not locked_bed.room.is_active:
        raise ValidationError({"bed": f"Room {locked_bed.room.room_number} is currently inactive."})

    if locked_bed.room.ward.hospital_id != admission.hospital_id:
        raise ValidationError({"bed": "Selected bed belongs to a different hospital than the admission."})

    if locked_bed.status != Bed.Status.AVAILABLE:
        # Check if it was reserved specifically for this patient
        active_res = locked_bed.reservations.filter(
            patient=admission.patient,
            status=BedReservation.Status.CONFIRMED,
        ).first()
        if not active_res:
            raise ValidationError({"bed": f"Bed {locked_bed.bed_number} is not available (current status: {locked_bed.get_status_display()})."})

    # Check that patient has no other active admission
    active_admissions = Admission.objects.filter(
        patient=admission.patient,
        status=Admission.Status.ADMITTED,
    ).exclude(pk=admission.pk).exists()
    if active_admissions:
        raise ValidationError({"patient": "Patient already has an active inpatient admission elsewhere in the hospital."})

    # Ensure bed has no other active assignment
    if locked_bed.assignments.filter(is_active=True).exists():
        raise ValidationError({"bed": f"Bed {locked_bed.bed_number} already has an active assignment."})

    # Update admission status
    admission.status = Admission.Status.ADMITTED
    admission.admitted_by = user
    admission.save()

    # Create active BedAssignment
    assignment = BedAssignment.objects.create(
        admission=admission,
        bed=locked_bed,
        start_time=timezone.now(),
        is_active=True,
        assigned_by=user,
        reason=reason,
    )

    # Transition bed to OCCUPIED
    locked_bed.status = Bed.Status.OCCUPIED
    locked_bed.save()

    # Fulfill any confirmed reservation
    locked_bed.reservations.filter(
        patient=admission.patient,
        status=BedReservation.Status.CONFIRMED,
    ).update(status=BedReservation.Status.FULFILLED)

    record_inpatient_audit(
        resource_type="ADMISSION",
        resource_id=admission.admission_reference,
        action="ADMITTED",
        user=user,
        patient=admission.patient,
        description=f"Patient {admission.patient.mrn} admitted to bed {locked_bed.bed_number} ({locked_bed.room.ward.name}) by {user.username}",
        metadata={
            "bed_id": locked_bed.id,
            "bed_number": locked_bed.bed_number,
            "ward": locked_bed.room.ward.name,
            "assignment_id": assignment.id,
        },
    )

    return admission, assignment


@transaction.atomic
def transfer_patient(
    admission,
    destination_bed,
    user,
    reason="Inpatient transfer",
):
    """
    Transfers an admitted patient from their current bed to a destination bed.
    Atomically closes the active assignment, transitions source bed to CLEANING,
    and creates a new active assignment for the destination bed in OCCUPIED status.
    """
    if admission.status != Admission.Status.ADMITTED:
        raise ValidationError({"admission": f"Only currently admitted patients can be transferred (status is {admission.status})."})

    if not reason or not reason.strip():
        raise ValidationError({"reason": "A documented reason is required to transfer an inpatient."})

    # 1. Lock and fetch current active assignment
    current_assignment = BedAssignment.objects.select_for_update().select_related("bed").filter(
        admission=admission,
        is_active=True,
    ).first()

    if not current_assignment:
        raise ValidationError({"admission": "Patient has no current active bed assignment to transfer from."})

    source_bed = Bed.objects.select_for_update().get(pk=current_assignment.bed_id)

    if source_bed.id == destination_bed.id:
        raise ValidationError({"destination_bed": "Destination bed cannot be the patient's current bed."})

    # 2. Lock and validate destination bed
    target_bed = Bed.objects.select_for_update().select_related("room", "room__ward").get(pk=destination_bed.pk)

    if not target_bed.room.ward.is_active:
        raise ValidationError({"destination_bed": f"Destination ward {target_bed.room.ward.name} is inactive."})

    if not target_bed.room.is_active:
        raise ValidationError({"destination_bed": f"Destination room {target_bed.room.room_number} is inactive."})

    if target_bed.room.ward.hospital_id != admission.hospital_id:
        raise ValidationError({"destination_bed": "Destination bed must belong to the same hospital as the admission."})

    if target_bed.status != Bed.Status.AVAILABLE:
        raise ValidationError({"destination_bed": f"Destination bed {target_bed.bed_number} is not available (status: {target_bed.get_status_display()})."})

    if target_bed.assignments.filter(is_active=True).exists():
        raise ValidationError({"destination_bed": f"Destination bed {target_bed.bed_number} already has an active assignment."})

    now = timezone.now()

    # 3. Release current assignment
    current_assignment.is_active = False
    current_assignment.end_time = now
    current_assignment.released_by = user
    current_assignment.save()

    # 4. Source bed moves to CLEANING
    source_bed.status = Bed.Status.CLEANING
    source_bed.save()

    # 5. Create new active assignment on target bed
    new_assignment = BedAssignment.objects.create(
        admission=admission,
        bed=target_bed,
        start_time=now,
        is_active=True,
        assigned_by=user,
        reason=reason.strip(),
    )

    # 6. Target bed moves to OCCUPIED
    target_bed.status = Bed.Status.OCCUPIED
    target_bed.save()

    record_inpatient_audit(
        resource_type="ADMISSION",
        resource_id=admission.admission_reference,
        action="TRANSFERRED",
        user=user,
        patient=admission.patient,
        description=f"Patient {admission.patient.mrn} transferred from bed {source_bed.bed_number} to {target_bed.bed_number}: {reason.strip()}",
        metadata={
            "source_bed": source_bed.bed_number,
            "destination_bed": target_bed.bed_number,
            "old_assignment_id": current_assignment.id,
            "new_assignment_id": new_assignment.id,
            "reason": reason.strip(),
        },
    )

    return new_assignment


@transaction.atomic
def discharge_patient(
    admission,
    user,
    discharge_disposition=Admission.DischargeDisposition.HOME_ROUTINE,
    discharge_instructions="",
    discharge_summary="",
    discharge_date=None,
):
    """
    Formally discharges an active inpatient.
    Releases any active bed assignment, moves bed to CLEANING status,
    and updates admission record to DISCHARGED.
    """
    if admission.status != Admission.Status.ADMITTED:
        raise ValidationError({"admission": f"Cannot discharge an admission with status {admission.status}. Must be ADMITTED."})

    now = discharge_date or timezone.now()
    if now < admission.admission_date:
        raise ValidationError({"discharge_date": "Discharge date/time cannot precede admission date."})

    # Release any active bed assignment
    active_assignment = BedAssignment.objects.select_for_update().select_related("bed").filter(
        admission=admission,
        is_active=True,
    ).first()

    released_bed_number = ""
    if active_assignment:
        active_assignment.is_active = False
        active_assignment.end_time = now
        active_assignment.released_by = user
        active_assignment.reason = f"Discharge: {discharge_disposition}"
        active_assignment.save()

        bed = Bed.objects.select_for_update().get(pk=active_assignment.bed_id)
        bed.status = Bed.Status.CLEANING
        bed.save()
        released_bed_number = bed.bed_number

    # Update admission
    admission.status = Admission.Status.DISCHARGED
    admission.actual_discharge_date = now
    admission.discharged_by = user
    admission.discharge_disposition = discharge_disposition
    admission.discharge_instructions = discharge_instructions.strip() if discharge_instructions else ""
    admission.discharge_summary = discharge_summary.strip() if discharge_summary else ""
    admission.save()

    record_inpatient_audit(
        resource_type="ADMISSION",
        resource_id=admission.admission_reference,
        action="DISCHARGED",
        user=user,
        patient=admission.patient,
        description=f"Patient {admission.patient.mrn} discharged by {user.username} (Disposition: {discharge_disposition}). Bed {released_bed_number} sent for sanitization.",
        metadata={
            "disposition": discharge_disposition,
            "released_bed": released_bed_number,
        },
    )

    return admission


@transaction.atomic
def update_bed_operational_status(
    bed,
    new_status,
    user,
    notes="",
):
    """
    Updates the operational/maintenance/sanitization status of a bed.
    E.g. moving a bed from CLEANING -> AVAILABLE after housekeeping confirms cleanliness.
    """
    locked_bed = Bed.objects.select_for_update().get(pk=bed.pk)

    if locked_bed.assignments.filter(is_active=True).exists() and new_status != Bed.Status.OCCUPIED:
        raise ValidationError({"status": "Bed has an active occupant and cannot be changed from OCCUPIED directly."})

    old_status = locked_bed.status
    locked_bed.status = new_status
    if notes:
        locked_bed.equipment_details = f"{locked_bed.equipment_details}\nStatus Note: {notes}".strip()
    locked_bed.save()

    record_inpatient_audit(
        resource_type="BED",
        resource_id=locked_bed.bed_number,
        action="STATUS_CHANGED",
        user=user,
        description=f"Bed {locked_bed.bed_number} status changed from {old_status} to {new_status} by {user.username}",
        metadata={
            "old_status": old_status,
            "new_status": new_status,
            "notes": notes,
        },
    )

    return locked_bed


@transaction.atomic
def reserve_bed(
    bed,
    user,
    reserved_until,
    patient=None,
    admission=None,
    notes="",
):
    """
    Reserves an available bed for an upcoming admission.
    """
    locked_bed = Bed.objects.select_for_update().get(pk=bed.pk)

    if locked_bed.status != Bed.Status.AVAILABLE:
        raise ValidationError({"bed": f"Bed {locked_bed.bed_number} is {locked_bed.get_status_display()} and cannot be reserved."})

    now = timezone.now()
    if reserved_until <= now:
        raise ValidationError({"reserved_until": "Reservation expiration must be in the future."})

    reservation = BedReservation.objects.create(
        bed=locked_bed,
        patient=patient,
        admission=admission,
        reserved_by=user,
        reserved_from=now,
        reserved_until=reserved_until,
        status=BedReservation.Status.CONFIRMED,
        notes=notes.strip() if notes else "",
    )

    locked_bed.status = Bed.Status.RESERVED
    locked_bed.save()

    record_inpatient_audit(
        resource_type="BED",
        resource_id=locked_bed.bed_number,
        action="RESERVED",
        user=user,
        patient=patient,
        description=f"Bed {locked_bed.bed_number} reserved until {reserved_until} by {user.username}",
        metadata={"reservation_id": reservation.id},
    )

    return reservation


@transaction.atomic
def cancel_bed_reservation(
    reservation,
    user,
    reason="",
):
    """
    Cancels an active bed reservation and returns the bed to AVAILABLE.
    """
    if reservation.status != BedReservation.Status.CONFIRMED:
        raise ValidationError({"reservation": f"Reservation in status {reservation.status} cannot be cancelled."})

    reservation.status = BedReservation.Status.CANCELLED
    if reason:
        reservation.notes = f"{reservation.notes}\nCancellation Reason: {reason}".strip()
    reservation.save()

    bed = Bed.objects.select_for_update().get(pk=reservation.bed_id)
    if bed.status == Bed.Status.RESERVED:
        bed.status = Bed.Status.AVAILABLE
        bed.save()

    record_inpatient_audit(
        resource_type="BED",
        resource_id=bed.bed_number,
        action="RESERVATION_CANCELLED",
        user=user,
        patient=reservation.patient,
        description=f"Reservation on bed {bed.bed_number} cancelled by {user.username}: {reason}",
    )

    return reservation


def calculate_occupancy_report(hospital, ward=None):
    """
    Computes occupancy metrics across active beds and active inpatient admissions.
    Denominator excludes inactive/decommissioned beds.
    """
    beds_qs = Bed.objects.filter(
        room__ward__hospital=hospital,
        room__ward__is_active=True,
        room__is_active=True,
    ).exclude(status=Bed.Status.INACTIVE)

    if ward:
        beds_qs = beds_qs.filter(room__ward=ward)

    total_active_beds = beds_qs.count()
    occupied_beds = beds_qs.filter(status=Bed.Status.OCCUPIED).count()
    available_beds = beds_qs.filter(status=Bed.Status.AVAILABLE).count()
    reserved_beds = beds_qs.filter(status=Bed.Status.RESERVED).count()
    cleaning_beds = beds_qs.filter(status=Bed.Status.CLEANING).count()
    maintenance_beds = beds_qs.filter(status=Bed.Status.MAINTENANCE).count()

    occupancy_rate = 0.0
    if total_active_beds > 0:
        occupancy_rate = round((occupied_beds / total_active_beds) * 100, 2)

    admissions_qs = Admission.objects.filter(hospital=hospital, status=Admission.Status.ADMITTED)
    if ward:
        admissions_qs = admissions_qs.filter(bed_assignments__bed__room__ward=ward, bed_assignments__is_active=True)
    active_admissions_count = admissions_qs.count()

    # Breakdown per ward if calculating hospital-wide
    wards_summary = []
    if not ward:
        for w in hospital.wards.filter(is_active=True):
            w_beds = Bed.objects.filter(
                room__ward=w,
                room__is_active=True,
            ).exclude(status=Bed.Status.INACTIVE)
            w_total = w_beds.count()
            w_occ = w_beds.filter(status=Bed.Status.OCCUPIED).count()
            w_rate = round((w_occ / w_total * 100), 2) if w_total > 0 else 0.0
            wards_summary.append({
                "ward_id": w.id,
                "ward_code": w.code,
                "ward_name": w.name,
                "ward_type": w.ward_type,
                "total_beds": w_total,
                "occupied_beds": w_occ,
                "available_beds": w_beds.filter(status=Bed.Status.AVAILABLE).count(),
                "occupancy_rate": w_rate,
            })

    return {
        "hospital_id": hospital.id,
        "hospital_name": hospital.name,
        "ward_id": ward.id if ward else None,
        "ward_name": ward.name if ward else None,
        "total_active_beds": total_active_beds,
        "occupied_beds": occupied_beds,
        "available_beds": available_beds,
        "reserved_beds": reserved_beds,
        "cleaning_beds": cleaning_beds,
        "maintenance_beds": maintenance_beds,
        "active_admissions": active_admissions_count,
        "occupancy_rate": occupancy_rate,
        "wards_summary": wards_summary,
    }

