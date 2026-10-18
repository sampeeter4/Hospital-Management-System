import logging
from datetime import timedelta
from django.conf import settings
from django.core.mail import send_mail
from django.db import models, transaction
from django.utils import timezone

from .models import DeliveryAttempt, Notification, NotificationPreference

logger = logging.getLogger(__name__)


def send_notification(
    recipient,
    title,
    message,
    notification_type=Notification.NotificationType.SYSTEM,
    priority=Notification.Priority.NORMAL,
    channel=Notification.Channel.IN_APP,
    resource_type="",
    resource_id="",
    metadata=None,
    event_key="",
    scheduled_at=None,
    expires_at=None,
    send_email=False,
):
    """
    Core notification dispatch service.
    Validates recipient, enforces preferences, prevents duplicate events via event_key,
    creates in-app notifications, and conditionally queues/dispatches email alerts.
    """
    if not recipient or not recipient.is_active:
        return None

    # Idempotency check: prevent duplicate notifications
    if event_key:
        existing = Notification.objects.filter(event_key=event_key).first()
        if existing:
            return existing

    # Preferences check
    pref, _ = NotificationPreference.objects.get_or_create(user=recipient)
    if not pref.is_category_enabled(notification_type):
        return None

    if (
        channel == Notification.Channel.IN_APP
        and not pref.in_app_enabled
        and notification_type != Notification.NotificationType.SYSTEM
    ):
        return None

    metadata_dict = metadata or {}

    with transaction.atomic():
        notification = Notification.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            priority=priority,
            channel=channel,
            title=title.strip()[:255],
            message=message.strip(),
            resource_type=resource_type,
            resource_id=str(resource_id),
            event_key=event_key,
            scheduled_at=scheduled_at,
            expires_at=expires_at,
            metadata=metadata_dict,
        )

        # External email delivery check
        should_send_email = (
            send_email
            or channel == Notification.Channel.EMAIL
            or (priority in [Notification.Priority.HIGH, Notification.Priority.URGENT] and pref.email_enabled)
        )

        if should_send_email and recipient.email and (pref.email_enabled or notification_type == Notification.NotificationType.SYSTEM):
            attempt = DeliveryAttempt.objects.create(
                notification=notification,
                channel=Notification.Channel.EMAIL,
                status=DeliveryAttempt.Status.QUEUED,
            )
            # Attempt dispatch immediately if not future scheduled
            if not scheduled_at or scheduled_at <= timezone.now():
                dispatch_email_delivery(attempt)

    return notification


def dispatch_email_delivery(attempt):
    """
    Dispatches an email delivery attempt using Django's configured mail backend.
    Tracks status, records provider evidence, and handles failures with backoff retry scheduling.
    """
    notification = attempt.notification
    recipient = notification.recipient

    if not recipient.email:
        attempt.status = DeliveryAttempt.Status.FAILED
        attempt.error_code = "NO_RECIPIENT_EMAIL"
        attempt.error_message = "Recipient has no email address configured."
        attempt.save(update_fields=["status", "error_code", "error_message", "updated_at"])
        return attempt

    subject = f"[{notification.get_notification_type_display()}] {notification.title}"
    body = (
        f"Dear {recipient.get_full_name() or recipient.username},\n\n"
        f"{notification.message}\n\n"
        f"---\n"
        f"This is an automated notification from Hospital Management System.\n"
        f"Please log in to your portal to review full details."
    )

    try:
        sent_count = send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient.email],
            fail_silently=False,
        )
        if sent_count > 0:
            attempt.status = DeliveryAttempt.Status.SENT
            attempt.provider_reference = f"MAIL_SENT_{int(timezone.now().timestamp())}"
            attempt.error_message = ""
            attempt.error_code = ""
            attempt.next_retry_at = None
            attempt.save(update_fields=["status", "provider_reference", "error_message", "error_code", "next_retry_at", "updated_at"])
        else:
            attempt.status = DeliveryAttempt.Status.FAILED
            attempt.error_code = "ZERO_RECIPIENTS_ACCEPTED"
            attempt.error_message = "Email backend returned 0 sent messages."
            attempt.save(update_fields=["status", "error_code", "error_message", "updated_at"])
    except Exception as exc:
        attempt.error_code = type(exc).__name__
        attempt.error_message = str(exc)[:500]
        if attempt.attempt_number < 3:
            attempt.status = DeliveryAttempt.Status.RETRYING
            attempt.next_retry_at = timezone.now() + timedelta(minutes=5 * attempt.attempt_number)
        else:
            attempt.status = DeliveryAttempt.Status.FAILED
            attempt.next_retry_at = None
        attempt.save(update_fields=["status", "error_code", "error_message", "next_retry_at", "updated_at"])
        logger.warning(f"Notification email failed for attempt {attempt.id}: {attempt.error_code}")

    return attempt


