from rest_framework import serializers

from .models import LoteProducao, MovimentacaoEstoque


class LoteProducaoSerializer(serializers.ModelSerializer):
    custo_total = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = LoteProducao
        fields = [
            "id",
            "variacao",
            "quantidade",
            "custo_producao_unitario",
            "custo_total",
            "data_producao",
            "observacoes",
            "created_at",
        ]
        read_only_fields = ["id", "custo_total", "created_at"]


class MovimentacaoEstoqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimentacaoEstoque
        fields = [
            "id",
            "variacao",
            "tipo",
            "origem",
            "quantidade",
            "saldo_resultante",
            "lote_producao",
            "pedido_compra",
            "observacoes",
            "created_at",
        ]
        # saldo_resultante é calculado no backend a partir do saldo atual.
        read_only_fields = ["id", "saldo_resultante", "created_at"]
