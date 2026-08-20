"""
Reserva de estoque para pedidos online aguardando pagamento.

Por que existe: o estoque só baixa quando alguém confirma o pagamento no
painel. Entre o cliente finalizar e essa confirmação acontecer, a mesma peça
podia ser vendida de novo — no balcão ou para outro cliente. Com peça única
de moda praia, isso não é hipótese.

Como funciona: ao finalizar o pedido, a quantidade fica *reservada* (não sai
do estoque, mas deixa de estar disponível). A reserva morre sozinha depois de
`RESERVA_HORAS` sem pagamento, ou quando o pedido é pago (vira baixa real) ou
cancelado.

A reserva não é uma MovimentacaoEstoque: o saldo físico não mudou, e misturar
as duas coisas quebraria a conferência do estoque e a auditoria.
"""
from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.inventory.views import saldo_atual

from .models import ItemPedido, ReservaEstoque, StatusPedido


def horas_de_reserva() -> int:
    return getattr(settings, "RESERVA_ESTOQUE_HORAS", 24)


def quantidade_reservada(variacao_id, ignorando_pedido=None) -> int:
    """
    Quanto desta variação está preso em reservas ainda válidas.

    `ignorando_pedido` exclui as reservas do próprio pedido — sem isso, ao
    revalidar um pedido ele competiria com a própria reserva.
    """
    qs = ReservaEstoque.objects.filter(
        variacao_id=variacao_id, expira_em__gt=timezone.now()
    )
    if ignorando_pedido is not None:
        qs = qs.exclude(pedido_id=ignorando_pedido)
    return qs.aggregate(total=Sum("quantidade"))["total"] or 0


def disponivel(variacao_id, ignorando_pedido=None) -> int:
    """Saldo físico menos o que já está reservado — o que dá para vender."""
    return saldo_atual(variacao_id) - quantidade_reservada(
        variacao_id, ignorando_pedido
    )


@transaction.atomic
def reservar_itens(pedido):
    """
    Reserva o estoque de todos os itens do pedido.

    Levanta ValidationError se algum item não couber no disponível — assim o
    cliente descobre na finalização, e não depois de já ter combinado tudo
    pelo WhatsApp.
    """
    # Um pedido revalidado começa do zero: as reservas antigas dele saem.
    ReservaEstoque.objects.filter(pedido=pedido).delete()

    expira_em = timezone.now() + timezone.timedelta(hours=horas_de_reserva())
    itens = pedido.itens.select_related("variacao__produto")

    faltantes = []
    for item in itens:
        livre = disponivel(item.variacao_id, ignorando_pedido=pedido.id)
        if item.quantidade > livre:
            faltantes.append(
                f"{item.variacao.produto.nome} "
                f"({item.variacao.sku}): {livre} disponível(is)"
            )

    if faltantes:
        raise ValidationError(
            {
                "itens": (
                    "Estoque insuficiente para: " + "; ".join(faltantes) + "."
                )
            }
        )

    ReservaEstoque.objects.bulk_create(
        [
            ReservaEstoque(
                pedido=pedido,
                variacao=item.variacao,
                quantidade=item.quantidade,
                expira_em=expira_em,
            )
            for item in itens
        ]
    )


def liberar_reservas(pedido):
    """
    Solta as reservas do pedido.

    Chamado quando o pedido é pago (o estoque saiu de verdade, a reserva não
    faz mais sentido) ou cancelado (a peça volta a ser vendável).
    """
    ReservaEstoque.objects.filter(pedido=pedido).delete()


def expurgar_reservas_vencidas() -> int:
    """
    Remove as reservas que passaram do prazo.

    As consultas já ignoram reservas vencidas (`expira_em__gt=now`), então
    isto é só higiene de tabela — não muda o comportamento.
    """
    apagadas, _ = ReservaEstoque.objects.filter(
        expira_em__lte=timezone.now()
    ).delete()
    return apagadas
