from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AppointmentsReportView,
    BillingReportView,
    DashboardView,
    InpatientReportView,
    InsuranceReportView,
    LaboratoryReportView,
    PatientsReportView,
    PharmacyReportView,
    ReportAuditLogViewSet,
)

router = DefaultRouter()
router.register(r"audit-logs", ReportAuditLogViewSet, basename="report-audit-log")

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="reports-dashboard"),
    path("patients/", PatientsReportView.as_view(), name="reports-patients"),
    path("appointments/", AppointmentsReportView.as_view(), name="reports-appointments"),
    path("inpatient/", InpatientReportView.as_view(), name="reports-inpatient"),
    path("pharmacy/", PharmacyReportView.as_view(), name="reports-pharmacy"),
    path("laboratory/", LaboratoryReportView.as_view(), name="reports-laboratory"),
    path("billing/", BillingReportView.as_view(), name="reports-billing"),
    path("insurance/", InsuranceReportView.as_view(), name="reports-insurance"),
    path("", include(router.urls)),
]

