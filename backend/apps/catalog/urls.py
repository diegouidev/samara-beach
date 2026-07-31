from rest_framework.routers import DefaultRouter

from .views import (
    AvaliacaoViewSet,
    CategoriaViewSet,
    ImagemProdutoViewSet,
    ProdutoViewSet,
    TabelaMedidasViewSet,
    VariacaoProdutoViewSet,
)

router = DefaultRouter()
router.register("categorias", CategoriaViewSet, basename="categoria")
router.register("produtos", ProdutoViewSet, basename="produto")
router.register("variacoes", VariacaoProdutoViewSet, basename="variacao")
router.register("imagens", ImagemProdutoViewSet, basename="imagem")
router.register("tabelas-medidas", TabelaMedidasViewSet, basename="tabela-medidas")
router.register("avaliacoes", AvaliacaoViewSet, basename="avaliacao")

urlpatterns = router.urls
