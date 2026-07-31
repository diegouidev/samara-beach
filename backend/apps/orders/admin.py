from django.contrib import admin

from .models import Cupom, ItemPedido, Pedido


class ItemPedidoInline(admin.TabularInline):
    model = ItemPedido
    extra = 0


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ("id", "cliente", "status", "subtotal", "desconto", "total", "created_at")
    list_filter = ("status",)
    search_fields = ("cliente__nome", "id")
    inlines = [ItemPedidoInline]


@admin.register(Cupom)
class CupomAdmin(admin.ModelAdmin):
    list_display = ("codigo", "tipo", "valor", "validade", "uso_maximo", "usos", "ativo")
    list_filter = ("tipo", "ativo")
    search_fields = ("codigo",)
