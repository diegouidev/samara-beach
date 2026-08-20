"""
Serviços de fornecedores e contas a pagar.

- Baixa de contas a pagar, com repetição mensal das despesas fixas.

As consultas de CNPJ/CEP vivem em `apps.common.documentos` (valem para qualquer
domínio) e são reexportadas aqui para não quebrar quem já importa deste módulo.
"""
import calendar
from datetime import date

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.audit import services as audit
from apps.audit.models import AcaoAuditoria
from apps.common.documentos import (  # noqa: F401  (reexport)
    apenas_digitos,
    cnpj_valido,
    consultar_cep,
    consultar_cnpj,
    formatar_cnpj,
)


# =========================================================================
# Contas a pagar
# =========================================================================


def proximo_vencimento(data: date) -> date:
    """
    Mesmo dia do mês seguinte, ajustando quando o dia não existe:
    31/01 → 28/02 (ou 29/02 em ano bissexto), 31/03 → 30/04.
    """
    ano = data.year + (1 if data.month == 12 else 0)
    mes = 1 if data.month == 12 else data.month + 1
    ultimo_dia = calendar.monthrange(ano, mes)[1]
    return date(ano, mes, min(data.day, ultimo_dia))


@transaction.atomic
def marcar_paga(conta, pago_em: date | None = None, usuario=None):
    """
    Baixa a conta e, se for recorrente, já lança a do mês seguinte.

    Devolve `(conta, proxima)` — `proxima` é None quando não há repetição.
    """
    from .models import ContaPagar, StatusContaPagar

    if conta.status == StatusContaPagar.PAGA:
        raise ValidationError("Esta conta já está paga.")
    if conta.status == StatusContaPagar.CANCELADA:
        raise ValidationError("Esta conta está cancelada.")

    conta.status = StatusContaPagar.PAGA
    conta.pago_em = pago_em or timezone.localdate()
    conta.save(update_fields=["status", "pago_em", "updated_at"])

    # Logo após a baixa, e não em cada return: a função sai por três
    # caminhos diferentes conforme a recorrência.
    audit.registrar(
        usuario=usuario,
        acao=AcaoAuditoria.PAGAMENTO_CONTA,
        objeto=conta,
        descricao=(
            f"Baixou a conta '{conta.descricao or conta.get_categoria_display()}' "
            f"de R$ {conta.valor}."
        ),
        dados={
            "valor": conta.valor,
            "categoria": conta.categoria,
            "vencimento": conta.vencimento,
            "pago_em": conta.pago_em,
            "recorrente": conta.recorrente,
            "fornecedor_id": conta.fornecedor_id,
        },
    )

    if not conta.recorrente:
        return conta, None

    vencimento = proximo_vencimento(conta.vencimento)
    # Idempotente: se a repetição deste vencimento já existe, não duplica.
    ja_existe = ContaPagar.objects.filter(
        conta_origem=conta, vencimento=vencimento
    ).first()
    if ja_existe:
        return conta, ja_existe

    proxima = ContaPagar.objects.create(
        fornecedor=conta.fornecedor,
        categoria=conta.categoria,
        descricao=conta.descricao,
        valor=conta.valor,
        vencimento=vencimento,
        recorrente=True,
        conta_origem=conta,
    )
    return conta, proxima
