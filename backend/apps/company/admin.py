from django.contrib import admin

from .models import Empresa


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ("__str__", "cnpj", "cidade", "uf", "updated_at")
    fieldsets = (
        ("Identificação", {
            "fields": (
                "razao_social", "nome_fantasia", "cnpj",
                "inscricao_estadual", "inscricao_municipal", "regime_tributario",
            )
        }),
        ("Endereço", {
            "fields": (
                "cep", "logradouro", "numero", "complemento",
                "bairro", "cidade", "uf",
            )
        }),
        ("Contato", {"fields": ("telefone", "whatsapp", "email", "site")}),
        ("Redes sociais", {"fields": ("instagram", "facebook", "tiktok")}),
        ("Operação", {"fields": ("horario_funcionamento",)}),
    )

    def has_add_permission(self, request):
        # Singleton: edita-se a linha existente, não se cria outra.
        return not Empresa.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
