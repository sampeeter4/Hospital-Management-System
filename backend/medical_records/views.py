from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from patients.models import Patient
from .models import (
    ClinicalEncounter,
    ClinicalNote,
    EncounterDiagnosis,
    MedicalHistoryEntry,
    VitalSigns,
)
from .permissions import (
    ClinicalEncounterPermission,
    ClinicalNotePermission,
    EncounterDiagnosisPermission,
    MedicalHistoryPermission,
    VitalSignsPermission,
)
from .serializers import (
    AddendumCreateSerializer,
    ClinicalEncounterSerializer,
    ClinicalNoteAddendumSerializer,
    ClinicalNoteSerializer,
    EncounterDiagnosisSerializer,
    MedicalHistoryEntrySerializer,
    PatientTimelineEventSerializer,
    VitalSignsSerializer,
)
from .services import (
    add_clinical_note_addendum,
    build_patient_timeline,
    close_clinical_encounter,
    sign_clinical_note,
)


class StandardResultsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class ClinicalEncounterViewSet(viewsets.ModelViewSet):
    """
    CRUD and clinical closure lifecycle endpoints for Clinical Encounters.
    """

    queryset = ClinicalEncounter.objects.select_related(
        "patient",
        "patient__user",
        "doctor",
        "doctor__user",
        "hospital",
        "department",
        "appointment",
        "created_by",
        "closed_by",
    ).all()
    serializer_class = ClinicalEncounterSerializer
    permission_classes = [ClinicalEncounterPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = [
        "patient",
        "doctor",
        "hospital",
        "department",
        "encounter_date",
        "status",
        "encounter_type",
    ]
    search_fields = [
        "encounter_reference",
        "chief_complaint",
        "patient__mrn",
        "patient__user__first_name",
        "patient__user__last_name",
        "doctor__user__first_name",
        "doctor__user__last_name",
    ]
    ordering_fields = ["encounter_date", "start_time", "created_at"]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return ClinicalEncounter.objects.none()

        base_qs = ClinicalEncounter.objects.select_related(
            "patient",
            "patient__user",
            "doctor",
            "doctor__user",
            "hospital",
            "department",
            "appointment",
            "created_by",
            "closed_by",
        ).all()

        if user.role == "PATIENT":
            return base_qs.filter(patient__user=user)

        if user.role == "DOCTOR":
            return base_qs.filter(doctor__user=user)

        if user.role in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "NURSE", "RECEPTIONIST"]:
            return base_qs

        return ClinicalEncounter.objects.none()

    @extend_schema(
        summary="Close clinical encounter",
        description="Transitions encounter status from OPEN to CLOSED. Once closed, clinical documentation is finalized.",
        request=None,
        responses={200: ClinicalEncounterSerializer},
    )
    @action(detail=True, methods=["post"], url_path="close", url_name="close")
    def close(self, request, pk=None):
        encounter = self.get_object()
        user = request.user

        # Only assigned doctor or admins may close an encounter
        is_assigned_doc = hasattr(user, "doctor_profile") and encounter.doctor_id == user.doctor_profile.id
        if not (user.role in ["SUPER_ADMIN", "HOSPITAL_ADMIN"] or is_assigned_doc):
            return Response(
                {"detail": "You do not have permission to close this clinical encounter."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            closed = close_clinical_encounter(encounter=encounter, user=user)
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(self.get_serializer(closed).data)


class VitalSignsViewSet(viewsets.ModelViewSet):
    """
    CRUD API for patient vital signs measurements.
    """

    queryset = VitalSigns.objects.select_related(
        "encounter",
        "encounter__patient",
        "encounter__patient__user",
        "recorded_by",
    ).all()
    serializer_class = VitalSignsSerializer
    permission_classes = [VitalSignsPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = [
        "encounter",
        "encounter__patient",
        "measured_at",
    ]
    ordering_fields = ["measured_at", "created_at"]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return VitalSigns.objects.none()

        base_qs = VitalSigns.objects.select_related(
            "encounter",
            "encounter__patient",
            "encounter__patient__user",
            "recorded_by",
        ).all()

        if user.role == "PATIENT":
            return base_qs.filter(encounter__patient__user=user)

        if user.role in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE"]:
            return base_qs

        return VitalSigns.objects.none()


class EncounterDiagnosisViewSet(viewsets.ModelViewSet):
    """
    CRUD API for encounter clinical diagnoses.
    """

    queryset = EncounterDiagnosis.objects.select_related(
        "encounter",
        "encounter__patient",
        "recorded_by",
    ).all()
    serializer_class = EncounterDiagnosisSerializer
    permission_classes = [EncounterDiagnosisPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = [
        "encounter",
        "is_primary",
        "diagnosis_type",
        "clinical_status",
    ]
    search_fields = [
        "diagnosis_description",
        "diagnosis_code",
    ]
    ordering_fields = ["created_at", "is_primary"]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return EncounterDiagnosis.objects.none()

        base_qs = EncounterDiagnosis.objects.select_related(
            "encounter",
            "encounter__patient",
            "recorded_by",
        ).all()

        if user.role == "PATIENT":
            return base_qs.filter(encounter__patient__user=user)

        if user.role in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE"]:
            return base_qs

        return EncounterDiagnosis.objects.none()


class ClinicalNoteViewSet(viewsets.ModelViewSet):
    """
    CRUD, signature, and addenda workflow endpoints for Clinical Notes.
    """

    queryset = ClinicalNote.objects.select_related(
        "encounter",
        "encounter__patient",
        "author",
        "signed_by",
    ).prefetch_related("addenda", "addenda__author").all()
    serializer_class = ClinicalNoteSerializer
    permission_classes = [ClinicalNotePermission]
    pagination_class = StandardResultsPagination

    filterset_fields = [
        "encounter",
        "note_type",
        "status",
        "is_patient_visible",
        "author",
    ]
    search_fields = [
        "subjective",
        "assessment",
        "plan",
        "summary",
    ]
    ordering_fields = ["created_at", "signed_at"]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return ClinicalNote.objects.none()

        base_qs = ClinicalNote.objects.select_related(
            "encounter",
            "encounter__patient",
            "author",
            "signed_by",
        ).prefetch_related("addenda", "addenda__author").all()

        if user.role == "PATIENT":
            # Patients can only see patient-visible, signed notes for their own encounters
            return base_qs.filter(
                encounter__patient__user=user,
                is_patient_visible=True,
                status=ClinicalNote.Status.SIGNED,
            )

        if user.role in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE"]:
            return base_qs

        return ClinicalNote.objects.none()

    @extend_schema(
        summary="Sign and finalize clinical note",
        description="Signs a draft clinical note. Once signed, the note is locked and any corrections require an addendum.",
        request=None,
        responses={200: ClinicalNoteSerializer},
    )
    @action(detail=True, methods=["post"], url_path="sign", url_name="sign")
    def sign(self, request, pk=None):
        clinical_note = self.get_object()
        user = request.user

        # Only doctors or super admins may sign clinical notes
        if user.role not in ["SUPER_ADMIN", "DOCTOR"]:
            return Response(
                {"detail": "Only physicians may sign clinical notes."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            signed = sign_clinical_note(clinical_note=clinical_note, user=user)
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(self.get_serializer(signed).data)

    @extend_schema(
        summary="Add addendum to signed clinical note",
        description="Appends an official clinical addendum to a finalized note, preserving original signed narrative.",
        request=AddendumCreateSerializer,
        responses={201: ClinicalNoteAddendumSerializer},
    )
    @action(detail=True, methods=["post"], url_path="addenda", url_name="addenda")
    def addenda(self, request, pk=None):
        clinical_note = self.get_object()
        user = request.user

        if user.role not in ["SUPER_ADMIN", "DOCTOR"]:
            return Response(
                {"detail": "Only physicians may record note addenda."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AddendumCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            addendum = add_clinical_note_addendum(
                clinical_note=clinical_note,
                user=user,
                reason=serializer.validated_data["reason"],
                addendum_content=serializer.validated_data["addendum_content"],
            )
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            ClinicalNoteAddendumSerializer(addendum).data,
            status=status.HTTP_201_CREATED,
        )


class MedicalHistoryEntryViewSet(viewsets.ModelViewSet):
    """
    CRUD API for patient longitudinal medical history entries.
    """

    queryset = MedicalHistoryEntry.objects.select_related(
        "patient",
        "patient__user",
        "recorded_by",
    ).all()
    serializer_class = MedicalHistoryEntrySerializer
    permission_classes = [MedicalHistoryPermission]
    pagination_class = StandardResultsPagination

    filterset_fields = [
        "patient",
        "category",
        "status",
    ]
    search_fields = [
        "title",
        "description",
    ]
    ordering_fields = ["onset_date", "created_at"]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return MedicalHistoryEntry.objects.none()

        base_qs = MedicalHistoryEntry.objects.select_related(
            "patient",
            "patient__user",
            "recorded_by",
        ).all()

        if user.role == "PATIENT":
            return base_qs.filter(patient__user=user)

        if user.role in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE"]:
            return base_qs

        return MedicalHistoryEntry.objects.none()


class PatientTimelineView(APIView):
    """
    Retrieves a unified chronological medical timeline for a patient.
    Accessible by: Patient (for their own records), Doctor, Nurse, Admins.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Patient medical timeline",
        description="Unified chronological feed of clinical encounters, vital signs, diagnoses, notes, and medical history.",
        parameters=[
            OpenApiParameter("category", OpenApiTypes.STR, description="Filter: encounters, vitals, diagnoses, notes, history, all", required=False),
        ],
        responses={200: PatientTimelineEventSerializer(many=True)},
    )
    def get(self, request, patient_id=None):
        user = request.user

        # Support /me/ alias for authenticated patient
        if str(patient_id).lower() == "me":
            if not (user.role == "PATIENT" and hasattr(user, "patient_profile")):
                return Response(
                    {"detail": "Current user is not a registered patient."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            patient = user.patient_profile
        else:
            patient = get_object_or_404(Patient, pk=patient_id)

            # Authorization check
            if user.role == "PATIENT":
                if not (hasattr(user, "patient_profile") and patient.id == user.patient_profile.id):
                    return Response(
                        {"detail": "Patients can only access their own clinical timeline."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            elif user.role not in ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE"]:
                return Response(
                    {"detail": "You do not have permission to view patient clinical timelines."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        category = request.query_params.get("category")
        timeline = build_patient_timeline(patient=patient, user=user, category=category)
        return Response(timeline, status=status.HTTP_200_OK)

