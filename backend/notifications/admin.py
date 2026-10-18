from django.contrib import admin

from .models import DeliveryAttempt, Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "recipient",
        "notification_type",
        "priority",
        "channel",
        "title",
        "is_read",
        "read_at",
        "created_at",
    ]
    list_filter = ["notification_type", "priority", "channel", "is_read", "created_at"]
    search_fields = ["title", "message", "recipient__username", "recipient__email", "resource_type", "resource_id", "event_key"]
    readonly_fields = ["created_at", "updated_at", "read_at"]


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ["user", "email_enabled", "in_app_enabled", "appointment_reminders_enabled", "updated_at"]
    list_filter = ["email_enabled", "in_app_enabled", "appointment_reminders_enabled"]
    search_fields = ["user__username", "user__email"]


@admin.register(DeliveryAttempt)
class DeliveryAttemptAdmin(admin.ModelAdmin):
    list_display = ["id", "notification", "channel", "attempt_number", "status", "attempted_at", "error_code"]
    list_filter = ["status", "channel", "attempted_at"]
    search_fields = ["notification__title", "notification__recipient__username", "error_code", "error_message", "provider_reference"]
    readonly_fields = ["attempted_at", "created_at", "updated_at"]

