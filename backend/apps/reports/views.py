from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import PapelInterno
from apps.common.permissions import HasInternalRole

from . import services


def _parse_data(request, nome):
    from django.utils.dateparse import parse_date

    valor = request.query_params.get(nome)
    if not valor:
        return None
    parsed = parse_date(valor)
    if parsed is None:
        raise ValidationError({nome: "Data inválida. Use o formato AAAA-MM-DD."})
    return parsed


class DashboardView(APIView):
    """
    GET /api/relatorios/dashboard/?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
    Vendas por período, produtos mais vendidos e ticket médio.
    Restrito a admin/financeiro/atendimento.
    """

    permission_classes = [HasInternalRole]
    required_roles = [
        PapelInterno.ADMIN,
        PapelInterno.FINANCEIRO,
        PapelInterno.ATENDIMENTO,
    ]

    def get(self, request):
        inicio = _parse_data(request, "inicio")
        fim = _parse_data(request, "fim")
        return Response(services.dashboard(inicio, fim))


class MargemView(APIView):
    """
    GET /api/relatorios/margem/?inicio=AAAA-MM-DD&fim=AAAA-MM-DD
    Margem por produto (produção própria vs. revenda).
    Restrito a admin/financeiro.
    """

    permission_classes = [HasInternalRole]
    required_roles = [PapelInterno.ADMIN, PapelInterno.FINANCEIRO]

    def get(self, request):
        inicio = _parse_data(request, "inicio")
        fim = _parse_data(request, "fim")
        return Response({"results": services.margem_por_produto(inicio, fim)})
