"""
Consultas agregadas para o painel interno: dashboard de vendas e
relatório de margem (produção própria vs. revenda).

Vendas consideradas = pedidos em status de venda confirmada.
"""
from datetime import date, datetime, time
from decimal import Decimal

from django.db.models import (
    Count,
    DecimalField,
    ExpressionWrapper,
    F,
    Sum,
)
from django.utils import timezone

from apps.orders.models import ItemPedido, Pedido
from apps.orders.services import STATUS_COM_BAIXA_ESTOQUE

_SUBTOTAL_EXPR = ExpressionWrapper(
    F("quantidade") * F("preco_unitario"),
    output_field=DecimalField(max_digits=14, decimal_places=2),
)


def _range_datetime(inicio: date | None, fim: date | None):
    tz = timezone.get_current_timezone()
    dt_inicio = timezone.make_aware(datetime.combine(inicio, time.min), tz) if inicio else None
    dt_fim = timezone.make_aware(datetime.combine(fim, time.max), tz) if fim else None
    return dt_inicio, dt_fim


def _pedidos_vendidos(inicio=None, fim=None):
    qs = Pedido.objects.filter(status__in=STATUS_COM_BAIXA_ESTOQUE)
    dt_inicio, dt_fim = _range_datetime(inicio, fim)
    if dt_inicio:
        qs = qs.filter(created_at__gte=dt_inicio)
    if dt_fim:
        qs = qs.filter(created_at__lte=dt_fim)
    return qs


def dashboard(inicio=None, fim=None) -> dict:
    pedidos = _pedidos_vendidos(inicio, fim)
    agg = pedidos.aggregate(
        num_pedidos=Count("id"),
        faturamento=Sum("total"),
    )
    num = agg["num_pedidos"] or 0
    faturamento = agg["faturamento"] or Decimal("0")
    ticket_medio = (faturamento / num).quantize(Decimal("0.01")) if num else Decimal("0")

    mais_vendidos = (
        ItemPedido.objects.filter(pedido__in=pedidos)
        .values("variacao__sku", "variacao__produto__nome")
        .annotate(qtd=Sum("quantidade"), receita=Sum(_SUBTOTAL_EXPR))
        .order_by("-qtd")[:10]
    )

    return {
        "periodo": {"inicio": inicio, "fim": fim},
        "num_pedidos": num,
        "faturamento": faturamento,
        "ticket_medio": ticket_medio,
        "produtos_mais_vendidos": [
            {
                "sku": r["variacao__sku"],
                "produto": r["variacao__produto__nome"],
                "quantidade": r["qtd"],
                "receita": r["receita"],
            }
            for r in mais_vendidos
        ],
    }


def margem_por_produto(inicio=None, fim=None) -> list[dict]:
    """
    Margem por produto = receita − custo estimado.
    Custo estimado usa `custo_medio` da variação (produção própria e revenda
    alimentam o mesmo custo, ver escopo). Itens sem custo_medio entram com custo 0
    e são sinalizados.
    """
    pedidos = _pedidos_vendidos(inicio, fim)
    custo_expr = ExpressionWrapper(
        F("quantidade") * F("variacao__custo_medio"),
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )

    linhas = (
        ItemPedido.objects.filter(pedido__in=pedidos)
        .values(
            "variacao__produto__id",
            "variacao__produto__nome",
            "variacao__produto__tipo_origem",
        )
        .annotate(
            receita=Sum(_SUBTOTAL_EXPR),
            custo=Sum(custo_expr),
            unidades=Sum("quantidade"),
        )
        .order_by("-receita")
    )

    resultado = []
    for r in linhas:
        receita = r["receita"] or Decimal("0")
        custo = r["custo"] or Decimal("0")
        margem = receita - custo
        margem_pct = (
            (margem / receita * 100).quantize(Decimal("0.01"))
            if receita
            else Decimal("0")
        )
        resultado.append(
            {
                "produto_id": str(r["variacao__produto__id"]),
                "produto": r["variacao__produto__nome"],
                "tipo_origem": r["variacao__produto__tipo_origem"],
                "unidades": r["unidades"],
                "receita": receita,
                "custo": custo,
                "margem": margem,
                "margem_percentual": margem_pct,
                "custo_incompleto": custo == 0 and receita > 0,
            }
        )
    return resultado
