from rest_framework import permissions


class NotificationPermission(permissions.BasePermission):
    """
    Object-level permission allowing users to only view, access, and mark read their own notifications.
    Admins can view system notifications.
    Creation of notifications is strictly blocked from the client API (system-generated only).
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Disallow arbitrary client notification creation
        if request.method == "POST" and view.action == "create":
            return False

        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        if getattr(user, "role", None) == "SUPER_ADMIN" or user.is_superuser:
            return True
        return obj.recipient_id == user.id


class NotificationPreferencePermission(permissions.BasePermission):
    """
    Permission allowing users to manage only their own personal notification preferences.
    Admins can view/update any user's preference.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if getattr(user, "role", None) == "SUPER_ADMIN" or user.is_superuser:
            return True
        return obj.user_id == user.id


class DeliveryStatusPermission(permissions.BasePermission):
    """
    Admin-only permission to inspect delivery health and trigger manual retries.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return getattr(user, "role", None) in ["SUPER_ADMIN", "HOSPITAL_ADMIN"] or user.is_staff or user.is_superuser

