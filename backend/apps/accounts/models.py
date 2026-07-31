"""
Usuário customizado.

Dois tipos de usuário:
- CLIENTE: acessa o storefront (dados de cliente ficam em apps.customers.Cliente).
- INTERNO: equipe da loja (painel de gestão), com um `papel`.

Login por e-mail (USERNAME_FIELD = email).
"""
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

from .managers import UserManager


class TipoUsuario(models.TextChoices):
    CLIENTE = "cliente", _("Cliente")
    INTERNO = "interno", _("Interno")


class PapelInterno(models.TextChoices):
    ADMIN = "admin", _("Administrador")
    ESTOQUE = "estoque", _("Estoque")
    FINANCEIRO = "financeiro", _("Financeiro")
    ATENDIMENTO = "atendimento", _("Atendimento")


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Removemos username; login é por e-mail.
    username = None
    email = models.EmailField(_("endereço de e-mail"), unique=True)

    tipo = models.CharField(
        max_length=10,
        choices=TipoUsuario.choices,
        default=TipoUsuario.CLIENTE,
    )
    # Só faz sentido quando tipo == INTERNO.
    papel = models.CharField(
        max_length=15,
        choices=PapelInterno.choices,
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        verbose_name = _("usuário")
        verbose_name_plural = _("usuários")

    def __str__(self):
        return self.email

    @property
    def is_interno(self) -> bool:
        return self.tipo == TipoUsuario.INTERNO

    @property
    def is_cliente(self) -> bool:
        return self.tipo == TipoUsuario.CLIENTE
