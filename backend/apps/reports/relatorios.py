"""
Relatórios do painel: vendas, produtos/estoque, clientes e financeiro.

Todos seguem o mesmo contrato: recebem `inicio`/`fim` (datas) e devolvem um
dicionário com blocos de linhas prontos para a tela e para o CSV. A definição
de "venda" é a mesma do resto do sistema — `STATUS_COM_BAIXA_ESTOQUE`, em
`orders.services` — para que nenhum relatório conte diferente do outro.
"""
from decimal import Decimal

from django.db.models import (
    Case,
    Count,
    DecimalField,
    ExpressionWrapper,
    F,
    Max,
    Q,
    Sum,
    When,
)
from django.db.models.functions import Coalesce, TruncDate

from apps.catalog.models import VariacaoProduto
from apps.customers.models import Cliente
from apps.orders.models import CanalVenda, ItemPedido, Pedido, StatusPedido
from apps.payments.models import Pagamento
from apps.pos.models import Devolucao, MovimentoCaixa, SessaoCaixa
from apps.suppliers.models import ContaPagar, StatusContaPagar

from .services import _pedidos_vendidos, _range_datetime

ZERO = Decimal("0")

SUBTOTAL = ExpressionWrapper(
    F("quantidade") * F("preco_unitario"),
    output_field=DecimalField(max_digits=14, decimal_places=2),
)
CUSTO = ExpressionWrapper(
    F("quantidade") * F("variacao__custo_medio"),
    output_field=DecimalField(max_digits=14, decimal_places=2),
)


def _d(valor) -> Decimal:
    return valor if valor is not None else ZERO


# =========================================================================
# Vendas
# =========================================================================


def relatorio_vendas(inicio=None, fim=None) -> dict:
    pedidos = _pedidos_vendidos(inicio, fim)

    por_dia = [
        {
            "data": linha["dia"],
            "pedidos": linha["pedidos"],
            "total": _d(linha["total"]),
        }
        for linha in pedidos.annotate(dia=TruncDate("created_at"))
        .values("dia")
        .annotate(pedidos=Count("id"), total=Sum("total"))
        .order_by("dia")
    ]

    por_canal = [
        {
            "canal": linha["canal"],
            "pedidos": linha["pedidos"],
            "total": _d(linha["total"]),
        }
        for linha in pedidos.values("canal")
        .annotate(pedidos=Count("id"), total=Sum("total"))
        .order_by("-total")
    ]

    # Vendedor só existe na venda de balcão; o online cai em "Loja online".
    por_vendedor = [
        {
            "vendedor": linha["vendedor__email"] or "Loja online",
            "pedidos": linha["pedidos"],
            "total": _d(linha["total"]),
            "ticket_medio": (
                (_d(linha["total"]) / linha["pedidos"]).quantize(Decimal("0.01"))
                if linha["pedidos"]
                else ZERO
            ),
        }
        for linha in pedidos.values("vendedor__email")
        .annotate(pedidos=Count("id"), total=Sum("total"))
        .order_by("-total")
    ]

    por_pagamento = [
        {
            "metodo": linha["metodo"] or "não informado",
            "transacoes": linha["transacoes"],
            "total": _d(linha["total"]),
        }
        for linha in Pagamento.objects.filter(pedido__in=pedidos)
        .values("metodo")
        .annotate(transacoes=Count("id"), total=Sum("valor"))
        .order_by("-total")
    ]

    agregado = pedidos.aggregate(pedidos=Count("id"), total=Sum("total"))
    num = agregado["pedidos"] or 0
    total = _d(agregado["total"])
    itens = ItemPedido.objects.filter(pedido__in=pedidos).aggregate(
        pecas=Sum("quantidade")
    )["pecas"] or 0

    return {
        "periodo": {"inicio": inicio, "fim": fim},
        "total_pedidos": num,
        "total_vendido": total,
        "pecas_vendidas": itens,
        "ticket_medio": (
            (total / num).quantize(Decimal("0.01")) if num else ZERO
        ),
        "pecas_por_venda": (
            (Decimal(itens) / num).quantize(Decimal("0.01")) if num else ZERO
        ),
        "por_dia": por_dia,
        "por_canal": por_canal,
        "por_vendedor": por_vendedor,
        "por_pagamento": por_pagamento,
    }


# =========================================================================
# Produtos e estoque
# =========================================================================


