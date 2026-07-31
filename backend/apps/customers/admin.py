from django.contrib import admin

from .models import Cliente, Endereco


class EnderecoInline(admin.TabularInline):
    model = Endereco
    extra = 0


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ("nome", "cpf", "telefone")
    search_fields = ("nome", "cpf", "usuario__email")
    inlines = [EnderecoInline]


admin.site.register(Endereco)
