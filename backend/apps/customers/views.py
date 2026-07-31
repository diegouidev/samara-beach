from rest_framework import mixins, permissions, status, viewsets
from rest_framework.generics import CreateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Cliente, Endereco
from .serializers import (
    ClienteSerializer,
    EnderecoSerializer,
    RegistroClienteSerializer,
)


class RegistroClienteView(CreateAPIView):
    """POST /api/clientes/registro/ — cadastro público de cliente."""

    serializer_class = RegistroClienteSerializer
    permission_classes = [permissions.AllowAny]


class MeuPerfilView(APIView):
    """GET/PATCH /api/clientes/eu/ — cliente vê/edita o próprio perfil."""

    permission_classes = [permissions.IsAuthenticated]

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


class EnderecoViewSet(viewsets.ModelViewSet):
    """CRUD de endereços do próprio cliente autenticado."""

    serializer_class = EnderecoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Endereco.objects.filter(cliente__usuario=self.request.user)

    def perform_create(self, serializer):
        cliente = Cliente.objects.filter(usuario=self.request.user).first()
        if cliente is None:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Usuário não possui perfil de cliente.")
        serializer.save(cliente=cliente)
