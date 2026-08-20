import pytest

from apps.conftest import auth

pytestmark = pytest.mark.django_db


def test_catalogo_leitura_publica(api, variacao):
    resp = api.get("/api/produtos/")
    assert resp.status_code == 200


def test_catalogo_escrita_sem_auth_401(api):
    resp = api.post("/api/produtos/", {}, format="json")
    assert resp.status_code == 401


def test_catalogo_escrita_cliente_403(api, cliente_user):
    auth(api, cliente_user)
    resp = api.post(
        "/api/categorias/", {"nome": "X", "slug": "x"}, format="json"
    )
    assert resp.status_code == 403


def test_catalogo_escrita_admin_201(api, admin_user):
    auth(api, admin_user)
    resp = api.post(
        "/api/categorias/", {"nome": "Nova", "slug": "nova"}, format="json"
    )
    assert resp.status_code == 201


def test_alteracao_de_preco_registra_valor_anterior(api, admin_user, variacao):
    """O diff precisa guardar o preço de antes, não só o novo."""
    from apps.audit.models import AcaoAuditoria, RegistroAuditoria

    auth(api, admin_user)
    api.patch(
        f"/api/variacoes/{variacao.id}/", {"preco": "89.90"}, format="json"
    )

    reg = RegistroAuditoria.objects.filter(
        acao=AcaoAuditoria.ALTERACAO_PRECO
    ).first()
    assert reg is not None
    assert reg.dados["preco"] == {"de": "100.00", "para": "89.90"}
    assert reg.usuario == admin_user


def test_patch_sem_mudanca_nao_gera_linha(api, admin_user, variacao):
    from apps.audit.models import RegistroAuditoria

    auth(api, admin_user)
    api.patch(
        f"/api/variacoes/{variacao.id}/", {"preco": "100.00"}, format="json"
    )
    assert RegistroAuditoria.objects.count() == 0
