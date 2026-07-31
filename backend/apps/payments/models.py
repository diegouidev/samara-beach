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


class Pagamento(BaseModel):
    pedido = models.ForeignKey(
        "orders.Pedido",
        on_delete=models.PROTECT,
        related_name="pagamentos",
    )
    gateway = models.CharField(max_length=40, blank=True)  # ex: mercadopago, pagarme
    metodo = models.CharField(
        max_length=10,
        choices=MetodoPagamento.choices,
        blank=True,
    )
    status = models.CharField(
        max_length=12,
        choices=StatusPagamento.choices,
        default=StatusPagamento.PENDENTE,
    )
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    referencia_externa = models.CharField(max_length=120, blank=True, db_index=True)
    payload_webhook = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = _("pagamento")
        verbose_name_plural = _("pagamentos")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Pagamento {self.id} — {self.get_status_display()}"
