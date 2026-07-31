import pytest
from rest_framework.test import APIClient

from apps.accounts.models import PapelInterno, TipoUsuario, User
from apps.catalog.models import Categoria, Produto, TipoOrigem, VariacaoProduto
from apps.customers.models import Cliente
from apps.inventory.models import MovimentacaoEstoque


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email="admin@test.com",
        password="senha12345",
        tipo=TipoUsuario.INTERNO,
        papel=PapelInterno.ADMIN,
        is_staff=True,
    )


@pytest.fixture
def cliente_user(db):
    user = User.objects.create_user(
        email="cli@test.com", password="senha12345", tipo=TipoUsuario.CLIENTE
    )
    Cliente.objects.create(usuario=user, nome="Cli Teste")
    return user


@pytest.fixture
def variacao(db):
    cat = Categoria.objects.create(nome="Biquínis", slug="biquinis")
    prod = Produto.objects.create(
        nome="Biquíni X", slug="biquini-x", categoria=cat,
        tipo_origem=TipoOrigem.PRODUCAO_PROPRIA,
    )
    var = VariacaoProduto.objects.create(
        produto=prod, cor="Azul", tamanho="M", sku="BIK-X-AZ-M",
        preco="100.00", custo_medio="40.00", estoque_minimo=5,
    )
    MovimentacaoEstoque.objects.create(
        variacao=var, tipo="entrada", origem="ajuste",
        quantidade=10, saldo_resultante=10,
    )
    return var


def auth(api, user):
    from rest_framework_simplejwt.tokens import RefreshToken

    token = RefreshToken.for_user(user).access_token
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api
