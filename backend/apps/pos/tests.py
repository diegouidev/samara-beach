"""Testes do ponto de venda: caixa, venda, trocas e resultado."""
from datetime import date
from decimal import Decimal

import pytest

from apps.conftest import auth
from apps.inventory.views import saldo_atual
from apps.orders.models import CanalVenda, Pedido, StatusPedido
from apps.pos.models import SessaoCaixa, StatusSessaoCaixa

pytestmark = pytest.mark.django_db


def _abrir(api, valor="100.00"):
    return api.post(
        "/api/caixa/sessoes/abrir/", {"valor_abertura": valor}, format="json"
    )


def _vender(api, variacao, pagamentos, quantidade=1, **extra):
    payload = {
        "itens": [{"variacao": str(variacao.id), "quantidade": quantidade}],
        "pagamentos": pagamentos,
        **extra,
    }
    return api.post("/api/pdv/vendas/", payload, format="json")


# =========================================================================
# Caixa
# =========================================================================


def test_abrir_caixa_e_recusar_segundo(api, admin_user):
    auth(api, admin_user)
    assert _abrir(api).status_code == 201

    segundo = _abrir(api)
    assert segundo.status_code == 400
    assert "já tem um caixa aberto" in str(segundo.json())
    assert SessaoCaixa.objects.filter(status=StatusSessaoCaixa.ABERTA).count() == 1


def test_venda_exige_caixa_aberto(api, admin_user, variacao):
    auth(api, admin_user)
    resp = _vender(api, variacao, [{"metodo": "dinheiro", "valor": "100.00"}])
    assert resp.status_code == 400
    assert "Abra o caixa" in str(resp.json())


def test_sangria_maior_que_a_gaveta_e_recusada(api, admin_user):
    auth(api, admin_user)
    sessao = _abrir(api, "50.00").json()

    resp = api.post(
        f"/api/caixa/sessoes/{sessao['id']}/sangria/",
        {"valor": "80.00", "motivo": "Pagamento de motoboy"},
        format="json",
    )
    assert resp.status_code == 400
    assert "apenas R$ 50.00" in str(resp.json())


def test_fechamento_confere_so_o_dinheiro(api, admin_user, variacao):
    """Cartão e PIX não estão na gaveta — não entram no valor esperado."""
    auth(api, admin_user)
    sessao = _abrir(api, "100.00").json()

    _vender(api, variacao, [{"metodo": "dinheiro", "valor": "100.00"}])
    _vender(api, variacao, [{"metodo": "pix", "valor": "100.00"}])
    _vender(api, variacao, [{"metodo": "credito", "valor": "100.00", "parcelas": 3}])

    resp = api.post(
        f"/api/caixa/sessoes/{sessao['id']}/fechar/",
        {"valor_informado": "200.00"},
        format="json",
    )
    assert resp.status_code == 200
    dados = resp.json()

    # 100 de abertura + 100 da venda em dinheiro (PIX e crédito ficam de fora).
    assert Decimal(dados["dinheiro_esperado"]) == Decimal("200.00")
    assert Decimal(dados["sessao"]["diferenca"]) == Decimal("0.00")
    assert Decimal(dados["total_vendido"]) == Decimal("300.00")
    assert dados["num_vendas"] == 3
    assert dados["sessao"]["status"] == StatusSessaoCaixa.FECHADA


def test_fechamento_registra_diferenca(api, admin_user):
    auth(api, admin_user)
    sessao = _abrir(api, "100.00").json()

    resp = api.post(
        f"/api/caixa/sessoes/{sessao['id']}/fechar/",
        {"valor_informado": "90.00"},
        format="json",
    )
    # Faltando R$ 10 na gaveta.
    assert Decimal(resp.json()["sessao"]["diferenca"]) == Decimal("-10.00")


