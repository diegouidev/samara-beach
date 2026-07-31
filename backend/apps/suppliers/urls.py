from rest_framework.routers import DefaultRouter

from .views import (
    ContaPagarViewSet,
    FornecedorViewSet,
    ItemPedidoCompraViewSet,
    PedidoCompraFornecedorViewSet,
)

router = DefaultRouter()
router.register("fornecedores", FornecedorViewSet, basename="fornecedor")
router.register("pedidos-compra", PedidoCompraFornecedorViewSet, basename="pedido-compra")
router.register("itens-compra", ItemPedidoCompraViewSet, basename="item-compra")
router.register("contas-pagar", ContaPagarViewSet, basename="conta-pagar")

urlpatterns = router.urls
