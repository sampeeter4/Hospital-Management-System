from datetime import datetime
from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, OpenApiResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from hospitals.models import Doctor
from .models import Appointment, AppointmentStatusHistory, DoctorAvailability
from .permissions import AppointmentPermission, DoctorAvailabilityPermission
from .serializers import (
    AppointmentCancelSerializer,
    AppointmentRescheduleSerializer,
    AppointmentSerializer,
    AppointmentStatusHistorySerializer,
    AvailableSlotSerializer,
    DoctorAvailabilitySerializer,
)
from .services import (
    get_available_slots,
    transition_appointment_status,
    validate_booking,
)


class StandardResultsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Doctor Availability schedules.
    Read: Authenticated users.
    Write: Super Admin, Hospital Admin, or Doctor for their own schedule.
    """

    queryset = DoctorAvailability.objects.select_related("doctor", "doctor__user").all()
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [DoctorAvailabilityPermission]
    pagination_class = StandardResultsPagination
    filterset_fields = ["doctor", "day_of_week", "is_active"]
    search_fields = [
        "doctor__doctor_id",
        "doctor__user__first_name",
        "doctor__user__last_name",
    ]
    ordering_fields = ["day_of_week", "start_time"]


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    CRUD and clinical/administrative lifecycle workflow endpoints for Appointments.
    """

    queryset = Appointment.objects.select_related(
        "patient",
        "patient__user",
        "doctor",
        "doctor__user",
        "hospital",
        "department",
        "booked_by",
        "cancelled_by",
    ).all()
    serializer_class = AppointmentSerializer
    permission_classes = [AppointmentPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = [
        "doctor",
        "patient",
        "hospital",
        "department",
        "appointment_date",
        "status",
        "appointment_type",
    ]
    search_fields = [
        "appointment_reference",
        "patient__user__first_name",
        "patient__user__last_name",
        "patient__mrn",
        "doctor__user__first_name",
        "doctor__user__last_name",
        "doctor__doctor_id",
    ]
    ordering_fields = ["appointment_date", "start_time", "created_at"]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Appointment.objects.none()

        base_qs = Appointment.objects.select_related(
            "patient",
            "patient__user",
            "doctor",
            "doctor__user",
            "hospital",
            "department",
            "booked_by",
            "cancelled_by",
        ).all()

        if user.role == "PATIENT":
            return base_qs.filter(patient__user=user)

        if user.role == "DOCTOR":
            return base_qs.filter(doctor__user=user)

        if user.role in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "NURSE"]:
            return base_qs

        return Appointment.objects.none()

    @extend_schema(
        summary="Appointments of current user",
        description="Retrieve appointments for the currently logged in patient or doctor.",
        responses={200: AppointmentSerializer(many=True)},
    )
    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="my",
        url_name="my",
    )
    def my(self, request):
        qs = self.get_queryset()
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Get available doctor appointment slots",
        description="Calculates open slots for a doctor on a specific date based on availability and existing bookings.",
        parameters=[
            OpenApiParameter("doctor_id", OpenApiTypes.INT, description="ID of Doctor", required=True),
            OpenApiParameter("date", OpenApiTypes.DATE, description="Date (YYYY-MM-DD)", required=True),
        ],
        responses={200: AvailableSlotSerializer(many=True)},
    )
    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="available-slots",
        url_name="available-slots",
    )
    def available_slots(self, request):
        doctor_id = request.query_params.get("doctor_id")
        date_str = request.query_params.get("date")

        if not doctor_id or not date_str:
            return Response(
                {"error": "Both doctor_id and date query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        doctor = get_object_or_404(Doctor, pk=doctor_id)

        try:
            query_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"date": "Date format must be YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        slots = get_available_slots(doctor=doctor, date=query_date)
        return Response(slots, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Confirm appointment",
        description="Transitions status from PENDING to CONFIRMED. Authorized: Admin, Receptionist, Doctor.",
        request=None,
        responses={200: AppointmentSerializer},
    )
    @action(detail=True, methods=["post"], url_path="confirm", url_name="confirm")
    def confirm(self, request, pk=None):
        appointment = self.get_object()
        user = request.user
        if user.role not in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "DOCTOR"]:
            return Response(
                {"detail": "You do not have permission to confirm appointments."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            updated = transition_appointment_status(
                appointment=appointment,
                new_status=Appointment.Status.CONFIRMED,
                user=user,
                reason="Confirmed by staff/doctor",
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else exc.messages, status=status.HTTP_400_BAD_REQUEST)

        return Response(self.get_serializer(updated).data)

    @extend_schema(
        summary="Check in patient for appointment",
        description="Transitions status from CONFIRMED to CHECKED_IN. Authorized: Admin, Receptionist, Nurse.",
        request=None,
        responses={200: AppointmentSerializer},
    )
    @action(detail=True, methods=["post"], url_path="check-in", url_name="check-in")
    def check_in(self, request, pk=None):
        appointment = self.get_object()
        user = request.user
        if user.role not in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "NURSE"]:
            return Response(
                {"detail": "You do not have permission to check in patients."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            updated = transition_appointment_status(
                appointment=appointment,
                new_status=Appointment.Status.CHECKED_IN,
                user=user,
                reason="Patient checked in at hospital",
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else exc.messages, status=status.HTTP_400_BAD_REQUEST)

        return Response(self.get_serializer(updated).data)

    @extend_schema(
        summary="Start consultation",
        description="Transitions status from CHECKED_IN to IN_PROGRESS. Authorized: Admin, Doctor.",
        request=None,
        responses={200: AppointmentSerializer},
    )
    @action(detail=True, methods=["post"], url_path="start", url_name="start")
    def start(self, request, pk=None):
        appointment = self.get_object()
        user = request.user
        if user.role not in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"]:
            return Response(
                {"detail": "You do not have permission to start appointments."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            updated = transition_appointment_status(
                appointment=appointment,
                new_status=Appointment.Status.IN_PROGRESS,
                user=user,
                reason="Doctor commenced consultation",
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else exc.messages, status=status.HTTP_400_BAD_REQUEST)

        return Response(self.get_serializer(updated).data)

    @extend_schema(
        summary="Complete appointment",
        description="Transitions status from IN_PROGRESS to COMPLETED. Authorized: Admin, Doctor.",
        request=None,
        responses={200: AppointmentSerializer},
    )
    @action(detail=True, methods=["post"], url_path="complete", url_name="complete")
    def complete(self, request, pk=None):
        appointment = self.get_object()
        user = request.user
        if user.role not in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"]:
            return Response(
                {"detail": "You do not have permission to complete appointments."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            updated = transition_appointment_status(
                appointment=appointment,
                new_status=Appointment.Status.COMPLETED,
                user=user,
                reason="Consultation concluded successfully",
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else exc.messages, status=status.HTTP_400_BAD_REQUEST)

        return Response(self.get_serializer(updated).data)

    @extend_schema(
        summary="Cancel appointment",
        description="Cancels the appointment. Authorized: Admin, Receptionist, Doctor, or the patient.",
        request=AppointmentCancelSerializer,
        responses={200: AppointmentSerializer},
    )
    @action(detail=True, methods=["post"], url_path="cancel", url_name="cancel")
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        serializer = AppointmentCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data["cancellation_reason"]

        try:
            updated = transition_appointment_status(
                appointment=appointment,
                new_status=Appointment.Status.CANCELLED,
                user=request.user,
                reason=reason,
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else exc.messages, status=status.HTTP_400_BAD_REQUEST)

        return Response(self.get_serializer(updated).data)

    @extend_schema(
        summary="Reschedule appointment",
        description="Reschedules an active appointment to a new date and time slot.",
        request=AppointmentRescheduleSerializer,
        responses={200: AppointmentSerializer},
    )
    @action(detail=True, methods=["post"], url_path="reschedule", url_name="reschedule")
    def reschedule(self, request, pk=None):
        appointment = self.get_object()
        if appointment.status in Appointment.TERMINAL_STATUSES:
            return Response(
                {"detail": f"Cannot reschedule appointment with status {appointment.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AppointmentRescheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_date = serializer.validated_data["appointment_date"]
        new_start = serializer.validated_data["start_time"]
        new_end = serializer.validated_data["end_time"]

        try:
            validate_booking(
                doctor=appointment.doctor,
                patient=appointment.patient,
                appointment_date=new_date,
                start_time=new_start,
                end_time=new_end,
                exclude_appointment_id=appointment.pk,
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else exc.messages, status=status.HTTP_400_BAD_REQUEST)

        appointment.appointment_date = new_date
        appointment.start_time = new_start
        appointment.end_time = new_end
        appointment.save()

        AppointmentStatusHistory.objects.create(
            appointment=appointment,
            previous_status=appointment.status,
            new_status=appointment.status,
            changed_by=request.user,
            reason=f"Rescheduled to {new_date} from {new_start} to {new_end}",
        )

        return Response(self.get_serializer(appointment).data)

    @extend_schema(
        summary="Mark appointment as no-show",
        description="Transitions status to NO_SHOW. Authorized: Admin, Receptionist, Doctor.",
        request=None,
        responses={200: AppointmentSerializer},
    )
    @action(detail=True, methods=["post"], url_path="no-show", url_name="no-show")
    def no_show(self, request, pk=None):
        appointment = self.get_object()
        user = request.user
        if user.role not in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "DOCTOR"]:
            return Response(
                {"detail": "You do not have permission to mark no-show."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            updated = transition_appointment_status(
                appointment=appointment,
                new_status=Appointment.Status.NO_SHOW,
                user=user,
                reason="Patient failed to attend scheduled appointment",
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else exc.messages, status=status.HTTP_400_BAD_REQUEST)

        return Response(self.get_serializer(updated).data)

    @extend_schema(
        summary="Appointment status history",
        description="Retrieves the audit trail of status transitions for this appointment.",
        responses={200: AppointmentStatusHistorySerializer(many=True)},
    )
    @action(detail=True, methods=["get"], url_path="history", url_name="history")
    def history(self, request, pk=None):
        appointment = self.get_object()
        history_qs = appointment.status_history.select_related("changed_by").all()
        serializer = AppointmentStatusHistorySerializer(history_qs, many=True)
        return Response(serializer.data)

