from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CriticalResultNotificationViewSet,
    LabAuditLogViewSet,
    LabOrderViewSet,
    LabReferenceRangeViewSet,
    LabResultViewSet,
    LabSpecimenViewSet,
    LabTestViewSet,
    PatientLabResultsView,
)

router = DefaultRouter()
router.register("tests", LabTestViewSet, basename="lab-test")
router.register("reference-ranges", LabReferenceRangeViewSet, basename="lab-reference-range")
router.register("orders", LabOrderViewSet, basename="lab-order")
router.register("specimens", LabSpecimenViewSet, basename="lab-specimen")
router.register("results", LabResultViewSet, basename="lab-result")
router.register("critical-notifications", CriticalResultNotificationViewSet, basename="lab-critical-notification")
router.register("audit-logs", LabAuditLogViewSet, basename="lab-audit-log")

urlpatterns = [
    path("patients/me/results/", PatientLabResultsView.as_view(), name="patient-my-lab-results"),
    path("patients/<int:patient_id>/results/", PatientLabResultsView.as_view(), name="patient-lab-results"),
] + router.urls

