"""
Estoque: LoteProducao (produção própria) e MovimentacaoEstoque.

Tanto produção própria quanto compra de fornecedor alimentam a mesma
MovimentacaoEstoque — permitindo relatório de margem por produto mesmo
com origem mista (ver escopo).
"""
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel


class LoteProducao(BaseModel):
    """Lote de produção própria de uma variação."""

    variacao = models.ForeignKey(
        "catalog.VariacaoProduto",
        on_delete=models.PROTECT,
        related_name="lotes_producao",
    )
    quantidade = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    custo_producao_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    data_producao = models.DateField()
    observacoes = models.TextField(blank=True)

    class Meta:
        verbose_name = _("lote de produção")
        verbose_name_plural = _("lotes de produção")
        ordering = ["-data_producao"]

    def __str__(self):
        return f"Lote {self.quantidade}x {self.variacao.sku} ({self.data_producao})"

    @property
    def custo_total(self):
        return self.quantidade * self.custo_producao_unitario


class TipoMovimentacao(models.TextChoices):
    ENTRADA = "entrada", _("Entrada")
    SAIDA = "saida", _("Saída")
    AJUSTE = "ajuste", _("Ajuste")


class OrigemMovimentacao(models.TextChoices):
    VENDA = "venda", _("Venda")
    PRODUCAO = "producao", _("Produção")
    COMPRA = "compra", _("Compra")
    DEVOLUCAO = "devolucao", _("Devolução")
    AJUSTE = "ajuste", _("Ajuste manual")


class MovimentacaoEstoque(BaseModel):
    """
    Registro imutável de movimentação de estoque por variação (SKU).
    `saldo_resultante` é o saldo após aplicar esta movimentação —
    permite auditoria e cálculo rápido do saldo atual (último registro).
    """

    variacao = models.ForeignKey(
        "catalog.VariacaoProduto",
        on_delete=models.PROTECT,
        related_name="movimentacoes",
    )
    tipo = models.CharField(max_length=10, choices=TipoMovimentacao.choices)
    origem = models.CharField(max_length=12, choices=OrigemMovimentacao.choices)
    quantidade = models.IntegerField(
        help_text=_("Positivo para entrada, negativo para saída."),
    )
    saldo_resultante = models.IntegerField()

    # Rastreabilidade opcional da origem (produção/compra/pedido).
    lote_producao = models.ForeignKey(
        LoteProducao,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimentacoes",
    )
    pedido_compra = models.ForeignKey(
        "suppliers.PedidoCompraFornecedor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimentacoes",
    )
    observacoes = models.TextField(blank=True)

    class Meta:
        verbose_name = _("movimentação de estoque")
        verbose_name_plural = _("movimentações de estoque")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["variacao", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.tipo} {self.quantidade} — {self.variacao.sku} (saldo {self.saldo_resultante})"
