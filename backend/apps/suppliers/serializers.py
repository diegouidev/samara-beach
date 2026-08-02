from rest_framework import serializers

from . import services
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
            "razao_social",
            "nome_fantasia",
            "contato_nome",
            "email",
            "telefone",
            "cep",
            "logradouro",
            "numero",
            "complemento",
            "bairro",
            "cidade",
            "uf",
            "prazo_medio_entrega_dias",
            "observacoes",
            "ativo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_cnpj(self, value):
        """Aceita com ou sem máscara; grava sempre formatado."""
        if not value:
            return ""
        if not services.cnpj_valido(value):
            raise serializers.ValidationError("CNPJ inválido.")

        formatado = services.formatar_cnpj(value)
        duplicado = Fornecedor.objects.filter(cnpj=formatado)
        if self.instance:
            duplicado = duplicado.exclude(pk=self.instance.pk)
        if duplicado.exists():
            raise serializers.ValidationError(
                "Já existe um fornecedor cadastrado com este CNPJ."
            )
        return formatado


class ConsultaCNPJSerializer(serializers.Serializer):
    """Resposta da consulta de CNPJ (somente leitura, não persiste nada)."""

    cnpj = serializers.CharField()
    nome = serializers.CharField()
    razao_social = serializers.CharField()
    nome_fantasia = serializers.CharField(allow_blank=True)
    email = serializers.CharField(allow_blank=True)
    telefone = serializers.CharField(allow_blank=True)
    cep = serializers.CharField(allow_blank=True)
    logradouro = serializers.CharField(allow_blank=True)
    numero = serializers.CharField(allow_blank=True)
    complemento = serializers.CharField(allow_blank=True)
    bairro = serializers.CharField(allow_blank=True)
    cidade = serializers.CharField(allow_blank=True)
    uf = serializers.CharField(allow_blank=True)
    situacao_cadastral = serializers.CharField(allow_blank=True)
    atividade_principal = serializers.CharField(allow_blank=True)


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
    fornecedor_nome = serializers.CharField(
        source="fornecedor.nome", read_only=True, default=""
    )
    categoria_label = serializers.CharField(
        source="get_categoria_display", read_only=True
    )
    # O status gravado nunca vira "vencida" sozinho — quem manda na tela é este.
    status_efetivo = serializers.CharField(read_only=True)
    titulo = serializers.CharField(read_only=True)

    class Meta:
        model = ContaPagar
        fields = [
            "id",
            "fornecedor",
            "fornecedor_nome",
            "pedido_compra",
            "categoria",
            "categoria_label",
            "titulo",
            "descricao",
            "valor",
            "vencimento",
            "pago_em",
            "status",
            "status_efetivo",
            "recorrente",
            "conta_origem",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "fornecedor_nome",
            "categoria_label",
            "titulo",
            "status_efetivo",
            "conta_origem",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        # Sem fornecedor e sem descrição a conta fica sem identificação nenhuma
        # na listagem — exige ao menos um dos dois.
        fornecedor = attrs.get(
            "fornecedor", getattr(self.instance, "fornecedor", None)
        )
        descricao = attrs.get(
            "descricao", getattr(self.instance, "descricao", "")
        )
        if not fornecedor and not (descricao or "").strip():
            raise serializers.ValidationError(
                {"descricao": "Descreva a despesa (ex.: 'Energia — julho')."}
            )
        return attrs


class PagarContaSerializer(serializers.Serializer):
    pago_em = serializers.DateField(required=False, allow_null=True)
