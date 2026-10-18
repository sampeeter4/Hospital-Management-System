from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AggregatedStockView,
    DispenseViewSet,
    ExpiringStockView,
    LowStockView,
    MedicineBatchViewSet,
    MedicineViewSet,
    PharmacyLocationViewSet,
    PrescriptionViewSet,
    StockAdjustmentView,
    StockMovementViewSet,
    StockReceiptView,
)


router = DefaultRouter()
router.register("medicines", MedicineViewSet, basename="medicine")
router.register("locations", PharmacyLocationViewSet, basename="location")
router.register("batches", MedicineBatchViewSet, basename="batch")
router.register("movements", StockMovementViewSet, basename="movement")
router.register("prescriptions", PrescriptionViewSet, basename="prescription")
router.register("dispenses", DispenseViewSet, basename="dispense")

urlpatterns = [
    path("stock/", AggregatedStockView.as_view(), name="pharmacy-stock"),
    path("receipts/", StockReceiptView.as_view(), name="pharmacy-receipts"),
    path("adjustments/", StockAdjustmentView.as_view(), name="pharmacy-adjustments"),
    path("low-stock/", LowStockView.as_view(), name="pharmacy-low-stock"),
    path("expiring/", ExpiringStockView.as_view(), name="pharmacy-expiring"),
] + router.urls
