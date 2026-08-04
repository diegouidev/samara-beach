from rest_framework import serializers

from apps.catalog.models import VariacaoProduto

from .models import Cupom, ItemPedido, Pedido


class CupomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cupom
        fields = [
            "id",
            "codigo",
            "tipo",
            "valor",
            "validade",
            "uso_maximo",
            "usos",
            "ativo",
        ]
        read_only_fields = ["id", "usos"]


class ItemPedidoSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    sku = serializers.CharField(source="variacao.sku", read_only=True)
    produto_nome = serializers.CharField(source="variacao.produto.nome", read_only=True)

    class Meta:
        model = ItemPedido
        fields = [
            "id",
            "pedido",
            "variacao",
            "sku",
            "produto_nome",
            "quantidade",
            "preco_unitario",
            "subtotal",
        ]
        # preco_unitario vem do preço vigente da variação; pedido é definido pela rota.
        read_only_fields = ["id", "pedido", "preco_unitario", "subtotal", "sku", "produto_nome"]


class AdicionarItemSerializer(serializers.Serializer):
    """Payload para adicionar item ao carrinho."""

    variacao = serializers.PrimaryKeyRelatedField(
        queryset=VariacaoProduto.objects.filter(ativo=True)
    )
    quantidade = serializers.IntegerField(min_value=1, default=1)


class PedidoSerializer(serializers.ModelSerializer):
    itens = ItemPedidoSerializer(many=True, read_only=True)
    cupom_codigo = serializers.CharField(source="cupom.codigo", read_only=True)
    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True, default=None)
    cliente_email = serializers.CharField(
        source="cliente.usuario.email", read_only=True, default=None
    )
    cliente_telefone = serializers.CharField(
        source="cliente.telefone", read_only=True, default=None
    )

    class Meta:
        model = Pedido
        fields = [
            "id",
            "cliente",
            "cliente_nome",
            "cliente_email",
            "cliente_telefone",
            "canal",
            "status",
            "cupom",
            "cupom_codigo",
            "endereco_entrega",
            "subtotal",
            "frete",
            "desconto",
            "total",
            "itens",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "cliente",
            "canal",
            "status",
            "cupom",
            "cupom_codigo",
            "subtotal",
            "frete",
            "desconto",
            "total",
            "itens",
            "created_at",
            "updated_at",
        ]


class AplicarCupomSerializer(serializers.Serializer):
    codigo = serializers.CharField(max_length=40)


class MudarStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Pedido._meta.get_field("status").choices)
