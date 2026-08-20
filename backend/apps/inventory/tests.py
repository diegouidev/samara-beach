import pytest

from apps.conftest import auth

pytestmark = pytest.mark.django_db


def test_estoque_baixo_lista_sku_abaixo_do_minimo(api, admin_user, variacao):
    # variacao: saldo 10, estoque_minimo 5 -> NÃO deve aparecer.
    auth(api, admin_user)
    resp = api.get("/api/movimentacoes/estoque-baixo/")
    assert resp.status_code == 200
    skus = [r["sku"] for r in resp.json()["results"]]
    assert variacao.sku not in skus


def test_estoque_baixo_aparece_apos_venda(api, admin_user, variacao):
    auth(api, admin_user)
    # Baixa 6 -> saldo 4 <= minimo 5
    api.post(
        "/api/movimentacoes/",
        {
            "variacao": str(variacao.id),
            "tipo": "saida",
            "origem": "venda",
            "quantidade": -6,
        },
        format="json",
    )
    resp = api.get("/api/movimentacoes/estoque-baixo/")
    skus = [r["sku"] for r in resp.json()["results"]]
    assert variacao.sku in skus


def test_estoque_restrito_a_interno(api, cliente_user, variacao):
    auth(api, cliente_user)
    resp = api.get("/api/movimentacoes/estoque-baixo/")
    assert resp.status_code == 403


# --- Auditoria ------------------------------------------------------------


def test_ajuste_de_estoque_gera_auditoria_critica(api, admin_user, variacao):
    """Ajuste manual é o caminho mais direto para sumiço de mercadoria."""
    from apps.audit.models import AcaoAuditoria, NivelAuditoria, RegistroAuditoria

    auth(api, admin_user)
    api.post(
        "/api/movimentacoes/",
        {
            "variacao": str(variacao.id),
            "tipo": "saida",
            "origem": "ajuste",
            "quantidade": -3,
            "observacoes": "Peça danificada",
        },
        format="json",
    )

    reg = RegistroAuditoria.objects.filter(acao=AcaoAuditoria.AJUSTE_ESTOQUE).first()
    assert reg is not None
    assert reg.usuario == admin_user
    assert reg.nivel == NivelAuditoria.CRITICO
    assert reg.dados["quantidade"] == -3
    assert reg.dados["variacao"] == variacao.sku
