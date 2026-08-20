"""
Kill switch da loja online (`LOJA_ONLINE_ATIVA`).

Regra: com a loja desligada, o público e o cliente perdem acesso; o usuário
interno não sente diferença nenhuma — painel, PDV e caixa seguem iguais.
"""
import pytest
from django.test import override_settings

from apps.catalog.models import Categoria
from apps.conftest import auth

pytestmark = pytest.mark.django_db

LOJA_OFF = override_settings(LOJA_ONLINE_ATIVA=False)
LOJA_ON = override_settings(LOJA_ONLINE_ATIVA=True)

TOKEN = "/api/auth/token/"


@pytest.fixture(autouse=True)
def sem_throttle(settings):
    """A suíte estoura o limite anônimo de 60/min; irrelevante para o teste."""
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {"anon": None, "user": None},
    }


# --- Catálogo público -----------------------------------------------------


@LOJA_ON
def test_catalogo_publico_com_loja_ligada(api):
    assert api.get("/api/produtos/").status_code == 200


@LOJA_OFF
def test_catalogo_publico_bloqueado_com_loja_desligada(api):
    resposta = api.get("/api/produtos/")
    assert resposta.status_code == 503
    assert resposta.json()["detail"].startswith("A loja online está")


@LOJA_OFF
@pytest.mark.parametrize("rota", ["/api/categorias/", "/api/variacoes/", "/api/imagens/"])
def test_rotas_de_catalogo_bloqueadas_com_loja_desligada(api, rota):
    assert api.get(rota).status_code == 503


# --- O interno não sente o kill switch ------------------------------------


@LOJA_OFF
def test_interno_le_catalogo_com_loja_desligada(api, admin_user):
    """O painel usa as mesmas rotas do storefront — não pode ser afetado."""
    auth(api, admin_user)
    assert api.get("/api/produtos/").status_code == 200


@LOJA_OFF
def test_interno_escreve_catalogo_com_loja_desligada(api, admin_user):
    auth(api, admin_user)
    resposta = api.post(
        "/api/categorias/", {"nome": "Novidades", "slug": "novidades"}, format="json"
    )
    assert resposta.status_code == 201


@LOJA_OFF
def test_pdv_funciona_com_loja_desligada(api, admin_user):
    auth(api, admin_user)
    assert api.get("/api/caixa/sessoes/atual/").status_code == 200


@LOJA_OFF
def test_estoque_funciona_com_loja_desligada(api, admin_user, variacao):
    auth(api, admin_user)
    resposta = api.post(
        "/api/movimentacoes/",
        {
            "variacao": str(variacao.id),
            "tipo": "entrada",
            "origem": "ajuste",
            "quantidade": 5,
        },
        format="json",
    )
    assert resposta.status_code == 201


# --- Rotas que alimentam a página institucional ---------------------------


@LOJA_OFF
def test_branding_publico_continua_com_loja_desligada(api):
    """É por aqui que o storefront descobre que está desligado."""
    assert api.get("/api/branding/").status_code == 200


@LOJA_OFF
def test_branding_expoe_flag_desligada(api):
    assert api.get("/api/branding/").json()["loja_online_ativa"] is False


@LOJA_ON
def test_branding_expoe_flag_ligada(api):
    assert api.get("/api/branding/").json()["loja_online_ativa"] is True


@LOJA_OFF
def test_empresa_publica_continua_com_loja_desligada(api):
    """A institucional precisa de endereço, horário e redes sociais."""
    assert api.get("/api/empresa/publica/").status_code == 200


def test_flag_nao_e_editavel_pelo_painel(api, admin_user):
    """A cliente não pode ligar a loja pelo painel — só quem tem SSH."""
    auth(api, admin_user)
    resposta = api.patch(
        "/api/branding/", {"loja_online_ativa": False}, format="json"
    )
    assert resposta.status_code == 200
    # Ignorado em silêncio: o campo não existe no serializer de escrita.
    assert api.get("/api/branding/").json()["loja_online_ativa"] is True


# --- Cadastro e login -----------------------------------------------------


@LOJA_OFF
def test_registro_de_cliente_bloqueado_com_loja_desligada(api):
    resposta = api.post(
        "/api/clientes/registro/",
        {"email": "nova@test.com", "password": "umaSenhaBoa123", "nome": "Nova"},
        format="json",
    )
    assert resposta.status_code == 503


@LOJA_OFF
def test_login_de_cliente_bloqueado_com_loja_desligada(api, cliente_user):
    resposta = api.post(
        TOKEN, {"email": cliente_user.email, "password": "senha12345"}, format="json"
    )
    assert resposta.status_code == 503


@LOJA_OFF
def test_login_interno_funciona_com_loja_desligada(api, admin_user):
    resposta = api.post(
        TOKEN, {"email": admin_user.email, "password": "senha12345"}, format="json"
    )
    assert resposta.status_code == 200
    assert "access" in resposta.json()


@LOJA_OFF
def test_senha_errada_nao_vaza_estado_da_loja(api, cliente_user):
    """
    401, não 503: senão dá para descobrir que o e-mail existe testando
    a diferença entre as respostas.
    """
    resposta = api.post(
        TOKEN, {"email": cliente_user.email, "password": "errada"}, format="json"
    )
    assert resposta.status_code == 401


# --- Pedidos: cliente perde, painel mantém --------------------------------


@LOJA_OFF
def test_cliente_nao_acessa_carrinho_com_loja_desligada(api, cliente_user):
    auth(api, cliente_user)
    assert api.get("/api/pedidos/carrinho/").status_code == 503


@LOJA_OFF
def test_interno_lista_pedidos_com_loja_desligada(api, admin_user):
    """O histórico de vendas online não some do painel."""
    auth(api, admin_user)
    assert api.get("/api/pedidos/").status_code == 200


@LOJA_OFF
def test_interno_muda_status_de_pedido_online_com_loja_desligada(
    api, admin_user, cliente_user, variacao
):
    """
    Desligar a loja não pode travar a finalização dos pedidos já recebidos.
    """
    from apps.customers.models import Cliente
    from apps.orders.models import ItemPedido, Pedido, StatusPedido

    pedido = Pedido.objects.create(
        cliente=Cliente.objects.get(usuario=cliente_user),
        status=StatusPedido.AGUARDANDO_PAGAMENTO,
    )
    ItemPedido.objects.create(
        pedido=pedido, variacao=variacao, quantidade=1, preco_unitario="100.00"
    )

    auth(api, admin_user)
    resposta = api.post(
        f"/api/pedidos/{pedido.id}/mudar-status/", {"status": "pago"}, format="json"
    )
    assert resposta.status_code == 200
    pedido.refresh_from_db()
    assert pedido.status == StatusPedido.PAGO
