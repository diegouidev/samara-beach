from django.db import transaction
from django.db.models import F, Sum
from django.db.models.functions import Coalesce
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import PapelInterno
from apps.common.permissions import HasInternalRole

from .models import LoteProducao, MovimentacaoEstoque
from .serializers import LoteProducaoSerializer, MovimentacaoEstoqueSerializer

ESTOQUE_ROLES = [PapelInterno.ESTOQUE, PapelInterno.ADMIN]


def saldo_atual(variacao_id) -> int:
    """Saldo atual = soma de todas as movimentações da variação."""
    agg = MovimentacaoEstoque.objects.filter(variacao_id=variacao_id).aggregate(
        total=Sum("quantidade")
    )
    return agg["total"] or 0


class LoteProducaoViewSet(viewsets.ModelViewSet):
    """
    Lotes de produção própria. Restrito a estoque/admin.
    Ao criar um lote, gera automaticamente a MovimentacaoEstoque de entrada.
    """

    queryset = LoteProducao.objects.select_related("variacao")
    serializer_class = LoteProducaoSerializer
    permission_classes = [HasInternalRole]
    required_roles = ESTOQUE_ROLES
    filterset_fields = ["variacao"]
    ordering_fields = ["data_producao", "created_at"]

    @transaction.atomic
    def perform_create(self, serializer):
        lote = serializer.save()
        novo_saldo = saldo_atual(lote.variacao_id) + lote.quantidade
        MovimentacaoEstoque.objects.create(
            variacao=lote.variacao,
            tipo="entrada",
            origem="producao",
            quantidade=lote.quantidade,
            saldo_resultante=novo_saldo,
            lote_producao=lote,
            observacoes=f"Entrada automática do lote de produção {lote.id}.",
        )


class MovimentacaoEstoqueViewSet(viewsets.ModelViewSet):
    """
    Movimentações de estoque. Restrito a estoque/admin.
    O saldo_resultante é calculado no backend; não é editável.
    Sem update/delete: registros são imutáveis (use ajuste para corrigir).
    """

    queryset = MovimentacaoEstoque.objects.select_related("variacao")
    serializer_class = MovimentacaoEstoqueSerializer
    permission_classes = [HasInternalRole]
    required_roles = ESTOQUE_ROLES
    http_method_names = ["get", "post", "head", "options"]
    filterset_fields = ["variacao", "tipo", "origem"]
    ordering_fields = ["created_at"]

    @transaction.atomic
    def perform_create(self, serializer):
        variacao = serializer.validated_data["variacao"]
        quantidade = serializer.validated_data["quantidade"]
        novo_saldo = saldo_atual(variacao.id) + quantidade
        serializer.save(saldo_resultante=novo_saldo)

    @action(detail=False, methods=["get"], url_path="saldo")
    def saldo(self, request):
        """
        GET /api/movimentacoes/saldo/?variacao=<uuid>
        Retorna o saldo atual de uma variação.
        """
        variacao_id = request.query_params.get("variacao")
        if not variacao_id:
            return Response(
                {"detail": "Informe o parâmetro 'variacao'."}, status=400
            )
        return Response(
            {"variacao": variacao_id, "saldo": saldo_atual(variacao_id)}
        )

    @action(detail=False, methods=["get"], url_path="estoque-baixo")
    def estoque_baixo(self, request):
        """
        GET /api/movimentacoes/estoque-baixo/
        Lista SKUs cujo saldo atual está <= estoque_minimo.
        """
        from apps.catalog.models import VariacaoProduto

        variacoes = (
            VariacaoProduto.objects.filter(ativo=True)
            .select_related("produto")
            .annotate(saldo=Coalesce(Sum("movimentacoes__quantidade"), 0))
            .filter(saldo__lte=F("estoque_minimo"))
            .order_by("saldo")
        )
        dados = [
            {
                "variacao": str(v.id),
                "sku": v.sku,
                "produto": v.produto.nome,
                "saldo": v.saldo,
                "estoque_minimo": v.estoque_minimo,
            }
            for v in variacoes
        ]
        return Response({"count": len(dados), "results": dados})
