from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):

    list_display = (
        "username",
        "email",
        "role",
        "is_verified",
        "is_active",
    )

    list_filter = (
        "role",
        "is_verified",
        "is_active",
    )

    search_fields = (
        "username",
        "email",
        "phone",
    )

    fieldsets = UserAdmin.fieldsets + (
        ("Hospital Profile", {"fields": ("phone", "role", "is_verified")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Hospital Profile", {"fields": ("email", "phone", "role", "is_verified")}),
    )
