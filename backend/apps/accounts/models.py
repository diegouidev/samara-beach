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

    # --- Dados da pessoa (equipe interna) ---------------------------------
    # Ficam aqui, e não num model Funcionario à parte, porque o cadastro é de
    # quem loga no sistema: separar duplicaria nome/e-mail em duas tabelas.
    cpf = models.CharField(max_length=14, blank=True)
    telefone = models.CharField(max_length=20, blank=True)
    cargo = models.CharField(
        max_length=60,
        blank=True,
        help_text=_("Cargo exibido no painel, ex.: Vendedora. Não afeta permissões."),
    )
    data_admissao = models.DateField(null=True, blank=True)
    observacoes = models.TextField(blank=True)

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
    def nome_exibicao(self) -> str:
        """Nome completo quando existe; senão o e-mail — nunca vazio."""
        return self.get_full_name().strip() or self.email

    @property
    def is_interno(self) -> bool:
        return self.tipo == TipoUsuario.INTERNO

    @property
    def is_cliente(self) -> bool:
        return self.tipo == TipoUsuario.CLIENTE
