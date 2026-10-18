import datetime
from decimal import Decimal
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.exceptions import ValidationError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from appointments.models import Appointment
from hospitals.models import Department, Doctor, Hospital
from notifications.models import DeliveryAttempt, Notification, NotificationPreference
from notifications.services import (
    dispatch_email_delivery,
    notify_admission_event,
    notify_appointment_event,
    notify_billing_event,
    notify_lab_result_event,
    notify_prescription_event,
    process_notification_queue,
    send_appointment_reminders,
    send_notification,
)
from patients.models import Patient

User = get_user_model()


class BaseNotificationTestCase(APITestCase):

    def setUp(self):
        # 1. Hospital & Department
        self.hospital = Hospital.objects.create(
            name="City Apex Hospital",
            registration_number="REG-NOTIF-001",
            phone="9876543210",
            email="apex@hospital.local",
            address="100 Medical Boulevard",
            city="Metropolis",
            state="MetroState",
            postal_code="12345",
        )
        self.department = Department.objects.create(
            hospital=self.hospital,
            name="Cardiology",
            code="CARDIO",
        )

        # 2. Users
        self.admin_user = User.objects.create_user(
            username="notif_admin",
            email="admin@hospital.local",
            password="AdminPassword123!",
            role=User.Role.HOSPITAL_ADMIN,
        )
        self.doctor_user = User.objects.create_user(
            username="notif_dr_house",
            email="house@hospital.local",
            password="DocPassword123!",
            role=User.Role.DOCTOR,
            first_name="Gregory",
            last_name="House",
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            hospital=self.hospital,
            department=self.department,
            doctor_id="DOC-NOTIF-01",
            license_number="LIC-NOTIF-999",
            specialization="Cardiology",
            qualification="MD Cardiology",
            consultation_fee=Decimal("800.00"),
        )

        self.patient_user = User.objects.create_user(
            username="notif_patient_john",
            email="john.doe@example.com",
            password="PatientPassword123!",
            role=User.Role.PATIENT,
            first_name="John",
            last_name="Doe",
        )
        self.patient = Patient.objects.create(
            user=self.patient_user,
            hospital=self.hospital,
            date_of_birth=datetime.date(1985, 5, 20),
            gender="MALE",
            blood_group="O+",
            phone="9988776655",
            emergency_contact_name="Jane Doe",
            emergency_contact_phone="9988776654",
            emergency_contact_relationship="Spouse",
        )

        self.other_patient_user = User.objects.create_user(
            username="notif_patient_alice",
            email="alice.smith@example.com",
            password="PatientPassword123!",
            role=User.Role.PATIENT,
            first_name="Alice",
            last_name="Smith",
        )


