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

from apps.orders.models import CanalVenda, ItemPedido, Pedido
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


def _totais(pedidos) -> dict:
    agg = pedidos.aggregate(num_pedidos=Count("id"), faturamento=Sum("total"))
    num = agg["num_pedidos"] or 0
    faturamento = agg["faturamento"] or Decimal("0")
    return {
        "num_pedidos": num,
        "faturamento": faturamento,
        "ticket_medio": (
            (faturamento / num).quantize(Decimal("0.01")) if num else Decimal("0")
        ),
    }


def dashboard(inicio=None, fim=None) -> dict:
    pedidos = _pedidos_vendidos(inicio, fim)
    totais = _totais(pedidos)
    num = totais["num_pedidos"]
    faturamento = totais["faturamento"]
    ticket_medio = totais["ticket_medio"]

    # Segmentação por canal: a loja física entra no mesmo funil de vendas.
    por_canal = {
        canal: _totais(pedidos.filter(canal=canal))
        for canal in (CanalVenda.ONLINE, CanalVenda.PRESENCIAL)
    }

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
        "por_canal": por_canal,
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


def resultado(inicio=None, fim=None) -> dict:
    """
    Resultado do período: receita líquida − custo dos produtos − despesas.

    - Receita líquida desconta as devoluções: a peça voltou, o dinheiro saiu.
    - Custo usa `custo_medio` da variação (mesma base do relatório de margem);
      SKUs sem custo entram como zero e ficam sinalizados.
    - Despesas são as contas **efetivamente pagas** no período (regime de caixa),
      não as lançadas — é o que a loja de fato desembolsou.
    """
    from apps.pos.models import Devolucao
    from apps.suppliers.models import ContaPagar, StatusContaPagar

    pedidos = _pedidos_vendidos(inicio, fim)
    receita_bruta = pedidos.aggregate(t=Sum("total"))["t"] or Decimal("0")

    custo_expr = ExpressionWrapper(
        F("quantidade") * F("variacao__custo_medio"),
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )
    custo = ItemPedido.objects.filter(pedido__in=pedidos).aggregate(
        t=Sum(custo_expr)
    )["t"] or Decimal("0")

    dt_inicio, dt_fim = _range_datetime(inicio, fim)
    devolucoes = Devolucao.objects.all()
    if dt_inicio:
        devolucoes = devolucoes.filter(created_at__gte=dt_inicio)
    if dt_fim:
        devolucoes = devolucoes.filter(created_at__lte=dt_fim)
    total_devolucoes = devolucoes.aggregate(t=Sum("valor_total"))["t"] or Decimal("0")

    despesas_qs = ContaPagar.objects.filter(status=StatusContaPagar.PAGA)
    if inicio:
        despesas_qs = despesas_qs.filter(pago_em__gte=inicio)
    if fim:
        despesas_qs = despesas_qs.filter(pago_em__lte=fim)
    total_despesas = despesas_qs.aggregate(t=Sum("valor"))["t"] or Decimal("0")

    receita_liquida = receita_bruta - total_devolucoes
    lucro_bruto = receita_liquida - custo

    return {
        "periodo": {"inicio": inicio, "fim": fim},
        "receita_bruta": receita_bruta,
        "devolucoes": total_devolucoes,
        "receita_liquida": receita_liquida,
        "custo_produtos": custo,
        "lucro_bruto": lucro_bruto,
        "despesas": total_despesas,
        "resultado": lucro_bruto - total_despesas,
        "margem_percentual": (
            (lucro_bruto / receita_liquida * 100).quantize(Decimal("0.01"))
            if receita_liquida
            else Decimal("0")
        ),
        "por_canal": {
            canal: _totais(pedidos.filter(canal=canal))
            for canal in (CanalVenda.ONLINE, CanalVenda.PRESENCIAL)
        },
        "despesas_por_categoria": [
            {"categoria": linha["categoria"], "total": linha["total"]}
            for linha in despesas_qs.values("categoria")
            .annotate(total=Sum("valor"))
            .order_by("-total")
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
