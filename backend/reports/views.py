from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from hospitals.models import Department, Doctor, Hospital

from .exports import build_csv_response
from .models import ReportAuditLog
from .permissions import (
    ClinicalReportPermission,
    FinancialReportPermission,
    LaboratoryReportPermission,
    PharmacyReportPermission,
    ReportAuditLogPermission,
    StaffReportPermission,
)
from .serializers import ReportAuditLogSerializer
from .services import (
    get_appointments_report,
    get_billing_report,
    get_dashboard_metrics,
    get_inpatient_report,
    get_insurance_report,
    get_laboratory_report,
    get_patients_report,
    get_pharmacy_report,
    parse_date_range,
    record_report_audit,
)


def resolve_hospital_scope(request):
    """
    Resolves target hospital while strictly checking authorization.
    SUPER_ADMIN can specify any hospital.
    Other staff are bound to their assigned hospital.
    """
    user = request.user
    hospital_id = request.query_params.get("hospital")

    if hospital_id:
        target = get_object_or_404(Hospital, id=hospital_id)
        # Verify user authorization to view this hospital
        if getattr(user, "role", None) != "SUPER_ADMIN" and not user.is_superuser:
            user_hosp = None
            if hasattr(user, "doctor_profile") and user.doctor_profile.hospital:
                user_hosp = user.doctor_profile.hospital
            elif hasattr(user, "staff_profile") and user.staff_profile.hospital:
                user_hosp = user.staff_profile.hospital

            if user_hosp and user_hosp.id != target.id:
                raise DjangoValidationError({"hospital": "You are not authorized to view reports for another hospital."})
        return target

    if hasattr(user, "doctor_profile") and user.doctor_profile.hospital:
        return user.doctor_profile.hospital
    if hasattr(user, "staff_profile") and user.staff_profile.hospital:
        return user.staff_profile.hospital

    return Hospital.objects.first()


class StandardReportPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class DashboardView(APIView):
    """
    Role-specific hospital dashboard providing operational, clinical, and financial aggregates.
    """

    permission_classes = [StaffReportPermission]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="hospital", description="Hospital ID", required=False, type=OpenApiTypes.INT),
            OpenApiParameter(name="start_date", description="Start date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="end_date", description="End date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        try:
            hospital = resolve_hospital_scope(request)
            start_date, end_date = parse_date_range(
                request.query_params.get("start_date"),
                request.query_params.get("end_date"),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        metrics = get_dashboard_metrics(
            user=request.user,
            hospital=hospital,
            start_date=start_date,
            end_date=end_date,
        )

        record_report_audit(
            user=request.user,
            report_type=ReportAuditLog.ReportType.DASHBOARD,
            action=ReportAuditLog.Action.VIEW,
            hospital=hospital,
            parameters={"start_date": str(start_date), "end_date": str(end_date)},
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response(metrics, status=status.HTTP_200_OK)


class PatientsReportView(APIView):
    """
    Patient demographics and registration statistics report with optional CSV export.
    """

    permission_classes = [ClinicalReportPermission]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="hospital", description="Hospital ID", required=False, type=OpenApiTypes.INT),
            OpenApiParameter(name="start_date", description="Start date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="end_date", description="End date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="export", description="Set to 'csv' to download as CSV", required=False, type=OpenApiTypes.STR),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        try:
            hospital = resolve_hospital_scope(request)
            start_date, end_date = parse_date_range(
                request.query_params.get("start_date"),
                request.query_params.get("end_date"),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        summary, headers, rows = get_patients_report(hospital=hospital, start_date=start_date, end_date=end_date)

        export_mode = request.query_params.get("export") or request.query_params.get("format")
        if export_mode == "csv":
            record_report_audit(
                user=request.user,
                report_type=ReportAuditLog.ReportType.PATIENTS,
                action=ReportAuditLog.Action.EXPORT_CSV,
                hospital=hospital,
                parameters={"start_date": str(start_date), "end_date": str(end_date)},
                ip_address=request.META.get("REMOTE_ADDR"),
                records_count=len(rows),
            )
            return build_csv_response("patients_report", headers, rows)

        record_report_audit(
            user=request.user,
            report_type=ReportAuditLog.ReportType.PATIENTS,
            action=ReportAuditLog.Action.VIEW,
            hospital=hospital,
            parameters={"start_date": str(start_date), "end_date": str(end_date)},
            ip_address=request.META.get("REMOTE_ADDR"),
            records_count=len(rows),
        )
        return Response({"summary": summary, "records_count": len(rows), "records": rows[:100]}, status=status.HTTP_200_OK)


class AppointmentsReportView(APIView):
    """
    Appointments volume, statuses, and scheduling utilization report with CSV export.
    """

    permission_classes = [ClinicalReportPermission]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="hospital", description="Hospital ID", required=False, type=OpenApiTypes.INT),
            OpenApiParameter(name="department", description="Department ID", required=False, type=OpenApiTypes.INT),
            OpenApiParameter(name="doctor", description="Doctor ID", required=False, type=OpenApiTypes.INT),
            OpenApiParameter(name="start_date", description="Start date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="end_date", description="End date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="export", description="Set to 'csv' to download as CSV", required=False, type=OpenApiTypes.STR),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        try:
            hospital = resolve_hospital_scope(request)
            start_date, end_date = parse_date_range(
                request.query_params.get("start_date"),
                request.query_params.get("end_date"),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        dept_id = request.query_params.get("department")
        department = get_object_or_404(Department, id=dept_id) if dept_id else None

        doc_id = request.query_params.get("doctor")
        doctor = get_object_or_404(Doctor, id=doc_id) if doc_id else None

        summary, headers, rows = get_appointments_report(
            hospital=hospital,
            department=department,
            doctor=doctor,
            start_date=start_date,
            end_date=end_date,
        )

        export_mode = request.query_params.get("export") or request.query_params.get("format")
        if export_mode == "csv":
            record_report_audit(
                user=request.user,
                report_type=ReportAuditLog.ReportType.APPOINTMENTS,
                action=ReportAuditLog.Action.EXPORT_CSV,
                hospital=hospital,
                ip_address=request.META.get("REMOTE_ADDR"),
                records_count=len(rows),
            )
            return build_csv_response("appointments_report", headers, rows)

        record_report_audit(
            user=request.user,
            report_type=ReportAuditLog.ReportType.APPOINTMENTS,
            action=ReportAuditLog.Action.VIEW,
            hospital=hospital,
            ip_address=request.META.get("REMOTE_ADDR"),
            records_count=len(rows),
        )
        return Response({"summary": summary, "records_count": len(rows), "records": rows[:100]}, status=status.HTTP_200_OK)


class InpatientReportView(APIView):
    """
    Inpatient admissions, ward capacity, and bed occupancy analytics report with CSV export.
    """

    permission_classes = [ClinicalReportPermission]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="hospital", description="Hospital ID", required=False, type=OpenApiTypes.INT),
            OpenApiParameter(name="start_date", description="Start date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="end_date", description="End date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="export", description="Set to 'csv' to download as CSV", required=False, type=OpenApiTypes.STR),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        try:
            hospital = resolve_hospital_scope(request)
            start_date, end_date = parse_date_range(
                request.query_params.get("start_date"),
                request.query_params.get("end_date"),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        summary, headers, rows = get_inpatient_report(hospital=hospital, start_date=start_date, end_date=end_date)

        export_mode = request.query_params.get("export") or request.query_params.get("format")
        if export_mode == "csv":
            record_report_audit(
                user=request.user,
                report_type=ReportAuditLog.ReportType.INPATIENT,
                action=ReportAuditLog.Action.EXPORT_CSV,
                hospital=hospital,
                ip_address=request.META.get("REMOTE_ADDR"),
                records_count=len(rows),
            )
            return build_csv_response("inpatient_occupancy_report", headers, rows)

        record_report_audit(
            user=request.user,
            report_type=ReportAuditLog.ReportType.INPATIENT,
            action=ReportAuditLog.Action.VIEW,
            hospital=hospital,
            ip_address=request.META.get("REMOTE_ADDR"),
            records_count=len(rows),
        )
        return Response({"summary": summary, "records_count": len(rows), "records": rows[:100]}, status=status.HTTP_200_OK)


class PharmacyReportView(APIView):
    """
    Pharmacy stock valuation, low-stock threshold alerts, and dispensing report with CSV export.
    """

    permission_classes = [PharmacyReportPermission]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="hospital", description="Hospital ID", required=False, type=OpenApiTypes.INT),
            OpenApiParameter(name="start_date", description="Start date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="end_date", description="End date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="export", description="Set to 'csv' to download as CSV", required=False, type=OpenApiTypes.STR),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        try:
            hospital = resolve_hospital_scope(request)
            start_date, end_date = parse_date_range(
                request.query_params.get("start_date"),
                request.query_params.get("end_date"),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        summary, headers, rows = get_pharmacy_report(hospital=hospital, start_date=start_date, end_date=end_date)

        export_mode = request.query_params.get("export") or request.query_params.get("format")
        if export_mode == "csv":
            record_report_audit(
                user=request.user,
                report_type=ReportAuditLog.ReportType.PHARMACY,
                action=ReportAuditLog.Action.EXPORT_CSV,
                hospital=hospital,
                ip_address=request.META.get("REMOTE_ADDR"),
                records_count=len(rows),
            )
            return build_csv_response("pharmacy_inventory_report", headers, rows)

        record_report_audit(
            user=request.user,
            report_type=ReportAuditLog.ReportType.PHARMACY,
            action=ReportAuditLog.Action.VIEW,
            hospital=hospital,
            ip_address=request.META.get("REMOTE_ADDR"),
            records_count=len(rows),
        )
        return Response({"summary": summary, "records_count": len(rows), "records": rows[:100]}, status=status.HTTP_200_OK)


class LaboratoryReportView(APIView):
    """
    Laboratory diagnostic order volumes, processing statuses, and critical alerts report with CSV export.
    """

    permission_classes = [LaboratoryReportPermission]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="hospital", description="Hospital ID", required=False, type=OpenApiTypes.INT),
            OpenApiParameter(name="start_date", description="Start date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="end_date", description="End date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="export", description="Set to 'csv' to download as CSV", required=False, type=OpenApiTypes.STR),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        try:
            hospital = resolve_hospital_scope(request)
            start_date, end_date = parse_date_range(
                request.query_params.get("start_date"),
                request.query_params.get("end_date"),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        summary, headers, rows = get_laboratory_report(hospital=hospital, start_date=start_date, end_date=end_date)

        export_mode = request.query_params.get("export") or request.query_params.get("format")
        if export_mode == "csv":
            record_report_audit(
                user=request.user,
                report_type=ReportAuditLog.ReportType.LABORATORY,
                action=ReportAuditLog.Action.EXPORT_CSV,
                hospital=hospital,
                ip_address=request.META.get("REMOTE_ADDR"),
                records_count=len(rows),
            )
            return build_csv_response("laboratory_activity_report", headers, rows)

        record_report_audit(
            user=request.user,
            report_type=ReportAuditLog.ReportType.LABORATORY,
            action=ReportAuditLog.Action.VIEW,
            hospital=hospital,
            ip_address=request.META.get("REMOTE_ADDR"),
            records_count=len(rows),
        )
        return Response({"summary": summary, "records_count": len(rows), "records": rows[:100]}, status=status.HTTP_200_OK)


class BillingReportView(APIView):
    """
    Financial billing, collections, refunds, and outstanding balance report with CSV export.
    """

    permission_classes = [FinancialReportPermission]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="hospital", description="Hospital ID", required=False, type=OpenApiTypes.INT),
            OpenApiParameter(name="start_date", description="Start date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="end_date", description="End date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="export", description="Set to 'csv' to download as CSV", required=False, type=OpenApiTypes.STR),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        try:
            hospital = resolve_hospital_scope(request)
            start_date, end_date = parse_date_range(
                request.query_params.get("start_date"),
                request.query_params.get("end_date"),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        summary, headers, rows = get_billing_report(hospital=hospital, start_date=start_date, end_date=end_date)

        export_mode = request.query_params.get("export") or request.query_params.get("format")
        if export_mode == "csv":
            record_report_audit(
                user=request.user,
                report_type=ReportAuditLog.ReportType.BILLING,
                action=ReportAuditLog.Action.EXPORT_CSV,
                hospital=hospital,
                ip_address=request.META.get("REMOTE_ADDR"),
                records_count=len(rows),
            )
            return build_csv_response("billing_collections_report", headers, rows)

        record_report_audit(
            user=request.user,
            report_type=ReportAuditLog.ReportType.BILLING,
            action=ReportAuditLog.Action.VIEW,
            hospital=hospital,
            ip_address=request.META.get("REMOTE_ADDR"),
            records_count=len(rows),
        )
        return Response({"summary": summary, "records_count": len(rows), "records": rows[:100]}, status=status.HTTP_200_OK)


class InsuranceReportView(APIView):
    """
    Insurance claims submitted, approved, settled, and outstanding reimbursement report with CSV export.
    """

    permission_classes = [FinancialReportPermission]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="hospital", description="Hospital ID", required=False, type=OpenApiTypes.INT),
            OpenApiParameter(name="start_date", description="Start date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="end_date", description="End date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="export", description="Set to 'csv' to download as CSV", required=False, type=OpenApiTypes.STR),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        try:
            hospital = resolve_hospital_scope(request)
            start_date, end_date = parse_date_range(
                request.query_params.get("start_date"),
                request.query_params.get("end_date"),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        summary, headers, rows = get_insurance_report(hospital=hospital, start_date=start_date, end_date=end_date)

        export_mode = request.query_params.get("export") or request.query_params.get("format")
        if export_mode == "csv":
            record_report_audit(
                user=request.user,
                report_type=ReportAuditLog.ReportType.INSURANCE,
                action=ReportAuditLog.Action.EXPORT_CSV,
                hospital=hospital,
                ip_address=request.META.get("REMOTE_ADDR"),
                records_count=len(rows),
            )
            return build_csv_response("insurance_claims_report", headers, rows)

        record_report_audit(
            user=request.user,
            report_type=ReportAuditLog.ReportType.INSURANCE,
            action=ReportAuditLog.Action.VIEW,
            hospital=hospital,
            ip_address=request.META.get("REMOTE_ADDR"),
            records_count=len(rows),
        )
        return Response({"summary": summary, "records_count": len(rows), "records": rows[:100]}, status=status.HTTP_200_OK)


class ReportAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Super Admin & Hospital Admin audit log endpoint tracking report access and CSV exports.
    """

    queryset = ReportAuditLog.objects.select_related("user", "hospital").order_by("-timestamp")
    serializer_class = ReportAuditLogSerializer
    permission_classes = [ReportAuditLogPermission]
    pagination_class = StandardReportPagination
    filterset_fields = ["report_type", "action", "hospital"]
    search_fields = ["user__username", "ip_address"]
