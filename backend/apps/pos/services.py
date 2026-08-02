"""
Regras do ponto de venda: caixa e venda de balcão.

Tudo que altera estado passa por aqui — as views só validam entrada e chamam
estes serviços (mesmo padrão de `orders.services`).
"""
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.catalog.models import VariacaoProduto
from apps.inventory.models import MovimentacaoEstoque
from apps.inventory.views import saldo_atual
from apps.orders.models import CanalVenda, ItemPedido, Pedido, StatusPedido
from apps.orders.services import mudar_status, recalcular_totais
from apps.payments.models import (
    METODOS_EM_ESPECIE,
    MetodoPagamento,
    Pagamento,
    StatusPagamento,
)

from .models import (
    Devolucao,
    ItemDevolucao,
    MovimentoCaixa,
    SessaoCaixa,
    StatusSessaoCaixa,
    TipoDevolucao,
    TipoMovimentoCaixa,
)

CENTAVO = Decimal("0.01")


def _dec(valor, campo: str) -> Decimal:
    try:
        return Decimal(str(valor)).quantize(CENTAVO)
    except Exception:
        raise ValidationError({campo: "Valor inválido."})


# =========================================================================
# Caixa
# =========================================================================


def sessao_aberta_de(operador) -> SessaoCaixa | None:
    return SessaoCaixa.objects.filter(
        operador=operador, status=StatusSessaoCaixa.ABERTA
    ).first()


@transaction.atomic
def abrir_caixa(operador, valor_abertura, observacoes: str = "") -> SessaoCaixa:
    """Abre o turno com o troco inicial. Um caixa aberto por operador."""
    if sessao_aberta_de(operador) is not None:
        raise ValidationError(
            "Você já tem um caixa aberto. Feche-o antes de abrir outro."
        )

    valor = _dec(valor_abertura, "valor_abertura")
    if valor < 0:
        raise ValidationError({"valor_abertura": "O valor não pode ser negativo."})

    sessao = SessaoCaixa.objects.create(
        operador=operador,
        valor_abertura=valor,
        observacoes_abertura=observacoes,
    )
    MovimentoCaixa.objects.create(
        sessao=sessao,
        tipo=TipoMovimentoCaixa.ABERTURA,
        metodo_pagamento=MetodoPagamento.DINHEIRO,
        valor=valor,
        usuario=operador,
        motivo="Abertura de caixa (troco inicial).",
    )
    return sessao


def _assert_aberta(sessao: SessaoCaixa):
    if not sessao.esta_aberta:
        raise ValidationError("Este caixa já foi fechado.")


def dinheiro_em_gaveta(sessao: SessaoCaixa) -> Decimal:
    """
    Espécie esperada na gaveta = soma dos movimentos em dinheiro.
    Cartão e PIX não entram: o dinheiro não está fisicamente no caixa.
    """
    total = Decimal("0")
    for mov in sessao.movimentos.all():
        if mov.metodo_pagamento in METODOS_EM_ESPECIE or not mov.metodo_pagamento:
            total += mov.valor
    return total.quantize(CENTAVO)


@transaction.atomic
def registrar_movimento_gaveta(
    sessao: SessaoCaixa, usuario, tipo: str, valor, motivo: str
) -> MovimentoCaixa:
    """Sangria (retirada) ou suprimento (reforço de troco)."""
    _assert_aberta(sessao)
    montante = _dec(valor, "valor")
    if montante <= 0:
        raise ValidationError({"valor": "Informe um valor maior que zero."})
    if not motivo.strip():
        raise ValidationError({"motivo": "Descreva o motivo do movimento."})

    if tipo == TipoMovimentoCaixa.SANGRIA:
        disponivel = dinheiro_em_gaveta(sessao)
        if montante > disponivel:
            raise ValidationError(
                {"valor": f"A gaveta tem apenas R$ {disponivel} em dinheiro."}
            )
        montante = -montante

    return MovimentoCaixa.objects.create(
        sessao=sessao,
        tipo=tipo,
        metodo_pagamento=MetodoPagamento.DINHEIRO,
        valor=montante,
        usuario=usuario,
        motivo=motivo.strip(),
    )


