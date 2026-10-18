from datetime import datetime, timedelta
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import Appointment, AppointmentStatusHistory, DoctorAvailability


def validate_booking(
    doctor,
    patient,
    appointment_date,
    start_time,
    end_time,
    exclude_appointment_id=None,
):
    """
    Validates booking rules:
    - Doctor and hospital must be active.
    - Cannot book in the past.
    - Doctor must have an active DoctorAvailability matching the weekday and slot interval.
    - No overlapping active appointment for the doctor.
    - No overlapping active appointment for the patient.
    """
    if not doctor.is_available:
        raise ValidationError({"doctor": "The selected doctor is currently unavailable."})

    if not doctor.hospital.is_active:
        raise ValidationError({"hospital": "The doctor's hospital is currently inactive."})

    # Validate appointment start time is before end time
    if start_time >= end_time:
        raise ValidationError({"end_time": "Appointment end time must be later than start time."})

    # Cannot book in the past
    tz = timezone.get_current_timezone()
    appointment_start_dt = timezone.make_aware(
        datetime.combine(appointment_date, start_time), tz
    )
    if appointment_start_dt < timezone.now():
        raise ValidationError(
            {"appointment_date": "Appointments cannot be scheduled in the past."}
        )

    # Check doctor availability schedule for the given day of the week
    weekday = appointment_date.weekday()
    availabilities = DoctorAvailability.objects.filter(
        doctor=doctor,
        day_of_week=weekday,
        is_active=True,
    )

    # Filter by effective date range
    matching_availability = None
    for avail in availabilities:
        if avail.effective_start_date and appointment_date < avail.effective_start_date:
            continue
        if avail.effective_end_date and appointment_date > avail.effective_end_date:
            continue

        # Check if requested time fits entirely inside availability window
        if start_time >= avail.start_time and end_time <= avail.end_time:
            # Check slot alignment
            dummy_d = appointment_date
            avail_start_dt = datetime.combine(dummy_d, avail.start_time)
            app_start_dt = datetime.combine(dummy_d, start_time)
            app_end_dt = datetime.combine(dummy_d, end_time)

            offset_minutes = int((app_start_dt - avail_start_dt).total_seconds() / 60)
            duration_minutes = int((app_end_dt - app_start_dt).total_seconds() / 60)

            if (
                offset_minutes % avail.slot_duration == 0
                and duration_minutes == avail.slot_duration
            ):
                matching_availability = avail
                break

    if not matching_availability:
        raise ValidationError(
            {"time_slot": "Doctor is not available at the requested date and time slot."}
        )

    # Check for doctor conflict (exclude cancelled appointments)
    doctor_conflicts = Appointment.objects.filter(
        doctor=doctor,
        appointment_date=appointment_date,
        start_time__lt=end_time,
        end_time__gt=start_time,
    ).exclude(status=Appointment.Status.CANCELLED)

    if exclude_appointment_id:
        doctor_conflicts = doctor_conflicts.exclude(pk=exclude_appointment_id)

    if doctor_conflicts.exists():
        raise ValidationError(
            {"time_slot": "The doctor already has another appointment booked at this time."}
        )

    # Check for patient conflict (exclude cancelled appointments)
    patient_conflicts = Appointment.objects.filter(
        patient=patient,
        appointment_date=appointment_date,
        start_time__lt=end_time,
        end_time__gt=start_time,
    ).exclude(status=Appointment.Status.CANCELLED)

    if exclude_appointment_id:
        patient_conflicts = patient_conflicts.exclude(pk=exclude_appointment_id)

    if patient_conflicts.exists():
        raise ValidationError(
            {"patient": "The patient already has another appointment scheduled at this time."}
        )


def get_available_slots(doctor, date):
    """
    Computes all unbooked, available time slots for a doctor on a specific date.
    Returns: list of dicts with start_time, end_time, and duration_minutes.
    """
    if not doctor.is_available or not doctor.hospital.is_active:
        return []

    # Can't query slots in the past date
    today = timezone.now().date()
    if date < today:
        return []

    weekday = date.weekday()
    availabilities = DoctorAvailability.objects.filter(
        doctor=doctor,
        day_of_week=weekday,
        is_active=True,
    )

    # Existing booked appointments for this doctor on this date (excluding cancelled)
    booked_appointments = list(
        Appointment.objects.filter(
            doctor=doctor,
            appointment_date=date,
        )
        .exclude(status=Appointment.Status.CANCELLED)
        .values("start_time", "end_time")
    )

    tz = timezone.get_current_timezone()
    now = timezone.now()
    available_slots = []

    for avail in availabilities:
        if avail.effective_start_date and date < avail.effective_start_date:
            continue
        if avail.effective_end_date and date > avail.effective_end_date:
            continue

        slot_duration = timedelta(minutes=avail.slot_duration)
        curr_dt = datetime.combine(date, avail.start_time)
        end_dt = datetime.combine(date, avail.end_time)

        while curr_dt + slot_duration <= end_dt:
            slot_start_time = curr_dt.time()
            slot_end_time = (curr_dt + slot_duration).time()

            # If date is today, check if slot start is already in the past
            slot_start_aware = timezone.make_aware(curr_dt, tz)
            if slot_start_aware > now:
                # Check collision with existing appointments
                is_booked = False
                for b in booked_appointments:
                    if slot_start_time < b["end_time"] and slot_end_time > b["start_time"]:
                        is_booked = True
                        break

                if not is_booked:
                    available_slots.append({
                        "start_time": slot_start_time.strftime("%H:%M:%S"),
                        "end_time": slot_end_time.strftime("%H:%M:%S"),
                        "slot_duration": avail.slot_duration,
                    })

            curr_dt += slot_duration

    # Sort slots chronologically
    available_slots.sort(key=lambda s: s["start_time"])
    return available_slots


@transaction.atomic
def transition_appointment_status(appointment, new_status, user, reason=""):
    """
    Safely transitions appointment status and records an audit trail entry.
    """
    if not appointment.can_transition_to(new_status):
        raise ValidationError({
            "status": f"Invalid status transition from {appointment.status} to {new_status}."
        })

    previous_status = appointment.status
    appointment.status = new_status

    if new_status == Appointment.Status.CANCELLED:
        appointment.cancelled_at = timezone.now()
        appointment.cancelled_by = user
        if reason:
            appointment.cancellation_reason = reason

    appointment.save()

    AppointmentStatusHistory.objects.create(
        appointment=appointment,
        previous_status=previous_status,
        new_status=new_status,
        changed_by=user,
        reason=reason,
    )

    return appointment

