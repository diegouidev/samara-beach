"""Trilha de auditoria: gravação, diff e blindagem contra falhas."""
from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest

from apps.audit import services as audit
from apps.audit.models import AcaoAuditoria, NivelAuditoria, RegistroAuditoria

pytestmark = pytest.mark.django_db


# --- Gravação -------------------------------------------------------------


def test_registra_quem_e_o_que(admin_user):
    reg = audit.registrar(
        usuario=admin_user,
        acao=AcaoAuditoria.AJUSTE_ESTOQUE,
        descricao="Ajustou o estoque",
    )
    assert reg is not None
    assert reg.usuario == admin_user
    assert reg.usuario_email == admin_user.email
    assert reg.usuario_papel == "admin"
    assert reg.acao == AcaoAuditoria.AJUSTE_ESTOQUE


def test_congela_identificacao_do_objeto(variacao):
    reg = audit.registrar(acao=AcaoAuditoria.ALTERACAO_PRECO, objeto=variacao)
    assert reg.app_label == "catalog"
    assert reg.model_name == "variacaoproduto"
    assert reg.objeto_id == str(variacao.pk)
    assert reg.objeto_repr  # str() do objeto, guardado como texto


def test_registro_sobrevive_a_exclusao_do_usuario(admin_user):
    """A pessoa sai da empresa; o histórico do que ela fez permanece."""
    email = admin_user.email
    reg_id = audit.registrar(usuario=admin_user, acao=AcaoAuditoria.LOGIN).id

    admin_user.delete()

    reg = RegistroAuditoria.objects.get(pk=reg_id)
    assert reg.usuario is None
    assert reg.usuario_email == email


# --- Serialização e blindagem --------------------------------------------


def test_serializa_decimal_uuid_e_data():
    """
    Sem isso, auditar fechar_caixa (Decimal) estouraria o JSONField dentro
    de uma transação atômica e derrubaria a operação.
    """
    reg = audit.registrar(
        acao=AcaoAuditoria.FECHAMENTO_CAIXA,
        dados={
            "valor": Decimal("1200.50"),
            "id": uuid4(),
            "quando": date(2026, 8, 20),
            "aninhado": {"lista": [Decimal("1.5")]},
        },
    )
    assert reg is not None
    assert reg.dados["valor"] == "1200.50"
    assert reg.dados["aninhado"]["lista"] == ["1.5"]


def test_nunca_levanta_quando_falha(admin_user):
    """Auditoria quebrada não pode derrubar a venda que a originou."""

    class NaoSerializavel:
        def __str__(self):
            raise RuntimeError("boom")

    reg = audit.registrar(
        usuario=admin_user,
        acao=AcaoAuditoria.VENDA,
        dados={"ruim": NaoSerializavel()},
    )
    assert reg is None  # falhou em silêncio, sem propagar


def test_payload_gigante_e_truncado():
    reg = audit.registrar(
        acao=AcaoAuditoria.ATUALIZAR, dados={"texto": "x" * 20_000}
    )
    assert reg.dados.get("truncado") is True


# --- Nível ----------------------------------------------------------------


def test_nivel_inferido_pela_acao():
    assert (
        audit.registrar(acao=AcaoAuditoria.AJUSTE_ESTOQUE).nivel
        == NivelAuditoria.CRITICO
    )
    assert audit.registrar(acao=AcaoAuditoria.LOGIN).nivel == NivelAuditoria.INFO


def test_nivel_explicito_vence_o_mapa():
    reg = audit.registrar(
        acao=AcaoAuditoria.LOGIN, nivel=NivelAuditoria.CRITICO
    )
    assert reg.nivel == NivelAuditoria.CRITICO


# --- Diff -----------------------------------------------------------------


def test_diff_so_traz_o_que_mudou():
    resultado = audit.diff(
        {"preco": "100.00", "cor": "Azul"}, {"preco": "89.90", "cor": "Azul"}
    )
    assert resultado == {"preco": {"de": "100.00", "para": "89.90"}}


def test_diff_vazio_quando_nada_muda():
    assert audit.diff({"a": 1}, {"a": 1}) == {}


def test_diff_compara_decimal_por_texto():
    """Decimal('100.00') e Decimal('100.0') são o mesmo valor."""
    assert audit.diff(
        {"preco": Decimal("100.00")}, {"preco": Decimal("100.00")}
    ) == {}


# --- Snapshot -------------------------------------------------------------


def test_snapshot_ignora_campos_sensiveis(admin_user):
    dados = audit.snapshot(admin_user)
    assert "password" not in dados
    assert "last_login" not in dados
    assert dados["email"] == admin_user.email


