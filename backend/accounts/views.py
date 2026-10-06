from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from rest_framework.response import Response

from .serializers import (
    ChangePasswordSerializer,
    RegisterSerializer,
    UserProfileSerializer,
)


@extend_schema(
    summary="Register a new user",
    description="Registers a new user (patient, staff, etc.) with encrypted password.",
    request=RegisterSerializer,
    responses={
        201: OpenApiResponse(
            description="User registered successfully",
            response={
                "type": "object",
                "properties": {
                    "message": {"type": "string"},
                    "user": {"type": "object"},
                },
            },
        ),
        400: OpenApiResponse(description="Validation error"),
    },
)
@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(
            {
                "message": "User registered successfully.",
                "user": UserProfileSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@extend_schema(
    summary="Get or update user profile",
    description="Retrieve or update the currently authenticated user's profile.",
    request=UserProfileSerializer,
    responses={
        200: UserProfileSerializer,
        400: OpenApiResponse(description="Validation error"),
        401: OpenApiResponse(description="Authentication credentials were not provided"),
    },
)
@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user

    if request.method == "GET":
        serializer = UserProfileSerializer(user)
        return Response(serializer.data)

    serializer = UserProfileSerializer(
        user,
        data=request.data,
        partial=True,
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@extend_schema(
    summary="Change user password",
    description="Allows an authenticated user to change their password.",
    request=ChangePasswordSerializer,
    responses={
        200: OpenApiResponse(
            description="Password changed successfully",
            response={
                "type": "object",
                "properties": {
                    "message": {"type": "string"},
                },
            },
        ),
        400: OpenApiResponse(description="Validation error"),
        401: OpenApiResponse(description="Authentication credentials were not provided"),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"old_password": ["Current password is incorrect."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response(
            {"message": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )
