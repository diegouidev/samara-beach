from decimal import Decimal

import pytest

from apps.conftest import auth
from apps.inventory.views import saldo_atual
from apps.orders.models import Cupom, StatusPedido, TipoCupom

pytestmark = pytest.mark.django_db


def _add_item(api, pedido_id, variacao_id, qtd):
    return api.post(
        f"/api/pedidos/{pedido_id}/itens/",
        {"variacao": str(variacao_id), "quantidade": qtd},
        format="json",
    )


def test_carrinho_e_totais(api, cliente_user, variacao):
    auth(api, cliente_user)
    pedido = api.post("/api/pedidos/carrinho/").json()
    resp = _add_item(api, pedido["id"], variacao.id, 3)
    assert resp.status_code == 200
    assert Decimal(resp.json()["subtotal"]) == Decimal("300.00")
    assert Decimal(resp.json()["total"]) == Decimal("300.00")


def test_aplicar_cupom_percentual(api, cliente_user, variacao):
    Cupom.objects.create(
        codigo="OFF10", tipo=TipoCupom.PERCENTUAL, valor="10.00", ativo=True
    )
    auth(api, cliente_user)
    pedido = api.post("/api/pedidos/carrinho/").json()
    _add_item(api, pedido["id"], variacao.id, 2)  # subtotal 200
    resp = api.post(
        f"/api/pedidos/{pedido['id']}/aplicar-cupom/",
        {"codigo": "OFF10"},
        format="json",
    )
    assert resp.status_code == 200
    assert Decimal(resp.json()["desconto"]) == Decimal("20.00")
    assert Decimal(resp.json()["total"]) == Decimal("180.00")


def test_cliente_nao_muda_status(api, cliente_user, variacao):
    auth(api, cliente_user)
    pedido = api.post("/api/pedidos/carrinho/").json()
    _add_item(api, pedido["id"], variacao.id, 1)
    resp = api.post(
        f"/api/pedidos/{pedido['id']}/mudar-status/",
        {"status": StatusPedido.PAGO},
        format="json",
    )
    assert resp.status_code == 403


def test_admin_muda_status_baixa_estoque_idempotente(
    api, cliente_user, admin_user, variacao
):
    # Cliente monta o carrinho
    auth(api, cliente_user)
    pedido = api.post("/api/pedidos/carrinho/").json()
    _add_item(api, pedido["id"], variacao.id, 3)
    assert saldo_atual(variacao.id) == 10

    # Admin confirma -> baixa 3
    auth(api, admin_user)
    resp = api.post(
        f"/api/pedidos/{pedido['id']}/mudar-status/",
        {"status": StatusPedido.PAGO},
        format="json",
    )
    assert resp.status_code == 200
    assert saldo_atual(variacao.id) == 7

    # Nova transição não baixa de novo
    api.post(
        f"/api/pedidos/{pedido['id']}/mudar-status/",
        {"status": StatusPedido.EM_SEPARACAO},
        format="json",
    )
    assert saldo_atual(variacao.id) == 7


def test_nao_edita_pedido_fora_do_carrinho(api, cliente_user, admin_user, variacao):
    auth(api, cliente_user)
    pedido = api.post("/api/pedidos/carrinho/").json()
    _add_item(api, pedido["id"], variacao.id, 1)

    auth(api, admin_user)
    api.post(
        f"/api/pedidos/{pedido['id']}/mudar-status/",
        {"status": StatusPedido.PAGO},
        format="json",
    )

    auth(api, cliente_user)
    resp = _add_item(api, pedido["id"], variacao.id, 1)
    assert resp.status_code == 400