def process_notification_queue(max_retries=3):
    """
    Batch processor for queued and retrying delivery attempts.
    """
    now = timezone.now()
    pending_attempts = DeliveryAttempt.objects.filter(
        status__in=[DeliveryAttempt.Status.QUEUED, DeliveryAttempt.Status.RETRYING],
    ).filter(
        models.Q(next_retry_at__lte=now) | models.Q(next_retry_at__isnull=True)
    ).select_related("notification", "notification__recipient")

    results = {"total": 0, "sent": 0, "failed": 0, "retrying": 0}

    for attempt in pending_attempts:
        results["total"] += 1
        attempt.attempt_number += 1
        attempt.attempted_at = now
        dispatch_email_delivery(attempt)
        attempt.refresh_from_db()
        if attempt.status == DeliveryAttempt.Status.SENT:
            results["sent"] += 1
        elif attempt.status == DeliveryAttempt.Status.RETRYING:
            results["retrying"] += 1
        else:
            results["failed"] += 1

    return results


def send_appointment_reminders(window_hours=24):
    """
    Scans for upcoming confirmed/pending appointments within the configured time window,
    checks recipient reminder preferences, and sends idempotent reminder notifications.
    """
    try:
        from appointments.models import Appointment
    except ImportError:
        return 0

    now = timezone.now()
    target_date = (now + timedelta(hours=window_hours)).date()

    appointments = Appointment.objects.filter(
        status__in=[Appointment.Status.CONFIRMED, Appointment.Status.PENDING],
        appointment_date__gte=now.date(),
        appointment_date__lte=target_date,
    ).select_related("patient", "patient__user", "doctor", "doctor__user", "hospital")

    created_count = 0
    for apt in appointments:
        patient_user = getattr(apt.patient, "user", None)
        if not patient_user:
            continue

        pref, _ = NotificationPreference.objects.get_or_create(user=patient_user)
        if not pref.appointment_reminders_enabled:
            continue

        # Prevent duplicate reminder for this specific appointment and window
        event_key = f"REMINDER_APT_{apt.id}_{apt.appointment_date}_{window_hours}H"
        if Notification.objects.filter(event_key=event_key).exists():
            continue
        doc_name = f"Dr. {apt.doctor.user.get_full_name() or apt.doctor.user.username}" if apt.doctor else "your doctor"

        title = f"Reminder: Upcoming Appointment with {doc_name}"
        message = (
            f"You have an upcoming appointment scheduled on {apt.appointment_date} "
            f"at {apt.start_time.strftime('%H:%M')} with {doc_name} at {apt.hospital.name}. "
            f"Reference: {apt.appointment_reference}."
        )

        n = send_notification(
            recipient=patient_user,
            title=title,
            message=message,
            notification_type=Notification.NotificationType.REMINDER,
            priority=Notification.Priority.HIGH,
            channel=Notification.Channel.IN_APP,
            resource_type="APPOINTMENT",
            resource_id=str(apt.id),
            event_key=event_key,
            send_email=True,
            metadata={"appointment_id": apt.id, "appointment_date": str(apt.appointment_date)},
        )
        if n:
            created_count += 1

    return created_count


# Module-Specific Notification Integrations

