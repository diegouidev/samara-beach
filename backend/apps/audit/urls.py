from rest_framework.routers import DefaultRouter

from .views import RegistroAuditoriaViewSet

router = DefaultRouter()
router.register("auditoria", RegistroAuditoriaViewSet, basename="auditoria")

urlpatterns = router.urls
