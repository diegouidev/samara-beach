from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BuscaPDVView,
    DevolucaoViewSet,
    ItensDevolviveisView,
    SessaoCaixaViewSet,
    VendaPDVViewSet,
)

router = DefaultRouter()
router.register("caixa/sessoes", SessaoCaixaViewSet, basename="sessao-caixa")
router.register("pdv/vendas", VendaPDVViewSet, basename="venda-pdv")
router.register("pdv/devolucoes", DevolucaoViewSet, basename="devolucao-pdv")

urlpatterns = [
    path("pdv/buscar/", BuscaPDVView.as_view(), name="pdv-buscar"),
    path(
        "pdv/vendas/<uuid:pk>/itens-devolviveis/",
        ItensDevolviveisView.as_view(),
        name="pdv-itens-devolviveis",
    ),
] + router.urls
