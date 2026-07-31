"""Envios (integração com Correios/Melhor Envio/Frenet)."""
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel


class StatusEnvio(models.TextChoices):
    PENDENTE = "pendente", _("Pendente")
    POSTADO = "postado", _("Postado")
    EM_TRANSITO = "em_transito", _("Em trânsito")
    ENTREGUE = "entregue", _("Entregue")
    DEVOLVIDO = "devolvido", _("Devolvido")


class Envio(BaseModel):
    pedido = models.OneToOneField(
        "orders.Pedido",
        on_delete=models.PROTECT,
        related_name="envio",
    )
    transportadora = models.CharField(max_length=80, blank=True)
    servico = models.CharField(max_length=80, blank=True)  # ex: SEDEX, PAC
    codigo_rastreio = models.CharField(max_length=60, blank=True, db_index=True)
    status = models.CharField(
        max_length=12,
        choices=StatusEnvio.choices,
        default=StatusEnvio.PENDENTE,
    )
    custo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    postado_em = models.DateTimeField(null=True, blank=True)
    entregue_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("envio")
        verbose_name_plural = _("envios")
        ordering = ["-created_at"]

    def __str__(self):
        return f"Envio {self.codigo_rastreio or self.id} — {self.get_status_display()}"