class NotificationCreationAndPreferencesTests(BaseNotificationTestCase):

    def test_notification_creation_and_delivery_attempts(self):
        notif = send_notification(
            recipient=self.patient_user,
            title="Welcome to Hospital Portal",
            message="Your patient account has been verified.",
            notification_type=Notification.NotificationType.SYSTEM,
            priority=Notification.Priority.NORMAL,
            channel=Notification.Channel.IN_APP,
            send_email=True,
        )
        self.assertIsNotNone(notif)
        self.assertEqual(notif.recipient, self.patient_user)
        self.assertFalse(notif.is_read)

        # External delivery attempt created and sent via test mail outbox
        attempt = DeliveryAttempt.objects.filter(notification=notif).first()
        self.assertIsNotNone(attempt)
        self.assertEqual(attempt.status, DeliveryAttempt.Status.SENT)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Welcome to Hospital Portal", mail.outbox[0].subject)

    def test_duplicate_notification_prevented_by_event_key(self):
        n1 = send_notification(
            recipient=self.patient_user,
            title="Lab Update",
            message="Your CBC panel has completed.",
            notification_type=Notification.NotificationType.LABORATORY,
            event_key="LAB_CBC_12345",
        )
        n2 = send_notification(
            recipient=self.patient_user,
            title="Lab Update Repeated",
            message="Your CBC panel has completed.",
            notification_type=Notification.NotificationType.LABORATORY,
            event_key="LAB_CBC_12345",
        )
        self.assertEqual(n1.id, n2.id)
        self.assertEqual(Notification.objects.filter(event_key="LAB_CBC_12345").count(), 1)

    def test_user_preferences_suppress_disabled_categories(self):
        pref, _ = NotificationPreference.objects.get_or_create(user=self.patient_user)
        pref.enabled_categories = [Notification.NotificationType.APPOINTMENT]
        pref.save()

        # Laboratory notification is disabled in preferences -> skipped
        n_lab = send_notification(
            recipient=self.patient_user,
            title="Lab Ready",
            message="Lab test done",
            notification_type=Notification.NotificationType.LABORATORY,
        )
        self.assertIsNone(n_lab)

        # Appointment notification is enabled in preferences -> created
        n_apt = send_notification(
            recipient=self.patient_user,
            title="Appointment Confirmed",
            message="See you tomorrow",
            notification_type=Notification.NotificationType.APPOINTMENT,
        )
        self.assertIsNotNone(n_apt)

        # Mandatory SYSTEM notifications cannot be disabled by user preferences
        pref.enabled_categories = []
        pref.in_app_enabled = False
        pref.save()

        n_sec = send_notification(
            recipient=self.patient_user,
            title="Security Alert",
            message="Your password was changed.",
            notification_type=Notification.NotificationType.SYSTEM,
        )
        self.assertIsNotNone(n_sec)

    def test_failed_email_delivery_and_retry_queue(self):
        pref, _ = NotificationPreference.objects.get_or_create(user=self.patient_user)
        pref.email_enabled = True
        pref.save()

        notif = Notification.objects.create(
            recipient=self.patient_user,
            title="Payment Alert",
            message="Payment received.",
            notification_type=Notification.NotificationType.PAYMENT,
        )
        attempt = DeliveryAttempt.objects.create(
            notification=notif,
            channel=Notification.Channel.EMAIL,
            status=DeliveryAttempt.Status.QUEUED,
        )

        # Simulate SMTP network failure
        with patch("notifications.services.send_mail", side_effect=OSError("SMTP connection refused")):
            dispatch_email_delivery(attempt)

        attempt.refresh_from_db()
        self.assertEqual(attempt.status, DeliveryAttempt.Status.RETRYING)
        self.assertEqual(attempt.error_code, "OSError")
        self.assertIsNotNone(attempt.next_retry_at)

        # Run queue processor with backoff
        results = process_notification_queue(max_retries=3)
        self.assertGreaterEqual(results["total"], 0)


class AppointmentRemindersTestCase(BaseNotificationTestCase):

    def test_scheduled_appointment_reminders(self):
        tomorrow = timezone.now().date() + datetime.timedelta(days=1)

        # 1. Eligible appointment
        apt_eligible = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            hospital=self.hospital,
            department=self.department,
            appointment_date=tomorrow,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(10, 30),
            reason_for_visit="Routine checkup",
            status=Appointment.Status.CONFIRMED,
        )

        # 2. Cancelled appointment -> should be excluded
        apt_cancelled = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            hospital=self.hospital,
            department=self.department,
            appointment_date=tomorrow,
            start_time=datetime.time(11, 0),
            end_time=datetime.time(11, 30),
            reason_for_visit="Cardiac checkup",
            status=Appointment.Status.CANCELLED,
        )

        reminders_sent = send_appointment_reminders(window_hours=48)
        self.assertEqual(reminders_sent, 1)

        # Verify notification created
        reminder_notif = Notification.objects.filter(
            recipient=self.patient_user,
            notification_type=Notification.NotificationType.REMINDER,
        ).first()
        self.assertIsNotNone(reminder_notif)
        self.assertIn("Dr. Gregory House", reminder_notif.title)

        # Calling again does not send duplicate reminder
        reminders_sent_again = send_appointment_reminders(window_hours=48)
        self.assertEqual(reminders_sent_again, 0)


