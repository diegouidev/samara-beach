"""Pagamentos (integração com gateway via webhook)."""
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel


class StatusPagamento(models.TextChoices):
    PENDENTE = "pendente", _("Pendente")
    APROVADO = "aprovado", _("Aprovado")
    RECUSADO = "recusado", _("Recusado")
    ESTORNADO = "estornado", _("Estornado")
    CANCELADO = "cancelado", _("Cancelado")


class MetodoPagamento(models.TextChoices):
    PIX = "pix", _("Pix")
    CARTAO = "cartao", _("Cartão")
    BOLETO = "boleto", _("Boleto")
    # Formas usadas no balcão (PDV).
    DINHEIRO = "dinheiro", _("Dinheiro")
    DEBITO = "debito", _("Cartão de débito")
    CREDITO = "credito", _("Cartão de crédito")
    # Crédito gerado por uma devolução, abatido em uma troca. Não é dinheiro
    # entrando: nunca conta como espécie na gaveta.
    CREDITO_TROCA = "credito_troca", _("Crédito de troca")


#: Só o dinheiro fica na gaveta — é o que se confere no fechamento do caixa.
METODOS_EM_ESPECIE = {MetodoPagamento.DINHEIRO}


class Pagamento(BaseModel):
    pedido = models.ForeignKey(
        "orders.Pedido",
        on_delete=models.PROTECT,
        related_name="pagamentos",
    )
    gateway = models.CharField(max_length=40, blank=True)  # ex: mercadopago, pagarme
    metodo = models.CharField(
        max_length=15,
        choices=MetodoPagamento.choices,
        blank=True,
    )
    status = models.CharField(
        max_length=12,
        choices=StatusPagamento.choices,
        default=StatusPagamento.PENDENTE,
    )
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    # Crédito parcelado no balcão (1 = à vista).
    parcelas = models.PositiveSmallIntegerField(default=1)
    # Só em dinheiro: quanto a cliente entregou e quanto voltou de troco.
    valor_recebido = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    troco = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    referencia_externa = models.CharField(max_length=120, blank=True, db_index=True)
    payload_webhook = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = _("pagamento")
        verbose_name_plural = _("pagamentos")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Pagamento {self.id} — {self.get_status_display()}"
