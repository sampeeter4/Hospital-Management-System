from rest_framework.routers import DefaultRouter

from .views import AppointmentViewSet, DoctorAvailabilityViewSet


router = DefaultRouter()
router.register("doctor-availability", DoctorAvailabilityViewSet, basename="doctor-availability")
router.register("appointments", AppointmentViewSet, basename="appointment")

urlpatterns = router.urls

