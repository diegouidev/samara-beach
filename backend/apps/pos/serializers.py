from rest_framework import serializers

from apps.orders.serializers import PedidoSerializer

from .models import (
    Devolucao,
    ItemDevolucao,
    MovimentoCaixa,
    SessaoCaixa,
    TipoDevolucao,
)


class SessaoCaixaSerializer(serializers.ModelSerializer):
    operador_nome = serializers.SerializerMethodField()

    class Meta:
        model = SessaoCaixa
        fields = [
            "id",
            "operador",
            "operador_nome",
            "status",
            "aberta_em",
            "fechada_em",
            "valor_abertura",
            "valor_fechamento_informado",
            "valor_fechamento_esperado",
            "diferenca",
            "observacoes_abertura",
            "observacoes_fechamento",
        ]
        read_only_fields = fields

    def get_operador_nome(self, obj) -> str:
        nome = f"{obj.operador.first_name} {obj.operador.last_name}".strip()
        return nome or obj.operador.email


class MovimentoCaixaSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source="usuario.email", read_only=True)

    class Meta:
        model = MovimentoCaixa
        fields = [
            "id",
            "tipo",
            "metodo_pagamento",
            "valor",
            "pedido",
            "motivo",
            "usuario_nome",
            "created_at",
        ]
        read_only_fields = fields


class AbrirCaixaSerializer(serializers.Serializer):
    valor_abertura = serializers.DecimalField(max_digits=12, decimal_places=2)
    observacoes = serializers.CharField(required=False, allow_blank=True, default="")


class FecharCaixaSerializer(serializers.Serializer):
    valor_informado = serializers.DecimalField(max_digits=12, decimal_places=2)
    observacoes = serializers.CharField(required=False, allow_blank=True, default="")


class MovimentoGavetaSerializer(serializers.Serializer):
    valor = serializers.DecimalField(max_digits=12, decimal_places=2)
    motivo = serializers.CharField(max_length=200)


class ResumoSessaoSerializer(serializers.Serializer):
    """Fechamento do turno: totais por forma de pagamento e extrato."""

    sessao = SessaoCaixaSerializer(read_only=True)
    total_vendido = serializers.DecimalField(max_digits=12, decimal_places=2)
    num_vendas = serializers.IntegerField()
    ticket_medio = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_sangrias = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_suprimentos = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_devolucoes = serializers.DecimalField(max_digits=12, decimal_places=2)
    dinheiro_esperado = serializers.DecimalField(max_digits=12, decimal_places=2)
    por_metodo = serializers.DictField(
        child=serializers.DecimalField(max_digits=12, decimal_places=2)
    )
    movimentos = MovimentoCaixaSerializer(many=True, read_only=True)


# =========================================================================
# Venda
# =========================================================================


class ItemVendaSerializer(serializers.Serializer):
    variacao = serializers.UUIDField()
    quantidade = serializers.IntegerField(min_value=1)
    # Opcional: permite desconto direto no item.
    preco_unitario = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )


class PagamentoVendaSerializer(serializers.Serializer):
    metodo = serializers.CharField()
    valor = serializers.DecimalField(max_digits=12, decimal_places=2)
    parcelas = serializers.IntegerField(required=False, default=1, min_value=1)
    # Só em dinheiro: base do cálculo de troco.
    valor_recebido = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )


class RegistrarVendaSerializer(serializers.Serializer):
    itens = ItemVendaSerializer(many=True)
    pagamentos = PagamentoVendaSerializer(many=True, required=False, default=list)
    cliente = serializers.UUIDField(required=False, allow_null=True)
    desconto_manual = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, default=0
    )
    observacoes = serializers.CharField(required=False, allow_blank=True, default="")
    # Troca: o crédito desta devolução abate o total da venda.
    devolucao = serializers.UUIDField(required=False, allow_null=True)


class CancelarVendaSerializer(serializers.Serializer):
    motivo = serializers.CharField(max_length=200)


class VendaPDVSerializer(PedidoSerializer):
    """Pedido + dados de pagamento, usado na confirmação e no recibo."""

    pagamentos = serializers.SerializerMethodField()
    vendedor_nome = serializers.SerializerMethodField()
    cliente_nome = serializers.CharField(
        source="cliente.nome", read_only=True, default=""
    )

    class Meta(PedidoSerializer.Meta):
        fields = PedidoSerializer.Meta.fields + [
            "pagamentos",
            "vendedor_nome",
            "cliente_nome",
            "desconto_manual",
        ]

    def get_pagamentos(self, obj) -> list[dict]:
        return [
            {
                "metodo": p.metodo,
                "valor": str(p.valor),
                "parcelas": p.parcelas,
                "valor_recebido": str(p.valor_recebido) if p.valor_recebido else None,
                "troco": str(p.troco) if p.troco else None,
            }
            for p in obj.pagamentos.all()
        ]

    def get_vendedor_nome(self, obj) -> str:
        if not obj.vendedor:
            return ""
        nome = f"{obj.vendedor.first_name} {obj.vendedor.last_name}".strip()
        return nome or obj.vendedor.email


# =========================================================================
# Trocas e devoluções
# =========================================================================


class ItemDevolucaoSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(source="item_pedido.variacao.sku", read_only=True)
    produto_nome = serializers.CharField(
        source="item_pedido.variacao.produto.nome", read_only=True
    )
    subtotal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = ItemDevolucao
        fields = [
            "id",
            "item_pedido",
            "sku",
            "produto_nome",
            "quantidade",
            "valor_unitario",
            "subtotal",
        ]
        read_only_fields = fields


class DevolucaoSerializer(serializers.ModelSerializer):
    itens = ItemDevolucaoSerializer(many=True, read_only=True)
    credito_disponivel = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    operador_nome = serializers.CharField(source="usuario.email", read_only=True)

    class Meta:
        model = Devolucao
        fields = [
            "id",
            "pedido_origem",
            "pedido_troca",
            "tipo",
            "motivo",
            "valor_total",
            "credito_usado",
            "credito_disponivel",
            "itens",
            "operador_nome",
            "created_at",
        ]
        read_only_fields = fields


class ItemParaDevolverSerializer(serializers.Serializer):
    item = serializers.UUIDField()
    quantidade = serializers.IntegerField(min_value=1)


class RegistrarDevolucaoSerializer(serializers.Serializer):
    pedido = serializers.UUIDField()
    itens = ItemParaDevolverSerializer(many=True)
    tipo = serializers.ChoiceField(choices=TipoDevolucao.choices)
    motivo = serializers.CharField(max_length=200)


class ItemDevolvivelSerializer(serializers.Serializer):
    """Item de uma venda com o saldo ainda passível de devolução."""

    id = serializers.UUIDField()
    sku = serializers.CharField()
    produto_nome = serializers.CharField()
    quantidade = serializers.IntegerField()
    devolvida = serializers.IntegerField()
    disponivel = serializers.IntegerField()
    preco_unitario = serializers.DecimalField(max_digits=10, decimal_places=2)


class VariacaoPDVSerializer(serializers.Serializer):
    """Resultado da busca do PDV: o SKU com preço, saldo e foto."""

    id = serializers.UUIDField()
    sku = serializers.CharField()
    produto = serializers.CharField()
    cor = serializers.CharField()
    tamanho = serializers.CharField()
    preco = serializers.DecimalField(max_digits=10, decimal_places=2)
    saldo = serializers.IntegerField()
    imagem = serializers.CharField(allow_null=True)
