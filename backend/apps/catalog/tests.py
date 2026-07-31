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
