from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AdmissionViewSet,
    BedAssignmentViewSet,
    BedViewSet,
    InpatientAuditLogViewSet,
    OccupancyReportView,
    RoomViewSet,
    WardViewSet,
)

router = DefaultRouter()
router.register("wards", WardViewSet, basename="inpatient-ward")
router.register("rooms", RoomViewSet, basename="inpatient-room")
router.register("beds", BedViewSet, basename="inpatient-bed")
router.register("admissions", AdmissionViewSet, basename="inpatient-admission")
router.register("assignments", BedAssignmentViewSet, basename="inpatient-assignment")
router.register("audit-logs", InpatientAuditLogViewSet, basename="inpatient-audit-log")

urlpatterns = [
    path("occupancy/", OccupancyReportView.as_view(), name="inpatient-occupancy"),
] + router.urls

