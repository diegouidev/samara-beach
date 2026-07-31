from django.contrib import admin

from .models import (
    Avaliacao,
    Categoria,
    ImagemProduto,
    Produto,
    TabelaMedidas,
    VariacaoProduto,
)


class VariacaoInline(admin.TabularInline):
    model = VariacaoProduto
    extra = 0


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ("nome", "slug", "categoria_pai", "ativo")
    prepopulated_fields = {"slug": ("nome",)}
    search_fields = ("nome",)


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ("nome", "categoria", "tipo_origem", "ativo", "created_at")
    list_filter = ("tipo_origem", "ativo", "categoria")
    prepopulated_fields = {"slug": ("nome",)}
    search_fields = ("nome", "slug")
    inlines = [VariacaoInline]


admin.site.register(VariacaoProduto)
admin.site.register(ImagemProduto)
admin.site.register(TabelaMedidas)
admin.site.register(Avaliacao)
