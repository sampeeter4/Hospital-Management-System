from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Patient
from .permissions import PatientAccessPermission
from .serializers import PatientMeSerializer, PatientSerializer


class PatientPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class PatientViewSet(viewsets.ModelViewSet):
    """
    CRUD and self-service APIs for Patient records.
    Role-based permissions:
    - Admins & Receptionists: Management access.
    - Doctors & Nurses: Clinical read-only access.
    - Patients: Access restricted exclusively to their own profile.
    """

    queryset = Patient.objects.select_related("user", "hospital").all()
    serializer_class = PatientSerializer
    permission_classes = [PatientAccessPermission]
    pagination_class = PatientPagination

    filterset_fields = ["gender", "blood_group", "hospital"]
    search_fields = [
        "mrn",
        "user__first_name",
        "user__last_name",
        "user__username",
        "user__email",
        "phone",
        "emergency_contact_name",
        "emergency_contact_phone",
    ]
    ordering_fields = ["mrn", "created_at", "date_of_birth"]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Patient.objects.none()

        # If user is a patient, restrict collection to their own profile only
        if user.role == "PATIENT":
            return Patient.objects.select_related("user", "hospital").filter(user=user)

        # Authorized clinical and administrative staff see all patients
        return Patient.objects.select_related("user", "hospital").all()

    @extend_schema(
        summary="Current patient self-service profile",
        description="Retrieve or update the currently authenticated patient's profile.",
        request=PatientMeSerializer,
        responses={
            200: PatientMeSerializer,
            404: OpenApiResponse(description="Patient profile not found for this user"),
        },
    )
    @action(
        detail=False,
        methods=["get", "put", "patch"],
        permission_classes=[IsAuthenticated],
        url_path="me",
        url_name="me",
    )
    def me(self, request):
        try:
            patient = Patient.objects.select_related("user", "hospital").get(user=request.user)
        except Patient.DoesNotExist:
            return Response(
                {"detail": "No patient profile found for current user."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.method == "GET":
            serializer = PatientMeSerializer(patient)
            return Response(serializer.data)

        partial = request.method == "PATCH"
        serializer = PatientMeSerializer(patient, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
