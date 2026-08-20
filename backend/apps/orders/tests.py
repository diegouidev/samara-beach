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


# --- Auditoria ------------------------------------------------------------


def test_auditoria_nao_quebra_idempotencia_da_baixa_de_estoque(
    admin_user, cliente_user, variacao
):
    """
    Regressão: a detecção de reprocessamento em `baixar_estoque` casa texto
    em `MovimentacaoEstoque.observacoes`. A auditoria vive em tabela própria
    justamente para não interferir nisso — se interferisse, o estoque seria
    baixado duas vezes.
    """
    from apps.customers.models import Cliente
    from apps.inventory.models import MovimentacaoEstoque
    from apps.orders.models import ItemPedido, Pedido, StatusPedido
    from apps.orders import services

    pedido = Pedido.objects.create(
        cliente=Cliente.objects.get(usuario=cliente_user),
        status=StatusPedido.AGUARDANDO_PAGAMENTO,
    )
    ItemPedido.objects.create(
        pedido=pedido, variacao=variacao, quantidade=2, preco_unitario="100.00"
    )

    services.mudar_status(pedido, StatusPedido.PAGO, usuario=admin_user)
    baixas = MovimentacaoEstoque.objects.filter(origem="venda").count()

    services.mudar_status(pedido, StatusPedido.EM_SEPARACAO, usuario=admin_user)
    services.mudar_status(pedido, StatusPedido.ENVIADO, usuario=admin_user)
    services.mudar_status(pedido, StatusPedido.ENTREGUE, usuario=admin_user)

    assert MovimentacaoEstoque.objects.filter(origem="venda").count() == baixas


def test_mudanca_de_status_registra_quem_fez(admin_user, cliente_user, variacao):
    from apps.audit.models import AcaoAuditoria, RegistroAuditoria
    from apps.customers.models import Cliente
    from apps.orders.models import ItemPedido, Pedido, StatusPedido
    from apps.orders import services

    pedido = Pedido.objects.create(
        cliente=Cliente.objects.get(usuario=cliente_user),
        status=StatusPedido.AGUARDANDO_PAGAMENTO,
    )
    ItemPedido.objects.create(
        pedido=pedido, variacao=variacao, quantidade=1, preco_unitario="100.00"
    )

    services.mudar_status(pedido, StatusPedido.PAGO, usuario=admin_user)

    reg = RegistroAuditoria.objects.filter(
        acao=AcaoAuditoria.MUDANCA_STATUS
    ).first()
    assert reg.usuario == admin_user
    assert reg.dados["status"]["para"] == StatusPedido.PAGO
    assert reg.dados["baixou_estoque"] is True


# =========================================================================
# Reserva de estoque
# =========================================================================


def _carrinho_com(cliente_user, variacao, quantidade=1):
    """Pedido em carrinho pronto para ser finalizado."""
    from apps.customers.models import Cliente
    from apps.orders.models import ItemPedido, Pedido, StatusPedido

    pedido = Pedido.objects.create(
        cliente=Cliente.objects.get(usuario=cliente_user),
        status=StatusPedido.CARRINHO,
    )
    ItemPedido.objects.create(
        pedido=pedido,
        variacao=variacao,
        quantidade=quantidade,
        preco_unitario="100.00",
    )
    return pedido


def test_finalizar_reserva_o_estoque(api, cliente_user, variacao):
    """Sem reserva, a peça continuava vendável até alguém confirmar o pagamento."""
    from apps.orders.models import ReservaEstoque
    from apps.orders.reservas import disponivel

    pedido = _carrinho_com(cliente_user, variacao, quantidade=3)
    auth(api, cliente_user)
    resposta = api.post(f"/api/pedidos/{pedido.id}/finalizar/")

    assert resposta.status_code == 200
    assert ReservaEstoque.objects.filter(pedido=pedido).count() == 1
    # Saldo físico intacto (nada saiu da prateleira), disponível menor.
    assert saldo_atual(variacao.id) == 10
    assert disponivel(variacao.id) == 7


