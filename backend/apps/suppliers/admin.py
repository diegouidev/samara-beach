from django.contrib import admin

from .models import (
    ContaPagar,
    Fornecedor,
    ItemPedidoCompra,
    PedidoCompraFornecedor,
)


class ItemPedidoCompraInline(admin.TabularInline):
    model = ItemPedidoCompra
    extra = 0


@admin.register(Fornecedor)
class FornecedorAdmin(admin.ModelAdmin):
    list_display = ("nome", "cnpj", "contato_nome", "ativo")
    search_fields = ("nome", "cnpj")
    list_filter = ("ativo",)


@admin.register(PedidoCompraFornecedor)
class PedidoCompraFornecedorAdmin(admin.ModelAdmin):
    list_display = ("id", "fornecedor", "status", "data_prevista", "custo_total")
    list_filter = ("status",)
    inlines = [ItemPedidoCompraInline]


@admin.register(ContaPagar)
class ContaPagarAdmin(admin.ModelAdmin):
    list_display = ("fornecedor", "valor", "vencimento", "status")
    list_filter = ("status",)
