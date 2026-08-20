"""Testes do CRUD de usuários internos (gestão de equipe pelo painel)."""
import pytest
from django.urls import reverse

from apps.accounts.models import PapelInterno, TipoUsuario, User
from apps.conftest import auth


@pytest.fixture
def estoque_user(db):
    return User.objects.create_user(
        email="estoque@test.com",
        password="senha12345",
        tipo=TipoUsuario.INTERNO,
        papel=PapelInterno.ESTOQUE,
        first_name="Maria",
        last_name="Silva",
    )


def url_lista():
    return reverse("accounts:usuario-interno-list")


def url_detalhe(user):
    return reverse("accounts:usuario-interno-detail", args=[user.pk])


# --- Permissões -----------------------------------------------------------


def test_anonimo_nao_acessa(api, db):
    assert api.get(url_lista()).status_code in (401, 403)


def test_interno_nao_admin_nao_acessa(api, estoque_user):
    auth(api, estoque_user)
    assert api.get(url_lista()).status_code == 403


def test_cliente_nao_acessa(api, cliente_user):
    auth(api, cliente_user)
    assert api.get(url_lista()).status_code == 403


def test_admin_lista(api, admin_user, estoque_user):
    auth(api, admin_user)
    resposta = api.get(url_lista())
    assert resposta.status_code == 200
    emails = [u["email"] for u in resposta.json()["results"]]
    assert estoque_user.email in emails


def test_lista_traz_so_internos(api, admin_user, cliente_user):
    auth(api, admin_user)
    emails = [u["email"] for u in api.get(url_lista()).json()["results"]]
    assert cliente_user.email not in emails


# --- Criação --------------------------------------------------------------


def test_admin_cria_usuario_interno(api, admin_user):
    auth(api, admin_user)
    resposta = api.post(
        url_lista(),
        {
            "email": "Nova@Test.com",
            "senha": "umaSenhaBoa123",
            "first_name": "Nova",
            "last_name": "Vendedora",
            "papel": "atendimento",
            "cargo": "Vendedora",
        },
        format="json",
    )
    assert resposta.status_code == 201

    criado = User.objects.get(email="nova@test.com")  # e-mail normalizado
    assert criado.tipo == TipoUsuario.INTERNO
    assert criado.papel == PapelInterno.ATENDIMENTO
    assert criado.check_password("umaSenhaBoa123")
    assert criado.nome_exibicao == "Nova Vendedora"


def test_senha_nao_volta_na_resposta(api, admin_user):
    auth(api, admin_user)
    dados = api.post(
        url_lista(),
        {
            "email": "x@test.com",
            "senha": "umaSenhaBoa123",
            "papel": "estoque",
        },
        format="json",
    ).json()
    assert "senha" not in dados
    assert "password" not in dados


def test_email_duplicado_e_recusado(api, admin_user, estoque_user):
    auth(api, admin_user)
    resposta = api.post(
        url_lista(),
        {"email": estoque_user.email.upper(), "senha": "umaSenhaBoa123", "papel": "estoque"},
        format="json",
    )
    assert resposta.status_code == 400
    assert "email" in resposta.json()


def test_senha_fraca_e_recusada(api, admin_user):
    auth(api, admin_user)
    resposta = api.post(
        url_lista(),
        {"email": "fraca@test.com", "senha": "123", "papel": "estoque"},
        format="json",
    )
    assert resposta.status_code == 400
    assert "senha" in resposta.json()


def test_papel_e_obrigatorio(api, admin_user):
    auth(api, admin_user)
    resposta = api.post(
        url_lista(),
        {"email": "sempapel@test.com", "senha": "umaSenhaBoa123"},
        format="json",
    )
    assert resposta.status_code == 400
    assert "papel" in resposta.json()


# --- Edição ---------------------------------------------------------------


def test_admin_edita_papel_de_outro(api, admin_user, estoque_user):
    auth(api, admin_user)
    resposta = api.patch(
        url_detalhe(estoque_user), {"papel": "financeiro"}, format="json"
    )
    assert resposta.status_code == 200
    estoque_user.refresh_from_db()
    assert estoque_user.papel == PapelInterno.FINANCEIRO


def test_admin_nao_altera_o_proprio_papel(api, admin_user):
    """Sem esta trava a loja pode ficar sem nenhum administrador."""
    auth(api, admin_user)
    resposta = api.patch(url_detalhe(admin_user), {"papel": "estoque"}, format="json")
    assert resposta.status_code == 400
    admin_user.refresh_from_db()
    assert admin_user.papel == PapelInterno.ADMIN


def test_admin_nao_desativa_a_si_mesmo(api, admin_user):
    auth(api, admin_user)
    resposta = api.patch(url_detalhe(admin_user), {"is_active": False}, format="json")
    assert resposta.status_code == 400
    admin_user.refresh_from_db()
    assert admin_user.is_active is True


def test_edicao_nao_permite_virar_cliente(api, admin_user, estoque_user):
    auth(api, admin_user)
    api.patch(url_detalhe(estoque_user), {"tipo": "cliente"}, format="json")
    estoque_user.refresh_from_db()
    assert estoque_user.tipo == TipoUsuario.INTERNO


# --- Desativar / reativar -------------------------------------------------


def test_delete_nao_e_permitido(api, admin_user, estoque_user):
    """Histórico de vendas/caixa aponta para o usuário — apagar quebraria."""
    auth(api, admin_user)
    assert api.delete(url_detalhe(estoque_user)).status_code == 405
    assert User.objects.filter(pk=estoque_user.pk).exists()