@transaction.atomic
def fechar_caixa(
    sessao: SessaoCaixa, valor_informado, observacoes: str = ""
) -> SessaoCaixa:
    """Confere o dinheiro contado contra o esperado e encerra o turno."""
    _assert_aberta(sessao)

    informado = _dec(valor_informado, "valor_informado")
    if informado < 0:
        raise ValidationError({"valor_informado": "O valor não pode ser negativo."})

    esperado = dinheiro_em_gaveta(sessao)
    sessao.valor_fechamento_informado = informado
    sessao.valor_fechamento_esperado = esperado
    sessao.diferenca = informado - esperado
    sessao.observacoes_fechamento = observacoes
    sessao.status = StatusSessaoCaixa.FECHADA
    sessao.fechada_em = timezone.now()
    sessao.save(
        update_fields=[
            "valor_fechamento_informado",
            "valor_fechamento_esperado",
            "diferenca",
            "observacoes_fechamento",
            "status",
            "fechada_em",
            "updated_at",
        ]
    )
    return sessao


def resumo_sessao(sessao: SessaoCaixa) -> dict:
    """Totais do turno: por forma de pagamento e por tipo de movimento."""
    movimentos = list(sessao.movimentos.select_related("pedido").all())

    por_metodo: dict[str, Decimal] = {}
    for mov in movimentos:
        if mov.tipo not in (TipoMovimentoCaixa.VENDA, TipoMovimentoCaixa.DEVOLUCAO):
            continue
        chave = mov.metodo_pagamento or "outros"
        por_metodo[chave] = por_metodo.get(chave, Decimal("0")) + mov.valor

    vendas = [m for m in movimentos if m.tipo == TipoMovimentoCaixa.VENDA]
    total_vendido = sum((m.valor for m in vendas), Decimal("0"))
    pedidos_distintos = {m.pedido_id for m in vendas if m.pedido_id}

    def soma(tipo):
        return sum(
            (m.valor for m in movimentos if m.tipo == tipo), Decimal("0")
        )

    return {
        "sessao": sessao,
        "total_vendido": total_vendido,
        "num_vendas": len(pedidos_distintos),
        "ticket_medio": (
            (total_vendido / len(pedidos_distintos)).quantize(CENTAVO)
            if pedidos_distintos
            else Decimal("0")
        ),
        "total_sangrias": soma(TipoMovimentoCaixa.SANGRIA),
        "total_suprimentos": soma(TipoMovimentoCaixa.SUPRIMENTO),
        "total_devolucoes": soma(TipoMovimentoCaixa.DEVOLUCAO),
        "dinheiro_esperado": dinheiro_em_gaveta(sessao),
        "por_metodo": {k: v.quantize(CENTAVO) for k, v in por_metodo.items()},
        "movimentos": movimentos,
    }


# =========================================================================
# Venda de balcão
# =========================================================================


@transaction.atomic
def registrar_venda(
    *,
    sessao: SessaoCaixa,
    operador,
    itens: list[dict],
    pagamentos: list[dict],
    cliente=None,
    desconto_manual=Decimal("0"),
    observacoes: str = "",
    devolucao: Devolucao | None = None,
) -> Pedido:
    """
    Cria a venda presencial inteira em uma transação: pedido, itens,
    pagamentos, baixa de estoque e movimentos de caixa.

    `itens`: [{"variacao": <uuid>, "quantidade": int, "preco_unitario": opcional}]
    `pagamentos`: [{"metodo": str, "valor": Decimal, "parcelas": int,
                    "valor_recebido": Decimal opcional}]
    `devolucao`: quando informada, é uma troca — o crédito abate o total antes
    das demais formas de pagamento.
    """
    _assert_aberta(sessao)
    if not itens:
        raise ValidationError({"itens": "Inclua ao menos um item na venda."})

    credito = _credito_disponivel(devolucao)
    if not pagamentos and not credito:
        raise ValidationError({"pagamentos": "Informe a forma de pagamento."})

    pedido = Pedido.objects.create(
        cliente=cliente,
        canal=CanalVenda.PRESENCIAL,
        vendedor=operador,
        status=StatusPedido.CARRINHO,
        desconto_manual=_dec(desconto_manual, "desconto_manual"),
    )

    for linha in itens:
        variacao = VariacaoProduto.objects.filter(pk=linha.get("variacao")).first()
        if variacao is None:
            raise ValidationError({"itens": "Variação inexistente na venda."})
        quantidade = int(linha.get("quantidade") or 0)
        if quantidade < 1:
            raise ValidationError({"itens": "Quantidade deve ser ao menos 1."})

        # Preço da venda: o informado (permite desconto no item) ou o vigente.
        preco = linha.get("preco_unitario")
        preco_unitario = (
            _dec(preco, "preco_unitario") if preco not in (None, "")
            else Decimal(str(variacao.preco_vigente))
        )
        ItemPedido.objects.create(
            pedido=pedido,
            variacao=variacao,
            quantidade=quantidade,
            preco_unitario=preco_unitario,
        )

    recalcular_totais(pedido)

    if pedido.total <= 0:
        raise ValidationError("O total da venda precisa ser maior que zero.")

    # O crédito da troca abate primeiro; o restante é que precisa ser pago.
    credito_aplicado = min(credito, pedido.total)
    a_pagar = pedido.total - credito_aplicado

    # Os pagamentos precisam cobrir o restante. Só o dinheiro pode exceder
    # (a diferença vira troco); cartão/PIX não fazem sentido com sobra.
    registros = _validar_pagamentos(pagamentos, a_pagar)

    if credito_aplicado:
        _consumir_credito(devolucao, pedido, sessao, operador, credito_aplicado)

    for reg in registros:
        pagamento = Pagamento.objects.create(
            pedido=pedido,
            metodo=reg["metodo"],
            status=StatusPagamento.APROVADO,
            valor=reg["valor"],
            parcelas=reg["parcelas"],
            valor_recebido=reg["valor_recebido"],
            troco=reg["troco"],
            gateway="pdv",
        )
        MovimentoCaixa.objects.create(
            sessao=sessao,
            tipo=TipoMovimentoCaixa.VENDA,
            metodo_pagamento=reg["metodo"],
            # Em dinheiro entra o que ficou na gaveta (recebido − troco).
            valor=reg["valor"],
            pedido=pedido,
            pagamento=pagamento,
            usuario=operador,
            motivo=observacoes or "Venda no balcão.",
        )

    # Venda de balcão nasce ENTREGUE: a cliente pagou e saiu com a peça na
    # mão — não há separação nem envio a acompanhar. Como ENTREGUE está em
    # STATUS_COM_BAIXA_ESTOQUE, o estoque é baixado do mesmo jeito.
    mudar_status(pedido, StatusPedido.ENTREGUE)
    pedido.refresh_from_db()
    return pedido


