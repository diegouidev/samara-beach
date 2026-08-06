"""
Empresa: dados cadastrais, fiscais e de contato da loja.

É um **singleton** (pk fixo=1), como o Branding: existe uma empresa só. A
separação entre os dois é de propósito, não de tela — `Branding` é aparência
(cores, logo, hero) e muda com a estação; `Empresa` é quem a loja é perante o
cliente e o fisco, e muda quase nunca.

Consumido por:
- recibo do PDV e futura NF-e → dados do emitente;
- rodapé da loja → CNPJ e razão social (exigidos pelo Decreto 7.962/2013);
- storefront → redes sociais e contato.
"""
from django.core.validators import RegexValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.documentos import apenas_digitos, cnpj_valido, formatar_cnpj
from apps.common.models import TimeStampedModel


def validar_cnpj(valor: str):
    """Validator de model — aceita vazio (campo opcional no cadastro inicial)."""
    if valor and not cnpj_valido(valor):
        raise models.fields.exceptions.ValidationError(
            _("CNPJ inválido."), code="cnpj_invalido"
        )


cep_validator = RegexValidator(
    regex=r"^\d{5}-?\d{3}$",
    message=_("Informe um CEP válido, ex.: 62000-000."),
)


class RegimeTributario(models.TextChoices):
    SIMPLES = "simples", _("Simples Nacional")
    PRESUMIDO = "presumido", _("Lucro Presumido")
    REAL = "real", _("Lucro Real")
    MEI = "mei", _("MEI")


class Empresa(TimeStampedModel):
    """Dados da empresa (singleton pk=1)."""

    # --- Identificação -----------------------------------------------------
    razao_social = models.CharField(
        max_length=200, blank=True,
        help_text=_("Nome registrado na Receita Federal."),
    )
    nome_fantasia = models.CharField(
        max_length=200, blank=True,
        help_text=_("Nome usado no dia a dia (aparece no recibo)."),
    )
    cnpj = models.CharField(
        max_length=18, blank=True, validators=[validar_cnpj],
        help_text=_("Somente números ou com máscara."),
    )
    inscricao_estadual = models.CharField(
        max_length=20, blank=True,
        help_text=_('Deixe vazio ou "ISENTO" quando não houver.'),
    )
    inscricao_municipal = models.CharField(max_length=20, blank=True)
    regime_tributario = models.CharField(
        max_length=12, choices=RegimeTributario.choices, blank=True,
    )

    # --- Endereço ----------------------------------------------------------
    cep = models.CharField(max_length=9, blank=True, validators=[cep_validator])
    logradouro = models.CharField(max_length=200, blank=True)
    numero = models.CharField(max_length=20, blank=True)
    complemento = models.CharField(max_length=100, blank=True)
    bairro = models.CharField(max_length=100, blank=True)
    cidade = models.CharField(max_length=100, blank=True)
    uf = models.CharField(max_length=2, blank=True)

    # --- Contato -----------------------------------------------------------
    telefone = models.CharField(max_length=20, blank=True)
    # WhatsApp comercial: o do Branding é o do checkout e pode ser outro número.
    whatsapp = models.CharField(
        max_length=20, blank=True,
        help_text=_("Com DDI e DDD, ex.: 5585999998888."),
    )
    email = models.EmailField(blank=True)
    site = models.URLField(blank=True)

    # --- Redes sociais -----------------------------------------------------
    # Guardamos só o @usuario; a URL é montada na exibição. Evita link quebrado
    # por gente colando ora a URL inteira, ora o handle.
    instagram = models.CharField(
        max_length=100, blank=True, help_text=_("Só o usuário, sem @ e sem URL."),
    )
    facebook = models.CharField(max_length=100, blank=True)
    tiktok = models.CharField(max_length=100, blank=True)

    # --- Operação ----------------------------------------------------------
    horario_funcionamento = models.TextField(
        blank=True, help_text=_("Ex.: Seg a Sex 9h-18h, Sáb 9h-13h."),
    )

    class Meta:
        verbose_name = _("empresa")
        verbose_name_plural = _("empresa")

    def __str__(self):
        return self.nome_fantasia or self.razao_social or "Empresa"

    def save(self, *args, **kwargs):
        # Normaliza antes de gravar: CNPJ com máscara, redes sem @/URL.
        if self.cnpj:
            self.cnpj = formatar_cnpj(self.cnpj)
        for campo in ("instagram", "facebook", "tiktok"):
            if valor := getattr(self, campo):
                setattr(self, campo, self._limpar_handle(valor))
        if self.uf:
            self.uf = self.uf.upper()

        # Garante singleton: sempre pk=1. Um `create()` viraria INSERT e
        # colidiria com a linha existente, então convertemos em UPDATE — e
        # herdamos o created_at dela, já que auto_now_add só vale no INSERT.
        self.pk = 1
        if existente := type(self).objects.filter(pk=1).values("created_at").first():
            kwargs.pop("force_insert", None)
            self.created_at = existente["created_at"]
        super().save(*args, **kwargs)

    @staticmethod
    def _limpar_handle(valor: str) -> str:
        """'@loja', 'instagram.com/loja/' e 'https://.../loja' → 'loja'."""
        valor = valor.strip().rstrip("/")
        if "/" in valor:
            valor = valor.rsplit("/", 1)[-1]
        return valor.lstrip("@")

    @classmethod
    def load(cls) -> "Empresa":
        obj, _created = cls.objects.get_or_create(pk=1)
        return obj

    # --- Derivados (usados no recibo, no rodapé e na NF-e) -----------------

    @property
    def cnpj_digitos(self) -> str:
        return apenas_digitos(self.cnpj)

    @property
    def endereco_linha(self) -> str:
        """'Rua X, 100 - Sala 2 - Centro, Fortaleza/CE - 60000-000'."""
        rua = ", ".join(p for p in [self.logradouro, self.numero] if p)
        partes = [p for p in [rua, self.complemento, self.bairro] if p]
        local = "/".join(p for p in [self.cidade, self.uf] if p)
        if local:
            partes.append(local)
        if self.cep:
            partes.append(self.cep)
        return " - ".join(partes)

    @property
    def esta_completa(self) -> bool:
        """Mínimo para emitir recibo/NF-e e atender o Decreto 7.962/2013."""
        return bool(
            self.razao_social and self.cnpj and self.logradouro
            and self.cidade and self.uf
        )
