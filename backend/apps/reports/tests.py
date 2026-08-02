"""Testes do módulo de relatórios e do fechamento pelo WhatsApp."""
from decimal import Decimal

import pytest

from apps.conftest import auth
from apps.orders.models import StatusPedido

pytestmark = pytest.mark.django_db


def _vender_no_balcao(api, variacao, quantidade=2, preco="100.00"):
    api.post("/api/caixa/sessoes/abrir/", {"valor_abertura": "0.00"}, format="json")
    total = Decimal(preco) * quantidade
    return api.post(
        "/api/pdv/vendas/",
        {
            "itens": [{"variacao": str(variacao.id), "quantidade": quantidade}],
            "pagamentos": [{"metodo": "dinheiro", "valor": str(total)}],
        },
        format="json",
    ).json()


# =========================================================================
# Venda de balcão nasce entregue
# =========================================================================


def test_venda_de_balcao_ja_nasce_entregue(api, admin_user, variacao):
    auth(api, admin_user)
    venda = _vender_no_balcao(api, variacao)
    assert venda["status"] == StatusPedido.ENTREGUE


# =========================================================================
# Relatórios
# =========================================================================


def test_relatorio_vendas_agrega_por_canal_e_vendedor(api, admin_user, variacao):
    auth(api, admin_user)
    _vender_no_balcao(api, variacao)

    r = api.get("/api/relatorios/vendas/").json()
    assert r["total_pedidos"] == 1
    assert Decimal(r["total_vendido"]) == Decimal("200.00")
    assert r["pecas_vendidas"] == 2
    assert Decimal(r["ticket_medio"]) == Decimal("200.00")

    canais = {linha["canal"]: linha for linha in r["por_canal"]}
    assert Decimal(canais["presencial"]["total"]) == Decimal("200.00")

    # O balcão registra quem vendeu; o online cairia em "Loja online".
    assert r["por_vendedor"][0]["vendedor"] == admin_user.email
    assert r["por_pagamento"][0]["metodo"] == "dinheiro"
    assert len(r["por_dia"]) == 1


def test_relatorio_produtos_classifica_curva_abc(api, admin_user, variacao):
    auth(api, admin_user)
    _vender_no_balcao(api, variacao)

    r = api.get("/api/relatorios/produtos/").json()
    linha = r["ranking"][0]
    assert linha["sku"] == variacao.sku
    assert linha["unidades"] == 2
    assert Decimal(linha["receita"]) == Decimal("200.00")
    # custo_medio da fixture é 40 → custo 80, margem 120 (60%).
    assert Decimal(linha["custo"]) == Decimal("80.00")
    assert Decimal(linha["margem_percentual"]) == Decimal("60.00")
    # Único produto vendido: concentra 100% da receita, logo curva A.
    assert linha["curva"] == "A"
    assert Decimal(linha["participacao"]) == Decimal("100.00")


def test_relatorio_produtos_lista_estoque_parado(api, admin_user, variacao):
    """SKU com saldo e sem venda no período entra como parado."""
    auth(api, admin_user)
    r = api.get("/api/relatorios/produtos/").json()

    parados = {p["sku"] for p in r["parados"]}
    assert variacao.sku in parados
    assert r["unidades_em_estoque"] == 10  # saldo da fixture
    assert Decimal(r["valor_em_estoque"]) == Decimal("400.00")  # 10 × 40


def test_relatorio_clientes_separa_identificadas_de_anonimas(
    api, admin_user, cliente_user, variacao
):
    auth(api, admin_user)
    cliente = cliente_user.cliente
    api.post("/api/caixa/sessoes/abrir/", {"valor_abertura": "0.00"}, format="json")
    api.post(
        "/api/pdv/vendas/",
        {
            "itens": [{"variacao": str(variacao.id), "quantidade": 1}],
            "pagamentos": [{"metodo": "pix", "valor": "100.00"}],
            "cliente": str(cliente.id),
        },
        format="json",
    )
    # Segunda venda sem identificar a cliente.
    api.post(
        "/api/pdv/vendas/",
        {
            "itens": [{"variacao": str(variacao.id), "quantidade": 1}],
            "pagamentos": [{"metodo": "pix", "valor": "100.00"}],
        },
        format="json",
    )

    r = api.get("/api/relatorios/clientes/").json()
    assert r["vendas_identificadas"] == 1
    assert r["vendas_anonimas"] == 1
    assert r["ranking"][0]["cliente"] == cliente.nome
    assert Decimal(r["ranking"][0]["gasto"]) == Decimal("100.00")