def notify_appointment_event(appointment, event_name, actor=None):
    """
    Sends event-driven notifications for appointment booking, confirmation, rescheduling, or cancellation.
    """
    patient_user = getattr(appointment.patient, "user", None)
    doctor_user = getattr(appointment.doctor, "user", None) if appointment.doctor else None

    doc_name = f"Dr. {doctor_user.get_full_name() or doctor_user.username}" if doctor_user else "Doctor"
    apt_ref = appointment.appointment_reference

    if event_name == "BOOKED":
        if patient_user:
            send_notification(
                recipient=patient_user,
                title="Appointment Booked",
                message=f"Your appointment ({apt_ref}) with {doc_name} on {appointment.appointment_date} at {appointment.start_time} has been requested.",
                notification_type=Notification.NotificationType.APPOINTMENT,
                resource_type="APPOINTMENT",
                resource_id=str(appointment.id),
                event_key=f"APT_{appointment.id}_BOOKED",
            )
        if doctor_user:
            send_notification(
                recipient=doctor_user,
                title="New Appointment Scheduled",
                message=f"A new appointment ({apt_ref}) has been booked for patient {appointment.patient.mrn} on {appointment.appointment_date} at {appointment.start_time}.",
                notification_type=Notification.NotificationType.APPOINTMENT,
                resource_type="APPOINTMENT",
                resource_id=str(appointment.id),
                event_key=f"APT_{appointment.id}_BOOKED_DOC",
            )
    elif event_name == "CONFIRMED" and patient_user:
        send_notification(
            recipient=patient_user,
            title="Appointment Confirmed",
            message=f"Your appointment ({apt_ref}) with {doc_name} on {appointment.appointment_date} at {appointment.start_time} has been confirmed.",
            notification_type=Notification.NotificationType.APPOINTMENT,
            resource_type="APPOINTMENT",
            resource_id=str(appointment.id),
            event_key=f"APT_{appointment.id}_CONFIRMED",
        )
    elif event_name == "CANCELLED":
        if patient_user:
            send_notification(
                recipient=patient_user,
                title="Appointment Cancelled",
                message=f"Your appointment ({apt_ref}) with {doc_name} on {appointment.appointment_date} has been cancelled.",
                notification_type=Notification.NotificationType.APPOINTMENT,
                priority=Notification.Priority.HIGH,
                resource_type="APPOINTMENT",
                resource_id=str(appointment.id),
                event_key=f"APT_{appointment.id}_CANCELLED",
            )
        if doctor_user:
            send_notification(
                recipient=doctor_user,
                title="Appointment Cancelled",
                message=f"Appointment ({apt_ref}) for patient {appointment.patient.mrn} on {appointment.appointment_date} has been cancelled.",
                notification_type=Notification.NotificationType.APPOINTMENT,
                resource_type="APPOINTMENT",
                resource_id=str(appointment.id),
                event_key=f"APT_{appointment.id}_CANCELLED_DOC",
            )


def notify_admission_event(admission, event_name, actor=None):
    """
    Sends notification for inpatient admission, transfer, or discharge.
    """
    patient_user = getattr(admission.patient, "user", None)
    doctor_user = getattr(admission.attending_doctor, "user", None) if admission.attending_doctor else None

    if event_name == "ADMITTED":
        if patient_user:
            send_notification(
                recipient=patient_user,
                title="Hospital Admission Recorded",
                message=f"You have been admitted under care reference {admission.admission_reference} at {admission.hospital.name}.",
                notification_type=Notification.NotificationType.ADMISSION,
                resource_type="ADMISSION",
                resource_id=str(admission.id),
                event_key=f"ADM_{admission.id}_ADMITTED",
            )
        if doctor_user:
            send_notification(
                recipient=doctor_user,
                title="Inpatient Admitted to Your Care",
                message=f"Patient {admission.patient.mrn} has been admitted under your care ({admission.admission_reference}).",
                notification_type=Notification.NotificationType.ADMISSION,
                resource_type="ADMISSION",
                resource_id=str(admission.id),
                event_key=f"ADM_{admission.id}_ADMITTED_DOC",
            )
    elif event_name == "DISCHARGED" and patient_user:
        send_notification(
            recipient=patient_user,
            title="Hospital Discharge Processed",
            message=f"Your inpatient discharge ({admission.admission_reference}) has been finalized. We wish you a speedy recovery.",
            notification_type=Notification.NotificationType.DISCHARGE,
            resource_type="ADMISSION",
            resource_id=str(admission.id),
            event_key=f"ADM_{admission.id}_DISCHARGED",
        )


