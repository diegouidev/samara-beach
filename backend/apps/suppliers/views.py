from rest_framework import viewsets

from apps.accounts.models import PapelInterno
from apps.common.permissions import HasInternalRole

from .models import (
    ContaPagar,
    Fornecedor,
    ItemPedidoCompra,
    PedidoCompraFornecedor,
)
from .serializers import (
    ContaPagarSerializer,
    FornecedorSerializer,
    ItemPedidoCompraSerializer,
    PedidoCompraFornecedorSerializer,
)

ESTOQUE_ROLES = [PapelInterno.ESTOQUE, PapelInterno.ADMIN]
FINANCEIRO_ROLES = [PapelInterno.FINANCEIRO, PapelInterno.ADMIN]


class FornecedorViewSet(viewsets.ModelViewSet):
    """Fornecedores — dados internos, sem leitura pública."""

    queryset = Fornecedor.objects.all()
    serializer_class = FornecedorSerializer
    permission_classes = [HasInternalRole]
    required_roles = ESTOQUE_ROLES + [PapelInterno.FINANCEIRO]
    filterset_fields = ["ativo"]
    search_fields = ["nome", "cnpj", "contato_nome"]
    ordering_fields = ["nome", "created_at"]


class PedidoCompraFornecedorViewSet(viewsets.ModelViewSet):
    queryset = PedidoCompraFornecedor.objects.select_related("fornecedor").prefetch_related("itens")
    serializer_class = PedidoCompraFornecedorSerializer
    permission_classes = [HasInternalRole]
    required_roles = ESTOQUE_ROLES
    filterset_fields = ["fornecedor", "status"]
    ordering_fields = ["created_at", "data_prevista", "custo_total"]


class ItemPedidoCompraViewSet(viewsets.ModelViewSet):
    queryset = ItemPedidoCompra.objects.select_related("pedido_compra", "variacao")
    serializer_class = ItemPedidoCompraSerializer
    permission_classes = [HasInternalRole]
    required_roles = ESTOQUE_ROLES
    filterset_fields = ["pedido_compra", "variacao"]


class ContaPagarViewSet(viewsets.ModelViewSet):
    """Contas a pagar — restrito a financeiro/admin."""

    queryset = ContaPagar.objects.select_related("fornecedor", "pedido_compra")
    serializer_class = ContaPagarSerializer
    permission_classes = [HasInternalRole]
    required_roles = FINANCEIRO_ROLES
    filterset_fields = ["fornecedor", "status"]
    ordering_fields = ["vencimento", "valor", "created_at"]
