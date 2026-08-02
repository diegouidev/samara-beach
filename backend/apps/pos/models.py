"""
Ponto de venda (loja física): sessão de caixa e movimentos da gaveta.

A venda em si continua sendo um `orders.Pedido` (com `canal=presencial`) —
aqui fica só o que é específico do balcão: quem abriu o caixa, quanto tinha
de troco, o que entrou e saiu no turno e a conferência do fechamento.

Dependência em uma direção só: `pos` conhece `orders`/`payments`, nunca o
contrário. Por isso o vínculo venda↔caixa mora em `MovimentoCaixa.pedido`.
"""
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel


class StatusSessaoCaixa(models.TextChoices):
    ABERTA = "aberta", _("Aberta")
    FECHADA = "fechada", _("Fechada")


class SessaoCaixa(BaseModel):
    """Um turno de caixa: da abertura com o troco inicial até a conferência."""

    operador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="sessoes_caixa",
    )
    status = models.CharField(
        max_length=10,
        choices=StatusSessaoCaixa.choices,
        default=StatusSessaoCaixa.ABERTA,
        db_index=True,
    )
    aberta_em = models.DateTimeField(auto_now_add=True)
    fechada_em = models.DateTimeField(null=True, blank=True)

    valor_abertura = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text=_("Troco inicial deixado na gaveta."),
    )
    # Preenchidos no fechamento.
    valor_fechamento_informado = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text=_("Dinheiro contado na gaveta ao fechar."),
    )
    valor_fechamento_esperado = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text=_("Quanto o sistema calculou que deveria haver em espécie."),
    )
    diferenca = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text=_("Informado − esperado: positivo é sobra, negativo é falta."),
    )

    observacoes_abertura = models.TextField(blank=True)
    observacoes_fechamento = models.TextField(blank=True)

    class Meta:
        verbose_name = _("sessão de caixa")
        verbose_name_plural = _("sessões de caixa")
        ordering = ["-aberta_em"]
        constraints = [
            # Trava no banco, não só na aplicação: um operador nunca tem
            # dois caixas abertos ao mesmo tempo.
            models.UniqueConstraint(
                fields=["operador"],
                condition=Q(status="aberta"),
                name="uma_sessao_aberta_por_operador",
            )
        ]

    def __str__(self):
        return f"Caixa de {self.operador} — {self.get_status_display()}"

    @property
    def esta_aberta(self) -> bool:
        return self.status == StatusSessaoCaixa.ABERTA


class TipoMovimentoCaixa(models.TextChoices):
    ABERTURA = "abertura", _("Abertura")
    VENDA = "venda", _("Venda")
    SANGRIA = "sangria", _("Sangria")
    SUPRIMENTO = "suprimento", _("Suprimento")
    DEVOLUCAO = "devolucao", _("Devolução")


class TipoDevolucao(models.TextChoices):
    DEVOLUCAO = "devolucao", _("Devolução (dinheiro de volta)")
    TROCA = "troca", _("Troca por outro produto")


class Devolucao(BaseModel):
    """
    Devolução de itens de uma venda — parcial ou total.

    Na **devolução** o dinheiro sai da gaveta na hora. Na **troca** nada sai:
    o valor vira crédito, consumido como forma de pagamento na venda nova
    (`payments.MetodoPagamento.CREDITO_TROCA`).
    """

    pedido_origem = models.ForeignKey(
        "orders.Pedido",
        on_delete=models.PROTECT,
        related_name="devolucoes",
    )
    sessao = models.ForeignKey(
        SessaoCaixa,
        on_delete=models.PROTECT,
        related_name="devolucoes",
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="devolucoes",
    )
    tipo = models.CharField(max_length=10, choices=TipoDevolucao.choices)
    motivo = models.CharField(max_length=200)
    valor_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Quanto do crédito já foi usado (só faz sentido em troca).
    credito_usado = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    pedido_troca = models.ForeignKey(
        "orders.Pedido",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="devolucoes_consumidas",
    )

    class Meta:
        verbose_name = _("devolução")
        verbose_name_plural = _("devoluções")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_tipo_display()} R$ {self.valor_total}"

    @property
    def credito_disponivel(self):
        """Crédito ainda utilizável (zero fora da troca)."""
        if self.tipo != TipoDevolucao.TROCA:
            return 0
        return self.valor_total - self.credito_usado


class ItemDevolucao(BaseModel):
    devolucao = models.ForeignKey(
        Devolucao,
        on_delete=models.CASCADE,
        related_name="itens",
    )
    item_pedido = models.ForeignKey(
        "orders.ItemPedido",
        on_delete=models.PROTECT,
        related_name="devolucoes",
    )
    quantidade = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    valor_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = _("item devolvido")
        verbose_name_plural = _("itens devolvidos")

    def __str__(self):
        return f"{self.quantidade}x {self.item_pedido.variacao.sku}"

    @property
    def subtotal(self):
        return self.quantidade * self.valor_unitario


class MovimentoCaixa(BaseModel):
    """
    Extrato do turno. Registro imutável — corrige-se com um novo movimento,
    nunca editando o anterior (mesma ideia de `inventory.MovimentacaoEstoque`).

    `valor` tem sinal: entradas positivas, saídas negativas.
    """

    sessao = models.ForeignKey(
        SessaoCaixa,
        on_delete=models.PROTECT,
        related_name="movimentos",
    )
    tipo = models.CharField(max_length=12, choices=TipoMovimentoCaixa.choices)
    # Em branco quando o movimento não é de venda (sangria, suprimento…).
    # Acompanha payments.MetodoPagamento (o maior valor é "credito_troca").
    metodo_pagamento = models.CharField(max_length=15, blank=True)
    valor = models.DecimalField(max_digits=12, decimal_places=2)

    pedido = models.ForeignKey(
        "orders.Pedido",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="movimentos_caixa",
    )
    pagamento = models.ForeignKey(
        "payments.Pagamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimentos_caixa",
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="movimentos_caixa",
    )
    motivo = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = _("movimento de caixa")
        verbose_name_plural = _("movimentos de caixa")
        ordering = ["created_at"]
        indexes = [models.Index(fields=["sessao", "created_at"])]

    def __str__(self):
        return f"{self.get_tipo_display()} R$ {self.valor}"
