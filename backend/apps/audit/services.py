"""
Ponto único de escrita da trilha de auditoria.

Por que explícito, e não signals ou threadlocal: o projeto já passa o usuário
por parâmetro em todos os services (`abrir_caixa(operador, ...)`,
`registrar_venda(*, operador, ...)`). Signals enxergam *o quê* mas nunca
*quem* — que é o ponto da feature. Threadlocal quebraria em
`orders.services.mudar_status`, que roda dentro de `transaction.on_commit`
disparando tasks Celery, num contexto sem request.
"""
import logging
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from .models import NIVEL_POR_ACAO, NivelAuditoria, RegistroAuditoria

logger = logging.getLogger(__name__)

#: Nunca entram no snapshot — segredo, ruído ou não serializável.
CAMPOS_IGNORADOS = {
    "password",
    "last_login",
    "id",
    "created_at",
    "updated_at",
}

#: Acima disso o payload é substituído por um resumo (protege contra
#: TextField gigante virando linha de log de megabytes).
LIMITE_DADOS_BYTES = 8_000


def jsonavel(valor):
    """
    Converte o que o JSONField não aceita: Decimal, UUID, date e datetime.

    Sem isso, auditar `fechar_caixa` (Decimal) ou `marcar_paga` (date)
    levantaria TypeError dentro de uma transação atômica e derrubaria a
    operação inteira.
    """
    if isinstance(valor, (Decimal, UUID, datetime, date)):
        return str(valor)
    if isinstance(valor, dict):
        return {k: jsonavel(v) for k, v in valor.items()}
    if isinstance(valor, (list, tuple)):
        return [jsonavel(v) for v in valor]
    return valor


def diff(antes: dict, depois: dict) -> dict:
    """
    {campo: {"de": x, "para": y}} só dos campos que mudaram.

    Compara por str() para não marcar diferença entre Decimal("100.00") e
    Decimal("100.0"), ou entre date e datetime.date — iguais em valor,
    diferentes em repr.
    """
    mudou = {}
    for campo, novo in depois.items():
        velho = antes.get(campo)
        if str(velho) != str(novo):
            mudou[campo] = {"de": jsonavel(velho), "para": jsonavel(novo)}
    return mudou


def snapshot(instancia, campos: list[str] | None = None) -> dict:
    """
    Valores dos campos auditáveis, já serializáveis.

    Usa `attname` nas FKs (`categoria_id`) para não disparar uma query por
    relacionamento, e pula arquivos — ImageField devolve FieldFile, que não
    vai para JSON.
    """
    from django.db.models import FileField

    meta = instancia._meta
    if campos is None:
        nomes = [
            f.attname if f.is_relation else f.name
            for f in meta.concrete_fields
            if f.name not in CAMPOS_IGNORADOS and not isinstance(f, FileField)
        ]
    else:
        nomes = campos
    return {nome: jsonavel(getattr(instancia, nome, None)) for nome in nomes}


def registrar(
    *,
    acao: str,
    usuario=None,
    objeto=None,
    descricao: str = "",
    dados: dict | None = None,
    nivel: str | None = None,
    request=None,
) -> RegistroAuditoria | None:
    """
    Grava uma linha na trilha.

    NUNCA levanta para o chamador: auditoria é observabilidade, não regra de
    negócio. Quase todos os services são @transaction.atomic — deixar uma
    falha de log derrubar uma venda seria muito pior do que perder o log.
    """
    try:
        if usuario is None and request is not None:
            candidato = getattr(request, "user", None)
            if candidato is not None and candidato.is_authenticated:
                usuario = candidato

        payload = jsonavel(dados or {})
        if len(str(payload)) > LIMITE_DADOS_BYTES:
            payload = {
                "truncado": True,
                "campos": sorted(payload)[:50] if isinstance(payload, dict) else [],
            }

        campos = {
            "usuario": usuario,
            "usuario_email": getattr(usuario, "email", "") or "",
            "usuario_nome": getattr(usuario, "nome_exibicao", "") or "",
            "usuario_papel": getattr(usuario, "papel", "") or "",
            "acao": acao,
            "nivel": nivel or NIVEL_POR_ACAO.get(acao, NivelAuditoria.INFO),
            "descricao": (descricao or "")[:255],
            "dados": payload,
        }

        if objeto is not None:
            meta = objeto._meta
            campos.update(
                app_label=meta.app_label,
                model_name=meta.model_name,
                objeto_id=str(objeto.pk),
                objeto_repr=str(objeto)[:200],
            )

        if request is not None:
            campos["ip"] = ip_do_request(request)
            campos["user_agent"] = (request.META.get("HTTP_USER_AGENT") or "")[:300]

        return RegistroAuditoria.objects.create(**campos)
    except Exception:  # noqa: BLE001
        logger.exception("Falha ao registrar auditoria (ação=%s).", acao)
        return None


def ip_do_request(request) -> str | None:
    """Atrás de Caddy + Cloudflare, o IP real vem no X-Forwarded-For."""
    encaminhado = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if encaminhado:
        return encaminhado.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
