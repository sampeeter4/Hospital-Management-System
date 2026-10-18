from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BillingAuditLogViewSet,
    CollectionsReportView,
    CreditNoteViewSet,
    FinancialSummaryReportView,
    InsuranceClaimViewSet,
    InsurancePreAuthorizationViewSet,
    InsuranceProviderViewSet,
    InsuranceReportView,
    InvoiceViewSet,
    OutstandingInvoicesReportView,
    PatientInsurancePolicyViewSet,
    PaymentViewSet,
    RefundViewSet,
    ServiceItemViewSet,
)

router = DefaultRouter()
router.register("services", ServiceItemViewSet, basename="billing-service")
router.register("invoices", InvoiceViewSet, basename="billing-invoice")
router.register("payments", PaymentViewSet, basename="billing-payment")
router.register("refunds", RefundViewSet, basename="billing-refund")
router.register("credit-notes", CreditNoteViewSet, basename="billing-credit-note")
router.register("insurance-providers", InsuranceProviderViewSet, basename="billing-insurance-provider")
router.register("policies", PatientInsurancePolicyViewSet, basename="billing-insurance-policy")
router.register("pre-authorizations", InsurancePreAuthorizationViewSet, basename="billing-pre-authorization")
router.register("claims", InsuranceClaimViewSet, basename="billing-claim")
router.register("audit-logs", BillingAuditLogViewSet, basename="billing-audit-log")

urlpatterns = [
    path("reports/summary/", FinancialSummaryReportView.as_view(), name="billing-reports-summary"),
    path("reports/outstanding/", OutstandingInvoicesReportView.as_view(), name="billing-reports-outstanding"),
    path("reports/collections/", CollectionsReportView.as_view(), name="billing-reports-collections"),
    path("reports/insurance/", InsuranceReportView.as_view(), name="billing-reports-insurance"),
] + router.urls

