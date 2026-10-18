from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DeliveryStatusView,
    NotificationPreferenceView,
    NotificationViewSet,
)

router = DefaultRouter()
router.register(r"", NotificationViewSet, basename="notification")

urlpatterns = [
    path("preferences/", NotificationPreferenceView.as_view(), name="notification-preferences"),
    path("delivery-status/", DeliveryStatusView.as_view(), name="notification-delivery-status"),
    path("", include(router.urls)),
]

