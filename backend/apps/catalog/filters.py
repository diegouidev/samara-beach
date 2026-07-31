"""
Filtros do catálogo.

Produto filtra por atributos de variação (cor, tamanho, faixa de preço) além dos
campos próprios — permite ao storefront filtrar sem N chamadas.
"""
import django_filters as filters

from .models import Produto


class ProdutoFilter(filters.FilterSet):
    # Filtros que atravessam para a variação.
    cor = filters.CharFilter(field_name="variacoes__cor", lookup_expr="iexact")
    tamanho = filters.CharFilter(
        field_name="variacoes__tamanho", lookup_expr="iexact"
    )
    preco_min = filters.NumberFilter(
        field_name="variacoes__preco", lookup_expr="gte"
    )
    preco_max = filters.NumberFilter(
        field_name="variacoes__preco", lookup_expr="lte"
    )

    class Meta:
        model = Produto
        fields = ["categoria", "tipo_origem", "ativo", "cor", "tamanho"]
