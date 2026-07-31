from rest_framework import serializers

from .models import (
    ContaPagar,
    Fornecedor,
    ItemPedidoCompra,
    PedidoCompraFornecedor,
)


class FornecedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fornecedor
        fields = [
            "id",
            "nome",
            "cnpj",
            "contato_nome",
            "email",
            "telefone",
            "prazo_medio_entrega_dias",
            "observacoes",
            "ativo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ItemPedidoCompraSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = ItemPedidoCompra
        fields = [
            "id",
            "pedido_compra",
            "variacao",
            "quantidade",
            "custo_unitario",
            "subtotal",
        ]
        read_only_fields = ["id", "subtotal"]


class PedidoCompraFornecedorSerializer(serializers.ModelSerializer):
    itens = ItemPedidoCompraSerializer(many=True, read_only=True)

    class Meta:
        model = PedidoCompraFornecedor
        fields = [
            "id",
            "fornecedor",
            "status",
            "data_prevista",
            "custo_total",
            "observacoes",
            "itens",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "itens", "created_at", "updated_at"]


class ContaPagarSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContaPagar
        fields = [
            "id",
            "fornecedor",
            "pedido_compra",
            "descricao",
            "valor",
            "vencimento",
            "pago_em",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
