from drf_spectacular.utils import extend_schema
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.common.permissions import IsInternalUser

from .models import PapelInterno, TipoUsuario, User
from .serializers import (
    AlterarSenhaSerializer,
    CustomTokenObtainPairSerializer,
    DefinirSenhaSerializer,
    PerfilUpdateSerializer,
    UserSerializer,
    UsuarioInternoCreateSerializer,
    UsuarioInternoSerializer,
    UsuarioInternoUpdateSerializer,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    """
    POST /api/auth/logout/ — invalida o refresh token (blacklist).
    Body: { "refresh": "<token>" }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response(
                {"detail": "Informe o refresh token."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            RefreshToken(refresh).blacklist()
        except TokenError:
            return Response(
                {"detail": "Token inválido ou já expirado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(RetrieveUpdateAPIView):
    """
    GET   /api/auth/me/ — usuário autenticado (usado pelos dois frontends).
    PATCH /api/auth/me/ — edita o próprio nome/e-mail (aba "Meu perfil").
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return PerfilUpdateSerializer
        return UserSerializer


class AlterarSenhaView(APIView):
    """POST /api/auth/alterar-senha/ — troca a senha do usuário logado."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AlterarSenhaSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Senha alterada com sucesso."})


class SomenteAdminInterno(IsInternalUser):
    """Gestão de equipe é exclusiva do administrador."""

    message = "Apenas administradores gerenciam usuários do sistema."

    def has_permission(self, request, view):
        return (
            super().has_permission(request, view)
            and request.user.papel == PapelInterno.ADMIN
        )


class UsuarioInternoViewSet(viewsets.ModelViewSet):
    """
    CRUD da equipe interna (/api/auth/usuarios/).

    Não expõe DELETE de propósito: vendas do PDV, caixa e movimentações de
    estoque apontam para o usuário que as fez, e apagar quebraria o histórico.
    Para tirar o acesso, use `is_active=False` (ou a ação `desativar`).
    """

    permission_classes = [SomenteAdminInterno]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["email", "first_name", "last_name", "cargo", "cpf"]
    ordering_fields = ["first_name", "email", "created_at", "last_login"]
    ordering = ["first_name", "email"]
    http_method_names = ["get", "post", "patch", "put", "head", "options"]

    def get_queryset(self):
        qs = User.objects.filter(tipo=TipoUsuario.INTERNO)
        papel = self.request.query_params.get("papel")
        if papel:
            qs = qs.filter(papel=papel)
        ativo = self.request.query_params.get("ativo")
        if ativo in ("true", "false"):
            qs = qs.filter(is_active=ativo == "true")
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return UsuarioInternoCreateSerializer
        if self.action in ("update", "partial_update"):
            return UsuarioInternoUpdateSerializer
        return UsuarioInternoSerializer

    @extend_schema(request=DefinirSenhaSerializer, responses={200: dict})
    @action(detail=True, methods=["post"], url_path="definir-senha")
    def definir_senha(self, request, pk=None):
        """POST /api/auth/usuarios/{id}/definir-senha/ — reset feito pelo admin."""
        usuario = self.get_object()
        serializer = DefinirSenhaSerializer(
            data=request.data, context={"usuario": usuario}
        )
        serializer.is_valid(raise_exception=True)
        usuario.set_password(serializer.validated_data["nova_senha"])
        usuario.save(update_fields=["password", "updated_at"])
        return Response({"detail": "Senha redefinida."})

    @action(detail=True, methods=["post"])
    def desativar(self, request, pk=None):
        """Bloqueia o acesso sem apagar o histórico da pessoa."""
        usuario = self.get_object()
        if usuario.pk == request.user.pk:
            raise ValidationError("Você não pode desativar a própria conta.")
        usuario.is_active = False
        usuario.save(update_fields=["is_active", "updated_at"])
        return Response(UsuarioInternoSerializer(usuario).data)

    @action(detail=True, methods=["post"])
    def reativar(self, request, pk=None):
        usuario = self.get_object()
        usuario.is_active = True
        usuario.save(update_fields=["is_active", "updated_at"])
        return Response(UsuarioInternoSerializer(usuario).data)