def test_snapshot_usa_id_em_relacionamentos(variacao):
    """`produto_id` em vez de `produto` — sem query extra por FK."""
    dados = audit.snapshot(variacao)
    assert "produto_id" in dados
    assert dados["produto_id"] == str(variacao.produto_id)


def test_snapshot_respeita_lista_de_campos(variacao):
    dados = audit.snapshot(variacao, ["preco", "sku"])
    assert set(dados) == {"preco", "sku"}


# =========================================================================
# API de consulta
# =========================================================================

from apps.conftest import auth  # noqa: E402

LISTA = "/api/auditoria/"


def test_admin_lista_auditoria(api, admin_user):
    audit.registrar(usuario=admin_user, acao=AcaoAuditoria.LOGIN)
    auth(api, admin_user)
    resposta = api.get(LISTA)
    assert resposta.status_code == 200
    assert resposta.json()["count"] >= 1


def test_atendimento_nao_acessa_auditoria(api, atendente_user):
    """A trilha mostra o que cada um fez — só o admin enxerga."""
    auth(api, atendente_user)
    assert api.get(LISTA).status_code == 403


def test_anonimo_nao_acessa_auditoria(api, db):
    assert api.get(LISTA).status_code in (401, 403)


def test_trilha_e_imutavel_pela_api(api, admin_user):
    reg = audit.registrar(usuario=admin_user, acao=AcaoAuditoria.LOGIN)
    auth(api, admin_user)
    assert api.post(LISTA, {}, format="json").status_code == 405
    assert api.delete(f"{LISTA}{reg.id}/").status_code == 405
    assert api.patch(f"{LISTA}{reg.id}/", {}, format="json").status_code == 405


def test_filtro_por_acao_e_nivel(api, admin_user):
    audit.registrar(usuario=admin_user, acao=AcaoAuditoria.AJUSTE_ESTOQUE)
    audit.registrar(usuario=admin_user, acao=AcaoAuditoria.LOGIN)
    auth(api, admin_user)

    por_acao = api.get(LISTA, {"acao": "ajuste_estoque"}).json()
    assert por_acao["count"] == 1

    criticos = api.get(LISTA, {"nivel": "critico"}).json()
    assert all(r["nivel"] == "critico" for r in criticos["results"])


def test_filtro_por_objeto(api, admin_user, variacao):
    audit.registrar(usuario=admin_user, acao=AcaoAuditoria.ALTERACAO_PRECO, objeto=variacao)
    audit.registrar(usuario=admin_user, acao=AcaoAuditoria.LOGIN)
    auth(api, admin_user)
    dados = api.get(
        LISTA, {"model_name": "variacaoproduto", "objeto_id": str(variacao.id)}
    ).json()
    assert dados["count"] == 1


def test_resumo_traz_contadores(api, admin_user):
    audit.registrar(usuario=admin_user, acao=AcaoAuditoria.AJUSTE_ESTOQUE)
    auth(api, admin_user)
    dados = api.get(f"{LISTA}resumo/").json()
    assert dados["acoes_hoje"] >= 1
    assert dados["criticas_semana"] >= 1


# =========================================================================
# Expurgo
# =========================================================================


def test_expurgo_respeita_prazo_por_nivel(admin_user, settings):
    from django.core.management import call_command
    from django.utils import timezone

    settings.AUDIT_RETENCAO_INFO_DIAS = 30
    settings.AUDIT_RETENCAO_CRITICO_DIAS = 3650

    antigo_info = audit.registrar(acao=AcaoAuditoria.LOGIN)
    antigo_critico = audit.registrar(acao=AcaoAuditoria.AJUSTE_ESTOQUE)
    passado = timezone.now() - timezone.timedelta(days=200)
    RegistroAuditoria.objects.filter(
        pk__in=[antigo_info.pk, antigo_critico.pk]
    ).update(created_at=passado)

    call_command("expurgar_auditoria")

    # O informativo velho sai; o crítico fica (retenção de 10 anos aqui).
    assert not RegistroAuditoria.objects.filter(pk=antigo_info.pk).exists()
    assert RegistroAuditoria.objects.filter(pk=antigo_critico.pk).exists()


def test_expurgo_dry_run_nao_apaga(settings):
    from django.core.management import call_command
    from django.utils import timezone

    settings.AUDIT_RETENCAO_INFO_DIAS = 1
    reg = audit.registrar(acao=AcaoAuditoria.LOGIN)
    RegistroAuditoria.objects.filter(pk=reg.pk).update(
        created_at=timezone.now() - timezone.timedelta(days=100)
    )

    call_command("expurgar_auditoria", "--dry-run")
    assert RegistroAuditoria.objects.filter(pk=reg.pk).exists()