def test_nao_finaliza_sem_estoque_disponivel(api, cliente_user, variacao):
    """
    O segundo cliente não consegue fechar a mesma peça — é exatamente a venda
    duplicada que a reserva existe para impedir.
    """
    from apps.accounts.models import TipoUsuario, User
    from apps.customers.models import Cliente
    from apps.orders.models import StatusPedido

    primeiro = _carrinho_com(cliente_user, variacao, quantidade=10)
    auth(api, cliente_user)
    assert api.post(f"/api/pedidos/{primeiro.id}/finalizar/").status_code == 200

    outro = User.objects.create_user(
        email="outro@test.com", password="senha12345", tipo=TipoUsuario.CLIENTE
    )
    Cliente.objects.create(usuario=outro, nome="Outro")
    segundo = _carrinho_com(outro, variacao, quantidade=1)

    api.credentials()
    auth(api, outro)
    resposta = api.post(f"/api/pedidos/{segundo.id}/finalizar/")

    assert resposta.status_code == 400
    assert "Estoque insuficiente" in str(resposta.json())
    segundo.refresh_from_db()
    assert segundo.status == StatusPedido.CARRINHO


def test_pagamento_libera_a_reserva_e_baixa_o_estoque(
    api, admin_user, cliente_user, variacao
):
    from apps.orders import services
    from apps.orders.models import ReservaEstoque, StatusPedido

    pedido = _carrinho_com(cliente_user, variacao, quantidade=2)
    auth(api, cliente_user)
    api.post(f"/api/pedidos/{pedido.id}/finalizar/")
    assert ReservaEstoque.objects.filter(pedido=pedido).exists()

    pedido.refresh_from_db()
    services.mudar_status(pedido, StatusPedido.PAGO, usuario=admin_user)

    # A reserva sai porque o estoque saiu de verdade — não some sem baixa.
    assert not ReservaEstoque.objects.filter(pedido=pedido).exists()
    assert saldo_atual(variacao.id) == 8


def test_cancelamento_libera_a_reserva(api, admin_user, cliente_user, variacao):
    from apps.orders import services
    from apps.orders.models import ReservaEstoque, StatusPedido
    from apps.orders.reservas import disponivel

    pedido = _carrinho_com(cliente_user, variacao, quantidade=4)
    auth(api, cliente_user)
    api.post(f"/api/pedidos/{pedido.id}/finalizar/")

    pedido.refresh_from_db()
    services.mudar_status(pedido, StatusPedido.CANCELADO, usuario=admin_user)

    assert not ReservaEstoque.objects.filter(pedido=pedido).exists()
    assert disponivel(variacao.id) == 10


def test_reserva_vencida_nao_bloqueia(db, cliente_user, variacao):
    """Passado o prazo, a peça volta a ser vendável sozinha."""
    from django.utils import timezone

    from apps.orders.models import ReservaEstoque
    from apps.orders.reservas import disponivel

    pedido = _carrinho_com(cliente_user, variacao, quantidade=10)
    ReservaEstoque.objects.create(
        pedido=pedido,
        variacao=variacao,
        quantidade=10,
        expira_em=timezone.now() - timezone.timedelta(minutes=1),
    )
    assert disponivel(variacao.id) == 10


def test_expurgo_remove_so_as_vencidas(db, cliente_user, variacao):
    from django.utils import timezone

    from apps.orders.models import ReservaEstoque
    from apps.orders.reservas import expurgar_reservas_vencidas

    pedido = _carrinho_com(cliente_user, variacao)
    ReservaEstoque.objects.create(
        pedido=pedido, variacao=variacao, quantidade=1,
        expira_em=timezone.now() - timezone.timedelta(hours=1),
    )
    valida = ReservaEstoque.objects.create(
        pedido=pedido, variacao=variacao, quantidade=1,
        expira_em=timezone.now() + timezone.timedelta(hours=1),
    )

    assert expurgar_reservas_vencidas() == 1
    assert ReservaEstoque.objects.filter(pk=valida.pk).exists()


def test_pdv_vende_peca_reservada(api, admin_user, cliente_user, variacao):
    """
    A peça reservada está na loja: se a cliente veio comprar presencialmente,
    o balcão vende. A reserva avisa, não bloqueia.
    """
    from apps.orders.reservas import quantidade_reservada

    pedido = _carrinho_com(cliente_user, variacao, quantidade=10)
    auth(api, cliente_user)
    api.post(f"/api/pedidos/{pedido.id}/finalizar/")

    api.credentials()
    auth(api, admin_user)
    resultados = api.get("/api/pdv/buscar/", {"q": variacao.sku}).json()

    assert resultados[0]["saldo"] == 10
    assert resultados[0]["reservado"] == 10
    assert quantidade_reservada(variacao.id) == 10
