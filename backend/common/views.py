from django.db import connection
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@extend_schema(
    summary="API Health Check",
    description="Check if the Hospital Management System API and database are running and operational.",
    responses={
        200: OpenApiResponse(
            description="API and database are active and operational",
            response={
                "type": "object",
                "properties": {
                    "status": {"type": "string", "example": "success"},
                    "message": {"type": "string", "example": "Hospital Management System API is running"},
                    "version": {"type": "string", "example": "1.0"},
                    "services": {"type": "object"},
                },
            },
        ),
        503: OpenApiResponse(description="Service Unavailable — Database connection error"),
    },
)
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    db_status = "healthy"
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        db_status = "unhealthy"

    payload = {
        "status": "success" if db_status == "healthy" else "unhealthy",
        "message": "Hospital Management System API is running" if db_status == "healthy" else "Hospital Management System API service degraded",
        "version": "1.0",
        "services": {
            "database": db_status,
        },
    }

    if db_status != "healthy":
        return Response(payload, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response(payload, status=status.HTTP_200_OK)