def test_caixa_fechado_nao_recebe_movimento(api, admin_user):
    auth(api, admin_user)
    sessao = _abrir(api, "100.00").json()
    api.post(
        f"/api/caixa/sessoes/{sessao['id']}/fechar/",
        {"valor_informado": "100.00"},
        format="json",
    )
    resp = api.post(
        f"/api/caixa/sessoes/{sessao['id']}/suprimento/",
        {"valor": "10.00", "motivo": "Troco"},
        format="json",
    )
    assert resp.status_code == 400
    assert "já foi fechado" in str(resp.json())


# =========================================================================
# Venda
# =========================================================================


def test_venda_baixa_estoque_e_registra_caixa(api, admin_user, variacao):
    auth(api, admin_user)
    _abrir(api)
    saldo_antes = saldo_atual(variacao.id)

    resp = _vender(
        api, variacao, [{"metodo": "dinheiro", "valor": "200.00"}], quantidade=2
    )
    assert resp.status_code == 201
    venda = resp.json()

    assert venda["canal"] == CanalVenda.PRESENCIAL
    # Venda de balcão já nasce entregue: a peça saiu com a cliente.
    assert venda["status"] == StatusPedido.ENTREGUE
    assert Decimal(venda["total"]) == Decimal("200.00")
    # Venda sem identificar a cliente: consumidor final.
    assert venda["cliente"] is None
    assert saldo_atual(variacao.id) == saldo_antes - 2


def test_pagamento_dividido_com_troco(api, admin_user, variacao):
    auth(api, admin_user)
    _abrir(api)

    resp = _vender(
        api,
        variacao,
        [
            {"metodo": "pix", "valor": "40.00"},
            # Cliente entrega R$ 100 para pagar os R$ 60 restantes.
            {"metodo": "dinheiro", "valor": "60.00", "valor_recebido": "100.00"},
        ],
    )
    assert resp.status_code == 201
    pagamentos = {p["metodo"]: p for p in resp.json()["pagamentos"]}
    assert Decimal(pagamentos["dinheiro"]["troco"]) == Decimal("40.00")

    # Na gaveta fica só o valor da venda, não o que a cliente entregou.
    sessao = api.get("/api/caixa/sessoes/atual/").json()
    assert Decimal(sessao["resumo"]["dinheiro_esperado"]) == Decimal("160.00")


def test_pagamento_insuficiente_e_recusado(api, admin_user, variacao):
    auth(api, admin_user)
    _abrir(api)

    resp = _vender(api, variacao, [{"metodo": "debito", "valor": "70.00"}])
    assert resp.status_code == 400
    assert "Faltam R$ 30.00" in str(resp.json())
    # Nada é gravado quando o pagamento não fecha.
    assert not Pedido.objects.filter(canal=CanalVenda.PRESENCIAL).exists()


def test_desconto_manual_abate_do_total(api, admin_user, variacao):
    auth(api, admin_user)
    _abrir(api)

    resp = _vender(
        api,
        variacao,
        [{"metodo": "dinheiro", "valor": "80.00"}],
        desconto_manual="20.00",
    )
    assert resp.status_code == 201
    venda = resp.json()
    assert Decimal(venda["subtotal"]) == Decimal("100.00")
    assert Decimal(venda["desconto"]) == Decimal("20.00")
    assert Decimal(venda["total"]) == Decimal("80.00")


def test_parcelamento_so_no_credito(api, admin_user, variacao):
    auth(api, admin_user)
    _abrir(api)

    resp = _vender(
        api, variacao, [{"metodo": "debito", "valor": "100.00", "parcelas": 3}]
    )
    assert resp.status_code == 400
    assert "Só crédito pode ser parcelado" in str(resp.json())


