from rest_framework import permissions, status
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    AlterarSenhaSerializer,
    CustomTokenObtainPairSerializer,
    PerfilUpdateSerializer,
    UserSerializer,
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
