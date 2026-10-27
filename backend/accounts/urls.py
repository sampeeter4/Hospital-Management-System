from django.urls import path

from .views import (
    change_password,
    profile,
    register,
    user_list,
)


urlpatterns = [
    path("register/", register, name="register"),
    path("profile/", profile, name="profile"),
    path("change-password/", change_password, name="change-password"),
    path("users/", user_list, name="user-list"),
]

