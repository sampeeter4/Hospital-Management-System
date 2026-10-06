from django.urls import path

from .views import (
    change_password,
    profile,
    register,
)


urlpatterns = [
    path("register/", register, name="register"),
    path("profile/", profile, name="profile"),
    path("change-password/", change_password, name="change-password"),
]
