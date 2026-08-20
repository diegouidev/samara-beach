from django.db.models import Count, Q, Sum
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.generics import CreateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import PapelInterno
from apps.common.permissions import HasInternalRole, LojaOnlineRequerida
from apps.orders.models import StatusPedido
from apps.suppliers.services import consultar_cep

from .models import Cliente, Endereco
from .serializers import (
    ClienteAdminSerializer,
    ClienteBalcaoSerializer,
    ClienteSerializer,
    EnderecoSerializer,
    RegistroClienteSerializer,
)


class RegistroClienteView(CreateAPIView):
    """POST /api/clientes/registro/ — cadastro público de cliente."""

    serializer_class = RegistroClienteSerializer
    permission_classes = [LojaOnlineRequerida, permissions.AllowAny]


class MeuPerfilView(APIView):
    """GET/PATCH /api/clientes/eu/ — cliente vê/edita o próprio perfil."""

    permission_classes = [LojaOnlineRequerida, permissions.IsAuthenticated]

    def _get_cliente(self, request):
        return Cliente.objects.filter(usuario=request.user).first()

    def get(self, request):
        cliente = self._get_cliente(request)
        if not cliente:
            return Response({"detail": "Perfil de cliente não encontrado."}, status=404)
        return Response(ClienteSerializer(cliente).data)

    def patch(self, request):
        cliente = self._get_cliente(request)
        if not cliente:
            return Response({"detail": "Perfil de cliente não encontrado."}, status=404)
        serializer = ClienteSerializer(cliente, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ClienteAdminViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Base de clientes no painel interno.

    Restrito a atendimento/admin: é dado pessoal, não entra em estoque/financeiro.
    O POST atende o cadastro rápido do balcão — cria o cliente sem usuário,
    só com nome e contato (ver `Cliente.usuario`, que é opcional).
    """

    permission_classes = [HasInternalRole]
    required_roles = [PapelInterno.ATENDIMENTO]
    search_fields = ["nome", "cpf", "telefone", "usuario__email"]
    ordering_fields = ["nome", "created_at"]
    ordering = ["nome"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ClienteBalcaoSerializer
        return ClienteAdminSerializer

    @extend_schema(
        parameters=[OpenApiParameter("cep", str, description="Só números ou com hífen")]
    )
    @action(detail=False, methods=["get"], url_path="consultar-cep")
    def consultar_cep(self, request):
        """
        GET /api/clientes/consultar-cep/?cep=01311000

        Preenche o endereço no cadastro. Reaproveita a integração com a
        BrasilAPI já usada na consulta de CNPJ dos fornecedores.
        """
        return Response(consultar_cep(request.query_params.get("cep", "")))

    def get_queryset(self):
        return (
            Cliente.objects.select_related("usuario")
            .prefetch_related("enderecos")
            .annotate(
                total_pedidos=Count(
                    "pedidos",
                    filter=~Q(pedidos__status=StatusPedido.CARRINHO),
                    distinct=True,
                ),
                total_gasto=Sum(
                    "pedidos__total",
                    filter=Q(
                        pedidos__status__in=[
                            StatusPedido.PAGO,
                            StatusPedido.EM_SEPARACAO,
                            StatusPedido.ENVIADO,
                            StatusPedido.ENTREGUE,
                        ]
                    ),
                ),
            )
        )


class EnderecoViewSet(viewsets.ModelViewSet):
    """CRUD de endereços do próprio cliente autenticado."""

    serializer_class = EnderecoSerializer
    permission_classes = [LojaOnlineRequerida, permissions.IsAuthenticated]

    def get_queryset(self):
        return Endereco.objects.filter(cliente__usuario=self.request.user)

    def perform_create(self, serializer):
        cliente = Cliente.objects.filter(usuario=self.request.user).first()
        if cliente is None:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Usuário não possui perfil de cliente.")
        serializer.save(cliente=cliente)
