from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@extend_schema(
    summary="API Health Check",
    description="Check if the Hospital Management System API is running.",
    responses={
        200: OpenApiResponse(
            description="API is active and operational",
            response={
                "type": "object",
                "properties": {
                    "status": {"type": "string", "example": "success"},
                    "message": {"type": "string", "example": "Hospital Management System API is running"},
                    "version": {"type": "string", "example": "1.0"},
                },
            },
        )
    },
)
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        "status": "success",
        "message": "Hospital Management System API is running",
        "version": "1.0"
    })