def test_relatorio_financeiro_traz_fluxo_e_turnos(api, admin_user, variacao):
    auth(api, admin_user)
    _vender_no_balcao(api, variacao)

    r = api.get("/api/relatorios/financeiro/").json()
    assert Decimal(r["total_entradas"]) == Decimal("200.00")
    assert len(r["fluxo"]) == 1
    assert r["turnos"][0]["operador"] == admin_user.email
    assert r["turnos"][0]["status"] == "aberta"


def test_relatorio_desconhecido_e_recusado(api, admin_user):
    auth(api, admin_user)
    assert api.get("/api/relatorios/inventado/").status_code == 400


def test_exportacao_csv(api, admin_user, variacao):
    auth(api, admin_user)
    _vender_no_balcao(api, variacao)

    resp = api.get("/api/relatorios/vendas/?formato=csv&bloco=por_canal")
    assert resp.status_code == 200
    assert resp["Content-Type"].startswith("text/csv")
    assert "attachment" in resp["Content-Disposition"]

    conteudo = resp.content.decode("utf-8")
    # BOM: sem ele o Excel abre os acentos quebrados.
    assert conteudo.startswith("﻿")
    linhas = conteudo.lstrip("﻿").strip().splitlines()
    assert linhas[0] == "Canal;Pedidos;Total"
    # Separador ; e decimal com vírgula (padrão pt-BR).
    assert "presencial;1;200,00" in linhas[1]


def test_bloco_nao_exportavel_e_recusado(api, admin_user):
    auth(api, admin_user)
    resp = api.get("/api/relatorios/vendas/?formato=csv&bloco=periodo")
    assert resp.status_code == 400


def test_relatorios_exigem_papel_interno(api, cliente_user):
    auth(api, cliente_user)
    assert api.get("/api/relatorios/vendas/").status_code == 403


# =========================================================================
# Fechamento do pedido pelo cliente (checkout do WhatsApp)
# =========================================================================


def test_cliente_finaliza_pedido_para_o_whatsapp(api, cliente_user, variacao):
    auth(api, cliente_user)
    pedido = api.post("/api/pedidos/carrinho/").json()
    api.post(
        f"/api/pedidos/{pedido['id']}/itens/",
        {"variacao": str(variacao.id), "quantidade": 2},
        format="json",
    )

    resp = api.post(f"/api/pedidos/{pedido['id']}/finalizar/", {}, format="json")
    assert resp.status_code == 200
    assert resp.json()["status"] == StatusPedido.AGUARDANDO_PAGAMENTO
    assert Decimal(resp.json()["total"]) == Decimal("200.00")


def test_nao_finaliza_carrinho_vazio(api, cliente_user):
    auth(api, cliente_user)
    pedido = api.post("/api/pedidos/carrinho/").json()
    resp = api.post(f"/api/pedidos/{pedido['id']}/finalizar/", {}, format="json")
    assert resp.status_code == 400
    assert "vazio" in str(resp.json())


def test_nao_finaliza_duas_vezes(api, cliente_user, variacao):
    auth(api, cliente_user)
    pedido = api.post("/api/pedidos/carrinho/").json()
    api.post(
        f"/api/pedidos/{pedido['id']}/itens/",
        {"variacao": str(variacao.id), "quantidade": 1},
        format="json",
    )
    api.post(f"/api/pedidos/{pedido['id']}/finalizar/", {}, format="json")

    resp = api.post(f"/api/pedidos/{pedido['id']}/finalizar/", {}, format="json")
    assert resp.status_code == 400
    assert "já foi finalizado" in str(resp.json())


def test_whatsapp_vem_no_branding(api):
    """A loja lê o número daqui para montar o link do checkout."""
    from apps.branding.models import Branding

    b = Branding.load()
    b.whatsapp = "5511999998888"
    b.save()

    dados = api.get("/api/branding/").json()
    assert dados["whatsapp"] == "5511999998888"
