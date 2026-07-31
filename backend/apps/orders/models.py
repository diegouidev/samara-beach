"""Pedidos, itens de pedido e cupons."""
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


class Pedido(BaseModel):
    cliente = models.ForeignKey(
        "customers.Cliente",
        on_delete=models.PROTECT,
        related_name="pedidos",
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
