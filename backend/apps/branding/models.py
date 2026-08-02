"""
Branding: identidade visual configurável da loja (cores, logo, favicon, nome).

É um **singleton**: existe no máximo uma linha (pk fixo=1). Os dois frontends
leem via API pública e aplicam as cores em runtime (CSS variables), de modo que
a cliente muda pelo painel e ambos os sites seguem — sem rebuild.
"""
from django.core.validators import RegexValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import TimeStampedModel

hex_validator = RegexValidator(
    regex=r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
    message=_("Informe uma cor hexadecimal válida, ex.: #0891b2."),
)


class Branding(TimeStampedModel):
    """Configuração única de identidade visual (singleton pk=1)."""

    nome_loja = models.CharField(max_length=120, default="Samara Beach")

    # Paleta — valores hex. Defaults refletem o tema atual (mar/coral/areia).
    cor_primaria = models.CharField(
        max_length=7, default="#0891b2", validators=[hex_validator],
        help_text=_("Cor principal (botões, links, destaques de marca)."),
    )
    cor_secundaria = models.CharField(
        max_length=7, default="#0e7490", validators=[hex_validator],
        help_text=_("Variante escura da primária (hover)."),
    )
    cor_destaque = models.CharField(
        max_length=7, default="#fb7185", validators=[hex_validator],
        help_text=_("Cor de destaque/CTA (ex.: coral)."),
    )
    cor_fundo = models.CharField(
        max_length=7, default="#f5efe6", validators=[hex_validator],
        help_text=_("Cor de fundo suave (areia)."),
    )
    cor_texto = models.CharField(
        max_length=7, default="#1f2937", validators=[hex_validator],
        help_text=_("Cor de texto principal."),
    )

    logo = models.ImageField(upload_to="branding/", null=True, blank=True)
    favicon = models.ImageField(upload_to="branding/", null=True, blank=True)

    # Canal de fechamento da loja online: o checkout leva a conversa para cá.
    whatsapp = models.CharField(
        max_length=20,
        blank=True,
        help_text=_("Número com DDI e DDD, ex.: 5511999998888."),
    )

    class Meta:
        verbose_name = _("identidade visual")
        verbose_name_plural = _("identidade visual")

    def __str__(self):
        return f"Branding: {self.nome_loja}"

    def save(self, *args, **kwargs):
        # Garante singleton: sempre pk=1.
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> "Branding":
        obj, _created = cls.objects.get_or_create(pk=1)
        return obj
