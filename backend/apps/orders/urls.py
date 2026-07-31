from rest_framework.routers import DefaultRouter

from .views import CupomViewSet, PedidoViewSet

router = DefaultRouter()
router.register("pedidos", PedidoViewSet, basename="pedido")
router.register("cupons", CupomViewSet, basename="cupom")

urlpatterns = router.urls
