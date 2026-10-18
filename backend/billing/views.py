from decimal import Decimal
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
    BillingAuditLog,
    CreditNote,
    InsuranceClaim,
    InsurancePreAuthorization,
    InsuranceProvider,
    Invoice,
    InvoiceLineItem,
    PatientInsurancePolicy,
    Payment,
    PaymentAllocation,
    Refund,
    ServiceItem,
)
from .permissions import (
    FinancialReportPermission,
    InsurancePermission,
    InvoicePermission,
    PaymentPermission,
    RefundCreditPermission,
    ServiceCataloguePermission,
)
from .serializers import (
    BillingAuditLogSerializer,
    ClaimDecisionSerializer,
    ClaimPaymentSerializer,
    CreditNoteCreateSerializer,
    CreditNoteSerializer,
    InsuranceClaimSerializer,
    InsurancePreAuthorizationSerializer,
    InsuranceProviderSerializer,
    InvoiceLineItemSerializer,
    InvoiceSerializer,
    InvoiceVoidSerializer,
    PatientInsurancePolicySerializer,
    PaymentAllocationActionSerializer,
    PaymentAllocationSerializer,
    PaymentReverseActionSerializer,
    PaymentSerializer,
    PreAuthDecisionSerializer,
    RefundCreateSerializer,
    RefundSerializer,
    ServiceItemSerializer,
)
from .services import (
    allocate_payment,
    generate_financial_reports,
    issue_credit_note,
    issue_invoice,
    process_refund,
    record_claim_decision,
    record_claim_payment,
    record_payment,
    reverse_payment_allocation,
    void_invoice,
)


class StandardResultsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class ServiceItemViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Hospital Service and Tariff Catalogue.
    """

    queryset = ServiceItem.objects.select_related("hospital").all()
    serializer_class = ServiceItemSerializer
    permission_classes = [ServiceCataloguePermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["hospital", "category", "is_active"]
    search_fields = ["code", "name", "description"]
    ordering_fields = ["name", "code", "category", "unit_price", "created_at"]
    ordering = ["category", "name"]


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    API for managing Patient Invoices, line items, and lifecycle transitions.
    """

    serializer_class = InvoiceSerializer
    permission_classes = [InvoicePermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["status", "patient", "hospital", "invoice_date", "due_date"]
    search_fields = [
        "invoice_number",
        "patient__mrn",
        "patient__user__first_name",
        "patient__user__last_name",
        "notes",
    ]
    ordering_fields = ["invoice_date", "due_date", "total_amount", "balance_due", "created_at"]
    ordering = ["-invoice_date", "-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Invoice.objects.select_related(
            "patient",
            "patient__user",
            "hospital",
            "admission",
            "appointment",
            "encounter",
            "created_by",
            "issued_by",
        ).prefetch_related(
            "line_items",
            "line_items__service_item",
            "allocations",
            "allocations__payment",
        )

        if not user.is_authenticated:
            return qs.none()

        if user.role == "PATIENT":
            return qs.filter(patient__user=user).exclude(status=Invoice.Status.VOID)

        return qs

    @extend_schema(
        request=None,
        responses={200: InvoiceSerializer},
    )
    @action(detail=True, methods=["post"], url_path="issue")
    def issue(self, request, pk=None):
        invoice = self.get_object()
        try:
            issued = issue_invoice(invoice=invoice, user=request.user)
            return Response(InvoiceSerializer(issued).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=InvoiceVoidSerializer,
        responses={200: InvoiceSerializer},
    )
    @action(detail=True, methods=["post"], url_path="void")
    def void(self, request, pk=None):
        invoice = self.get_object()
        serializer = InvoiceVoidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data["reason"]

        try:
            voided = void_invoice(invoice=invoice, user=request.user, reason=reason)
            return Response(InvoiceSerializer(voided).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    @action(detail=True, methods=["get"], url_path="receipt")
    def receipt(self, request, pk=None):
        invoice = self.get_object()
        allocations_data = []
        for alloc in invoice.allocations.filter(is_reversed=False, payment__status=Payment.Status.COMPLETED):
            allocations_data.append({
                "payment_reference": alloc.payment.payment_reference,
                "payment_date": alloc.payment.payment_date,
                "payment_method": alloc.payment.get_payment_method_display(),
                "allocated_amount": str(alloc.amount),
                "external_transaction_id": alloc.payment.external_transaction_id,
            })

        receipt_payload = {
            "invoice_number": invoice.invoice_number,
            "invoice_date": invoice.invoice_date,
            "status": invoice.status,
            "hospital": {
                "name": invoice.hospital.name,
                "phone": invoice.hospital.phone,
                "email": invoice.hospital.email,
                "address": invoice.hospital.address,
            },
            "patient": {
                "mrn": invoice.patient.mrn,
                "name": invoice.patient.user.get_full_name() if invoice.patient.user else "",
                "phone": invoice.patient.user.phone if invoice.patient.user else "",
            },
            "currency": invoice.currency,
            "subtotal": str(invoice.subtotal),
            "discount": str(invoice.total_discount),
            "tax": str(invoice.total_tax),
            "total_amount": str(invoice.total_amount),
            "paid_amount": str(invoice.paid_amount),
            "balance_due": str(invoice.balance_due),
            "line_items": [
                {
                    "code": item.service_code,
                    "description": item.description,
                    "quantity": str(item.quantity),
                    "unit_price": str(item.unit_price),
                    "total": str(item.total_amount),
                }
                for item in invoice.line_items.all()
            ],
            "payments_applied": allocations_data,
        }
        return Response(receipt_payload, status=status.HTTP_200_OK)


class PaymentViewSet(viewsets.ModelViewSet):
    """
    API for recording payments, tracking allocations, and reversing allocations.
    """

    serializer_class = PaymentSerializer
    permission_classes = [PaymentPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["status", "payment_method", "patient", "hospital"]
    search_fields = [
        "payment_reference",
        "patient__mrn",
        "external_transaction_id",
        "notes",
    ]
    ordering_fields = ["payment_date", "amount", "created_at"]
    ordering = ["-payment_date", "-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related(
            "patient",
            "patient__user",
            "hospital",
            "received_by",
        ).prefetch_related(
            "allocations",
            "allocations__invoice",
        )

        if not user.is_authenticated:
            return qs.none()

        if user.role == "PATIENT":
            return qs.filter(patient__user=user)

        return qs

    @extend_schema(
        request=PaymentAllocationActionSerializer,
        responses={200: PaymentAllocationSerializer},
    )
    @action(detail=True, methods=["post"], url_path="allocate")
    def allocate(self, request, pk=None):
        payment = self.get_object()
        serializer = PaymentAllocationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invoice = get_object_or_404(Invoice, id=serializer.validated_data["invoice_id"])
        amount = serializer.validated_data["amount"]

        try:
            allocation = allocate_payment(
                payment=payment,
                invoice=invoice,
                amount=amount,
                user=request.user,
            )
            return Response(PaymentAllocationSerializer(allocation).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=PaymentReverseActionSerializer,
        responses={200: PaymentAllocationSerializer},
    )
    @action(detail=True, methods=["post"], url_path="reverse")
    def reverse(self, request, pk=None):
        payment = self.get_object()
        serializer = PaymentReverseActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        allocation = get_object_or_404(
            PaymentAllocation,
            id=serializer.validated_data["allocation_id"],
            payment=payment,
        )
        reason = serializer.validated_data["reason"]

        try:
            reversed_alloc = reverse_payment_allocation(
                allocation=allocation,
                user=request.user,
                reason=reason,
            )
            return Response(PaymentAllocationSerializer(reversed_alloc).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)


class RefundViewSet(viewsets.ModelViewSet):
    """
    API for managing patient and insurer refund requests and executions.
    """

    queryset = Refund.objects.select_related(
        "payment",
        "invoice",
        "requested_by",
        "approved_by",
    ).all()
    serializer_class = RefundSerializer
    permission_classes = [RefundCreditPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["status", "payment__hospital"]
    search_fields = ["refund_reference", "payment__payment_reference", "reason"]
    ordering = ["-created_at"]

    def create(self, request, *args, **kwargs):
        serializer = RefundCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        payment = get_object_or_404(Payment, id=data["payment_id"])
        invoice = None
        if data.get("invoice_id"):
            invoice = get_object_or_404(Invoice, id=data["invoice_id"])

        try:
            refund = process_refund(
                payment=payment,
                amount=data["amount"],
                reason=data["reason"],
                user=request.user,
                invoice=invoice,
            )
            return Response(RefundSerializer(refund).data, status=status.HTTP_201_CREATED)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=None,
        responses={200: RefundSerializer},
    )
    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        refund = self.get_object()
        if refund.status != Refund.Status.REQUESTED:
            return Response({"detail": f"Cannot approve refund in status {refund.status}."}, status=status.HTTP_400_BAD_REQUEST)

        refund.status = Refund.Status.APPROVED
        refund.approved_by = request.user
        refund.approved_at = timezone.now()
        refund.save()
        return Response(RefundSerializer(refund).data, status=status.HTTP_200_OK)

    @extend_schema(
        request=None,
        responses={200: RefundSerializer},
    )
    @action(detail=True, methods=["post"], url_path="execute")
    def execute(self, request, pk=None):
        refund = self.get_object()
        if refund.status not in [Refund.Status.REQUESTED, Refund.Status.APPROVED]:
            return Response({"detail": f"Cannot execute refund in status {refund.status}."}, status=status.HTTP_400_BAD_REQUEST)

        refund.status = Refund.Status.EXECUTED
        refund.executed_at = timezone.now()
        refund.save()
        return Response(RefundSerializer(refund).data, status=status.HTTP_200_OK)


class CreditNoteViewSet(viewsets.ModelViewSet):
    """
    API for creating and reviewing credit notes against invoices.
    """

    queryset = CreditNote.objects.select_related("invoice", "invoice__patient", "issued_by").all()
    serializer_class = CreditNoteSerializer
    permission_classes = [RefundCreditPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["invoice__hospital"]
    search_fields = ["credit_note_number", "invoice__invoice_number", "reason"]
    ordering = ["-issued_at"]

    def create(self, request, *args, **kwargs):
        serializer = CreditNoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        invoice = get_object_or_404(Invoice, id=data["invoice_id"])
        try:
            cn = issue_credit_note(
                invoice=invoice,
                amount=data["amount"],
                reason=data["reason"],
                user=request.user,
            )
            return Response(CreditNoteSerializer(cn).data, status=status.HTTP_201_CREATED)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)


class InsuranceProviderViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Insurance Companies and Third Party Administrators (TPAs).
    """

    queryset = InsuranceProvider.objects.all()
    serializer_class = InsuranceProviderSerializer
    permission_classes = [InsurancePermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["is_active"]
    search_fields = ["code", "name", "contact_person", "email", "phone"]
    ordering = ["name"]


class PatientInsurancePolicyViewSet(viewsets.ModelViewSet):
    """
    API for managing patient insurance coverage policies.
    """

    serializer_class = PatientInsurancePolicySerializer
    permission_classes = [InsurancePermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["provider", "is_verified", "is_active", "patient"]
    search_fields = ["policy_number", "patient__mrn", "plan_name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = PatientInsurancePolicy.objects.select_related("patient", "patient__user", "provider")
        if not user.is_authenticated:
            return qs.none()
        if user.role == "PATIENT":
            return qs.filter(patient__user=user)
        return qs


class InsurancePreAuthorizationViewSet(viewsets.ModelViewSet):
    """
    API for managing insurance pre-authorizations for planned procedures and admissions.
    """

    serializer_class = InsurancePreAuthorizationSerializer
    permission_classes = [InsurancePermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["status", "hospital", "patient"]
    search_fields = ["preauth_reference", "patient__mrn", "insurer_reference"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = InsurancePreAuthorization.objects.select_related("patient", "patient__user", "policy", "hospital", "admission")
        if not user.is_authenticated:
            return qs.none()
        if user.role == "PATIENT":
            return qs.filter(patient__user=user)
        return qs

    @extend_schema(
        request=PreAuthDecisionSerializer,
        responses={200: InsurancePreAuthorizationSerializer},
    )
    @action(detail=True, methods=["post"], url_path="record-decision")
    def record_decision(self, request, pk=None):
        preauth = self.get_object()
        serializer = PreAuthDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        preauth.status = data["status"]
        preauth.authorized_amount = data.get("authorized_amount", Decimal("0.00"))
        preauth.decision_date = timezone.now()
        preauth.insurer_reference = data.get("insurer_reference", "")
        preauth.denial_reason = data.get("denial_reason", "")
        preauth.save()

        return Response(InsurancePreAuthorizationSerializer(preauth).data, status=status.HTTP_200_OK)


class InsuranceClaimViewSet(viewsets.ModelViewSet):
    """
    API for Insurance Claims submission, adjudication decisions, and settlement payments.
    """

    serializer_class = InsuranceClaimSerializer
    permission_classes = [InsurancePermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["status", "hospital", "patient"]
    search_fields = ["claim_reference", "invoice__invoice_number", "patient__mrn", "insurer_reference"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = InsuranceClaim.objects.select_related(
            "patient",
            "patient__user",
            "policy",
            "hospital",
            "invoice",
            "pre_authorization",
        )
        if not user.is_authenticated:
            return qs.none()
        if user.role == "PATIENT":
            return qs.filter(patient__user=user)
        return qs

    @extend_schema(
        request=None,
        responses={200: InsuranceClaimSerializer},
    )
    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        claim = self.get_object()
        claim.status = InsuranceClaim.Status.SUBMITTED
        claim.submission_date = timezone.now()
        claim.submitted_by = request.user
        claim.save()
        return Response(InsuranceClaimSerializer(claim).data, status=status.HTTP_200_OK)

    @extend_schema(
        request=ClaimDecisionSerializer,
        responses={200: InsuranceClaimSerializer},
    )
    @action(detail=True, methods=["post"], url_path="record-decision")
    def record_decision(self, request, pk=None):
        claim = self.get_object()
        serializer = ClaimDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            updated = record_claim_decision(
                claim=claim,
                approved_amount=data["approved_amount"],
                decision_status=data["status"],
                user=request.user,
                denial_reason=data.get("denial_reason", ""),
                insurer_reference=data.get("insurer_reference", ""),
            )
            return Response(InsuranceClaimSerializer(updated).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=ClaimPaymentSerializer,
        responses={200: InsuranceClaimSerializer},
    )
    @action(detail=True, methods=["post"], url_path="record-payment")
    def record_payment(self, request, pk=None):
        claim = self.get_object()
        serializer = ClaimPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            settled = record_claim_payment(
                claim=claim,
                payment_amount=data["payment_amount"],
                user=request.user,
                external_reference=data.get("external_reference", ""),
                notes=data.get("notes", ""),
            )
            return Response(InsuranceClaimSerializer(settled).data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}, status=status.HTTP_400_BAD_REQUEST)


class FinancialSummaryReportView(APIView):
    """
    Financial reporting endpoint providing totals, collections, and claims metrics.
    """

    permission_classes = [FinancialReportPermission]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="hospital", description="Hospital ID", required=False, type=OpenApiTypes.INT),
            OpenApiParameter(name="start_date", description="Start date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
            OpenApiParameter(name="end_date", description="End date (YYYY-MM-DD)", required=False, type=OpenApiTypes.DATE),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        user = request.user
        hospital_id = request.query_params.get("hospital")

        hospital = None
        if hospital_id:
            hospital = get_object_or_404(Hospital, id=hospital_id)
        elif hasattr(user, "doctor_profile") and user.doctor_profile.hospital:
            hospital = user.doctor_profile.hospital
        else:
            hospital = Hospital.objects.first()

        if not hospital:
            return Response({"detail": "No hospital found in the system."}, status=status.HTTP_404_NOT_FOUND)

        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        summary = generate_financial_reports(hospital=hospital, start_date=start_date, end_date=end_date)
        return Response(summary, status=status.HTTP_200_OK)


class OutstandingInvoicesReportView(APIView):
    """
    List outstanding and overdue invoices with positive balance due.
    """

    permission_classes = [FinancialReportPermission]

    @extend_schema(responses={200: InvoiceSerializer(many=True)})
    def get(self, request):
        qs = Invoice.objects.filter(balance_due__gt=Decimal("0.00")).exclude(status=Invoice.Status.VOID).order_by("due_date")
        serializer = InvoiceSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CollectionsReportView(APIView):
    """
    Collections breakdown by payment method.
    """

    permission_classes = [FinancialReportPermission]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        hospital = Hospital.objects.first()
        summary = generate_financial_reports(hospital=hospital)
        return Response({
            "total_collected": summary["total_collected"],
            "net_collected": summary["net_collected"],
            "collections_by_method": summary["collections_by_method"],
        }, status=status.HTTP_200_OK)


class InsuranceReportView(APIView):
    """
    Insurance claims and pre-authorization metrics report.
    """

    permission_classes = [FinancialReportPermission]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        hospital = Hospital.objects.first()
        summary = generate_financial_reports(hospital=hospital)
        return Response(summary["claims_summary"], status=status.HTTP_200_OK)


class BillingAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for immutable Billing audit logs.
    """

    queryset = BillingAuditLog.objects.select_related("user", "patient").all()
    serializer_class = BillingAuditLogSerializer
    permission_classes = [FinancialReportPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = ["resource_type", "action", "patient"]
    search_fields = ["resource_id", "description", "patient__mrn"]
    ordering = ["-created_at"]