def _credito_disponivel(devolucao: Devolucao | None) -> Decimal:
    if devolucao is None:
        return Decimal("0")
    if devolucao.tipo != TipoDevolucao.TROCA:
        raise ValidationError(
            {"devolucao": "Esta devolução foi paga em dinheiro, não gera crédito."}
        )
    disponivel = Decimal(str(devolucao.credito_disponivel))
    if disponivel <= 0:
        raise ValidationError({"devolucao": "Este crédito de troca já foi usado."})
    return disponivel


def _consumir_credito(
    devolucao: Devolucao,
    pedido: Pedido,
    sessao: SessaoCaixa,
    operador,
    aplicado: Decimal,
):
    """
    Registra o crédito como pagamento da venda nova.

    O crédito não é dinheiro entrando — por isso o movimento de caixa fica com
    o método `credito_troca`, que está fora de `METODOS_EM_ESPECIE` e não mexe
    na conferência da gaveta.
    """
    pagamento = Pagamento.objects.create(
        pedido=pedido,
        metodo=MetodoPagamento.CREDITO_TROCA,
        status=StatusPagamento.APROVADO,
        valor=aplicado,
        gateway="pdv",
    )
    MovimentoCaixa.objects.create(
        sessao=sessao,
        tipo=TipoMovimentoCaixa.VENDA,
        metodo_pagamento=MetodoPagamento.CREDITO_TROCA,
        valor=aplicado,
        pedido=pedido,
        pagamento=pagamento,
        usuario=operador,
        motivo=f"Crédito da devolução {devolucao.id}.",
    )

    devolucao.credito_usado += aplicado
    devolucao.pedido_troca = pedido

    # Compra menor que a peça devolvida: a diferença volta em dinheiro.
    sobra = Decimal(str(devolucao.credito_disponivel))
    if sobra > 0:
        devolucao.credito_usado += sobra
        MovimentoCaixa.objects.create(
            sessao=sessao,
            tipo=TipoMovimentoCaixa.DEVOLUCAO,
            metodo_pagamento=MetodoPagamento.DINHEIRO,
            valor=-sobra,
            pedido=devolucao.pedido_origem,
            usuario=operador,
            motivo="Diferença da troca devolvida em dinheiro.",
        )

    devolucao.save(update_fields=["credito_usado", "pedido_troca", "updated_at"])


