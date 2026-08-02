from django.contrib import admin

from .models import MovimentoCaixa, SessaoCaixa


class MovimentoCaixaInline(admin.TabularInline):
    model = MovimentoCaixa
    extra = 0
    readonly_fields = ("tipo", "metodo_pagamento", "valor", "pedido", "motivo")


@admin.register(SessaoCaixa)
class SessaoCaixaAdmin(admin.ModelAdmin):
    list_display = (
        "operador",
        "status",
        "aberta_em",
        "fechada_em",
        "valor_abertura",
        "valor_fechamento_informado",
        "diferenca",
    )
    list_filter = ("status",)
    search_fields = ("operador__email",)
    inlines = [MovimentoCaixaInline]


@admin.register(MovimentoCaixa)
class MovimentoCaixaAdmin(admin.ModelAdmin):
    list_display = ("created_at", "sessao", "tipo", "metodo_pagamento", "valor")
    list_filter = ("tipo", "metodo_pagamento")
