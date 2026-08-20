"""Regras de negócio de pedidos: totais, cupom e baixa de estoque."""
from decimal import Decimal

from django.db import transaction
from django.db.models import DecimalField, ExpressionWrapper, F, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.audit import services as audit
from apps.audit.models import AcaoAuditoria
from apps.inventory.models import MovimentacaoEstoque
from apps.inventory.views import saldo_atual

from .models import Cupom, Pedido, StatusPedido, TipoCupom

# Status a partir dos quais o estoque já foi baixado (venda confirmada).
STATUS_COM_BAIXA_ESTOQUE = {
    StatusPedido.PAGO,
    StatusPedido.EM_SEPARACAO,
    StatusPedido.ENVIADO,
    StatusPedido.ENTREGUE,
}


def calcular_desconto(cupom: Cupom, subtotal: Decimal) -> Decimal:
    if cupom is None:
        return Decimal("0")
    if cupom.tipo == TipoCupom.PERCENTUAL:
        desconto = subtotal * (cupom.valor / Decimal("100"))
    else:
        desconto = cupom.valor
    return min(desconto, subtotal).quantize(Decimal("0.01"))


def recalcular_totais(pedido: Pedido) -> Pedido:
    """Recalcula subtotal/desconto/total do pedido a partir dos itens."""
    agg = pedido.itens.aggregate(
        subtotal=Sum(
            ExpressionWrapper(
                F("quantidade") * F("preco_unitario"),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            )
        )
    )
    subtotal = agg["subtotal"] or Decimal("0")
    # O desconto do cupom e o concedido na mão (PDV) somam, sem passar do subtotal.
    desconto_cupom = calcular_desconto(pedido.cupom, subtotal)
    desconto = min(
        desconto_cupom + (pedido.desconto_manual or Decimal("0")), subtotal
    )
    pedido.subtotal = subtotal
    pedido.desconto = desconto
    pedido.total = subtotal - desconto + (pedido.frete or Decimal("0"))
    pedido.save(update_fields=["subtotal", "desconto", "total", "updated_at"])
    return pedido


def aplicar_cupom(pedido: Pedido, codigo: str) -> Pedido:
    cupom = Cupom.objects.filter(codigo=codigo, ativo=True).first()
    if cupom is None:
        raise ValidationError({"codigo": "Cupom inválido ou inativo."})
    if cupom.validade and cupom.validade < timezone.now():
        raise ValidationError({"codigo": "Cupom expirado."})
    if cupom.uso_maximo is not None and cupom.usos >= cupom.uso_maximo:
        raise ValidationError({"codigo": "Cupom esgotado."})
    pedido.cupom = cupom
    pedido.save(update_fields=["cupom", "updated_at"])
    return recalcular_totais(pedido)


@transaction.atomic
def baixar_estoque(pedido: Pedido):
    """
    Gera MovimentacaoEstoque de saída para cada item do pedido.
    Idempotente: não baixa de novo se já houver movimentação de venda deste pedido.
    """
    ja_baixado = MovimentacaoEstoque.objects.filter(
        origem="venda", observacoes__icontains=f"pedido {pedido.id}"
    ).exists()
    if ja_baixado:
        return

    for item in pedido.itens.select_related("variacao"):
        novo_saldo = saldo_atual(item.variacao_id) - item.quantidade
        MovimentacaoEstoque.objects.create(
            variacao=item.variacao,
            tipo="saida",
            origem="venda",
            quantidade=-item.quantidade,
            saldo_resultante=novo_saldo,
            observacoes=f"Saída por venda do pedido {pedido.id}.",
        )


@transaction.atomic
def mudar_status(
    pedido: Pedido, novo_status: str, usuario=None, auditar: bool = True
) -> Pedido:
    """
    Transição de status do pedido.

    `auditar=False` é para quem já registra a operação maior que contém esta
    transição — hoje, a venda do PDV (ver pos.services.registrar_venda): ela
    nasce ENTREGUE por construção, e duas linhas na trilha para o mesmo ato
    seriam ruído.
    """
    anterior = pedido.status
    pedido.status = novo_status
    pedido.save(update_fields=["status", "updated_at"])

    entrou_em_venda = (
        anterior not in STATUS_COM_BAIXA_ESTOQUE
        and novo_status in STATUS_COM_BAIXA_ESTOQUE
    )

    # Ao entrar num status de venda confirmada, baixa o estoque (uma vez)
    # e contabiliza o uso do cupom.
    if entrou_em_venda:
        baixar_estoque(pedido)
        if pedido.cupom_id:
            Cupom.objects.filter(pk=pedido.cupom_id).update(usos=F("usos") + 1)

    if auditar:
        # Dentro da transação, e nunca no on_commit: ali o INSERT sairia numa
        # transação separada e um rollback deixaria o log órfão.
        audit.registrar(
            usuario=usuario,
            acao=AcaoAuditoria.MUDANCA_STATUS,
            objeto=pedido,
            descricao=(
                f"Pedido #{str(pedido.id)[:8]}: "
                f"{anterior} → {novo_status}."
            ),
            dados={
                "status": {"de": anterior, "para": novo_status},
                "baixou_estoque": entrou_em_venda,
                "canal": pedido.canal,
                "total": pedido.total,
            },
        )

    # E-mails transacionais (assíncronos). Import local evita ciclo de import.
    from .tasks import (
        enviar_email_confirmacao_pedido,
        enviar_email_status_pedido,
    )

    def _agendar_emails():
        if entrou_em_venda:
            enviar_email_confirmacao_pedido.delay(str(pedido.id))
        elif novo_status in (StatusPedido.ENVIADO, StatusPedido.ENTREGUE):
            enviar_email_status_pedido.delay(str(pedido.id), novo_status)

    # Só dispara após o commit da transação (evita e-mail de pedido não salvo).
    transaction.on_commit(_agendar_emails)
    return pedido
