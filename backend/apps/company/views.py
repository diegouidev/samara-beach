from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import RetrieveAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response

from apps.accounts.models import PapelInterno
from apps.common import documentos
from apps.common.permissions import IsInternalUser

from .models import Empresa
from .serializers import (
    EmpresaPublicaSerializer,
    EmpresaSerializer,
    EmpresaUpdateSerializer,
)


class EmpresaAdminPermission(IsInternalUser):
    """Leitura para qualquer interno; escrita só para admin."""

    def has_permission(self, request, view):
        user = request.user
        eh_interno = bool(
            user and user.is_authenticated and getattr(user, "is_interno", False)
        )
        if not eh_interno:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return user.papel == PapelInterno.ADMIN


class EmpresaView(RetrieveUpdateAPIView):
    """
    GET   /api/empresa/  → dados completos (usuário interno).
    PATCH /api/empresa/  → atualiza (somente admin).
    """

    permission_classes = [EmpresaAdminPermission]

    def get_object(self):
        return Empresa.load()

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return EmpresaUpdateSerializer
        return EmpresaSerializer


class EmpresaPublicaView(RetrieveAPIView):
    """
    GET /api/empresa/publica/ → dados públicos para o rodapé da loja.

    Sem autenticação: CNPJ e razão social precisam estar visíveis ao consumidor
    (Decreto 7.962/2013).
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = EmpresaPublicaSerializer

    def get_object(self):
        return Empresa.load()


@extend_schema(
    parameters=[
        OpenApiParameter(
            "cep", str, description="CEP com ou sem máscara.", required=True,
        )
    ],
    responses=dict,
)
@api_view(["GET"])
@permission_classes([IsInternalUser])
def consultar_cep(request):
    """GET /api/empresa/consultar-cep/?cep=60000000 — preenche o endereço."""
    return Response(documentos.consultar_cep(request.query_params.get("cep", "")))


@extend_schema(
    parameters=[
        OpenApiParameter(
            "cnpj", str, description="CNPJ com ou sem máscara.", required=True,
        )
    ],
    responses=dict,
)
@api_view(["GET"])
@permission_classes([IsInternalUser])
def consultar_cnpj(request):
    """GET /api/empresa/consultar-cnpj/?cnpj=... — preenche o cadastro."""
    return Response(documentos.consultar_cnpj(request.query_params.get("cnpj", "")))
