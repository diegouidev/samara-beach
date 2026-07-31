"""
Fornecedores e compras: Fornecedor, PedidoCompraFornecedor (+ itens)
e ContaPagar (controle financeiro básico).
"""
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel, SoftDeleteModel


class Fornecedor(SoftDeleteModel):
    nome = models.CharField(max_length=200)
    cnpj = models.CharField(max_length=18, blank=True)
    contato_nome = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    telefone = models.CharField(max_length=30, blank=True)
    prazo_medio_entrega_dias = models.PositiveIntegerField(null=True, blank=True)
    observacoes = models.TextField(blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = _("fornecedor")
        verbose_name_plural = _("fornecedores")
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class StatusPedidoCompra(models.TextChoices):
    RASCUNHO = "rascunho", _("Rascunho")
    ENVIADO = "enviado", _("Enviado")
    CONFIRMADO = "confirmado", _("Confirmado")
    RECEBIDO = "recebido", _("Recebido")
    CANCELADO = "cancelado", _("Cancelado")


class PedidoCompraFornecedor(BaseModel):
    fornecedor = models.ForeignKey(
        Fornecedor,
        on_delete=models.PROTECT,
        related_name="pedidos_compra",
    )
    status = models.CharField(
        max_length=15,
        choices=StatusPedidoCompra.choices,
        default=StatusPedidoCompra.RASCUNHO,
    )
    data_prevista = models.DateField(null=True, blank=True)
    custo_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    observacoes = models.TextField(blank=True)

    class Meta:
        verbose_name = _("pedido de compra")
        verbose_name_plural = _("pedidos de compra")
        ordering = ["-created_at"]

    def __str__(self):
        return f"PC {self.id} — {self.fornecedor.nome} ({self.status})"


class ItemPedidoCompra(BaseModel):
    pedido_compra = models.ForeignKey(
        PedidoCompraFornecedor,
        on_delete=models.CASCADE,
        related_name="itens",
    )
    variacao = models.ForeignKey(
        "catalog.VariacaoProduto",
        on_delete=models.PROTECT,
        related_name="itens_compra",
    )
    quantidade = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    custo_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    class Meta:
        verbose_name = _("item de pedido de compra")
        verbose_name_plural = _("itens de pedido de compra")

    def __str__(self):
        return f"{self.quantidade}x {self.variacao.sku}"

    @property
    def subtotal(self):
        return self.quantidade * self.custo_unitario


class StatusContaPagar(models.TextChoices):
    ABERTA = "aberta", _("Aberta")
    PAGA = "paga", _("Paga")
    VENCIDA = "vencida", _("Vencida")
    CANCELADA = "cancelada", _("Cancelada")


class ContaPagar(BaseModel):
    fornecedor = models.ForeignKey(
        Fornecedor,
        on_delete=models.PROTECT,
        related_name="contas_pagar",
    )
    pedido_compra = models.ForeignKey(
        PedidoCompraFornecedor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contas_pagar",
    )
    descricao = models.CharField(max_length=200, blank=True)
    valor = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    vencimento = models.DateField()
    pago_em = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=12,
        choices=StatusContaPagar.choices,
        default=StatusContaPagar.ABERTA,
    )

    class Meta:
        verbose_name = _("conta a pagar")
        verbose_name_plural = _("contas a pagar")
        ordering = ["vencimento"]

    def __str__(self):
        return f"{self.fornecedor.nome} — R$ {self.valor} ({self.status})"