def notify_prescription_event(prescription, actor=None):
    """
    Notifies patient when a new prescription is issued.
    """
    patient_user = getattr(prescription.patient, "user", None)
    if patient_user:
        send_notification(
            recipient=patient_user,
            title="New Prescription Issued",
            message=f"A new prescription ({prescription.prescription_number}) has been issued. You may collect your medications from the hospital pharmacy.",
            notification_type=Notification.NotificationType.PRESCRIPTION,
            resource_type="PRESCRIPTION",
            resource_id=str(prescription.id),
            event_key=f"RX_{prescription.id}_ISSUED",
        )


def notify_lab_result_event(lab_result, actor=None):
    """
    Notifies doctor and patient when laboratory test results are verified and released.
    Note: Does not expose sensitive medical diagnosis values in the alert text.
    """
    order = lab_result.order
    patient_user = getattr(order.patient, "user", None)
    doctor_user = getattr(order.ordering_doctor, "user", None) if order.ordering_doctor else None

    if doctor_user:
        send_notification(
            recipient=doctor_user,
            title="Laboratory Results Released",
            message=f"Diagnostic results for patient {order.patient.mrn} ({lab_result.result_reference}) are now available for clinical review.",
            notification_type=Notification.NotificationType.LABORATORY,
            priority=Notification.Priority.HIGH,
            resource_type="LAB_RESULT",
            resource_id=str(lab_result.id),
            event_key=f"RES_{lab_result.id}_RELEASED_DOC",
        )

    if patient_user:
        send_notification(
            recipient=patient_user,
            title="Laboratory Results Available",
            message=f"Your laboratory results ({lab_result.result_reference}) have been verified and are ready to view in your patient portal.",
            notification_type=Notification.NotificationType.LABORATORY,
            resource_type="LAB_RESULT",
            resource_id=str(lab_result.id),
            event_key=f"RES_{lab_result.id}_RELEASED_PAT",
        )


def notify_billing_event(resource, event_type, actor=None):
    """
    Handles invoicing, payment, and insurance claim notifications.
    """
    if event_type == "INVOICE_ISSUED":
        patient_user = getattr(resource.patient, "user", None)
        if patient_user:
            send_notification(
                recipient=patient_user,
                title="New Invoice Issued",
                message=f"Invoice {resource.invoice_number} for {resource.currency} {resource.total_amount} has been issued. Balance due: {resource.currency} {resource.balance_due}.",
                notification_type=Notification.NotificationType.BILLING,
                resource_type="INVOICE",
                resource_id=str(resource.id),
                event_key=f"INV_{resource.id}_ISSUED",
            )
    elif event_type == "PAYMENT_RECEIVED":
        patient_user = getattr(resource.patient, "user", None)
        if patient_user:
            send_notification(
                recipient=patient_user,
                title="Payment Receipt",
                message=f"We received your payment of {resource.currency} {resource.amount} (Ref: {resource.payment_reference}). Thank you.",
                notification_type=Notification.NotificationType.PAYMENT,
                resource_type="PAYMENT",
                resource_id=str(resource.id),
                event_key=f"PAY_{resource.id}_RECEIVED",
            )
    elif event_type == "CLAIM_DECISION":
        patient_user = getattr(resource.patient, "user", None)
        if patient_user:
            send_notification(
                recipient=patient_user,
                title="Insurance Claim Update",
                message=f"An adjudication decision has been recorded for claim {resource.claim_reference}. Status: {resource.get_status_display()}.",
                notification_type=Notification.NotificationType.INSURANCE,
                priority=Notification.Priority.HIGH,
                resource_type="CLAIM",
                resource_id=str(resource.id),
                event_key=f"CLM_{resource.id}_DECISION_{resource.status}",
            )