def relatorio_produtos(inicio=None, fim=None) -> dict:
    pedidos = _pedidos_vendidos(inicio, fim)
    itens = ItemPedido.objects.filter(pedido__in=pedidos)

    vendidos = list(
        itens.values(
            "variacao__id",
            "variacao__sku",
            "variacao__produto__nome",
            "variacao__produto__tipo_origem",
        )
        .annotate(
            unidades=Sum("quantidade"),
            receita=Sum(SUBTOTAL),
            custo=Coalesce(Sum(CUSTO), ZERO),
        )
        .order_by("-receita")
    )

    receita_total = sum((linha["receita"] for linha in vendidos), ZERO)

    # Curva ABC: A é o grupo que forma os primeiros 80% da receita, B vai até
    # 95%, C é a cauda. A classificação olha o acumulado ANTES do item — assim
    # o item que cruza a faixa ainda pertence a ela (com um produto só, ele é A).
    acumulado = ZERO
    ranking = []
    for linha in vendidos:
        fatia_acumulada = (
            (acumulado / receita_total * 100) if receita_total else ZERO
        )
        acumulado += linha["receita"]
        participacao = (
            (linha["receita"] / receita_total * 100).quantize(Decimal("0.01"))
            if receita_total
            else ZERO
        )
        margem = linha["receita"] - linha["custo"]
        ranking.append(
            {
                "sku": linha["variacao__sku"],
                "produto": linha["variacao__produto__nome"],
                "tipo_origem": linha["variacao__produto__tipo_origem"],
                "unidades": linha["unidades"],
                "receita": linha["receita"],
                "custo": linha["custo"],
                "margem": margem,
                "margem_percentual": (
                    (margem / linha["receita"] * 100).quantize(Decimal("0.01"))
                    if linha["receita"]
                    else ZERO
                ),
                "participacao": participacao,
                "curva": "A" if fatia_acumulada < 80 else ("B" if fatia_acumulada < 95 else "C"),
                "custo_incompleto": linha["custo"] == 0 and linha["receita"] > 0,
            }
        )

    vendidos_ids = {linha["variacao__id"] for linha in vendidos}

    # Estoque parado: SKU ativo, com saldo, sem nenhuma venda no período.
    parados = []
    variacoes = (
        VariacaoProduto.objects.filter(ativo=True)
        .select_related("produto")
        .annotate(saldo=Coalesce(Sum("movimentacoes__quantidade"), 0))
        .filter(saldo__gt=0)
        .exclude(id__in=vendidos_ids)
        .order_by("-saldo")
    )
    valor_parado = ZERO
    for v in variacoes:
        valor = (v.custo_medio or ZERO) * v.saldo
        valor_parado += valor
        parados.append(
            {
                "sku": v.sku,
                "produto": v.produto.nome,
                "saldo": v.saldo,
                "custo_medio": v.custo_medio or ZERO,
                "valor_parado": valor,
            }
        )

    # Valor total imobilizado em estoque (todos os SKUs com saldo).
    estoque_total = ZERO
    unidades_estoque = 0
    for v in (
        VariacaoProduto.objects.filter(ativo=True)
        .annotate(saldo=Coalesce(Sum("movimentacoes__quantidade"), 0))
        .filter(saldo__gt=0)
    ):
        estoque_total += (v.custo_medio or ZERO) * v.saldo
        unidades_estoque += v.saldo

    return {
        "periodo": {"inicio": inicio, "fim": fim},
        "receita_total": receita_total,
        "skus_vendidos": len(ranking),
        "unidades_em_estoque": unidades_estoque,
        "valor_em_estoque": estoque_total,
        "valor_parado": valor_parado,
        "ranking": ranking,
        "parados": parados[:50],
    }


# =========================================================================
# Clientes
# =========================================================================


def relatorio_clientes(inicio=None, fim=None) -> dict:
    pedidos = _pedidos_vendidos(inicio, fim)
    dt_inicio, dt_fim = _range_datetime(inicio, fim)

    linhas = (
        Cliente.objects.filter(pedidos__in=pedidos)
        .annotate(
            compras=Count("pedidos", distinct=True),
            gasto=Sum("pedidos__total"),
            ultima_compra=Max("pedidos__created_at"),
        )
        .order_by("-gasto")
    )

    ranking = [
        {
            "cliente": c.nome,
            "contato": c.telefone or (c.usuario.email if c.usuario else ""),
            "compras": c.compras,
            "gasto": _d(c.gasto),
            "ticket_medio": (
                (_d(c.gasto) / c.compras).quantize(Decimal("0.01"))
                if c.compras
                else ZERO
            ),
            "ultima_compra": c.ultima_compra,
        }
        for c in linhas[:100]
    ]

    # Novo = cadastrado dentro do período; recorrente = comprou mais de uma vez.
    novos = Cliente.objects.all()
    if dt_inicio:
        novos = novos.filter(created_at__gte=dt_inicio)
    if dt_fim:
        novos = novos.filter(created_at__lte=dt_fim)

    identificados = pedidos.filter(cliente__isnull=False).count()
    anonimos = pedidos.filter(cliente__isnull=True).count()

    return {
        "periodo": {"inicio": inicio, "fim": fim},
        "clientes_compraram": linhas.count(),
        "clientes_novos": novos.count(),
        "clientes_recorrentes": sum(1 for c in linhas if c.compras > 1),
        "vendas_identificadas": identificados,
        "vendas_anonimas": anonimos,
        "ranking": ranking,
    }


