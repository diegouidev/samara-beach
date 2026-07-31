import pytest

pytestmark = pytest.mark.django_db


def test_login_retorna_tipo_e_papel(api, admin_user):
    resp = api.post(
        "/api/auth/token/",
        {"email": "admin@test.com", "password": "senha12345"},
        format="json",
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access" in data
    assert data["user"]["tipo"] == "interno"
    assert data["user"]["papel"] == "admin"


def test_logout_blacklist_refresh(api, admin_user):
    login = api.post(
        "/api/auth/token/",
        {"email": "admin@test.com", "password": "senha12345"},
        format="json",
    ).json()
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login['access']}")

    logout = api.post(
        "/api/auth/logout/", {"refresh": login["refresh"]}, format="json"
    )
    assert logout.status_code == 205

    # Refresh depois do logout deve falhar.
    refresh = api.post(
        "/api/auth/token/refresh/", {"refresh": login["refresh"]}, format="json"
    )
    assert refresh.status_code == 401
