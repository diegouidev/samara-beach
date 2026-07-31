"""Clientes e endereços."""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel, SoftDeleteModel


class Cliente(SoftDeleteModel):
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cliente",
    )
    nome = models.CharField(max_length=200)
    cpf = models.CharField(max_length=14, blank=True)
    telefone = models.CharField(max_length=30, blank=True)

    class Meta:
        verbose_name = _("cliente")
        verbose_name_plural = _("clientes")

    def __str__(self):
        return self.nome


class TipoEndereco(models.TextChoices):
    ENTREGA = "entrega", _("Entrega")
    COBRANCA = "cobranca", _("Cobrança")


class Endereco(BaseModel):
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name="enderecos",
    )
    tipo = models.CharField(
        max_length=10,
        choices=TipoEndereco.choices,
        default=TipoEndereco.ENTREGA,
    )
    logradouro = models.CharField(max_length=200)
    numero = models.CharField(max_length=20, blank=True)
    complemento = models.CharField(max_length=100, blank=True)
    bairro = models.CharField(max_length=100, blank=True)
    cidade = models.CharField(max_length=100)
    uf = models.CharField(max_length=2)
    cep = models.CharField(max_length=9)
    principal = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("endereço")
        verbose_name_plural = _("endereços")

    def __str__(self):
        return f"{self.logradouro}, {self.numero} — {self.cidade}/{self.uf}"