def test_cancelamento_devolve_estoque(api, admin_user, variacao):
    auth(api, admin_user)
    _abrir(api)
    saldo_antes = saldo_atual(variacao.id)

    venda = _vender(api, variacao, [{"metodo": "dinheiro", "valor": "100.00"}]).json()
    assert saldo_atual(variacao.id) == saldo_antes - 1

    resp = api.post(
        f"/api/pdv/vendas/{venda['id']}/cancelar/",
        {"motivo": "Cliente desistiu"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == StatusPedido.CANCELADO
    assert saldo_atual(variacao.id) == saldo_antes

    # A devolução sai do caixa: a gaveta volta ao valor de abertura.
    sessao = api.get("/api/caixa/sessoes/atual/").json()
    assert Decimal(sessao["resumo"]["dinheiro_esperado"]) == Decimal("100.00")


def test_cancelamento_nao_repete_devolucao(api, admin_user, variacao):
    auth(api, admin_user)
    _abrir(api)
    saldo_antes = saldo_atual(variacao.id)
    venda = _vender(api, variacao, [{"metodo": "dinheiro", "valor": "100.00"}]).json()

    api.post(
        f"/api/pdv/vendas/{venda['id']}/cancelar/",
        {"motivo": "Erro de digitação"},
        format="json",
    )
    segundo = api.post(
        f"/api/pdv/vendas/{venda['id']}/cancelar/",
        {"motivo": "Erro de digitação"},
        format="json",
    )
    assert segundo.status_code == 400
    assert saldo_atual(variacao.id) == saldo_antes


def test_busca_do_pdv_traz_saldo(api, admin_user, variacao):
    auth(api, admin_user)
    resp = api.get(f"/api/pdv/buscar/?q={variacao.sku}")
    assert resp.status_code == 200
    resultado = resp.json()[0]
    assert resultado["sku"] == variacao.sku
    assert resultado["saldo"] == saldo_atual(variacao.id)
    assert Decimal(resultado["preco"]) == Decimal("100.00")


def test_venda_exige_papel_interno(api, cliente_user, variacao):
    auth(api, cliente_user)
    assert api.get("/api/pdv/buscar/").status_code == 403
    assert _abrir(api).status_code == 403


# =========================================================================
# Trocas e devoluções de item
# =========================================================================


def _devolver(api, venda, item_id, quantidade, tipo, motivo="Tamanho errado"):
    return api.post(
        "/api/pdv/devolucoes/",
        {
            "pedido": venda["id"],
            "itens": [{"item": item_id, "quantidade": quantidade}],
            "tipo": tipo,
            "motivo": motivo,
        },
        format="json",
    )


def test_devolucao_parcial_repoe_so_o_devolvido(api, admin_user, variacao):
    auth(api, admin_user)
    _abrir(api, "0.00")
    saldo_antes = saldo_atual(variacao.id)

    venda = _vender(
        api, variacao, [{"metodo": "dinheiro", "valor": "300.00"}], quantidade=3
    ).json()
    assert saldo_atual(variacao.id) == saldo_antes - 3

    resp = _devolver(api, venda, venda["itens"][0]["id"], 1, "devolucao")
    assert resp.status_code == 201
    assert Decimal(resp.json()["valor_total"]) == Decimal("100.00")

    # Só uma unidade voltou; as outras duas seguem vendidas.
    assert saldo_atual(variacao.id) == saldo_antes - 2

    # E o dinheiro saiu da gaveta: 300 da venda − 100 devolvidos.
    resumo = api.get("/api/caixa/sessoes/atual/").json()["resumo"]
    assert Decimal(resumo["dinheiro_esperado"]) == Decimal("200.00")


def test_nao_devolve_mais_do_que_foi_vendido(api, admin_user, variacao):
    auth(api, admin_user)
    _abrir(api)
    venda = _vender(
        api, variacao, [{"metodo": "dinheiro", "valor": "300.00"}], quantidade=3
    ).json()
    item = venda["itens"][0]["id"]

    assert _devolver(api, venda, item, 2, "devolucao").status_code == 201

    # Restou 1: pedir 2 de novo tem de ser recusado.
    resp = _devolver(api, venda, item, 2, "devolucao")
    assert resp.status_code == 400
    assert "só restam 1" in str(resp.json())


def test_devolver_tudo_cancela_a_venda(api, admin_user, variacao):
    auth(api, admin_user)
    _abrir(api)
    venda = _vender(api, variacao, [{"metodo": "dinheiro", "valor": "100.00"}]).json()

    _devolver(api, venda, venda["itens"][0]["id"], 1, "devolucao")
    assert (
        Pedido.objects.get(pk=venda["id"]).status == StatusPedido.CANCELADO
    )


def test_cancelar_venda_com_devolucao_e_recusado(api, admin_user, variacao):
    auth(api, admin_user)
    _abrir(api)
    saldo_antes = saldo_atual(variacao.id)
    venda = _vender(
        api, variacao, [{"metodo": "dinheiro", "valor": "200.00"}], quantidade=2
    ).json()
    _devolver(api, venda, venda["itens"][0]["id"], 1, "devolucao")

    resp = api.post(
        f"/api/pdv/vendas/{venda['id']}/cancelar/",
        {"motivo": "Cliente desistiu"},
        format="json",
    )
    assert resp.status_code == 400
    assert "já teve itens devolvidos" in str(resp.json())
    # O estoque não voltou duas vezes: 2 vendidas, 1 devolvida.
    assert saldo_atual(variacao.id) == saldo_antes - 1


def test_troca_gera_credito_que_abate_a_venda_nova(api, admin_user, variacao):
    """Troca por peça mais cara: o crédito abate e o cliente paga a diferença."""
    auth(api, admin_user)
    _abrir(api, "0.00")
    venda = _vender(api, variacao, [{"metodo": "dinheiro", "valor": "100.00"}]).json()

    devolucao = _devolver(api, venda, venda["itens"][0]["id"], 1, "troca").json()
    assert Decimal(devolucao["credito_disponivel"]) == Decimal("100.00")

    # A troca não mexe na gaveta: continua só o dinheiro da venda original.
    resumo = api.get("/api/caixa/sessoes/atual/").json()["resumo"]
    assert Decimal(resumo["dinheiro_esperado"]) == Decimal("100.00")

    # Nova venda de R$ 150: 100 de crédito + 50 pagos.
    resp = api.post(
        "/api/pdv/vendas/",
        {
            "itens": [
                {
                    "variacao": str(variacao.id),
                    "quantidade": 1,
                    "preco_unitario": "150.00",
                }
            ],
            "pagamentos": [{"metodo": "dinheiro", "valor": "50.00"}],
            "devolucao": devolucao["id"],
        },
        format="json",
    )
    assert resp.status_code == 201
    metodos = {p["metodo"]: Decimal(p["valor"]) for p in resp.json()["pagamentos"]}
    assert metodos["credito_troca"] == Decimal("100.00")
    assert metodos["dinheiro"] == Decimal("50.00")
    assert Decimal(resp.json()["total"]) == Decimal("150.00")

    # Na gaveta entrou só a diferença: 100 + 50.
    resumo = api.get("/api/caixa/sessoes/atual/").json()["resumo"]
    assert Decimal(resumo["dinheiro_esperado"]) == Decimal("150.00")


def test_credito_de_troca_nao_e_usado_duas_vezes(api, admin_user, variacao):
    auth(api, admin_user)
    _abrir(api)
    venda = _vender(api, variacao, [{"metodo": "dinheiro", "valor": "100.00"}]).json()
    devolucao = _devolver(api, venda, venda["itens"][0]["id"], 1, "troca").json()

    corpo = {
        "itens": [{"variacao": str(variacao.id), "quantidade": 1}],
        "pagamentos": [],
        "devolucao": devolucao["id"],
    }
    assert api.post("/api/pdv/vendas/", corpo, format="json").status_code == 201

    repetido = api.post("/api/pdv/vendas/", corpo, format="json")
    assert repetido.status_code == 400
    assert "já foi usado" in str(repetido.json())


def test_troca_por_peca_mais_barata_devolve_a_diferenca(api, admin_user, variacao):
    auth(api, admin_user)
    _abrir(api, "0.00")
    venda = _vender(api, variacao, [{"metodo": "dinheiro", "valor": "100.00"}]).json()
    devolucao = _devolver(api, venda, venda["itens"][0]["id"], 1, "troca").json()

    # Leva uma peça de R$ 60 usando um crédito de R$ 100.
    resp = api.post(
        "/api/pdv/vendas/",
        {
            "itens": [
                {
                    "variacao": str(variacao.id),
                    "quantidade": 1,
                    "preco_unitario": "60.00",
                }
            ],
            "pagamentos": [],
            "devolucao": devolucao["id"],
        },
        format="json",
    )
    assert resp.status_code == 201

    # Gaveta: 100 da venda original − 40 de diferença devolvida.
    resumo = api.get("/api/caixa/sessoes/atual/").json()["resumo"]
    assert Decimal(resumo["dinheiro_esperado"]) == Decimal("60.00")


def test_credito_de_devolucao_simples_nao_serve_para_troca(api, admin_user, variacao):
    auth(api, admin_user)
    _abrir(api)
    venda = _vender(api, variacao, [{"metodo": "dinheiro", "valor": "100.00"}]).json()
    devolucao = _devolver(api, venda, venda["itens"][0]["id"], 1, "devolucao").json()

    resp = api.post(
        "/api/pdv/vendas/",
        {
            "itens": [{"variacao": str(variacao.id), "quantidade": 1}],
            "pagamentos": [],
            "devolucao": devolucao["id"],
        },
        format="json",
    )
    assert resp.status_code == 400
    assert "não gera crédito" in str(resp.json())


def test_itens_devolviveis_mostra_o_saldo(api, admin_user, variacao):
    auth(api, admin_user)
    _abrir(api)
    venda = _vender(
        api, variacao, [{"metodo": "dinheiro", "valor": "300.00"}], quantidade=3
    ).json()
    _devolver(api, venda, venda["itens"][0]["id"], 1, "devolucao")

    itens = api.get(f"/api/pdv/vendas/{venda['id']}/itens-devolviveis/").json()
    assert itens[0]["quantidade"] == 3
    assert itens[0]["devolvida"] == 1
    assert itens[0]["disponivel"] == 2


def test_devolucao_exige_caixa_aberto(api, admin_user, variacao):
    auth(api, admin_user)
    sessao = _abrir(api).json()
    venda = _vender(api, variacao, [{"metodo": "pix", "valor": "100.00"}]).json()
    api.post(
        f"/api/caixa/sessoes/{sessao['id']}/fechar/",
        {"valor_informado": "100.00"},
        format="json",
    )

    resp = _devolver(api, venda, venda["itens"][0]["id"], 1, "devolucao")
    assert resp.status_code == 400
    assert "Abra o caixa" in str(resp.json())


# =========================================================================
# Resultado do período
# =========================================================================


def test_resultado_desconta_devolucao_custo_e_despesas(api, admin_user, variacao):
    """Receita líquida − custo dos produtos − despesas pagas."""
    from apps.suppliers.models import CategoriaDespesa, ContaPagar

    auth(api, admin_user)
    _abrir(api, "0.00")

    # 3 unidades a R$ 100 (custo médio da fixture: R$ 40).
    venda = _vender(
        api, variacao, [{"metodo": "dinheiro", "valor": "300.00"}], quantidade=3
    ).json()
    _devolver(api, venda, venda["itens"][0]["id"], 1, "devolucao")

    conta = ContaPagar.objects.create(
        categoria=CategoriaDespesa.ENERGIA,
        descricao="Energia",
        valor=Decimal("80.00"),
        vencimento=date.today(),
    )
    api.post(f"/api/contas-pagar/{conta.id}/pagar/", {}, format="json")

    r = api.get("/api/relatorios/resultado/").json()
    assert Decimal(r["receita_bruta"]) == Decimal("300.00")
    assert Decimal(r["devolucoes"]) == Decimal("100.00")
    assert Decimal(r["receita_liquida"]) == Decimal("200.00")
    assert Decimal(r["custo_produtos"]) == Decimal("120.00")  # 3 × 40
    assert Decimal(r["lucro_bruto"]) == Decimal("80.00")
    assert Decimal(r["despesas"]) == Decimal("80.00")
    assert Decimal(r["resultado"]) == Decimal("0.00")
    assert r["despesas_por_categoria"][0]["categoria"] == "energia"


# =========================================================================
# Auditoria
# =========================================================================


def test_venda_no_pdv_nao_duplica_auditoria_de_status(api, admin_user, variacao):
    """
    A venda de balcão nasce ENTREGUE. Registrar a venda E a transição de
    status seria duas linhas para o mesmo ato — daí o `auditar=False`.
    """
    from apps.audit.models import AcaoAuditoria, RegistroAuditoria

    auth(api, admin_user)
    _abrir(api)
    _vender(api, variacao, [{"metodo": "dinheiro", "valor": "100.00",
                             "valor_recebido": "100.00"}])

    assert RegistroAuditoria.objects.filter(
        acao=AcaoAuditoria.MUDANCA_STATUS
    ).count() == 0
    assert RegistroAuditoria.objects.filter(acao=AcaoAuditoria.VENDA).count() == 1


def test_fechamento_por_admin_marca_caixa_de_terceiro(api, admin_user, variacao):
    """
    A view deixa o admin fechar o caixa de outro operador — até agora isso
    não deixava nenhum rastro.
    """
    from apps.accounts.models import PapelInterno, TipoUsuario, User
    from apps.audit.models import AcaoAuditoria, RegistroAuditoria
    from apps.pos import services

    operador = User.objects.create_user(
        email="operador@test.com", password="senha12345",
        tipo=TipoUsuario.INTERNO, papel=PapelInterno.ATENDIMENTO,
    )
    sessao = services.abrir_caixa(operador, "100.00")
    services.fechar_caixa(sessao, "100.00", "", usuario=admin_user)

    reg = RegistroAuditoria.objects.filter(
        acao=AcaoAuditoria.FECHAMENTO_CAIXA
    ).first()
    assert reg.usuario == admin_user
    assert reg.dados["fechado_por_terceiro"] is True


def test_fechamento_pelo_proprio_operador_nao_marca_terceiro(admin_user):
    from apps.audit.models import AcaoAuditoria, RegistroAuditoria
    from apps.pos import services

    sessao = services.abrir_caixa(admin_user, "100.00")
    services.fechar_caixa(sessao, "100.00", "", usuario=admin_user)

    reg = RegistroAuditoria.objects.filter(
        acao=AcaoAuditoria.FECHAMENTO_CAIXA
    ).first()
    assert reg.dados["fechado_por_terceiro"] is False


def test_cancelamento_registra_mesmo_sem_caixa_aberto(api, admin_user, variacao):
    """
    Sem caixa aberto não há MovimentoCaixa — antes, o cancelamento não
    deixava rastro de autoria nenhum.
    """
    from apps.audit.models import AcaoAuditoria, RegistroAuditoria
    from apps.orders.models import Pedido
    from apps.pos import services

    auth(api, admin_user)
    _abrir(api)
    _vender(api, variacao, [{"metodo": "dinheiro", "valor": "100.00",
                             "valor_recebido": "100.00"}])
    pedido = Pedido.objects.latest("created_at")

    # Fecha o caixa: o cancelamento acontece fora de qualquer turno aberto.
    sessao = SessaoCaixa.objects.get(status=StatusSessaoCaixa.ABERTA)
    services.fechar_caixa(sessao, "200.00", "", usuario=admin_user)

    services.cancelar_venda(pedido, admin_user, "Cliente desistiu")

    reg = RegistroAuditoria.objects.filter(
        acao=AcaoAuditoria.CANCELAMENTO_VENDA
    ).first()
    assert reg is not None
    assert reg.usuario == admin_user
    assert reg.dados["estornou_no_caixa"] is False


def test_sangria_gera_auditoria(api, admin_user):
    from apps.audit.models import AcaoAuditoria, RegistroAuditoria

    auth(api, admin_user)
    resposta = _abrir(api)
    sessao_id = resposta.json()["id"]
    api.post(
        f"/api/caixa/sessoes/{sessao_id}/sangria/",
        {"valor": "50.00", "motivo": "Depósito no banco"},
        format="json",
    )
    reg = RegistroAuditoria.objects.filter(acao=AcaoAuditoria.SANGRIA).first()
    assert reg is not None
    assert reg.dados["motivo"] == "Depósito no banco"
