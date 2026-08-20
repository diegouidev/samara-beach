from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import PapelInterno
from apps.common.permissions import HasInternalRole, LojaOnlineRequerida
from apps.customers.models import Cliente

from . import services
from .models import Cupom, ItemPedido, Pedido, StatusPedido
from .serializers import (
    AdicionarItemSerializer,
    AplicarCupomSerializer,
    CupomSerializer,
    MudarStatusSerializer,
    PedidoSerializer,
)

# Quem gerencia pedidos internamente (status, envio) e cupons.
ATENDIMENTO_ROLES = [PapelInterno.ATENDIMENTO, PapelInterno.ADMIN]


class CupomViewSet(viewsets.ModelViewSet):
    """Cupons — gestão interna (atendimento/admin)."""

    queryset = Cupom.objects.all()
    serializer_class = CupomSerializer
    permission_classes = [HasInternalRole]
    required_roles = ATENDIMENTO_ROLES
    filterset_fields = ["ativo", "tipo"]
    search_fields = ["codigo"]


class PedidoViewSet(viewsets.ModelViewSet):
    """
    Pedidos / carrinho.

    - Cliente: enxerga e gerencia apenas os próprios pedidos.
    - Interno (atendimento/admin): enxerga todos e pode mudar status.
    """

    serializer_class = PedidoSerializer
    permission_classes = [LojaOnlineRequerida, IsAuthenticated]
    filterset_fields = ["status", "canal"]
    search_fields = [
        "id",
        "cliente__nome",
        "cliente__usuario__email",
        "cliente__telefone",
    ]
    ordering_fields = ["created_at", "total"]

    def get_queryset(self):
        qs = (
            Pedido.objects.select_related("cliente", "cupom")
            .prefetch_related("itens__variacao__produto")
        )
        user = self.request.user
        if getattr(user, "is_interno", False):
            return qs
        return qs.filter(cliente__usuario=user)

    def _get_cliente(self):
        cliente = Cliente.objects.filter(usuario=self.request.user).first()
        if cliente is None:
            raise PermissionDenied("Usuário não possui perfil de cliente.")
        return cliente

    def perform_create(self, serializer):
        # Cria um pedido em status carrinho para o cliente logado.
        serializer.save(cliente=self._get_cliente(), status=StatusPedido.CARRINHO)

    @action(detail=False, methods=["get", "post"], url_path="carrinho")
    def carrinho(self, request):
        """
        GET  → carrinho atual do cliente (cria se não existir).
        POST → idem GET (garante que existe um carrinho).
        """
        cliente = self._get_cliente()
        pedido, _ = Pedido.objects.get_or_create(
            cliente=cliente,
            status=StatusPedido.CARRINHO,
        )
        return Response(PedidoSerializer(pedido).data)

    @action(detail=True, methods=["post"], url_path="itens")
    def adicionar_item(self, request, pk=None):
        """Adiciona (ou incrementa) um item no carrinho."""
        pedido = self.get_object()
        self._assert_editavel(pedido)

        serializer = AdicionarItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        variacao = serializer.validated_data["variacao"]
        quantidade = serializer.validated_data["quantidade"]

        item, created = ItemPedido.objects.get_or_create(
            pedido=pedido,
            variacao=variacao,
            defaults={
                "quantidade": quantidade,
                "preco_unitario": variacao.preco_vigente,
            },
        )
        if not created:
            item.quantidade += quantidade
            item.save(update_fields=["quantidade", "updated_at"])

        services.recalcular_totais(pedido)
        return Response(PedidoSerializer(pedido).data, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"itens/(?P<item_id>[^/.]+)",
    )
    def remover_item(self, request, pk=None, item_id=None):
        pedido = self.get_object()
        self._assert_editavel(pedido)
        item = get_object_or_404(ItemPedido, pk=item_id, pedido=pedido)
        item.delete()
        services.recalcular_totais(pedido)
        return Response(PedidoSerializer(pedido).data)

    @action(detail=True, methods=["post"], url_path="aplicar-cupom")
    def aplicar_cupom(self, request, pk=None):
        pedido = self.get_object()
        self._assert_editavel(pedido)
        serializer = AplicarCupomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.aplicar_cupom(pedido, serializer.validated_data["codigo"])
        return Response(PedidoSerializer(pedido).data)

    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        """
        O cliente fecha o carrinho e o pedido passa a aguardar pagamento.

        A negociação (entrega e pagamento) segue no WhatsApp da loja; o estoque
        só é baixado quando alguém do time confirmar o pagamento no painel.
        """
        pedido = self.get_object()
        if pedido.status != StatusPedido.CARRINHO:
            raise ValidationError("Este pedido já foi finalizado.")
        if not pedido.itens.exists():
            raise ValidationError("O carrinho está vazio.")

        services.recalcular_totais(pedido)
        services.mudar_status(pedido, StatusPedido.AGUARDANDO_PAGAMENTO)
        return Response(PedidoSerializer(pedido).data)

    @action(detail=True, methods=["post"], url_path="mudar-status")
    def mudar_status(self, request, pk=None):
        """Transição de status — restrito a interno (atendimento/admin)."""
        user = request.user
        is_admin_ou_atendimento = getattr(user, "is_interno", False) and (
            user.papel in ATENDIMENTO_ROLES
        )
        if not is_admin_ou_atendimento:
            raise PermissionDenied("Apenas atendimento/admin podem mudar o status.")

        pedido = self.get_object()
        serializer = MudarStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.mudar_status(pedido, serializer.validated_data["status"])
        return Response(PedidoSerializer(pedido).data)

    @staticmethod
    def _assert_editavel(pedido):
        if pedido.status != StatusPedido.CARRINHO:
            raise ValidationError(
                "Só é possível editar itens de um pedido em status 'carrinho'."
            )
