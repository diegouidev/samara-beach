import django_filters as filters

from .models import RegistroAuditoria


class RegistroAuditoriaFilter(filters.FilterSet):
    """Filtros da tela: período, quem, o quê e severidade."""

    inicio = filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    fim = filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = RegistroAuditoria
        fields = [
            "usuario",
            "acao",
            "nivel",
            "app_label",
            "model_name",
            "objeto_id",
        ]
