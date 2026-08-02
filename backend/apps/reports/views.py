from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import PapelInterno
from apps.common.permissions import HasInternalRole

from . import services
from .csv_export import csv_response
from .relatorios import COLUNAS_CSV, RELATORIOS


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


class ResultadoView(APIView):
    """
    GET /api/relatorios/resultado/?inicio=AAAA-MM-DD&fim=AAAA-MM-DD

    Receita líquida − custo dos produtos vendidos − despesas pagas.
    Restrito a admin/financeiro.
    """

    permission_classes = [HasInternalRole]
    required_roles = [PapelInterno.ADMIN, PapelInterno.FINANCEIRO]

    def get(self, request):
        inicio = _parse_data(request, "inicio")
        fim = _parse_data(request, "fim")
        return Response(services.resultado(inicio, fim))


class RelatorioView(APIView):
    """
    GET /api/relatorios/{nome}/?inicio=&fim=[&formato=csv&bloco=]

    `nome`: vendas | produtos | clientes | financeiro.
    Com `formato=csv`, exporta um bloco do relatório (ex.: `bloco=ranking`).
    """

    permission_classes = [HasInternalRole]
    required_roles = [
        PapelInterno.ADMIN,
        PapelInterno.FINANCEIRO,
        PapelInterno.ATENDIMENTO,
    ]

    @extend_schema(
        parameters=[
            OpenApiParameter("inicio", str, description="AAAA-MM-DD"),
            OpenApiParameter("fim", str, description="AAAA-MM-DD"),
            OpenApiParameter("formato", str, description="csv para baixar"),
            OpenApiParameter("bloco", str, description="bloco exportado no CSV"),
        ]
    )
    def get(self, request, nome):
        gerar = RELATORIOS.get(nome)
        if gerar is None:
            raise ValidationError({"relatorio": "Relatório desconhecido."})

        inicio = _parse_data(request, "inicio")
        fim = _parse_data(request, "fim")
        dados = gerar(inicio, fim)

        if request.query_params.get("formato") != "csv":
            return Response(dados)

        bloco = request.query_params.get("bloco", "")
        colunas = COLUNAS_CSV.get((nome, bloco))
        if colunas is None:
            raise ValidationError(
                {"bloco": f"Bloco '{bloco}' não é exportável neste relatório."}
            )

        periodo = f"{inicio or 'inicio'}_{fim or 'hoje'}"
        return csv_response(f"{nome}-{bloco}-{periodo}", colunas, dados[bloco])


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
