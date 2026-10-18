from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Notification(models.Model):

    class NotificationType(models.TextChoices):
        APPOINTMENT = "APPOINTMENT", "Appointment"
        ADMISSION = "ADMISSION", "Admission"
        DISCHARGE = "DISCHARGE", "Discharge"
        PRESCRIPTION = "PRESCRIPTION", "Prescription"
        LABORATORY = "LABORATORY", "Laboratory"
        BILLING = "BILLING", "Billing"
        PAYMENT = "PAYMENT", "Payment"
        INSURANCE = "INSURANCE", "Insurance"
        SYSTEM = "SYSTEM", "System & Security"
        REMINDER = "REMINDER", "Appointment Reminder"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        NORMAL = "NORMAL", "Normal"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    class Channel(models.TextChoices):
        IN_APP = "IN_APP", "In-App"
        EMAIL = "EMAIL", "Email"
        SMS = "SMS", "SMS"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=True,
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
        db_index=True,
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
        db_index=True,
    )
    channel = models.CharField(
        max_length=20,
        choices=Channel.choices,
        default=Channel.IN_APP,
        db_index=True,
    )
    title = models.CharField(
        max_length=255,
    )
    message = models.TextField()
    is_read = models.BooleanField(
        default=False,
        db_index=True,
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    resource_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="Target resource model, e.g. APPOINTMENT, ADMISSION, INVOICE",
    )
    resource_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Identifier of the target resource",
    )
    event_key = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
        help_text="Unique event / idempotency key preventing duplicate notifications",
    )
    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
    )
    expires_at = models.DateTimeField(
        null=True,
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
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "notification_type"]),
            models.Index(fields=["recipient", "created_at"]),
            models.Index(fields=["event_key"]),
        ]

    def mark_as_read(self, user=None):
        """
        Marks notification as read for authorized recipient.
        """
        if user and user != self.recipient and getattr(user, "role", None) != "SUPER_ADMIN" and not user.is_superuser:
            raise ValidationError("You cannot mark another user's notification as read.")
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at", "updated_at"])

    def __str__(self):
        status = "Read" if self.is_read else "Unread"
        return f"[{self.notification_type}] {self.title} -> {self.recipient.username} ({status})"


class NotificationPreference(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
    )
    email_enabled = models.BooleanField(
        default=True,
        help_text="Enable receiving notifications via email",
    )
    in_app_enabled = models.BooleanField(
        default=True,
        help_text="Enable receiving in-app notification center alerts",
    )
    appointment_reminders_enabled = models.BooleanField(
        default=True,
        help_text="Enable automated appointment reminders",
    )
    enabled_categories = models.JSONField(
        default=list,
        blank=True,
        help_text="Specific enabled categories. Empty list implies all permitted categories are enabled.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        verbose_name = "Notification Preference"
        verbose_name_plural = "Notification Preferences"

    def is_category_enabled(self, category):
        """
        Mandatory security and system policy notifications cannot be disabled by user preferences.
        """
        if category == Notification.NotificationType.SYSTEM:
            return True
        if self.enabled_categories and category not in self.enabled_categories:
            return False
        return True

    def __str__(self):
        return f"Preferences for {self.user.username} (Email: {self.email_enabled}, In-App: {self.in_app_enabled})"


class DeliveryAttempt(models.Model):

    class Status(models.TextChoices):
        QUEUED = "QUEUED", "Queued"
        SENT = "SENT", "Sent / Delivered"
        FAILED = "FAILED", "Failed"
        RETRYING = "RETRYING", "Retrying"

    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name="delivery_attempts",
    )
    channel = models.CharField(
        max_length=20,
        choices=Notification.Channel.choices,
        default=Notification.Channel.EMAIL,
        db_index=True,
    )
    attempt_number = models.PositiveIntegerField(
        default=1,
    )
    attempted_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.QUEUED,
        db_index=True,
    )
    error_message = models.TextField(
        blank=True,
    )
    error_code = models.CharField(
        max_length=50,
        blank=True,
    )
    next_retry_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
    )
    provider_reference = models.CharField(
        max_length=150,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-attempted_at"]
        indexes = [
            models.Index(fields=["status", "next_retry_at"]),
            models.Index(fields=["notification", "status"]),
        ]

    def __str__(self):
        return f"Attempt #{self.attempt_number} for {self.notification.id} ({self.channel}) - [{self.status}]"