class NotificationAPIsTestCase(BaseNotificationTestCase):

    def setUp(self):
        super().setUp()
        self.n1 = Notification.objects.create(
            recipient=self.patient_user,
            title="Appointment Booked",
            message="Your appointment is booked.",
            notification_type=Notification.NotificationType.APPOINTMENT,
        )
        self.n2 = Notification.objects.create(
            recipient=self.patient_user,
            title="Lab Results Ready",
            message="Your blood count is available.",
            notification_type=Notification.NotificationType.LABORATORY,
        )
        self.other_notif = Notification.objects.create(
            recipient=self.other_patient_user,
            title="Alice's Private Notification",
            message="Secret message.",
            notification_type=Notification.NotificationType.BILLING,
        )

    def test_user_can_only_view_own_notifications(self):
        self.client.force_authenticate(user=self.patient_user)
        url = reverse("notification-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        ids = [item["id"] for item in res.data["results"]]
        self.assertIn(self.n1.id, ids)
        self.assertIn(self.n2.id, ids)
        self.assertNotIn(self.other_notif.id, ids)

        # Directly requesting another user's notification returns 404
        url_other = reverse("notification-detail", kwargs={"pk": self.other_notif.id})
        res_other = self.client.get(url_other)
        self.assertEqual(res_other.status_code, status.HTTP_404_NOT_FOUND)

    def test_clients_cannot_arbitrarily_create_notifications(self):
        self.client.force_authenticate(user=self.patient_user)
        url = reverse("notification-list")
        res = self.client.post(url, {
            "title": "Forged alert",
            "message": "System hacked",
            "recipient": self.other_patient_user.id,
        })
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED])

    def test_mark_as_read_and_unread_count(self):
        self.client.force_authenticate(user=self.patient_user)

        # Unread count initially 2
        url_count = reverse("notification-unread-count")
        res_count = self.client.get(url_count)
        self.assertEqual(res_count.data["unread_count"], 2)

        # Mark n1 read
        url_read = reverse("notification-mark-read", kwargs={"pk": self.n1.id})
        res_read = self.client.post(url_read)
        self.assertEqual(res_read.status_code, status.HTTP_200_OK)
        self.assertTrue(res_read.data["is_read"])

        # Unread count now 1
        res_count2 = self.client.get(url_count)
        self.assertEqual(res_count2.data["unread_count"], 1)

        # Mark all read
        url_all = reverse("notification-mark-all-read")
        res_all = self.client.post(url_all)
        self.assertEqual(res_all.status_code, status.HTTP_200_OK)
        self.assertEqual(res_all.data["updated_count"], 1)

        res_count3 = self.client.get(url_count)
        self.assertEqual(res_count3.data["unread_count"], 0)

    def test_notification_preferences_get_and_patch(self):
        self.client.force_authenticate(user=self.patient_user)
        url = reverse("notification-preferences")

        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["email_enabled"])

        # Update preference
        res_patch = self.client.patch(url, {
            "email_enabled": False,
            "appointment_reminders_enabled": False,
        }, format="json")
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertFalse(res_patch.data["email_enabled"])
        self.assertFalse(res_patch.data["appointment_reminders_enabled"])

    def test_admin_delivery_status_and_retry(self):
        # Patient cannot access delivery status
        self.client.force_authenticate(user=self.patient_user)
        url_deliv = reverse("notification-delivery-status")
        res_pat = self.client.get(url_deliv)
        self.assertEqual(res_pat.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can access delivery status
        self.client.force_authenticate(user=self.admin_user)
        res_admin = self.client.get(url_deliv)
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        self.assertIn("queue_counts", res_admin.data)

        # Admin can trigger retry queue
        res_retry = self.client.post(url_deliv)
        self.assertEqual(res_retry.status_code, status.HTTP_200_OK)
        self.assertIn("results", res_retry.data)
