"""Testes de contas a pagar: despesas sem fornecedor e repetição mensal."""
from datetime import date
from decimal import Decimal

import pytest

from apps.conftest import auth
from apps.suppliers.models import ContaPagar, StatusContaPagar
from apps.suppliers.services import proximo_vencimento

pytestmark = pytest.mark.django_db


def _lancar(api, **extra):
    payload = {
        "descricao": "Energia elétrica — julho",
        "categoria": "energia",
        "valor": "480.00",
        "vencimento": "2026-07-10",
        **extra,
    }
    return api.post("/api/contas-pagar/", payload, format="json")


# =========================================================================
# Vencimento da repetição
# =========================================================================


@pytest.mark.parametrize(
    "atual,esperado",
    [
        (date(2026, 1, 10), date(2026, 2, 10)),
        # Dia que não existe no mês seguinte cai no último dia dele.
        (date(2026, 1, 31), date(2026, 2, 28)),
        (date(2028, 1, 31), date(2028, 2, 29)),  # bissexto
        (date(2026, 3, 31), date(2026, 4, 30)),
        (date(2026, 12, 15), date(2027, 1, 15)),  # vira o ano
    ],
)
def test_proximo_vencimento(atual, esperado):
    assert proximo_vencimento(atual) == esperado


# =========================================================================
# Despesas sem fornecedor
# =========================================================================


def test_lanca_despesa_sem_fornecedor(api, admin_user):
    auth(api, admin_user)
    resp = _lancar(api)
    assert resp.status_code == 201
    conta = resp.json()
    assert conta["fornecedor"] is None
    assert conta["categoria"] == "energia"
    assert conta["titulo"] == "Energia elétrica — julho"


def test_despesa_sem_fornecedor_exige_descricao(api, admin_user):
    auth(api, admin_user)
    resp = _lancar(api, descricao="")
    assert resp.status_code == 400
    assert "Descreva a despesa" in str(resp.json())


def test_conta_vencida_e_calculada(api, admin_user):
    auth(api, admin_user)
    _lancar(api, vencimento="2020-01-10")
    conta = api.get("/api/contas-pagar/").json()["results"][0]
    # O status gravado continua "aberta"; quem vira é o efetivo.
    assert conta["status"] == StatusContaPagar.ABERTA
    assert conta["status_efetivo"] == StatusContaPagar.VENCIDA


# =========================================================================
# Pagamento e repetição
# =========================================================================


def test_pagar_conta_recorrente_gera_a_do_mes_seguinte(api, admin_user):
    auth(api, admin_user)
    conta = _lancar(api, recorrente=True).json()

    resp = api.post(
        f"/api/contas-pagar/{conta['id']}/pagar/",
        {"pago_em": "2026-07-09"},
        format="json",
    )
    assert resp.status_code == 200
    dados = resp.json()

    assert dados["conta"]["status"] == StatusContaPagar.PAGA
    assert dados["conta"]["pago_em"] == "2026-07-09"

    proxima = dados["proxima"]
    assert proxima is not None
    assert proxima["vencimento"] == "2026-08-10"
    assert proxima["status"] == StatusContaPagar.ABERTA
    assert Decimal(proxima["valor"]) == Decimal("480.00")
    assert proxima["conta_origem"] == conta["id"]


def test_conta_avulsa_nao_repete(api, admin_user):
    auth(api, admin_user)
    conta = _lancar(api).json()
    resp = api.post(f"/api/contas-pagar/{conta['id']}/pagar/", {}, format="json")
    assert resp.json()["proxima"] is None
    assert ContaPagar.objects.count() == 1


def test_nao_paga_duas_vezes(api, admin_user):
    auth(api, admin_user)
    conta = _lancar(api, recorrente=True).json()
    api.post(f"/api/contas-pagar/{conta['id']}/pagar/", {}, format="json")

    resp = api.post(f"/api/contas-pagar/{conta['id']}/pagar/", {}, format="json")
    assert resp.status_code == 400
    assert "já está paga" in str(resp.json())
    # A repetição não foi duplicada.
    assert ContaPagar.objects.count() == 2


def test_resumo_separa_aberto_vencido_e_pago(api, admin_user):
    auth(api, admin_user)
    _lancar(api, descricao="Vencida", vencimento="2020-01-10", valor="100.00")
    _lancar(api, descricao="A vencer", vencimento="2090-01-10", valor="200.00")
    paga = _lancar(api, descricao="Paga", valor="300.00").json()
    api.post(
        f"/api/contas-pagar/{paga['id']}/pagar/",
        {"pago_em": "2026-07-05"},
        format="json",
    )

    resumo = api.get("/api/contas-pagar/resumo/?inicio=2026-07-01&fim=2026-07-31").json()
    assert Decimal(resumo["total_aberto"]) == Decimal("300.00")  # 100 + 200
    assert Decimal(resumo["total_vencido"]) == Decimal("100.00")
    assert Decimal(resumo["total_pago"]) == Decimal("300.00")
    assert resumo["num_vencidas"] == 1
    assert resumo["por_categoria"][0]["categoria"] == "energia"


def test_estoque_nao_acessa_contas(api, cliente_user):
    auth(api, cliente_user)
    assert api.get("/api/contas-pagar/").status_code == 403
