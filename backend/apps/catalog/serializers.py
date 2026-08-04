from django.utils.text import slugify
from rest_framework import serializers

from apps.common.serializers import RelativeImageField

from .models import (
    Avaliacao,
    Categoria,
    ImagemProduto,
    Produto,
    TabelaMedidas,
    VariacaoProduto,
)


class CategoriaSerializer(serializers.ModelSerializer):
    total_produtos = serializers.SerializerMethodField()
    categoria_pai_nome = serializers.CharField(
        source="categoria_pai.nome", read_only=True, default=None
    )
    imagem = RelativeImageField(required=False, allow_null=True)

    class Meta:
        model = Categoria
        fields = [
            "id",
            "nome",
            "slug",
            "categoria_pai",
            "categoria_pai_nome",
            "imagem",
            "ordem",
            "destaque",
            "ativo",
            "total_produtos",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "categoria_pai_nome",
            "total_produtos",
            "created_at",
            "updated_at",
        ]

    def get_total_produtos(self, obj) -> int:
        # Anotado no queryset da view; o fallback cobre uso fora dela.
        total = getattr(obj, "total_produtos_anotado", None)
        return total if total is not None else obj.produtos.count()

    def validate(self, attrs):
        pai = attrs.get("categoria_pai")
        if pai and self.instance and pai.pk == self.instance.pk:
            raise serializers.ValidationError(
                {"categoria_pai": "Uma categoria não pode ser pai de si mesma."}
            )
        return attrs


class ImagemProdutoSerializer(serializers.ModelSerializer):
    imagem = RelativeImageField(required=False, allow_null=True)

    class Meta:
        model = ImagemProduto
        fields = ["id", "variacao", "imagem", "url_externa", "alt_text", "ordem"]
        read_only_fields = ["id"]


def gerar_sku(produto, cor: str, tamanho: str) -> str:
    """
    SKU legível derivado do produto + variação (ex.: BIQUINI-LUA-VERM-M).
    Acrescenta sufixo numérico se já existir.
    """
    partes = [slugify(produto.nome)[:20]]
    if cor:
        partes.append(slugify(cor)[:6])
    if tamanho:
        partes.append(slugify(tamanho)[:6])
    base = "-".join(p for p in partes if p).upper() or "SKU"

    candidato, contador = base, 2
    while VariacaoProduto.all_objects.filter(sku=candidato).exists():
        candidato = f"{base}-{contador}"
        contador += 1
    return candidato[:60]


class VariacaoProdutoSerializer(serializers.ModelSerializer):
    imagens = ImagemProdutoSerializer(many=True, read_only=True)
    preco_vigente = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    # Opcional: quando o painel cria variações em lote, o SKU é gerado aqui.
    sku = serializers.CharField(max_length=60, required=False, allow_blank=True)
    produto_nome = serializers.CharField(source="produto.nome", read_only=True)

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
            "produto_nome",
        ]
        read_only_fields = ["id", "preco_vigente", "imagens", "produto_nome"]

    def validate_sku(self, value):
        value = (value or "").strip().upper()
        if not value:
            return value
        existente = VariacaoProduto.all_objects.filter(sku=value)
        if self.instance:
            existente = existente.exclude(pk=self.instance.pk)
        if existente.exists():
            raise serializers.ValidationError("Já existe uma variação com este SKU.")
        return value

    def validate(self, attrs):
        preco = attrs.get("preco", getattr(self.instance, "preco", None))
        promocional = attrs.get(
            "preco_promocional", getattr(self.instance, "preco_promocional", None)
        )
        if preco is not None and promocional is not None and promocional >= preco:
            raise serializers.ValidationError(
                {"preco_promocional": "O preço promocional deve ser menor que o preço."}
            )
        return attrs

    def create(self, validated_data):
        if not validated_data.get("sku"):
            validated_data["sku"] = gerar_sku(
                validated_data["produto"],
                validated_data.get("cor", ""),
                validated_data.get("tamanho", ""),
            )
        return super().create(validated_data)


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
    """
    Versão enxuta para listagens: sem as variações aninhadas, mas com o
    resumo que a listagem precisa mostrar (miniatura, faixa de preço, nº de SKUs).
    """

    categoria_nome = serializers.CharField(source="categoria.nome", read_only=True)
    imagem_principal = serializers.SerializerMethodField()
    preco_minimo = serializers.SerializerMethodField()
    preco_original = serializers.SerializerMethodField()
    preco_promocional = serializers.SerializerMethodField()
    total_variacoes = serializers.SerializerMethodField()
    tamanhos = serializers.SerializerMethodField()
    variacao_destaque = serializers.SerializerMethodField()

    class Meta:
        model = Produto
        fields = [
            "id",
            "nome",
            "slug",
            "categoria",
            "categoria_nome",
            "tipo_origem",
            "ativo",
            "imagem_principal",
            "preco_minimo",
            "preco_original",
            "preco_promocional",
            "total_variacoes",
            "tamanhos",
            "variacao_destaque",
        ]
        read_only_fields = fields

    def _variacoes(self, obj):
        # As variações vêm de prefetch_related na view — sem query extra aqui.
        return list(obj.variacoes.all())

    def _destaque(self, obj):
        """A variação mais barata em exibição — é ela que a vitrine mostra."""
        ativas = [v for v in self._variacoes(obj) if v.ativo] or self._variacoes(obj)
        if not ativas:
            return None
        return min(ativas, key=lambda v: v.preco_vigente)

    def get_imagem_principal(self, obj) -> str | None:
        # Prioriza as fotos da variação em destaque; cai para qualquer outra.
        destaque = self._destaque(obj)
        ordenadas = self._variacoes(obj)
        if destaque:
            ordenadas = [destaque] + [v for v in ordenadas if v.pk != destaque.pk]
        for variacao in ordenadas:
            for imagem in sorted(variacao.imagens.all(), key=lambda i: i.ordem):
                if imagem.imagem:
                    return imagem.imagem.url
                if imagem.url_externa:
                    return imagem.url_externa
        return None

    def get_preco_minimo(self, obj) -> str | None:
        destaque = self._destaque(obj)
        return str(destaque.preco_vigente) if destaque else None

    def get_preco_original(self, obj) -> str | None:
        destaque = self._destaque(obj)
        return str(destaque.preco) if destaque else None

    def get_preco_promocional(self, obj) -> str | None:
        destaque = self._destaque(obj)
        if destaque and destaque.preco_promocional:
            return str(destaque.preco_promocional)
        return None

    def get_total_variacoes(self, obj) -> int:
        return len(self._variacoes(obj))

    def get_tamanhos(self, obj) -> list[str]:
        vistos = {v.tamanho for v in self._variacoes(obj) if v.tamanho}
        return sorted(vistos)

    def get_variacao_destaque(self, obj) -> dict | None:
        """
        A variação exibida no card. Com um SKU só, a vitrine consegue
        adicionar ao carrinho direto — sem abrir a página do produto.
        """
        destaque = self._destaque(obj)
        if destaque is None:
            return None
        return {
            "id": str(destaque.id),
            "sku": destaque.sku,
            "cor": destaque.cor,
            "tamanho": destaque.tamanho,
        }


class AvaliacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Avaliacao
        fields = ["id", "produto", "cliente", "nota", "comentario", "aprovada", "created_at"]
        # `aprovada` é gravável (moderação por interno via PATCH); no create,
        # perform_create força aprovada=False. A permissão PodeAvaliar restringe
        # PATCH a atendimento/admin.
        read_only_fields = ["id", "cliente", "created_at"]
