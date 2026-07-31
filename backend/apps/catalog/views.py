from rest_framework import viewsets
from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import PapelInterno
from apps.common.permissions import ReadOnlyOrInternalRole


class PodeAvaliar(BasePermission):
    """
    Leitura pública; criação por cliente autenticado; edição/moderação por
    interno atendimento/admin.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method == "POST":
            # Cliente pode criar avaliação.
            return True
        # PUT/PATCH/DELETE: só interno atendimento/admin.
        return getattr(user, "is_interno", False) and user.papel in (
            PapelInterno.ATENDIMENTO,
            PapelInterno.ADMIN,
        )

from .filters import ProdutoFilter
from .models import (
    Avaliacao,
    Categoria,
    ImagemProduto,
    Produto,
    TabelaMedidas,
    VariacaoProduto,
)
from .serializers import (
    AvaliacaoSerializer,
    CategoriaSerializer,
    ImagemProdutoSerializer,
    ProdutoListSerializer,
    ProdutoSerializer,
    TabelaMedidasSerializer,
    VariacaoProdutoSerializer,
)

# Escrita no catálogo: admin ou papel estoque (quem cadastra produto).
CATALOG_WRITE_ROLES = [PapelInterno.ESTOQUE, PapelInterno.ADMIN]


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [ReadOnlyOrInternalRole]
    write_roles = CATALOG_WRITE_ROLES
    lookup_field = "slug"
    filterset_fields = ["ativo", "categoria_pai"]
    search_fields = ["nome", "slug"]
    ordering_fields = ["nome", "created_at"]


class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = (
        Produto.objects.select_related("categoria")
        .prefetch_related("variacoes__imagens")
        .all()
    )
    permission_classes = [ReadOnlyOrInternalRole]
    write_roles = CATALOG_WRITE_ROLES
    lookup_field = "slug"
    filterset_class = ProdutoFilter
    search_fields = ["nome", "slug", "descricao"]
    ordering_fields = ["nome", "created_at"]

    def filter_queryset(self, queryset):
        # Filtros por variação (cor/tamanho/preço) usam JOIN e podem duplicar
        # produtos; distinct() garante um por produto.
        return super().filter_queryset(queryset).distinct()

    def get_serializer_class(self):
        if self.action == "list":
            return ProdutoListSerializer
        return ProdutoSerializer


class VariacaoProdutoViewSet(viewsets.ModelViewSet):
    queryset = VariacaoProduto.objects.select_related("produto").prefetch_related("imagens")
    serializer_class = VariacaoProdutoSerializer
    permission_classes = [ReadOnlyOrInternalRole]
    write_roles = CATALOG_WRITE_ROLES
    filterset_fields = ["produto", "cor", "tamanho", "ativo"]
    search_fields = ["sku", "produto__nome"]
    ordering_fields = ["preco", "created_at"]


class ImagemProdutoViewSet(viewsets.ModelViewSet):
    queryset = ImagemProduto.objects.all()
    serializer_class = ImagemProdutoSerializer
    permission_classes = [ReadOnlyOrInternalRole]
    write_roles = CATALOG_WRITE_ROLES
    filterset_fields = ["variacao"]


class TabelaMedidasViewSet(viewsets.ModelViewSet):
    queryset = TabelaMedidas.objects.all()
    serializer_class = TabelaMedidasSerializer
    permission_classes = [ReadOnlyOrInternalRole]
    write_roles = CATALOG_WRITE_ROLES
    filterset_fields = ["categoria", "produto"]


class AvaliacaoViewSet(viewsets.ModelViewSet):
    """
    Avaliações de produto.

    - Leitura: pública (só aprovadas); internos veem todas.
    - Criar: cliente autenticado avalia (entra como não-aprovada, aguardando moderação).
    - Editar/excluir/aprovar: interno atendimento/admin.
    """

    queryset = Avaliacao.objects.select_related("produto", "cliente")
    serializer_class = AvaliacaoSerializer
    permission_classes = [PodeAvaliar]
    filterset_fields = ["produto", "nota", "aprovada"]
    ordering_fields = ["created_at", "nota"]

    def get_queryset(self):
        qs = super().get_queryset()
        # Público só vê avaliações aprovadas; internos veem todas.
        user = self.request.user
        if not (user.is_authenticated and getattr(user, "is_interno", False)):
            qs = qs.filter(aprovada=True)
        return qs

    def perform_create(self, serializer):
        # A avaliação é vinculada ao cliente logado e entra pendente de moderação.
        serializer.save(cliente=self.request.user, aprovada=False)