# =========================================================================
# Financeiro e caixa
# =========================================================================


def relatorio_financeiro(inicio=None, fim=None) -> dict:
    dt_inicio, dt_fim = _range_datetime(inicio, fim)

    movimentos = MovimentoCaixa.objects.all()
    if dt_inicio:
        movimentos = movimentos.filter(created_at__gte=dt_inicio)
    if dt_fim:
        movimentos = movimentos.filter(created_at__lte=dt_fim)

    fluxo = [
        {
            "data": linha["dia"],
            "entradas": _d(linha["entradas"]),
            "saidas": _d(linha["saidas"]),
            "liquido": _d(linha["entradas"]) + _d(linha["saidas"]),
        }
        for linha in movimentos.annotate(dia=TruncDate("created_at"))
        .values("dia")
        .annotate(
            entradas=Sum(Case(When(valor__gt=0, then="valor"))),
            saidas=Sum(Case(When(valor__lt=0, then="valor"))),
        )
        .order_by("dia")
    ]

    sessoes = SessaoCaixa.objects.select_related("operador")
    if dt_inicio:
        sessoes = sessoes.filter(aberta_em__gte=dt_inicio)
    if dt_fim:
        sessoes = sessoes.filter(aberta_em__lte=dt_fim)

    turnos = [
        {
            "operador": s.operador.email,
            "abertura": s.aberta_em,
            "fechamento": s.fechada_em,
            "status": s.status,
            "valor_abertura": s.valor_abertura,
            "esperado": s.valor_fechamento_esperado,
            "contado": s.valor_fechamento_informado,
            "diferenca": s.diferenca,
        }
        for s in sessoes.order_by("-aberta_em")[:50]
    ]

    a_vencer = [
        {
            "conta": c.titulo,
            "categoria": c.get_categoria_display(),
            "vencimento": c.vencimento,
            "valor": c.valor,
            "situacao": c.status_efetivo,
        }
        for c in ContaPagar.objects.filter(
            status=StatusContaPagar.ABERTA
        ).order_by("vencimento")[:50]
    ]

    devolucoes = Devolucao.objects.all()
    if dt_inicio:
        devolucoes = devolucoes.filter(created_at__gte=dt_inicio)
    if dt_fim:
        devolucoes = devolucoes.filter(created_at__lte=dt_fim)

    return {
        "periodo": {"inicio": inicio, "fim": fim},
        "total_entradas": _d(
            movimentos.filter(valor__gt=0).aggregate(t=Sum("valor"))["t"]
        ),
        "total_saidas": _d(
            movimentos.filter(valor__lt=0).aggregate(t=Sum("valor"))["t"]
        ),
        "turnos_fechados": sessoes.filter(status="fechada").count(),
        "diferenca_acumulada": _d(
            sessoes.aggregate(t=Sum("diferenca"))["t"]
        ),
        "total_devolvido": _d(devolucoes.aggregate(t=Sum("valor_total"))["t"]),
        "contas_a_vencer": _d(
            ContaPagar.objects.filter(status=StatusContaPagar.ABERTA).aggregate(
                t=Sum("valor")
            )["t"]
        ),
        "fluxo": fluxo,
        "turnos": turnos,
        "a_vencer": a_vencer,
    }


#: Colunas exportadas em CSV por bloco de cada relatório.
COLUNAS_CSV = {
    ("vendas", "por_dia"): ["data", "pedidos", "total"],
    ("vendas", "por_canal"): ["canal", "pedidos", "total"],
    ("vendas", "por_vendedor"): ["vendedor", "pedidos", "total", "ticket_medio"],
    ("vendas", "por_pagamento"): ["metodo", "transacoes", "total"],
    ("produtos", "ranking"): [
        "sku", "produto", "unidades", "receita", "custo", "margem",
        "margem_percentual", "participacao", "curva",
    ],
    ("produtos", "parados"): ["sku", "produto", "saldo", "custo_medio", "valor_parado"],
    ("clientes", "ranking"): [
        "cliente", "contato", "compras", "gasto", "ticket_medio", "ultima_compra",
    ],
    ("financeiro", "fluxo"): ["data", "entradas", "saidas", "liquido"],
    ("financeiro", "turnos"): [
        "operador", "abertura", "fechamento", "status", "valor_abertura",
        "esperado", "contado", "diferenca",
    ],
    ("financeiro", "a_vencer"): ["conta", "categoria", "vencimento", "valor", "situacao"],
}

RELATORIOS = {
    "vendas": relatorio_vendas,
    "produtos": relatorio_produtos,
    "clientes": relatorio_clientes,
    "financeiro": relatorio_financeiro,
}
