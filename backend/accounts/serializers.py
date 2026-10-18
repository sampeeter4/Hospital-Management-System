from django.contrib.auth import get_user_model
from rest_framework import serializers


User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    password_confirm = serializers.CharField(
        write_only=True,
    )

    role = serializers.CharField(
        required=False,
        default=User.Role.PATIENT,
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password_confirm",
            "phone",
            "role",
        ]

    def validate_role(self, value):
        if value and value != User.Role.PATIENT:
            raise serializers.ValidationError(
                "Self-registration is only allowed for the PATIENT role. Staff and administrator accounts must be provisioned by an administrator."
            )
        return value or User.Role.PATIENT

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({
                "password": "Passwords do not match."
            })
        return data

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        if "role" not in validated_data or not validated_data["role"]:
            validated_data["role"] = User.Role.PATIENT
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "role",
            "is_verified",
            "date_joined",
            "last_login",
        ]
        read_only_fields = [
            "id",
            "username",
            "role",
            "is_verified",
            "date_joined",
            "last_login",
        ]


class ChangePasswordSerializer(serializers.Serializer):

    old_password = serializers.CharField(
        write_only=True,
    )

    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    new_password_confirm = serializers.CharField(
        write_only=True,
    )

    def validate(self, data):
        if data["new_password"] != data["new_password_confirm"]:
            raise serializers.ValidationError({
                "new_password": "Passwords do not match."
            })
        return data

