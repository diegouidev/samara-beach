from django.db.models import Count
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import PapelInterno
from apps.common.permissions import IsInternalUser

from .filters import RegistroAuditoriaFilter
from .models import NivelAuditoria, RegistroAuditoria
from .serializers import RegistroAuditoriaSerializer


class SomenteAdminInterno(IsInternalUser):
    """A trilha mostra o que cada pessoa da equipe fez — só o admin vê."""

    message = "Apenas administradores consultam a auditoria."

    def has_permission(self, request, view):
        return (
            super().has_permission(request, view)
            and request.user.papel == PapelInterno.ADMIN
        )


class RegistroAuditoriaViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """
    Consulta da trilha de auditoria (somente leitura).

    Sem create/update/destroy de propósito: um registro de auditoria que pode
    ser editado ou apagado pela aplicação não serve como trilha.
    """

    queryset = RegistroAuditoria.objects.select_related("usuario")
    serializer_class = RegistroAuditoriaSerializer
    permission_classes = [SomenteAdminInterno]
    filterset_class = RegistroAuditoriaFilter
    search_fields = ["descricao", "objeto_repr", "usuario_email"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"])
    def resumo(self, request):
        """Contadores do topo da tela: hoje, críticos e pessoas ativas."""
        hoje = timezone.localdate()
        semana = hoje - timezone.timedelta(days=7)
        base = RegistroAuditoria.objects.filter(created_at__date=hoje)
        return Response(
            {
                "acoes_hoje": base.count(),
                "criticas_semana": RegistroAuditoria.objects.filter(
                    created_at__date__gte=semana, nivel=NivelAuditoria.CRITICO
                ).count(),
                "usuarios_hoje": base.exclude(usuario=None)
                .values("usuario")
                .distinct()
                .count(),
                "por_nivel": list(
                    RegistroAuditoria.objects.filter(created_at__date__gte=semana)
                    .values("nivel")
                    .annotate(total=Count("id"))
                    .order_by("nivel")
                ),
            }
        )
