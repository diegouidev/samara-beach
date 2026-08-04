"""
Catálogo: Categoria, Produto, VariacaoProduto, ImagemProduto,
TabelaMedidas e Avaliacao.
"""
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel, SoftDeleteModel, TimeStampedModel


class TipoOrigem(models.TextChoices):
    PRODUCAO_PROPRIA = "producao_propria", _("Produção própria")
    REVENDA = "revenda", _("Revenda")


class Categoria(SoftDeleteModel):
    nome = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    categoria_pai = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subcategorias",
    )
    # Imagem do card da categoria na vitrine (home).
    imagem = models.ImageField(upload_to="categorias/", null=True, blank=True)
    # Ordem de exibição dos cards na home (menor primeiro).
    ordem = models.PositiveSmallIntegerField(default=0)
    # Destacar na home (mostrar como card na vitrine de categorias).
    destaque = models.BooleanField(default=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = _("categoria")
        verbose_name_plural = _("categorias")
        ordering = ["ordem", "nome"]

    def __str__(self):
        return self.nome


class Produto(SoftDeleteModel):
    nome = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    descricao = models.TextField(blank=True)
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        related_name="produtos",
    )
    tipo_origem = models.CharField(
        max_length=20,
        choices=TipoOrigem.choices,
        default=TipoOrigem.REVENDA,
    )
    tags = models.JSONField(default=list, blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = _("produto")
        verbose_name_plural = _("produtos")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["categoria", "ativo"]),
            models.Index(fields=["tipo_origem"]),
        ]

    def __str__(self):
        return self.nome


class VariacaoProduto(SoftDeleteModel):
    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE,
        related_name="variacoes",
    )
    cor = models.CharField(max_length=60, blank=True)
    tamanho = models.CharField(max_length=30, blank=True)
    sku = models.CharField(max_length=60, unique=True)
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    preco_promocional = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    # Dados para cálculo de frete
    peso_gramas = models.PositiveIntegerField(null=True, blank=True)
    altura_cm = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    largura_cm = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    profundidade_cm = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    # Custo médio para cálculo de margem (revenda ou base de produção).
    custo_medio = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text=_("Custo de referência do SKU, usado no relatório de margem."),
    )
    estoque_minimo = models.PositiveIntegerField(
        default=0,
        help_text=_("Abaixo deste saldo, o SKU entra no alerta de estoque baixo."),
    )
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = _("variação de produto")
        verbose_name_plural = _("variações de produto")
        ordering = ["produto", "tamanho", "cor"]
        constraints = [
            models.UniqueConstraint(
                fields=["produto", "cor", "tamanho"],
                name="uniq_variacao_produto_cor_tamanho",
            )
        ]

    def __str__(self):
        return f"{self.produto.nome} — {self.cor}/{self.tamanho} ({self.sku})"

    @property
    def preco_vigente(self):
        return self.preco_promocional or self.preco


class ImagemProduto(BaseModel):
    variacao = models.ForeignKey(
        VariacaoProduto,
        on_delete=models.CASCADE,
        related_name="imagens",
    )
    imagem = models.ImageField(upload_to="produtos/", null=True, blank=True)
    url_externa = models.URLField(blank=True)
    alt_text = models.CharField(max_length=200, blank=True)
    ordem = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = _("imagem de produto")
        verbose_name_plural = _("imagens de produto")
        ordering = ["variacao", "ordem"]

    def __str__(self):
        return f"Imagem #{self.ordem} de {self.variacao_id}"


class TabelaMedidas(BaseModel):
    """
    Referência de medidas. Pode estar associada a uma categoria
    (ex.: 'Biquínis') ou a um produto específico.
    """
    nome = models.CharField(max_length=120)
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="tabelas_medidas",
    )
    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="tabelas_medidas",
    )
    # Estrutura livre: {"P": {"busto": "80-84", ...}, "M": {...}}
    dados = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = _("tabela de medidas")
        verbose_name_plural = _("tabelas de medidas")

    def __str__(self):
        return self.nome


class Avaliacao(BaseModel):
    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE,
        related_name="avaliacoes",
    )
    cliente = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avaliacoes",
    )
    nota = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    comentario = models.TextField(blank=True)
    aprovada = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("avaliação")
        verbose_name_plural = _("avaliações")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["produto", "cliente"],
                name="uniq_avaliacao_produto_cliente",
            )
        ]

    def __str__(self):
        return f"{self.produto.nome} — {self.nota}★"
