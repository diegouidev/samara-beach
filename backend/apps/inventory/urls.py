from rest_framework.routers import DefaultRouter

from .views import LoteProducaoViewSet, MovimentacaoEstoqueViewSet

router = DefaultRouter()
router.register("lotes-producao", LoteProducaoViewSet, basename="lote-producao")
router.register("movimentacoes", MovimentacaoEstoqueViewSet, basename="movimentacao")

urlpatterns = router.urls
