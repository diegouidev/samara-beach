"""Testes do módulo de empresa (singleton, permissões e normalização)."""
import pytest
from django.urls import reverse

from apps.accounts.models import PapelInterno, TipoUsuario, User
from apps.company.models import Empresa
from apps.conftest import auth

CNPJ_VALIDO = "11.222.333/0001-81"


@pytest.fixture
def estoque_user(db):
    return User.objects.create_user(
        email="estoque@test.com",
        password="senha12345",
        tipo=TipoUsuario.INTERNO,
        papel=PapelInterno.ESTOQUE,
    )


# --- Model ---------------------------------------------------------------


def test_load_cria_singleton_e_nunca_duplica(db):
    primeira = Empresa.load()
    primeira.razao_social = "Samara Beach LTDA"
    primeira.save()

    segunda = Empresa.load()
    assert segunda.pk == 1
    assert segunda.razao_social == "Samara Beach LTDA"
    assert Empresa.objects.count() == 1


def test_save_forca_pk_1_mesmo_criando_direto(db):
    Empresa.objects.create(razao_social="A")
    Empresa.objects.create(razao_social="B")
    assert Empresa.objects.count() == 1
    assert Empresa.objects.get().razao_social == "B"


def test_cnpj_e_normalizado_com_mascara(db):
    empresa = Empresa.load()
    empresa.cnpj = "11222333000181"
    empresa.save()
    assert empresa.cnpj == CNPJ_VALIDO
    assert empresa.cnpj_digitos == "11222333000181"


@pytest.mark.parametrize(
    "entrada,esperado",
    [
        ("@samarabeach", "samarabeach"),
        ("samarabeach", "samarabeach"),
        ("https://instagram.com/samarabeach", "samarabeach"),
        ("instagram.com/samarabeach/", "samarabeach"),
    ],
)
def test_handle_de_rede_social_vira_so_o_usuario(db, entrada, esperado):
    empresa = Empresa.load()
    empresa.instagram = entrada
    empresa.save()
    assert empresa.instagram == esperado


def test_uf_vira_maiuscula(db):
    empresa = Empresa.load()
    empresa.uf = "ce"
    empresa.save()
    assert empresa.uf == "CE"


def test_endereco_linha_monta_so_com_o_que_existe(db):
    empresa = Empresa.load()
    empresa.logradouro = "Rua das Ondas"
    empresa.numero = "100"
    empresa.bairro = "Centro"
    empresa.cidade = "Fortaleza"
    empresa.uf = "CE"
    empresa.cep = "60000-000"
    empresa.save()
    assert empresa.endereco_linha == (
        "Rua das Ondas, 100 - Centro - Fortaleza/CE - 60000-000"
    )


def test_endereco_linha_vazio_quando_nada_preenchido(db):
    assert Empresa.load().endereco_linha == ""


def test_esta_completa_exige_os_campos_do_recibo(db):
    empresa = Empresa.load()
    assert empresa.esta_completa is False

    empresa.razao_social = "Samara Beach LTDA"
    empresa.cnpj = CNPJ_VALIDO
    empresa.logradouro = "Rua das Ondas"
    empresa.cidade = "Fortaleza"
    empresa.uf = "CE"
    empresa.save()
    assert empresa.esta_completa is True


# --- API: permissões ------------------------------------------------------


def test_get_exige_autenticacao(api, db):
    assert api.get(reverse("empresa")).status_code in (401, 403)


def test_interno_nao_admin_le_mas_nao_edita(api, estoque_user):
    auth(api, estoque_user)
    assert api.get(reverse("empresa")).status_code == 200

    resposta = api.patch(
        reverse("empresa"), {"razao_social": "Hack"}, format="json"
    )
    assert resposta.status_code == 403
    assert Empresa.load().razao_social != "Hack"


def test_cliente_nao_acessa(api, cliente_user):
    auth(api, cliente_user)
    assert api.get(reverse("empresa")).status_code == 403


def test_admin_edita(api, admin_user):
    auth(api, admin_user)
    resposta = api.patch(
        reverse("empresa"),
        {"razao_social": "Samara Beach LTDA", "cnpj": "11222333000181", "uf": "ce"},
        format="json",
    )
    assert resposta.status_code == 200

    empresa = Empresa.load()
    assert empresa.razao_social == "Samara Beach LTDA"
    assert empresa.cnpj == CNPJ_VALIDO
    assert empresa.uf == "CE"


def test_admin_recebe_derivados_no_get(api, admin_user):
    auth(api, admin_user)
    dados = api.get(reverse("empresa")).json()
    assert "endereco_linha" in dados
    assert "esta_completa" in dados


# --- API: validação -------------------------------------------------------


def test_cnpj_invalido_e_recusado(api, admin_user):
    auth(api, admin_user)
    resposta = api.patch(
        reverse("empresa"), {"cnpj": "11111111111111"}, format="json"
    )
    assert resposta.status_code == 400
    assert "cnpj" in resposta.json()


def test_cnpj_vazio_e_aceito(api, admin_user):
    """O cadastro pode ser preenchido aos poucos."""
    auth(api, admin_user)
    resposta = api.patch(reverse("empresa"), {"cnpj": ""}, format="json")
    assert resposta.status_code == 200


def test_uf_com_tamanho_errado_e_recusada(api, admin_user):
    auth(api, admin_user)
    resposta = api.patch(reverse("empresa"), {"uf": "CEA"}, format="json")
    assert resposta.status_code == 400
    assert "uf" in resposta.json()


# --- API pública ----------------------------------------------------------


def test_publica_dispensa_login(api, db):
    empresa = Empresa.load()
    empresa.razao_social = "Samara Beach LTDA"
    empresa.cnpj = CNPJ_VALIDO
    empresa.save()

    resposta = api.get(reverse("empresa-publica"))
    assert resposta.status_code == 200
    assert resposta.json()["cnpj"] == CNPJ_VALIDO


def test_publica_nao_expoe_dados_fiscais_internos(api, db):
    empresa = Empresa.load()
    empresa.inscricao_estadual = "123456789"
    empresa.regime_tributario = "simples"
    empresa.save()

    dados = api.get(reverse("empresa-publica")).json()
    assert "inscricao_estadual" not in dados
    assert "inscricao_municipal" not in dados
    assert "regime_tributario" not in dados


def test_publica_e_somente_leitura(api, admin_user):
    auth(api, admin_user)
    resposta = api.patch(
        reverse("empresa-publica"), {"razao_social": "X"}, format="json"
    )
    assert resposta.status_code == 405


# --- Consultas externas ---------------------------------------------------


def test_consulta_cep_exige_usuario_interno(api, cliente_user):
    auth(api, cliente_user)
    resposta = api.get(reverse("empresa-consultar-cep"), {"cep": "60000000"})
    assert resposta.status_code == 403


def test_consulta_cep_valida_formato_sem_chamar_a_rede(api, admin_user):
    """CEP curto falha na validação local — nenhuma requisição externa sai."""
    auth(api, admin_user)
    resposta = api.get(reverse("empresa-consultar-cep"), {"cep": "123"})
    assert resposta.status_code == 400


def test_consulta_cnpj_valida_formato_sem_chamar_a_rede(api, admin_user):
    auth(api, admin_user)
    resposta = api.get(reverse("empresa-consultar-cnpj"), {"cnpj": "11111111111111"})
    assert resposta.status_code == 400
