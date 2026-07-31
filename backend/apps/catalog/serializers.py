from rest_framework import serializers

from .models import (
    Avaliacao,
    Categoria,
    ImagemProduto,
    Produto,
    TabelaMedidas,
    VariacaoProduto,
)


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ["id", "nome", "slug", "categoria_pai", "ativo", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class ImagemProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagemProduto
        fields = ["id", "variacao", "imagem", "url_externa", "alt_text", "ordem"]
        read_only_fields = ["id"]


class VariacaoProdutoSerializer(serializers.ModelSerializer):
    imagens = ImagemProdutoSerializer(many=True, read_only=True)
    preco_vigente = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = VariacaoProduto
        fields = [
            "id",
            "produto",
            "cor",
            "tamanho",
            "sku",
            "preco",
            "preco_promocional",
            "preco_vigente",
            "peso_gramas",
            "altura_cm",
            "largura_cm",
            "profundidade_cm",
            "custo_medio",
            "estoque_minimo",
            "ativo",
            "imagens",
        ]
        read_only_fields = ["id", "preco_vigente", "imagens"]


class TabelaMedidasSerializer(serializers.ModelSerializer):
    class Meta:
        model = TabelaMedidas
        fields = ["id", "nome", "categoria", "produto", "dados"]
        read_only_fields = ["id"]


class ProdutoSerializer(serializers.ModelSerializer):
    variacoes = VariacaoProdutoSerializer(many=True, read_only=True)

    class Meta:
        model = Produto
        fields = [
            "id",
            "nome",
            "slug",
            "descricao",
            "categoria",
            "tipo_origem",
            "tags",
            "ativo",
            "variacoes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "variacoes", "created_at", "updated_at"]


class ProdutoListSerializer(serializers.ModelSerializer):
    """Versão enxuta para listagens (sem variações aninhadas)."""

    class Meta:
        model = Produto
        fields = ["id", "nome", "slug", "categoria", "tipo_origem", "ativo"]
        read_only_fields = fields


class AvaliacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Avaliacao
        fields = ["id", "produto", "cliente", "nota", "comentario", "aprovada", "created_at"]
        # `aprovada` é gravável (moderação por interno via PATCH); no create,
        # perform_create força aprovada=False. A permissão PodeAvaliar restringe
        # PATCH a atendimento/admin.
        read_only_fields = ["id", "cliente", "created_at"]
