from datetime import timedelta
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import F, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    DispenseRecord,
    Medicine,
    MedicineBatch,
    PharmacyLocation,
    Prescription,
    StockMovement,
)
from .permissions import (
    DispensePermission,
    InventoryPermission,
    MedicinePermission,
    PharmacyLocationPermission,
    PrescriptionPermission,
)
from .serializers import (
    DispenseCreateSerializer,
    DispenseRecordSerializer,
    DispenseReturnSerializer,
    MedicineBatchSerializer,
    MedicineSerializer,
    PharmacyLocationSerializer,
    PrescriptionCancelSerializer,
    PrescriptionSerializer,
    StockAdjustmentCreateSerializer,
    StockMovementSerializer,
    StockReceiptCreateSerializer,
)
from .services import (
    adjust_stock_batch,
    cancel_prescription,
    dispense_prescription,
    issue_prescription,
    receive_stock_batch,
    reverse_dispense_record,
)


class StandardResultsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class MedicineViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Medicine catalogue.
    """

    queryset = Medicine.objects.all()
    serializer_class = MedicineSerializer
    permission_classes = [MedicinePermission]
    pagination_class = StandardResultsPagination

    filterset_fields = [
        "dosage_form",
        "requires_prescription",
        "is_active",
    ]
    search_fields = [
        "code",
        "generic_name",
        "brand_name",
        "active_ingredients",
        "manufacturer",
    ]
    ordering_fields = ["generic_name", "brand_name", "created_at"]


class PharmacyLocationViewSet(viewsets.ModelViewSet):
    """
    CRUD API for hospital pharmacy physical locations.
    """

    queryset = PharmacyLocation.objects.select_related("hospital").all()
    serializer_class = PharmacyLocationSerializer
    permission_classes = [PharmacyLocationPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["hospital", "is_active"]
    search_fields = ["location_code", "name"]
    ordering_fields = ["name", "created_at"]


class MedicineBatchViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List and retrieve medicine inventory batches.
    """

    queryset = MedicineBatch.objects.select_related("medicine", "pharmacy_location").all()
    serializer_class = MedicineBatchSerializer
    permission_classes = [InventoryPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = [
        "medicine",
        "pharmacy_location",
        "batch_status",
        "expiry_date",
    ]
    search_fields = [
        "batch_number",
        "medicine__generic_name",
        "medicine__code",
    ]
    ordering_fields = ["expiry_date", "available_quantity", "created_at"]


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Audit trail of all inventory movements.
    """

    queryset = StockMovement.objects.select_related(
        "batch",
        "batch__medicine",
        "pharmacy_location",
        "acting_user",
    ).all()
    serializer_class = StockMovementSerializer
    permission_classes = [InventoryPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = [
        "batch",
        "pharmacy_location",
        "movement_type",
        "acting_user",
    ]
    search_fields = [
        "reference_number",
        "reason",
        "batch__batch_number",
        "batch__medicine__generic_name",
    ]
    ordering_fields = ["created_at"]


class StockReceiptView(APIView):
    """
    Receive new inventory stock into a batch with movement logging.
    """

    permission_classes = [InventoryPermission]

    @extend_schema(
        summary="Receive stock into batch",
        request=StockReceiptCreateSerializer,
        responses={201: MedicineBatchSerializer},
    )
    def post(self, request):
        serializer = StockReceiptCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            batch = receive_stock_batch(
                medicine=data["medicine"],
                pharmacy_location=data["pharmacy_location"],
                batch_number=data["batch_number"],
                expiry_date=data["expiry_date"],
                quantity=data["quantity"],
                purchase_cost=data.get("purchase_cost", 0.00),
                selling_price=data.get("selling_price", 0.00),
                user=request.user,
                supplier=data.get("supplier", ""),
            )
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(MedicineBatchSerializer(batch).data, status=status.HTTP_201_CREATED)


class StockAdjustmentView(APIView):
    """
    Apply manual audited stock adjustments (increase, decrease, wastage, expired).
    """

    permission_classes = [InventoryPermission]

    @extend_schema(
        summary="Adjust batch stock",
        request=StockAdjustmentCreateSerializer,
        responses={200: StockMovementSerializer},
    )
    def post(self, request):
        serializer = StockAdjustmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            movement = adjust_stock_batch(
                batch=data["batch"],
                adjustment_type=data["adjustment_type"],
                quantity=data["quantity"],
                user=request.user,
                reason=data["reason"],
            )
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(StockMovementSerializer(movement).data, status=status.HTTP_200_OK)


class AggregatedStockView(APIView):
    """
    Aggregated available stock per medicine and location.
    """

    permission_classes = [InventoryPermission]

    @extend_schema(
        summary="Get aggregated medicine stock",
        parameters=[
            OpenApiParameter("medicine_id", OpenApiTypes.INT, required=False),
            OpenApiParameter("location_id", OpenApiTypes.INT, required=False),
        ],
    )
    def get(self, request):
        qs = MedicineBatch.objects.filter(
            batch_status=MedicineBatch.BatchStatus.ACTIVE,
            available_quantity__gt=0,
            expiry_date__gte=timezone.now().date(),
        )

        med_id = request.query_params.get("medicine_id")
        loc_id = request.query_params.get("location_id")
        if med_id:
            qs = qs.filter(medicine_id=med_id)
        if loc_id:
            qs = qs.filter(pharmacy_location_id=loc_id)

        aggregates = (
            qs.values("medicine_id", "medicine__generic_name", "medicine__code", "pharmacy_location_id", "pharmacy_location__name")
            .annotate(total_available=Sum("available_quantity"))
            .order_by("medicine__generic_name")
        )

        return Response(list(aggregates), status=status.HTTP_200_OK)


class LowStockView(APIView):
    """
    Medicines or batches currently at or below their low-stock threshold.
    """

    permission_classes = [InventoryPermission]

    @extend_schema(summary="Get low stock medicines")
    def get(self, request):
        low_stock_medicines = (
            Medicine.objects.filter(is_active=True)
            .annotate(total_stock=Sum("batches__available_quantity"))
            .filter(total_stock__lte=F("low_stock_threshold"))
            .values("id", "code", "generic_name", "brand_name", "low_stock_threshold", "total_stock")
        )
        return Response(list(low_stock_medicines), status=status.HTTP_200_OK)


class ExpiringStockView(APIView):
    """
    Inventory batches expiring within a specified number of days (default 30 days).
    """

    permission_classes = [InventoryPermission]

    @extend_schema(
        summary="Get expiring stock batches",
        parameters=[
            OpenApiParameter("days", OpenApiTypes.INT, description="Days to expiry (default: 30)", required=False),
        ],
        responses={200: MedicineBatchSerializer(many=True)},
    )
    def get(self, request):
        days_param = request.query_params.get("days", "30")
        try:
            days = int(days_param)
        except ValueError:
            days = 30

        today = timezone.now().date()
        cutoff_date = today + timedelta(days=days)

        batches = MedicineBatch.objects.filter(
            expiry_date__gte=today,
            expiry_date__lte=cutoff_date,
            available_quantity__gt=0,
        ).select_related("medicine", "pharmacy_location").order_by("expiry_date")

        serializer = MedicineBatchSerializer(batches, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PrescriptionViewSet(viewsets.ModelViewSet):
    """
    CRUD and issuing/cancellation lifecycle endpoints for Prescriptions.
    """

    queryset = Prescription.objects.select_related(
        "patient",
        "patient__user",
        "doctor",
        "doctor__user",
        "hospital",
        "encounter",
        "appointment",
        "issued_by",
        "cancelled_by",
    ).prefetch_related("items", "items__medicine").all()
    serializer_class = PrescriptionSerializer
    permission_classes = [PrescriptionPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = [
        "patient",
        "doctor",
        "hospital",
        "status",
        "encounter",
    ]
    search_fields = [
        "prescription_reference",
        "patient__mrn",
        "patient__user__first_name",
        "patient__user__last_name",
        "doctor__doctor_id",
        "clinical_indication",
    ]
    ordering_fields = ["prescribed_date", "created_at"]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Prescription.objects.none()

        base_qs = Prescription.objects.select_related(
            "patient",
            "patient__user",
            "doctor",
            "doctor__user",
            "hospital",
            "encounter",
            "appointment",
            "issued_by",
            "cancelled_by",
        ).prefetch_related("items", "items__medicine").all()

        if user.role == "PATIENT":
            return base_qs.filter(patient__user=user)

        if user.role == "DOCTOR":
            return base_qs.filter(doctor__user=user)

        if user.role in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "PHARMACIST"]:
            return base_qs

        return Prescription.objects.none()

    @extend_schema(
        summary="Issue prescription",
        description="Finalizes prescription, transitions status to ISSUED, and performs allergy safety checks.",
        request=None,
        responses={200: PrescriptionSerializer},
    )
    @action(detail=True, methods=["post"], url_path="issue", url_name="issue")
    def issue(self, request, pk=None):
        prescription = self.get_object()
        user = request.user

        if user.role not in ["SUPER_ADMIN", "DOCTOR"]:
            return Response(
                {"detail": "Only authorized physicians may issue prescriptions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            issued = issue_prescription(prescription=prescription, user=user)
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(self.get_serializer(issued).data)

    @extend_schema(
        summary="Cancel prescription",
        description="Cancels an issued or draft prescription before it has been fully dispensed.",
        request=PrescriptionCancelSerializer,
        responses={200: PrescriptionSerializer},
    )
    @action(detail=True, methods=["post"], url_path="cancel", url_name="cancel")
    def cancel(self, request, pk=None):
        prescription = self.get_object()
        serializer = PrescriptionCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if user.role not in ["SUPER_ADMIN", "DOCTOR"]:
            return Response(
                {"detail": "Only authorized physicians may cancel prescriptions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            cancelled = cancel_prescription(
                prescription=prescription,
                user=user,
                cancellation_reason=serializer.validated_data["cancellation_reason"],
            )
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(self.get_serializer(cancelled).data)


class DispenseViewSet(viewsets.ModelViewSet):
    """
    Dispensing records and operations.
    """

    queryset = DispenseRecord.objects.select_related(
        "prescription",
        "prescription__patient",
        "prescription__patient__user",
        "pharmacy_location",
        "dispensed_by",
        "reversed_by",
    ).prefetch_related("items", "items__batch", "items__prescription_item").all()
    serializer_class = DispenseRecordSerializer
    permission_classes = [DispensePermission]
    pagination_class = StandardResultsPagination

    filterset_fields = [
        "prescription",
        "pharmacy_location",
        "is_reversed",
    ]
    search_fields = [
        "dispense_reference",
        "prescription__prescription_reference",
        "prescription__patient__mrn",
    ]
    ordering_fields = ["dispensed_at"]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return DispenseRecord.objects.none()

        base_qs = DispenseRecord.objects.select_related(
            "prescription",
            "prescription__patient",
            "prescription__patient__user",
            "pharmacy_location",
            "dispensed_by",
            "reversed_by",
        ).prefetch_related("items", "items__batch", "items__prescription_item").all()

        if user.role == "PATIENT":
            return base_qs.filter(prescription__patient__user=user)

        if user.role in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "PHARMACIST", "DOCTOR", "NURSE"]:
            return base_qs

        return DispenseRecord.objects.none()

    @extend_schema(
        summary="Dispense medicines for prescription",
        request=DispenseCreateSerializer,
        responses={201: DispenseRecordSerializer},
    )
    def create(self, request, *args, **kwargs):
        user = request.user
        if user.role not in ["SUPER_ADMIN", "PHARMACIST"]:
            return Response(
                {"detail": "Only pharmacists may dispense medicines."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = DispenseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            dispense_record = dispense_prescription(
                prescription=data["prescription"],
                pharmacy_location=data["pharmacy_location"],
                items_data=data["items"],
                user=user,
                notes=data.get("notes", ""),
            )
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            DispenseRecordSerializer(dispense_record).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        summary="Reverse or return dispensing record",
        request=DispenseReturnSerializer,
        responses={200: DispenseRecordSerializer},
    )
    @action(detail=True, methods=["post"], url_path="return", url_name="return")
    def return_dispense(self, request, pk=None):
        dispense_record = self.get_object()
        user = request.user

        if user.role not in ["SUPER_ADMIN", "PHARMACIST"]:
            return Response(
                {"detail": "Only pharmacists may process dispense returns."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = DispenseReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reversed_record = reverse_dispense_record(
                dispense_record=dispense_record,
                user=user,
                reason=serializer.validated_data["reason"],
                return_to_stock=serializer.validated_data.get("return_to_stock", True),
            )
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(self.get_serializer(reversed_record).data)
