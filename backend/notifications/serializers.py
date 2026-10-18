from rest_framework import serializers

from .models import DeliveryAttempt, Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.CharField(
        source="get_notification_type_display",
        read_only=True,
    )
    priority_display = serializers.CharField(
        source="get_priority_display",
        read_only=True,
    )
    channel_display = serializers.CharField(
        source="get_channel_display",
        read_only=True,
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "notification_type_display",
            "priority",
            "priority_display",
            "channel",
            "channel_display",
            "title",
            "message",
            "is_read",
            "read_at",
            "resource_type",
            "resource_id",
            "scheduled_at",
            "expires_at",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "notification_type",
            "notification_type_display",
            "priority",
            "priority_display",
            "channel",
            "channel_display",
            "title",
            "message",
            "read_at",
            "resource_type",
            "resource_id",
            "scheduled_at",
            "expires_at",
            "metadata",
            "created_at",
            "updated_at",
        ]


class NotificationPreferenceSerializer(serializers.ModelSerializer):

    class Meta:
        model = NotificationPreference
        fields = [
            "id",
            "email_enabled",
            "in_app_enabled",
            "appointment_reminders_enabled",
            "enabled_categories",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_enabled_categories(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("enabled_categories must be a list of notification types.")
        valid_choices = set(Notification.NotificationType.values)
        for cat in value:
            if cat not in valid_choices:
                raise serializers.ValidationError(f"Invalid category '{cat}'. Valid choices: {sorted(valid_choices)}.")
        return value


class DeliveryAttemptSerializer(serializers.ModelSerializer):
    notification_id = serializers.IntegerField(source="notification.id", read_only=True)
    notification_title = serializers.CharField(source="notification.title", read_only=True)
    recipient_username = serializers.CharField(source="notification.recipient.username", read_only=True)

    class Meta:
        model = DeliveryAttempt
        fields = [
            "id",
            "notification_id",
            "notification_title",
            "recipient_username",
            "channel",
            "attempt_number",
            "attempted_at",
            "status",
            "error_message",
            "error_code",
            "next_retry_at",
            "provider_reference",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

