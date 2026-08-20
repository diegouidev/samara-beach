"""Pedidos, itens de pedido e cupons."""
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel


class TipoCupom(models.TextChoices):
    PERCENTUAL = "percentual", _("Percentual")
    FIXO = "fixo", _("Valor fixo")


class Cupom(BaseModel):
    codigo = models.CharField(max_length=40, unique=True)
    tipo = models.CharField(max_length=12, choices=TipoCupom.choices)
    valor = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    validade = models.DateTimeField(null=True, blank=True)
    uso_maximo = models.PositiveIntegerField(null=True, blank=True)
    usos = models.PositiveIntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = _("cupom")
        verbose_name_plural = _("cupons")

    def __str__(self):
        return self.codigo


class StatusPedido(models.TextChoices):
    CARRINHO = "carrinho", _("Carrinho")
    AGUARDANDO_PAGAMENTO = "aguardando_pagamento", _("Aguardando pagamento")
    PAGO = "pago", _("Pago")
    EM_SEPARACAO = "em_separacao", _("Em separação")
    ENVIADO = "enviado", _("Enviado")
    ENTREGUE = "entregue", _("Entregue")
    CANCELADO = "cancelado", _("Cancelado")


class CanalVenda(models.TextChoices):
    ONLINE = "online", _("Loja online")
    PRESENCIAL = "presencial", _("Loja física")


class Pedido(BaseModel):
    # Nulo na venda de balcão sem identificação ("consumidor final").
    cliente = models.ForeignKey(
        "customers.Cliente",
        on_delete=models.PROTECT,
        related_name="pedidos",
        null=True,
        blank=True,
    )
    canal = models.CharField(
        max_length=12,
        choices=CanalVenda.choices,
        default=CanalVenda.ONLINE,
        db_index=True,
    )
    # Quem operou a venda presencial (usuário interno do PDV).
    vendedor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vendas",
    )
    status = models.CharField(
        max_length=25,
        choices=StatusPedido.choices,
        default=StatusPedido.CARRINHO,
    )
    cupom = models.ForeignKey(
        Cupom,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pedidos",
    )
    endereco_entrega = models.ForeignKey(
        "customers.Endereco",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="pedidos",
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    frete = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Desconto concedido na mão (PDV). Soma ao desconto do cupom em `desconto`.
    desconto_manual = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    desconto = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        verbose_name = _("pedido")
        verbose_name_plural = _("pedidos")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Pedido {self.id} — {self.get_status_display()}"


class ItemPedido(BaseModel):
    pedido = models.ForeignKey(
        Pedido,
        on_delete=models.CASCADE,
        related_name="itens",
    )
    variacao = models.ForeignKey(
        "catalog.VariacaoProduto",
        on_delete=models.PROTECT,
        related_name="itens_pedido",
    )
    quantidade = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = _("item de pedido")
        verbose_name_plural = _("itens de pedido")

    def __str__(self):
        return f"{self.quantidade}x {self.variacao.sku}"

    @property
    def subtotal(self):
        return self.quantidade * self.preco_unitario


class ReservaEstoque(BaseModel):
    """
    Estoque preso por um pedido que ainda não foi pago.

    Não é uma MovimentacaoEstoque: nada saiu da prateleira ainda. É um
    "não conte com esta peça" temporário, que morre sozinho no prazo
    (`expira_em`) se o pagamento não vier — ver apps.orders.reservas.
    """

    pedido = models.ForeignKey(
        "orders.Pedido",
        on_delete=models.CASCADE,
        related_name="reservas",
    )
    variacao = models.ForeignKey(
        "catalog.VariacaoProduto",
        on_delete=models.CASCADE,
        related_name="reservas",
    )
    quantidade = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    expira_em = models.DateTimeField(db_index=True)

    class Meta:
        verbose_name = _("reserva de estoque")
        verbose_name_plural = _("reservas de estoque")
        indexes = [
            # A pergunta quente é sempre "quanto desta variação está preso
            # agora?" — daí o índice composto com a validade.
            models.Index(fields=["variacao", "expira_em"]),
        ]

    def __str__(self):
        return f"{self.quantidade}x {self.variacao.sku} (pedido {self.pedido_id})"