def _validar_pagamentos(pagamentos: list[dict], total: Decimal) -> list[dict]:
    registros = []
    somado = Decimal("0")

    for linha in pagamentos:
        metodo = linha.get("metodo")
        if metodo not in MetodoPagamento.values:
            raise ValidationError({"pagamentos": f"Forma de pagamento inválida: {metodo}."})
        if metodo == MetodoPagamento.CREDITO_TROCA:
            # O crédito de troca não é digitado como forma de pagamento comum:
            # entra pelo campo `devolucao` da venda (ver registrar_venda).
            raise ValidationError(
                {"pagamentos": "Informe o crédito de troca pelo campo 'devolucao'."}
            )

        valor = _dec(linha.get("valor"), "valor")
        if valor <= 0:
            raise ValidationError({"pagamentos": "Cada pagamento precisa ter valor."})

        parcelas = int(linha.get("parcelas") or 1)
        if parcelas < 1:
            raise ValidationError({"pagamentos": "Número de parcelas inválido."})
        if parcelas > 1 and metodo != MetodoPagamento.CREDITO:
            raise ValidationError(
                {"pagamentos": "Só crédito pode ser parcelado."}
            )

        valor_recebido, troco = None, None
        if metodo == MetodoPagamento.DINHEIRO:
            bruto = linha.get("valor_recebido")
            valor_recebido = _dec(bruto, "valor_recebido") if bruto else valor
            if valor_recebido < valor:
                raise ValidationError(
                    {"pagamentos": "O valor recebido é menor que o valor do pagamento."}
                )
            troco = valor_recebido - valor

        somado += valor
        registros.append(
            {
                "metodo": metodo,
                "valor": valor,
                "parcelas": parcelas,
                "valor_recebido": valor_recebido,
                "troco": troco,
            }
        )

    if somado < total:
        raise ValidationError(
            {"pagamentos": f"Faltam R$ {(total - somado).quantize(CENTAVO)} para fechar a venda."}
        )
    if somado > total:
        raise ValidationError(
            {
                "pagamentos": (
                    "A soma dos pagamentos passou do total. Em dinheiro, informe "
                    "o valor do pagamento e o valor recebido separadamente — o "
                    "troco é calculado."
                )
            }
        )
    return registros


@transaction.atomic
def cancelar_venda(pedido: Pedido, usuario, motivo: str, sessao=None) -> Pedido:
    """
    Cancela uma venda presencial: devolve o estoque, estorna os pagamentos e
    lança a saída no caixa.
    """
    if pedido.canal != CanalVenda.PRESENCIAL:
        raise ValidationError("Esta operação é só para vendas do balcão.")
    if pedido.status == StatusPedido.CANCELADO:
        raise ValidationError("Esta venda já foi cancelada.")
    if not motivo.strip():
        raise ValidationError({"motivo": "Descreva o motivo do cancelamento."})
    if pedido.devolucoes.exists():
        # Cancelar aqui devolveria ao estoque itens que já voltaram na devolução.
        raise ValidationError(
            "Esta venda já teve itens devolvidos. Devolva os itens restantes "
            "pela tela de trocas e devoluções."
        )

    devolver_estoque(pedido, motivo)

    pedido.status = StatusPedido.CANCELADO
    pedido.save(update_fields=["status", "updated_at"])

    pedido.pagamentos.update(status=StatusPagamento.ESTORNADO)

    # A devolução sai do caixa em que a venda foi feita; se ele já fechou,
    # sai do caixa aberto de quem está cancelando.
    destino = sessao or _sessao_para_estorno(pedido, usuario)
    if destino is not None:
        for pagamento in pedido.pagamentos.all():
            MovimentoCaixa.objects.create(
                sessao=destino,
                tipo=TipoMovimentoCaixa.DEVOLUCAO,
                metodo_pagamento=pagamento.metodo,
                valor=-pagamento.valor,
                pedido=pedido,
                pagamento=pagamento,
                usuario=usuario,
                motivo=f"Devolução: {motivo.strip()}",
            )
    return pedido


# =========================================================================
# Trocas e devoluções de item
# =========================================================================


def quantidade_devolvida(item: ItemPedido) -> int:
    """Quanto deste item já voltou em devoluções anteriores."""
    total = item.devolucoes.aggregate(t=Sum("quantidade"))["t"]
    return total or 0


