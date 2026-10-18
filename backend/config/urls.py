from django.contrib import admin
from django.urls import include, path

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


urlpatterns = [
    path("admin/", admin.site.urls),

    # Accounts & Authentication
    path("api/v1/accounts/", include("accounts.urls")),
    path(
        "api/v1/accounts/login/",
        TokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),
    path(
        "api/v1/accounts/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),

    # Hospitals & Organization Structure
    path("api/v1/", include("hospitals.urls")),

    # Patients Management
    path("api/v1/", include("patients.urls")),

    # Appointments & Scheduling
    path("api/v1/", include("appointments.urls")),

    # Medical Records & Clinical Management
    path("api/v1/medical-records/", include("medical_records.urls")),

    # Prescriptions & Pharmacy Management
    path("api/v1/pharmacy/", include("pharmacy.urls")),

    # Laboratory & Diagnostics Management
    path("api/v1/laboratory/", include("laboratory.urls")),

    # Hospital Admissions, Beds & Wards Management
    path("api/v1/inpatient/", include("inpatient.urls")),

    # Billing, Payments & Insurance Management
    path("api/v1/billing/", include("billing.urls")),

    # Common & Health Check
    path("api/v1/", include("common.urls")),

    # API Documentation (Swagger / OpenAPI)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]
