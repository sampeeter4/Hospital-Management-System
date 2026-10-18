from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from hospitals.models import Hospital
from .models import (
    Admission,
    Bed,
    BedAssignment,
    BedReservation,
    InpatientAuditLog,
    Room,
    Ward,
)
from .permissions import (
    AdmissionPermission,
    BedAssignmentPermission,
    OccupancyReportPermission,
    WardRoomBedPermission,
)
from .serializers import (
    AdmissionCancelSerializer,
    AdmissionSerializer,
    AdmitActionSerializer,
    BedAssignmentSerializer,
    BedReservationSerializer,
    BedReserveActionSerializer,
    BedSerializer,
    BedStatusUpdateSerializer,
    DischargeActionSerializer,
    InpatientAuditLogSerializer,
    RoomSerializer,
    TransferActionSerializer,
    WardSerializer,
)
from .services import (
    admit_patient,
    calculate_occupancy_report,
    discharge_patient,
    record_inpatient_audit,
    reserve_bed,
    transfer_patient,
    update_bed_operational_status,
)


class StandardResultsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class WardViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Hospital Wards and clinical units.
    """

    queryset = Ward.objects.select_related("hospital", "department").prefetch_related("rooms", "rooms__beds").all()
    serializer_class = WardSerializer
    permission_classes = [WardRoomBedPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["hospital", "department", "ward_type", "gender_policy", "is_active"]
    search_fields = ["code", "name", "floor", "description"]
    ordering_fields = ["name", "code", "created_at"]
    ordering = ["hospital", "name"]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    @action(detail=True, methods=["get"], url_path="occupancy")
    def occupancy(self, request, pk=None):
        ward = self.get_object()
        report = calculate_occupancy_report(hospital=ward.hospital, ward=ward)
        return Response(report, status=status.HTTP_200_OK)


class RoomViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Ward Rooms and suites.
    """

    queryset = Room.objects.select_related("ward", "ward__hospital").prefetch_related("beds").all()
    serializer_class = RoomSerializer
    permission_classes = [WardRoomBedPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["ward", "ward__hospital", "room_type", "is_active"]
    search_fields = ["room_number", "ward__name", "ward__code", "floor"]
    ordering_fields = ["room_number", "capacity", "created_at"]
    ordering = ["ward", "room_number"]


class BedViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Hospital Beds, operational statuses, and reservations.
    """

    queryset = Bed.objects.select_related(
        "room",
        "room__ward",
        "room__ward__hospital",
    ).prefetch_related(
        "assignments",
        "assignments__admission",
        "assignments__admission__patient",
        "assignments__admission__patient__user",
    ).all()
    serializer_class = BedSerializer
    permission_classes = [WardRoomBedPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["room", "room__ward", "room__ward__hospital", "bed_type", "status"]
    search_fields = ["bed_number", "room__room_number", "room__ward__name", "room__ward__code"]
    ordering_fields = ["bed_number", "status", "created_at"]
    ordering = ["room__ward", "room", "bed_number"]

    @extend_schema(responses={200: BedSerializer(many=True)})
    @action(detail=False, methods=["get"], url_path="available")
    def available_beds(self, request):
        qs = self.get_queryset().filter(
            status=Bed.Status.AVAILABLE,
            room__is_active=True,
            room__ward__is_active=True,
        )
        hospital_id = request.query_params.get("hospital")
        ward_id = request.query_params.get("ward")
        room_id = request.query_params.get("room")
        if hospital_id:
            qs = qs.filter(room__ward__hospital_id=hospital_id)
        if ward_id:
            qs = qs.filter(room__ward_id=ward_id)
        if room_id:
            qs = qs.filter(room_id=room_id)

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=BedStatusUpdateSerializer,
        responses={200: BedSerializer},
    )
    @action(detail=True, methods=["post"], url_path="update-status")
    def update_status(self, request, pk=None):
        bed = self.get_object()
        serializer = BedStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        notes = serializer.validated_data.get("notes", "")

        try:
            updated_bed = update_bed_operational_status(
                bed=bed,
                new_status=new_status,
                user=request.user,
                notes=notes,
            )
            return Response(BedSerializer(updated_bed).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=BedReserveActionSerializer,
        responses={200: BedReservationSerializer},
    )
    @action(detail=True, methods=["post"], url_path="reserve")
    def reserve(self, request, pk=None):
        bed = self.get_object()
        serializer = BedReserveActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient = None
        if data.get("patient_id"):
            patient = get_object_or_404(Bed.objects.model.room.field.related_model.ward.field.related_model.hospital.field.related_model.objects.first().__class__.objects.first().__class__, id=1)  # placeholder check
            from patients.models import Patient
            patient = get_object_or_404(Patient, id=data["patient_id"])

        admission = None
        if data.get("admission_id"):
            admission = get_object_or_404(Admission, id=data["admission_id"])

        try:
            reservation = reserve_bed(
                bed=bed,
                user=request.user,
                reserved_until=data["reserved_until"],
                patient=patient,
                admission=admission,
                notes=data.get("notes", ""),
            )
            return Response(BedReservationSerializer(reservation).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)


class AdmissionViewSet(viewsets.ModelViewSet):
    """
    API for managing Patient Inpatient Admissions and clinical movement workflows.
    """

    serializer_class = AdmissionSerializer
    permission_classes = [AdmissionPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["status", "admission_type", "patient", "hospital", "department", "attending_doctor"]
    search_fields = [
        "admission_reference",
        "patient__mrn",
        "patient__user__first_name",
        "patient__user__last_name",
        "admission_reason",
    ]
    ordering_fields = ["admission_date", "expected_discharge_date", "actual_discharge_date", "created_at"]
    ordering = ["-admission_date", "-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Admission.objects.select_related(
            "patient",
            "patient__user",
            "hospital",
            "attending_doctor",
            "attending_doctor__user",
            "department",
            "encounter",
            "appointment",
            "admitted_by",
            "discharged_by",
        ).prefetch_related(
            "bed_assignments",
            "bed_assignments__bed",
            "bed_assignments__bed__room",
            "bed_assignments__bed__room__ward",
            "bed_assignments__assigned_by",
            "bed_assignments__released_by",
        )

        if not user.is_authenticated:
            return qs.none()

        if user.role == "PATIENT":
            return qs.filter(patient__user=user)

        return qs

    @extend_schema(
        request=AdmitActionSerializer,
        responses={200: AdmissionSerializer},
    )
    @action(detail=True, methods=["post"], url_path="admit")
    def admit(self, request, pk=None):
        admission = self.get_object()
        serializer = AdmitActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        bed = get_object_or_404(Bed, id=serializer.validated_data["bed_id"])
        reason = serializer.validated_data.get("reason", "Inpatient bed allocation")

        try:
            admitted_admission, _ = admit_patient(
                admission=admission,
                bed=bed,
                user=request.user,
                reason=reason,
            )
            return Response(AdmissionSerializer(admitted_admission).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=TransferActionSerializer,
        responses={200: BedAssignmentSerializer},
    )
    @action(detail=True, methods=["post"], url_path="transfer")
    def transfer(self, request, pk=None):
        admission = self.get_object()
        serializer = TransferActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        dest_bed = get_object_or_404(Bed, id=serializer.validated_data["destination_bed_id"])
        reason = serializer.validated_data["reason"]

        try:
            new_assignment = transfer_patient(
                admission=admission,
                destination_bed=dest_bed,
                user=request.user,
                reason=reason,
            )
            return Response(BedAssignmentSerializer(new_assignment).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=DischargeActionSerializer,
        responses={200: AdmissionSerializer},
    )
    @action(detail=True, methods=["post"], url_path="discharge")
    def discharge(self, request, pk=None):
        admission = self.get_object()
        serializer = DischargeActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            discharged_admission = discharge_patient(
                admission=admission,
                user=request.user,
                discharge_disposition=data.get("discharge_disposition", Admission.DischargeDisposition.HOME_ROUTINE),
                discharge_instructions=data.get("discharge_instructions", ""),
                discharge_summary=data.get("discharge_summary", ""),
                discharge_date=data.get("discharge_date"),
            )
            return Response(AdmissionSerializer(discharged_admission).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=AdmissionCancelSerializer,
        responses={200: AdmissionSerializer},
    )
    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        admission = self.get_object()
        if admission.status in [Admission.Status.DISCHARGED, Admission.Status.CANCELLED]:
            return Response(
                {"detail": f"Admission in status {admission.status} cannot be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if admission.bed_assignments.filter(is_active=True).exists():
            return Response(
                {"detail": "Cannot cancel admission with an active bed assignment. Please discharge the patient instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AdmissionCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data["reason"]

        admission.status = Admission.Status.CANCELLED
        admission.cancellation_reason = reason
        admission.save()

        record_inpatient_audit(
            resource_type="ADMISSION",
            resource_id=admission.admission_reference,
            action="CANCELLED",
            user=request.user,
            patient=admission.patient,
            description=f"Admission request {admission.admission_reference} cancelled by {request.user.username}: {reason}",
            metadata={"reason": reason},
        )

        return Response(AdmissionSerializer(admission).data, status=status.HTTP_200_OK)

    @extend_schema(responses={200: BedAssignmentSerializer(many=True)})
    @action(detail=True, methods=["get"], url_path="bed-history")
    def bed_history(self, request, pk=None):
        admission = self.get_object()
        assignments = admission.bed_assignments.select_related(
            "bed",
            "bed__room",
            "bed__room__ward",
            "assigned_by",
            "released_by",
        ).order_by("-start_time")
        serializer = BedAssignmentSerializer(assignments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BedAssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only API for historical and active Inpatient Bed Assignments.
    """

    serializer_class = BedAssignmentSerializer
    permission_classes = [BedAssignmentPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["is_active", "bed", "admission", "bed__room__ward"]
    search_fields = [
        "admission__admission_reference",
        "admission__patient__mrn",
        "bed__bed_number",
        "reason",
    ]
    ordering_fields = ["start_time", "end_time", "created_at"]
    ordering = ["-start_time"]

    def get_queryset(self):
        user = self.request.user
        qs = BedAssignment.objects.select_related(
            "admission",
            "admission__patient",
            "admission__patient__user",
            "bed",
            "bed__room",
            "bed__room__ward",
            "assigned_by",
            "released_by",
        )

        if not user.is_authenticated:
            return qs.none()

        if user.role == "PATIENT":
            return qs.filter(admission__patient__user=user)

        return qs


class OccupancyReportView(APIView):
    """
    API for calculating real-time Hospital and Ward occupancy metrics and dashboard data.
    """

    permission_classes = [OccupancyReportPermission]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="hospital",
                description="Filter occupancy metrics by Hospital ID",
                required=False,
                type=OpenApiTypes.INT,
            ),
            OpenApiParameter(
                name="ward",
                description="Filter occupancy metrics by Ward ID",
                required=False,
                type=OpenApiTypes.INT,
            ),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        user = request.user
        hospital_id = request.query_params.get("hospital")
        ward_id = request.query_params.get("ward")

        hospital = None
        if hospital_id:
            hospital = get_object_or_404(Hospital, id=hospital_id)
        elif hasattr(user, "doctor_profile") and user.doctor_profile.hospital:
            hospital = user.doctor_profile.hospital
        elif hasattr(user, "staff_profile") and user.staff_profile.hospital:
            hospital = user.staff_profile.hospital
        else:
            hospital = Hospital.objects.first()

        if not hospital:
            return Response({"detail": "No hospital found in the system."}, status=status.HTTP_404_NOT_FOUND)

        ward = None
        if ward_id:
            ward = get_object_or_404(Ward, id=ward_id, hospital=hospital)

        report = calculate_occupancy_report(hospital=hospital, ward=ward)
        return Response(report, status=status.HTTP_200_OK)


class InpatientAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only API for immutable Inpatient audit trail records.
    """

    queryset = InpatientAuditLog.objects.select_related("user", "patient").all()
    serializer_class = InpatientAuditLogSerializer
    permission_classes = [WardRoomBedPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["resource_type", "action", "patient"]
    search_fields = ["resource_id", "description", "patient__mrn"]
    ordering = ["-created_at"]