@transaction.atomic
def registrar_devolucao(
    *,
    pedido: Pedido,
    itens: list[dict],
    tipo: str,
    motivo: str,
    sessao: SessaoCaixa,
    usuario,
) -> Devolucao:
    """
    Devolve itens de uma venda — parcial ou total.

    `itens`: [{"item": <uuid do ItemPedido>, "quantidade": int}]

    Devolução: o dinheiro sai da gaveta na hora.
    Troca: nada sai; o valor vira crédito para a venda seguinte.
    """
    _assert_aberta(sessao)

    if pedido.canal != CanalVenda.PRESENCIAL:
        raise ValidationError("Só vendas do balcão são devolvidas por aqui.")
    if pedido.status == StatusPedido.CANCELADO:
        raise ValidationError("Esta venda foi cancelada.")
    if tipo not in TipoDevolucao.values:
        raise ValidationError({"tipo": "Tipo de devolução inválido."})
    if not motivo.strip():
        raise ValidationError({"motivo": "Descreva o motivo da devolução."})
    if not itens:
        raise ValidationError({"itens": "Selecione ao menos um item."})

    devolucao = Devolucao.objects.create(
        pedido_origem=pedido,
        sessao=sessao,
        usuario=usuario,
        tipo=tipo,
        motivo=motivo.strip(),
    )

    total = Decimal("0")
    for linha in itens:
        item = pedido.itens.filter(pk=linha.get("item")).select_related(
            "variacao"
        ).first()
        if item is None:
            raise ValidationError({"itens": "Item não pertence a esta venda."})

        quantidade = int(linha.get("quantidade") or 0)
        if quantidade < 1:
            raise ValidationError({"itens": "Quantidade deve ser ao menos 1."})

        disponivel = item.quantidade - quantidade_devolvida(item)
        if quantidade > disponivel:
            raise ValidationError(
                {
                    "itens": (
                        f"{item.variacao.sku}: só restam {disponivel} unidade(s) "
                        "para devolver."
                    )
                }
            )

        ItemDevolucao.objects.create(
            devolucao=devolucao,
            item_pedido=item,
            quantidade=quantidade,
            valor_unitario=item.preco_unitario,
        )
        total += item.preco_unitario * quantidade

        # Repõe o estoque. O texto é diferente do usado em
        # `orders.services.baixar_estoque`, que detecta reprocessamento por
        # busca textual — se batesse, a venda deixaria de baixar estoque.
        novo_saldo = saldo_atual(item.variacao_id) + quantidade
        MovimentacaoEstoque.objects.create(
            variacao=item.variacao,
            tipo="entrada",
            origem="devolucao",
            quantidade=quantidade,
            saldo_resultante=novo_saldo,
            observacoes=(
                f"Devolução {devolucao.id} do pedido {pedido.id}. "
                f"Motivo: {motivo.strip()}"
            ),
        )

    devolucao.valor_total = total.quantize(CENTAVO)
    devolucao.save(update_fields=["valor_total", "updated_at"])

    if tipo == TipoDevolucao.DEVOLUCAO:
        # Dinheiro de volta: sai da gaveta agora.
        MovimentoCaixa.objects.create(
            sessao=sessao,
            tipo=TipoMovimentoCaixa.DEVOLUCAO,
            metodo_pagamento=MetodoPagamento.DINHEIRO,
            valor=-devolucao.valor_total,
            pedido=pedido,
            usuario=usuario,
            motivo=f"Devolução: {motivo.strip()}",
        )

    # Devolveu tudo: a venda deixa de existir para efeito de faturamento.
    if _tudo_devolvido(pedido):
        pedido.status = StatusPedido.CANCELADO
        pedido.save(update_fields=["status", "updated_at"])

    return devolucao


def _tudo_devolvido(pedido: Pedido) -> bool:
    return all(
        quantidade_devolvida(item) >= item.quantidade
        for item in pedido.itens.all()
    )


def _sessao_para_estorno(pedido: Pedido, usuario) -> SessaoCaixa | None:
    movimento = pedido.movimentos_caixa.select_related("sessao").first()
    if movimento and movimento.sessao.esta_aberta:
        return movimento.sessao
    return sessao_aberta_de(usuario)


@transaction.atomic
def devolver_estoque(pedido: Pedido, motivo: str):
    """
    Repõe o estoque dos itens do pedido.

    O texto da observação é propositalmente diferente do usado em
    `orders.services.baixar_estoque` ("Saída por venda do pedido X"), que
    detecta reprocessamento por busca textual — se batesse, uma nova venda
    do mesmo pedido deixaria de baixar estoque.
    """
    marca = f"Devolução do pedido {pedido.id}"
    if MovimentacaoEstoque.objects.filter(
        origem="devolucao", observacoes__icontains=marca
    ).exists():
        return

    for item in pedido.itens.select_related("variacao"):
        novo_saldo = saldo_atual(item.variacao_id) + item.quantidade
        MovimentacaoEstoque.objects.create(
            variacao=item.variacao,
            tipo="entrada",
            origem="devolucao",
            quantidade=item.quantidade,
            saldo_resultante=novo_saldo,
            observacoes=f"{marca}. Motivo: {motivo.strip()}",
        )
