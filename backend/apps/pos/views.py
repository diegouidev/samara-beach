"""API do ponto de venda: caixa e venda de balcão."""
from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import PapelInterno
from apps.catalog.models import VariacaoProduto
from apps.common.permissions import HasInternalRole
from apps.customers.models import Cliente
from apps.orders.models import CanalVenda, Pedido

from . import services
from .models import Devolucao, SessaoCaixa, TipoMovimentoCaixa
from .serializers import (
    AbrirCaixaSerializer,
    CancelarVendaSerializer,
    DevolucaoSerializer,
    FecharCaixaSerializer,
    ItemDevolvivelSerializer,
    MovimentoGavetaSerializer,
    RegistrarDevolucaoSerializer,
    RegistrarVendaSerializer,
    ResumoSessaoSerializer,
    SessaoCaixaSerializer,
    VariacaoPDVSerializer,
    VendaPDVSerializer,
)

# Quem opera o balcão. `HasInternalRole` já libera admin automaticamente.
PDV_ROLES = [PapelInterno.ATENDIMENTO]


class SessaoCaixaViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """
    Caixa da loja física.

    GET  /api/caixa/sessoes/          histórico
    GET  /api/caixa/sessoes/atual/    sessão aberta do operador logado
    POST /api/caixa/sessoes/abrir/    abre o turno
    POST /api/caixa/sessoes/{id}/fechar/      conferência e fechamento
    POST /api/caixa/sessoes/{id}/sangria/     retirada de dinheiro
    POST /api/caixa/sessoes/{id}/suprimento/  reforço de troco
    GET  /api/caixa/sessoes/{id}/resumo/      extrato + totais
    """

    queryset = SessaoCaixa.objects.select_related("operador")
    serializer_class = SessaoCaixaSerializer
    permission_classes = [HasInternalRole]
    required_roles = PDV_ROLES
    filterset_fields = ["status", "operador"]
    ordering = ["-aberta_em"]

    @action(detail=False, methods=["get"])
    def atual(self, request):
        sessao = services.sessao_aberta_de(request.user)
        if sessao is None:
            return Response({"sessao": None})
        return Response(
            {
                "sessao": SessaoCaixaSerializer(sessao).data,
                "resumo": _resumo_serializado(sessao),
            }
        )

    @extend_schema(request=AbrirCaixaSerializer, responses=SessaoCaixaSerializer)
    @action(detail=False, methods=["post"])
    def abrir(self, request):
        entrada = AbrirCaixaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        sessao = services.abrir_caixa(
            request.user,
            entrada.validated_data["valor_abertura"],
            entrada.validated_data.get("observacoes", ""),
        )
        return Response(SessaoCaixaSerializer(sessao).data, status=201)

    @extend_schema(request=FecharCaixaSerializer, responses=ResumoSessaoSerializer)
    @action(detail=True, methods=["post"])
    def fechar(self, request, pk=None):
        sessao = self._sessao_do_operador(pk)
        entrada = FecharCaixaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        # O resumo é calculado antes de fechar para o recibo do turno.
        sessao = services.fechar_caixa(
            sessao,
            entrada.validated_data["valor_informado"],
            entrada.validated_data.get("observacoes", ""),
            usuario=request.user,
        )
        return Response(_resumo_serializado(sessao))

    @extend_schema(request=MovimentoGavetaSerializer)
    @action(detail=True, methods=["post"])
    def sangria(self, request, pk=None):
        return self._movimento(request, pk, TipoMovimentoCaixa.SANGRIA)

    @extend_schema(request=MovimentoGavetaSerializer)
    @action(detail=True, methods=["post"])
    def suprimento(self, request, pk=None):
        return self._movimento(request, pk, TipoMovimentoCaixa.SUPRIMENTO)

    @action(detail=True, methods=["get"])
    def resumo(self, request, pk=None):
        sessao = get_object_or_404(SessaoCaixa, pk=pk)
        return Response(_resumo_serializado(sessao))

    def _movimento(self, request, pk, tipo):
        sessao = self._sessao_do_operador(pk)
        entrada = MovimentoGavetaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        services.registrar_movimento_gaveta(
            sessao,
            request.user,
            tipo,
            entrada.validated_data["valor"],
            entrada.validated_data["motivo"],
        )
        return Response(_resumo_serializado(sessao))

    def _sessao_do_operador(self, pk) -> SessaoCaixa:
        """Só o dono do caixa (ou um admin) mexe na gaveta."""
        sessao = get_object_or_404(SessaoCaixa, pk=pk)
        usuario = self.request.user
        if sessao.operador_id != usuario.id and usuario.papel != PapelInterno.ADMIN:
            raise ValidationError("Este caixa é de outro operador.")
        return sessao


def _resumo_serializado(sessao: SessaoCaixa) -> dict:
    return ResumoSessaoSerializer(services.resumo_sessao(sessao)).data


class VendaPDVViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """
    Vendas do balcão.

    GET  /api/pdv/vendas/               vendas presenciais
    POST /api/pdv/vendas/               registra a venda (itens + pagamentos)
    POST /api/pdv/vendas/{id}/cancelar/ devolve estoque e estorna
    """

    serializer_class = VendaPDVSerializer
    permission_classes = [HasInternalRole]
    required_roles = PDV_ROLES
    ordering = ["-created_at"]

    def get_queryset(self):
        return (
            Pedido.objects.filter(canal=CanalVenda.PRESENCIAL)
            .select_related("cliente", "vendedor")
            .prefetch_related("itens__variacao__produto", "pagamentos")
        )

    @extend_schema(request=RegistrarVendaSerializer, responses=VendaPDVSerializer)
    def create(self, request):
        entrada = RegistrarVendaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        dados = entrada.validated_data

        sessao = services.sessao_aberta_de(request.user)
        if sessao is None:
            raise ValidationError(
                "Abra o caixa antes de vender — nenhuma sessão aberta para você."
            )

        cliente = None
        if dados.get("cliente"):
            cliente = get_object_or_404(Cliente, pk=dados["cliente"])

        devolucao = None
        if dados.get("devolucao"):
            devolucao = get_object_or_404(Devolucao, pk=dados["devolucao"])

        pedido = services.registrar_venda(
            sessao=sessao,
            operador=request.user,
            itens=dados["itens"],
            pagamentos=dados["pagamentos"],
            cliente=cliente,
            desconto_manual=dados.get("desconto_manual") or 0,
            observacoes=dados.get("observacoes", ""),
            devolucao=devolucao,
        )
        return Response(VendaPDVSerializer(pedido).data, status=201)

    @extend_schema(request=CancelarVendaSerializer, responses=VendaPDVSerializer)
    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        pedido = get_object_or_404(self.get_queryset(), pk=pk)
        entrada = CancelarVendaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        pedido = services.cancelar_venda(
            pedido, request.user, entrada.validated_data["motivo"]
        )
        return Response(VendaPDVSerializer(pedido).data)


class DevolucaoViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """
    Trocas e devoluções de item.

    GET  /api/pdv/devolucoes/        histórico
    POST /api/pdv/devolucoes/        devolve itens (dinheiro de volta ou crédito)
    GET  /api/pdv/devolucoes/{id}/   detalhe, com o crédito ainda disponível
    """

    serializer_class = DevolucaoSerializer
    permission_classes = [HasInternalRole]
    required_roles = PDV_ROLES
    ordering = ["-created_at"]

    def get_queryset(self):
        return Devolucao.objects.select_related(
            "pedido_origem", "usuario"
        ).prefetch_related("itens__item_pedido__variacao__produto")

    @extend_schema(request=RegistrarDevolucaoSerializer, responses=DevolucaoSerializer)
    def create(self, request):
        entrada = RegistrarDevolucaoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        dados = entrada.validated_data

        sessao = services.sessao_aberta_de(request.user)
        if sessao is None:
            raise ValidationError(
                "Abra o caixa antes de registrar uma devolução."
            )

        pedido = get_object_or_404(
            Pedido.objects.filter(canal=CanalVenda.PRESENCIAL), pk=dados["pedido"]
        )
        devolucao = services.registrar_devolucao(
            pedido=pedido,
            itens=dados["itens"],
            tipo=dados["tipo"],
            motivo=dados["motivo"],
            sessao=sessao,
            usuario=request.user,
        )
        return Response(DevolucaoSerializer(devolucao).data, status=201)


class ItensDevolviveisView(APIView):
    """
    GET /api/pdv/vendas/{id}/itens-devolviveis/

    Itens da venda com o quanto ainda pode ser devolvido — a tela precisa
    disso para não deixar devolver duas vezes a mesma peça.
    """

    permission_classes = [HasInternalRole]
    required_roles = PDV_ROLES

    @extend_schema(responses=ItemDevolvivelSerializer(many=True))
    def get(self, request, pk):
        pedido = get_object_or_404(
            Pedido.objects.filter(canal=CanalVenda.PRESENCIAL), pk=pk
        )
        dados = []
        for item in pedido.itens.select_related("variacao__produto"):
            devolvida = services.quantidade_devolvida(item)
            dados.append(
                {
                    "id": item.id,
                    "sku": item.variacao.sku,
                    "produto_nome": item.variacao.produto.nome,
                    "quantidade": item.quantidade,
                    "devolvida": devolvida,
                    "disponivel": item.quantidade - devolvida,
                    "preco_unitario": item.preco_unitario,
                }
            )
        return Response(ItemDevolvivelSerializer(dados, many=True).data)


class BuscaPDVView(APIView):
    """
    GET /api/pdv/buscar/?q=<sku ou nome>

    Busca por SKU ou nome do produto já com o saldo em estoque — o balcão
    precisa ver disponibilidade sem uma segunda chamada por item.
    """

    permission_classes = [HasInternalRole]
    required_roles = PDV_ROLES

    @extend_schema(
        parameters=[OpenApiParameter("q", str, description="SKU ou nome do produto")],
        responses=VariacaoPDVSerializer(many=True),
    )
    def get(self, request):
        termo = (request.query_params.get("q") or "").strip()

        variacoes = (
            VariacaoProduto.objects.filter(ativo=True, produto__ativo=True)
            .select_related("produto")
            .prefetch_related("imagens")
            .annotate(saldo=Coalesce(Sum("movimentacoes__quantidade"), 0))
        )
        if termo:
            variacoes = variacoes.filter(
                Q(sku__icontains=termo)
                | Q(produto__nome__icontains=termo)
                | Q(cor__icontains=termo)
            )
        variacoes = variacoes.order_by("produto__nome", "tamanho")[:40]

        resultados = []
        for v in variacoes:
            imagem = next(
                (
                    i.imagem.url if i.imagem else i.url_externa
                    for i in sorted(v.imagens.all(), key=lambda i: i.ordem)
                    if i.imagem or i.url_externa
                ),
                None,
            )
            resultados.append(
                {
                    "id": v.id,
                    "sku": v.sku,
                    "produto": v.produto.nome,
                    "cor": v.cor,
                    "tamanho": v.tamanho,
                    "preco": v.preco_vigente,
                    "saldo": v.saldo,
                    "imagem": imagem,
                }
            )
        return Response(VariacaoPDVSerializer(resultados, many=True).data)
