from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import PapelInterno
from apps.common.permissions import HasInternalRole

from . import services
from .models import (
    ContaPagar,
    Fornecedor,
    ItemPedidoCompra,
    PedidoCompraFornecedor,
    StatusContaPagar,
)
from .serializers import (
    ConsultaCNPJSerializer,
    ContaPagarSerializer,
    FornecedorSerializer,
    ItemPedidoCompraSerializer,
    PagarContaSerializer,
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
    search_fields = ["nome", "cnpj", "contato_nome", "razao_social"]
    ordering_fields = ["nome", "created_at"]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "cnpj",
                str,
                description="CNPJ com ou sem máscara.",
                required=True,
            )
        ],
        responses=ConsultaCNPJSerializer,
    )
    @action(detail=False, methods=["get"], url_path="consultar-cnpj")
    def consultar_cnpj(self, request):
        """
        GET /api/fornecedores/consultar-cnpj/?cnpj=00000000000000

        Busca os dados cadastrais na Receita (via BrasilAPI) para preencher o
        formulário. Não grava nada — quem grava é o POST/PATCH normal.
        """
        dados = services.consultar_cnpj(request.query_params.get("cnpj", ""))
        return Response(dados)


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
    """
    Contas a pagar — restrito a financeiro/admin.

    Cobre tanto a compra de mercadoria (com fornecedor) quanto as despesas da
    loja (água, luz, internet…), que não têm fornecedor cadastrado.
    """

    queryset = ContaPagar.objects.select_related("fornecedor", "pedido_compra")
    serializer_class = ContaPagarSerializer
    permission_classes = [HasInternalRole]
    required_roles = FINANCEIRO_ROLES
    filterset_fields = ["fornecedor", "status", "categoria", "recorrente"]
    search_fields = ["descricao", "fornecedor__nome"]
    ordering_fields = ["vencimento", "valor", "created_at"]

    @extend_schema(request=PagarContaSerializer, responses=ContaPagarSerializer)
    @action(detail=True, methods=["post"])
    def pagar(self, request, pk=None):
        """
        Baixa a conta. Sendo recorrente, já devolve a do mês seguinte em
        `proxima` — é o que evita redigitar as contas fixas todo mês.
        """
        entrada = PagarContaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        conta, proxima = services.marcar_paga(
            self.get_object(), entrada.validated_data.get("pago_em")
        )
        return Response(
            {
                "conta": ContaPagarSerializer(conta).data,
                "proxima": ContaPagarSerializer(proxima).data if proxima else None,
            }
        )

    @extend_schema(
        parameters=[
            OpenApiParameter("inicio", str, description="AAAA-MM-DD"),
            OpenApiParameter("fim", str, description="AAAA-MM-DD"),
        ]
    )
    @action(detail=False, methods=["get"])
    def resumo(self, request):
        """Totais de aberto/vencido/pago no período e quebra por categoria."""
        inicio = request.query_params.get("inicio")
        fim = request.query_params.get("fim")
        hoje = timezone.localdate()

        contas = self.filter_queryset(self.get_queryset())
        abertas = contas.filter(status=StatusContaPagar.ABERTA)

        pagas = contas.filter(status=StatusContaPagar.PAGA)
        if inicio:
            pagas = pagas.filter(pago_em__gte=inicio)
        if fim:
            pagas = pagas.filter(pago_em__lte=fim)

        def total(qs):
            return qs.aggregate(t=Sum("valor"))["t"] or Decimal("0")

        por_categoria = [
            {
                "categoria": linha["categoria"],
                "total": linha["total"],
            }
            for linha in pagas.values("categoria")
            .annotate(total=Sum("valor"))
            .order_by("-total")
        ]

        return Response(
            {
                "total_aberto": total(abertas),
                "total_vencido": total(abertas.filter(vencimento__lt=hoje)),
                "total_pago": total(pagas),
                "num_vencidas": abertas.filter(vencimento__lt=hoje).count(),
                "por_categoria": por_categoria,
            }
        )
