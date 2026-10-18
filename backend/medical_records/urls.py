from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ClinicalEncounterViewSet,
    ClinicalNoteViewSet,
    EncounterDiagnosisViewSet,
    MedicalHistoryEntryViewSet,
    PatientTimelineView,
    VitalSignsViewSet,
)


router = DefaultRouter()
router.register("encounters", ClinicalEncounterViewSet, basename="encounter")
router.register("vitals", VitalSignsViewSet, basename="vitals")
router.register("diagnoses", EncounterDiagnosisViewSet, basename="diagnosis")
router.register("notes", ClinicalNoteViewSet, basename="clinical-note")
router.register("history", MedicalHistoryEntryViewSet, basename="medical-history")

urlpatterns = [
    path("patients/me/timeline/", PatientTimelineView.as_view(), {"patient_id": "me"}, name="patient-timeline-me"),
    path("patients/<int:patient_id>/timeline/", PatientTimelineView.as_view(), name="patient-timeline"),
] + router.urls

