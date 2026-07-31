from django.contrib import admin

from .models import LoteProducao, MovimentacaoEstoque


@admin.register(LoteProducao)
class LoteProducaoAdmin(admin.ModelAdmin):
    list_display = ("variacao", "quantidade", "custo_producao_unitario", "data_producao")
    list_filter = ("data_producao",)
    search_fields = ("variacao__sku",)


@admin.register(MovimentacaoEstoque)
class MovimentacaoEstoqueAdmin(admin.ModelAdmin):
    list_display = ("variacao", "tipo", "origem", "quantidade", "saldo_resultante", "created_at")
    list_filter = ("tipo", "origem")
    search_fields = ("variacao__sku",)
    readonly_fields = ("saldo_resultante",)
