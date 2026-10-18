from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from patients.models import Patient
from .models import (
    CriticalResultNotification,
    LabAuditLog,
    LabOrder,
    LabOrderItem,
    LabReferenceRange,
    LabResult,
    LabSpecimen,
    LabTest,
    LabTestParameter,
)
from .permissions import (
    CriticalNotificationPermission,
    LabCataloguePermission,
    LabOrderPermission,
    LabResultPermission,
    LabSpecimenPermission,
)
from .serializers import (
    CriticalNotificationAcknowledgeSerializer,
    CriticalResultNotificationSerializer,
    LabAuditLogSerializer,
    LabOrderCancelSerializer,
    LabOrderItemSerializer,
    LabOrderSerializer,
    LabReferenceRangeSerializer,
    LabResultCorrectionActionSerializer,
    LabResultEntrySerializer,
    LabResultSerializer,
    LabSpecimenSerializer,
    LabTestSerializer,
    SpecimenCollectSerializer,
    SpecimenRejectSerializer,
)
from .services import (
    acknowledge_critical_notification,
    collect_specimen,
    correct_verified_result,
    enter_lab_result,
    receive_specimen,
    record_lab_audit,
    reject_specimen,
    verify_lab_result,
)


class StandardResultsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class LabTestViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Laboratory Diagnostic Tests Catalogue.
    """

    queryset = LabTest.objects.prefetch_related(
        "parameters",
        "parameters__reference_ranges",
    ).all()
    serializer_class = LabTestSerializer
    permission_classes = [LabCataloguePermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["category", "specimen_type", "is_active"]
    search_fields = ["code", "name", "description", "methodology"]
    ordering_fields = ["name", "code", "category", "turnaround_time_hours", "created_at"]
    ordering = ["category", "name"]


class LabReferenceRangeViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Parameter-specific Reference Ranges and Critical Thresholds.
    """

    queryset = LabReferenceRange.objects.select_related("parameter", "parameter__test").all()
    serializer_class = LabReferenceRangeSerializer
    permission_classes = [LabCataloguePermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["parameter", "gender", "is_active"]
    search_fields = ["parameter__name", "parameter__code", "notes"]
    ordering_fields = ["age_min_years", "age_max_years", "min_normal_value", "max_normal_value"]
    ordering = ["parameter", "gender", "age_min_years"]


class LabOrderViewSet(viewsets.ModelViewSet):
    """
    API for managing Laboratory Test Orders.
    """

    serializer_class = LabOrderSerializer
    permission_classes = [LabOrderPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["status", "priority", "patient", "ordering_doctor", "hospital", "department"]
    search_fields = [
        "order_reference",
        "patient__mrn",
        "patient__user__first_name",
        "patient__user__last_name",
        "clinical_indication",
    ]
    ordering_fields = ["ordered_at", "created_at", "priority", "status"]
    ordering = ["-ordered_at", "-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = LabOrder.objects.select_related(
            "patient",
            "patient__user",
            "ordering_doctor",
            "ordering_doctor__user",
            "hospital",
            "department",
            "encounter",
            "appointment",
        ).prefetch_related(
            "items",
            "items__test",
            "specimens",
        )

        if not user.is_authenticated:
            return qs.none()

        if user.role == "PATIENT":
            return qs.filter(patient__user=user)

        return qs

    @extend_schema(
        request=LabOrderCancelSerializer,
        responses={200: LabOrderSerializer},
    )
    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        order = self.get_object()

        if order.status in [LabOrder.Status.COMPLETED, LabOrder.Status.CANCELLED]:
            return Response(
                {"detail": f"Order in status {order.status} cannot be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = LabOrderCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data["reason"]

        order.status = LabOrder.Status.CANCELLED
        order.cancelled_by = request.user
        order.cancelled_at = timezone.now()
        order.cancellation_reason = reason
        order.save()

        # Mark non-verified items as cancelled
        order.items.exclude(status=LabOrderItem.ItemStatus.VERIFIED).update(
            status=LabOrderItem.ItemStatus.CANCELLED,
            cancellation_reason=reason,
        )

        # Mark specimens as cancelled if not completed
        order.specimens.exclude(status=LabSpecimen.Status.COMPLETED).update(
            status=LabSpecimen.Status.CANCELLED
        )

        record_lab_audit(
            resource_type="ORDER",
            resource_id=order.order_reference,
            action="CANCELLED",
            user=request.user,
            patient=order.patient,
            description=f"Lab order {order.order_reference} cancelled by {request.user.username}: {reason}",
            metadata={"reason": reason},
        )

        return Response(LabOrderSerializer(order).data, status=status.HTTP_200_OK)


class LabSpecimenViewSet(viewsets.ModelViewSet):
    """
    API for Specimen Accessioning, Tracking, and Handling.
    """

    serializer_class = LabSpecimenSerializer
    permission_classes = [LabSpecimenPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["status", "specimen_type"]
    search_fields = ["barcode", "order__order_reference", "order__patient__mrn", "collection_location"]
    ordering_fields = ["created_at", "collected_at", "received_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return LabSpecimen.objects.select_related(
            "order",
            "order__patient",
            "order__patient__user",
            "collected_by",
            "received_by",
            "rejected_by",
        ).prefetch_related("order_items", "order_items__test")

    @extend_schema(
        request=SpecimenCollectSerializer,
        responses={200: LabSpecimenSerializer},
    )
    @action(detail=True, methods=["post"], url_path="collect")
    def collect(self, request, pk=None):
        specimen = self.get_object()
        serializer = SpecimenCollectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        location = serializer.validated_data.get("collection_location", "")

        try:
            updated_specimen = collect_specimen(
                specimen=specimen,
                user=request.user,
                collection_location=location,
            )
            return Response(LabSpecimenSerializer(updated_specimen).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=None,
        responses={200: LabSpecimenSerializer},
    )
    @action(detail=True, methods=["post"], url_path="receive")
    def receive(self, request, pk=None):
        specimen = self.get_object()
        try:
            updated_specimen = receive_specimen(
                specimen=specimen,
                user=request.user,
            )
            return Response(LabSpecimenSerializer(updated_specimen).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=SpecimenRejectSerializer,
        responses={200: LabSpecimenSerializer},
    )
    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        specimen = self.get_object()
        serializer = SpecimenRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data["rejection_reason"]

        try:
            updated_specimen = reject_specimen(
                specimen=specimen,
                user=request.user,
                rejection_reason=reason,
            )
            return Response(LabSpecimenSerializer(updated_specimen).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)


class LabResultViewSet(viewsets.ModelViewSet):
    """
    API for Diagnostic Results Entry, Verification, Corrections, and Review.
    """

    serializer_class = LabResultSerializer
    permission_classes = [LabResultPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["status", "is_critical", "is_abnormal"]
    search_fields = [
        "result_reference",
        "order_item__order__order_reference",
        "order_item__test__name",
        "order_item__order__patient__mrn",
    ]
    ordering_fields = ["created_at", "verified_at", "entered_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = LabResult.objects.select_related(
            "order_item",
            "order_item__order",
            "order_item__order__patient",
            "order_item__order__patient__user",
            "order_item__test",
            "specimen",
            "entered_by",
            "verified_by",
        ).prefetch_related(
            "parameter_values",
            "parameter_values__parameter",
            "corrections",
            "corrections__parameter",
            "corrections__corrected_by",
        )

        if not user.is_authenticated:
            return qs.none()

        if user.role == "PATIENT":
            return qs.filter(
                order_item__order__patient__user=user,
                status__in=[LabResult.Status.VERIFIED, LabResult.Status.CORRECTED],
            )

        return qs

    @extend_schema(
        request=LabResultEntrySerializer,
        responses={200: LabResultSerializer},
    )
    @action(detail=False, methods=["post"], url_path="enter")
    def enter_results(self, request):
        serializer = LabResultEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        order_item = get_object_or_404(LabOrderItem, id=data["order_item_id"])
        specimen = None
        if data.get("specimen_id"):
            specimen = get_object_or_404(LabSpecimen, id=data["specimen_id"])

        # Map parameter IDs to instances
        resolved_params_data = []
        for p in data["parameter_values"]:
            param_obj = get_object_or_404(LabTestParameter, id=p["parameter_id"])
            resolved_params_data.append({
                "parameter": param_obj,
                "numeric_value": p.get("numeric_value"),
                "text_value": p.get("text_value", ""),
            })

        try:
            result = enter_lab_result(
                order_item=order_item,
                specimen=specimen,
                parameter_values_data=resolved_params_data,
                user=request.user,
                overall_interpretation=data.get("overall_interpretation", ""),
                clinical_comments=data.get("clinical_comments", ""),
            )
            return Response(LabResultSerializer(result).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=None,
        responses={200: LabResultSerializer},
    )
    @action(detail=True, methods=["post"], url_path="verify")
    def verify(self, request, pk=None):
        result = self.get_object()
        try:
            verified_result = verify_lab_result(
                result=result,
                user=request.user,
            )
            return Response(LabResultSerializer(verified_result).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=LabResultCorrectionActionSerializer,
        responses={200: LabResultSerializer},
    )
    @action(detail=True, methods=["post"], url_path="correct")
    def correct(self, request, pk=None):
        result = self.get_object()
        serializer = LabResultCorrectionActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        resolved_corrections = []
        for item in data["corrections"]:
            param_obj = get_object_or_404(LabTestParameter, id=item["parameter_id"])
            resolved_corrections.append({
                "parameter": param_obj,
                "new_numeric_value": item.get("new_numeric_value"),
                "new_text_value": item.get("new_text_value", ""),
            })

        try:
            corrected_result = correct_verified_result(
                result=result,
                user=request.user,
                parameter_corrections_data=resolved_corrections,
                correction_reason=data["correction_reason"],
            )
            return Response(LabResultSerializer(corrected_result).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)


class PatientLabResultsView(APIView):
    """
    API for retrieving all released laboratory diagnostic results for a specific patient.
    """

    permission_classes = [LabResultPermission]

    @extend_schema(responses={200: LabResultSerializer(many=True)})
    def get(self, request, patient_id=None):
        user = request.user
        if not (user and user.is_authenticated):
            return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)

        if patient_id is None or str(patient_id).lower() == "me":
            if not hasattr(user, "patient_profile"):
                return Response({"detail": "User has no patient profile linked."}, status=status.HTTP_400_BAD_REQUEST)
            patient = user.patient_profile
        else:
            patient = get_object_or_404(Patient, id=patient_id)
            if user.role == "PATIENT" and patient.user_id != user.id:
                return Response({"detail": "You do not have permission to view other patients' results."}, status=status.HTTP_403_FORBIDDEN)

        results_qs = LabResult.objects.filter(
            order_item__order__patient=patient,
            status__in=[LabResult.Status.VERIFIED, LabResult.Status.CORRECTED],
        ).select_related(
            "order_item",
            "order_item__order",
            "order_item__test",
            "specimen",
            "verified_by",
        ).prefetch_related(
            "parameter_values",
            "parameter_values__parameter",
            "corrections",
        ).order_by("-verified_at", "-created_at")

        serializer = LabResultSerializer(results_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CriticalResultNotificationViewSet(viewsets.ModelViewSet):
    """
    API for managing Critical Laboratory Alerts and Clinician Acknowledgements.
    """

    serializer_class = CriticalResultNotificationSerializer
    permission_classes = [CriticalNotificationPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["status"]
    search_fields = ["notification_reference", "patient__mrn", "order__order_reference"]
    ordering = ["-generated_at"]

    def get_queryset(self):
        return CriticalResultNotification.objects.select_related(
            "result",
            "result__order_item",
            "result__order_item__test",
            "order",
            "patient",
            "patient__user",
            "acknowledged_by",
        )

    @extend_schema(
        request=CriticalNotificationAcknowledgeSerializer,
        responses={200: CriticalResultNotificationSerializer},
    )
    @action(detail=True, methods=["post"], url_path="acknowledge")
    def acknowledge(self, request, pk=None):
        notification = self.get_object()
        serializer = CriticalNotificationAcknowledgeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notes = serializer.validated_data.get("notes", "")

        try:
            updated_notification = acknowledge_critical_notification(
                notification=notification,
                user=request.user,
                notes=notes,
            )
            return Response(CriticalResultNotificationSerializer(updated_notification).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)


class LabAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for immutable Laboratory audit logs.
    """

    queryset = LabAuditLog.objects.select_related("user", "patient").all()
    serializer_class = LabAuditLogSerializer
    permission_classes = [LabCataloguePermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["resource_type", "action", "patient"]
    search_fields = ["resource_id", "description", "patient__mrn"]
    ordering = ["-created_at"]
