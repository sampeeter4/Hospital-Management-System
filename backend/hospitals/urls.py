from rest_framework.routers import DefaultRouter

from .views import (
    DepartmentViewSet,
    DoctorViewSet,
    HospitalViewSet,
    StaffViewSet,
)


router = DefaultRouter()

router.register("hospitals", HospitalViewSet, basename="hospital")
router.register("departments", DepartmentViewSet, basename="department")
router.register("doctors", DoctorViewSet, basename="doctor")
router.register("staff", StaffViewSet, basename="staff")

urlpatterns = router.urls