def test_desativar_e_reativar(api, admin_user, estoque_user):
    auth(api, admin_user)

    resposta = api.post(f"{url_detalhe(estoque_user)}desativar/")
    assert resposta.status_code == 200
    estoque_user.refresh_from_db()
    assert estoque_user.is_active is False

    resposta = api.post(f"{url_detalhe(estoque_user)}reativar/")
    assert resposta.status_code == 200
    estoque_user.refresh_from_db()
    assert estoque_user.is_active is True


def test_nao_desativa_a_propria_conta_pela_acao(api, admin_user):
    auth(api, admin_user)
    resposta = api.post(f"{url_detalhe(admin_user)}desativar/")
    assert resposta.status_code == 400
    admin_user.refresh_from_db()
    assert admin_user.is_active is True


def test_usuario_desativado_nao_faz_login(api, admin_user, estoque_user):
    auth(api, admin_user)
    api.post(f"{url_detalhe(estoque_user)}desativar/")

    api.credentials()  # limpa o token do admin
    resposta = api.post(
        reverse("accounts:token_obtain_pair"),
        {"email": estoque_user.email, "password": "senha12345"},
        format="json",
    )
    assert resposta.status_code == 401


# --- Reset de senha pelo admin -------------------------------------------


def test_admin_redefine_senha_de_outro(api, admin_user, estoque_user):
    auth(api, admin_user)
    resposta = api.post(
        f"{url_detalhe(estoque_user)}definir-senha/",
        {"nova_senha": "outraSenhaBoa456"},
        format="json",
    )
    assert resposta.status_code == 200
    estoque_user.refresh_from_db()
    assert estoque_user.check_password("outraSenhaBoa456")


def test_reset_recusa_senha_fraca(api, admin_user, estoque_user):
    auth(api, admin_user)
    resposta = api.post(
        f"{url_detalhe(estoque_user)}definir-senha/",
        {"nova_senha": "123"},
        format="json",
    )
    assert resposta.status_code == 400
    estoque_user.refresh_from_db()
    assert estoque_user.check_password("senha12345")


# --- Busca e filtros ------------------------------------------------------


def test_busca_por_nome(api, admin_user, estoque_user):
    auth(api, admin_user)
    dados = api.get(url_lista(), {"search": "Maria"}).json()
    assert [u["email"] for u in dados["results"]] == [estoque_user.email]


def test_filtro_por_papel(api, admin_user, estoque_user):
    auth(api, admin_user)
    dados = api.get(url_lista(), {"papel": "estoque"}).json()
    assert [u["email"] for u in dados["results"]] == [estoque_user.email]


def test_filtro_por_ativo(api, admin_user, estoque_user):
    auth(api, admin_user)
    api.post(f"{url_detalhe(estoque_user)}desativar/")

    ativos = api.get(url_lista(), {"ativo": "true"}).json()["results"]
    assert estoque_user.email not in [u["email"] for u in ativos]

    inativos = api.get(url_lista(), {"ativo": "false"}).json()["results"]
    assert estoque_user.email in [u["email"] for u in inativos]


# --- Auditoria ------------------------------------------------------------


def test_reset_de_senha_gera_auditoria(api, admin_user, estoque_user):
    from apps.audit.models import AcaoAuditoria, RegistroAuditoria

    auth(api, admin_user)
    api.post(
        f"{url_detalhe(estoque_user)}definir-senha/",
        {"nova_senha": "outraSenhaBoa456"},
        format="json",
    )
    reg = RegistroAuditoria.objects.filter(acao=AcaoAuditoria.RESET_SENHA).first()
    assert reg is not None
    assert reg.usuario == admin_user
    assert str(estoque_user.pk) == reg.objeto_id


def test_senha_nunca_aparece_na_auditoria(api, admin_user, estoque_user):
    """Teste de segurança: o log não pode virar um vazamento."""
    from apps.audit.models import RegistroAuditoria

    auth(api, admin_user)
    api.post(
        f"{url_detalhe(estoque_user)}definir-senha/",
        {"nova_senha": "SenhaSuperSecreta789"},
        format="json",
    )
    for reg in RegistroAuditoria.objects.all():
        serializado = str(reg.dados) + reg.descricao
        assert "SenhaSuperSecreta789" not in serializado
        assert "password" not in reg.dados


def test_mudanca_de_papel_gera_auditoria_com_diff(api, admin_user, estoque_user):
    from apps.audit.models import AcaoAuditoria, NivelAuditoria, RegistroAuditoria

    auth(api, admin_user)
    api.patch(url_detalhe(estoque_user), {"papel": "financeiro"}, format="json")

    reg = RegistroAuditoria.objects.filter(acao=AcaoAuditoria.MUDANCA_PAPEL).first()
    assert reg is not None
    assert reg.nivel == NivelAuditoria.CRITICO
    assert reg.dados["papel"] == {"de": "estoque", "para": "financeiro"}


def test_desativar_usuario_gera_auditoria(api, admin_user, estoque_user):
    from apps.audit.models import AcaoAuditoria, RegistroAuditoria

    auth(api, admin_user)
    api.post(f"{url_detalhe(estoque_user)}desativar/")
    assert RegistroAuditoria.objects.filter(
        acao=AcaoAuditoria.DESATIVAR_USUARIO
    ).exists()


def test_login_gera_auditoria(api, admin_user):
    from apps.audit.models import AcaoAuditoria, RegistroAuditoria

    api.post(
        reverse("accounts:token_obtain_pair"),
        {"email": admin_user.email, "password": "senha12345"},
        format="json",
    )
    reg = RegistroAuditoria.objects.filter(acao=AcaoAuditoria.LOGIN).first()
    assert reg is not None
    assert reg.usuario == admin_user
