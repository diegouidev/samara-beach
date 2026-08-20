from rest_framework import serializers

from .models import RegistroAuditoria


class RegistroAuditoriaSerializer(serializers.ModelSerializer):
    acao_label = serializers.CharField(source="get_acao_display", read_only=True)
    nivel_label = serializers.CharField(source="get_nivel_display", read_only=True)

    class Meta:
        model = RegistroAuditoria
        fields = [
            "id",
            "created_at",
            "usuario",
            "usuario_email",
            "usuario_nome",
            "usuario_papel",
            "acao",
            "acao_label",
            "nivel",
            "nivel_label",
            "app_label",
            "model_name",
            "objeto_id",
            "objeto_repr",
            "descricao",
            "dados",
            "ip",
        ]
        # A trilha é imutável: nada aqui é editável pela API.
        read_only_fields = fields
