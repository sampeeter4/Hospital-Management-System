from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DeliveryAttempt, Notification, NotificationPreference
from .permissions import DeliveryStatusPermission, NotificationPermission, NotificationPreferencePermission
from .serializers import (
    DeliveryAttemptSerializer,
    NotificationPreferenceSerializer,
    NotificationSerializer,
)
from .services import process_notification_queue


class StandardNotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    In-App Notification Center:
    Allows authenticated users to list their own notifications, retrieve details,
    and mark notifications as read.
    """

    serializer_class = NotificationSerializer
    permission_classes = [NotificationPermission]
    pagination_class = StandardNotificationPagination
    filterset_fields = ["is_read", "notification_type", "priority", "channel"]
    search_fields = ["title", "message", "resource_type", "resource_id"]
    ordering_fields = ["created_at", "priority", "is_read"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Notification.objects.none()

        # Super admin can inspect system notifications if explicitly queried, else defaults to own
        if (getattr(user, "role", None) == "SUPER_ADMIN" or user.is_superuser) and self.request.query_params.get("all") == "true":
            return Notification.objects.all().select_related("recipient")

        return Notification.objects.filter(recipient=user).select_related("recipient")

    @extend_schema(
        request=None,
        responses={200: NotificationSerializer},
        description="Mark a single notification as read",
    )
    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.mark_as_read(user=request.user)
        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)

    @extend_schema(
        request=None,
        responses={200: OpenApiTypes.OBJECT},
        description="Mark all unread notifications for current user as read",
    )
    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        user = request.user
        updated_count = Notification.objects.filter(
            recipient=user,
            is_read=False,
        ).update(is_read=True, read_at=timezone.now())
        return Response({"detail": "All notifications marked as read.", "updated_count": updated_count}, status=status.HTTP_200_OK)

    @extend_schema(
        request=None,
        responses={200: OpenApiTypes.OBJECT},
        description="Get count of unread notifications for current user",
    )
    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        user = request.user
        count = Notification.objects.filter(recipient=user, is_read=False).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)


class NotificationPreferenceView(APIView):
    """
    Manage user-specific notification preferences (email, in-app, reminders, categories).
    """

    permission_classes = [NotificationPreferencePermission]

    @extend_schema(responses={200: NotificationPreferenceSerializer})
    def get(self, request):
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(pref)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=NotificationPreferenceSerializer,
        responses={200: NotificationPreferenceSerializer},
    )
    def patch(self, request):
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class DeliveryStatusView(APIView):
    """
    Admin-only operational endpoint for delivery health, queue stats, and manual retry triggers.
    """

    permission_classes = [DeliveryStatusPermission]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="status", description="Filter by attempt status", required=False, type=OpenApiTypes.STR),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        attempts_qs = DeliveryAttempt.objects.select_related("notification", "notification__recipient")
        status_param = request.query_params.get("status")
        if status_param:
            attempts_qs = attempts_qs.filter(status=status_param)

        counts = {
            "queued": DeliveryAttempt.objects.filter(status=DeliveryAttempt.Status.QUEUED).count(),
            "sent": DeliveryAttempt.objects.filter(status=DeliveryAttempt.Status.SENT).count(),
            "retrying": DeliveryAttempt.objects.filter(status=DeliveryAttempt.Status.RETRYING).count(),
            "failed": DeliveryAttempt.objects.filter(status=DeliveryAttempt.Status.FAILED).count(),
        }

        recent_attempts = attempts_qs[:50]
        return Response(
            {
                "queue_counts": counts,
                "recent_attempts": DeliveryAttemptSerializer(recent_attempts, many=True).data,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=None,
        responses={200: OpenApiTypes.OBJECT},
        description="Trigger background processing of queued or retryable notifications",
    )
    def post(self, request):
        results = process_notification_queue(max_retries=3)
        return Response(
            {
                "detail": "Notification queue processing executed successfully.",
                "results": results,
            },
            status=status.HTTP_200_OK,
        )

