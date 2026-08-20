from django.contrib import admin

from .models import RegistroAuditoria


@admin.register(RegistroAuditoria)
class RegistroAuditoriaAdmin(admin.ModelAdmin):
    """Somente leitura: a trilha não se edita nem se apaga — nem pelo admin."""

    list_display = ("created_at", "usuario_email", "acao", "nivel", "objeto_repr")
    list_filter = ("acao", "nivel", "app_label")
    search_fields = ("usuario_email", "descricao", "objeto_repr", "objeto_id")
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
