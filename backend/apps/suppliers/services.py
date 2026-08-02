"""
Serviços de fornecedores e contas a pagar.

- Consulta de CNPJ na BrasilAPI (dados públicos da Receita Federal).
- Baixa de contas a pagar, com repetição mensal das despesas fixas.

Usada pelo painel para preencher o cadastro de fornecedor automaticamente:
a pessoa digita o CNPJ e o restante do formulário vem pronto.

Fica no backend (e não no browser) para centralizar o cache e não depender da
rede do cliente. Sem chave de API — a BrasilAPI é aberta.
"""
import calendar
import json
import re
import urllib.error
import urllib.request
from datetime import date

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

BRASILAPI_URL = "https://brasilapi.com.br/api/cnpj/v1/{cnpj}"
BRASILAPI_CEP_URL = "https://brasilapi.com.br/api/cep/v2/{cep}"
TIMEOUT_SEGUNDOS = 8
CACHE_SEGUNDOS = 60 * 60 * 24  # dados cadastrais mudam pouco


def apenas_digitos(valor: str) -> str:
    return re.sub(r"\D", "", valor or "")


def formatar_cnpj(cnpj: str) -> str:
    """00000000000000 → 00.000.000/0000-00 (devolve como veio se não tiver 14)."""
    d = apenas_digitos(cnpj)
    if len(d) != 14:
        return cnpj
    return f"{d[:2]}.{d[2:5]}.{d[5:8]}/{d[8:12]}-{d[12:]}"


def cnpj_valido(cnpj: str) -> bool:
    """Validação pelos dois dígitos verificadores."""
    d = apenas_digitos(cnpj)
    if len(d) != 14 or d == d[0] * 14:
        return False

    def digito(base: str) -> str:
        pesos = list(range(len(base) + 1, 1, -1))
        pesos = [p if p <= 9 else p - 8 for p in pesos]
        soma = sum(int(n) * p for n, p in zip(base, pesos))
        resto = soma % 11
        return "0" if resto < 2 else str(11 - resto)

    return d[12] == digito(d[:12]) and d[13] == digito(d[:13])


def _telefone(dados: dict) -> str:
    ddd = (dados.get("ddd_telefone_1") or "").strip()
    if ddd:
        return ddd
    return (dados.get("ddd_telefone_2") or "").strip()


def consultar_cnpj(cnpj: str) -> dict:
    """
    Devolve os dados do CNPJ já no formato dos campos de Fornecedor.

    Levanta ValidationError (400) para CNPJ malformado e NotFound (404) quando
    a Receita não conhece o número. Erros de rede viram ValidationError com uma
    mensagem clara — o cadastro manual continua possível.
    """
    numero = apenas_digitos(cnpj)
    if not cnpj_valido(numero):
        raise ValidationError({"cnpj": "CNPJ inválido."})

    chave = f"cnpj:{numero}"
    if (cacheado := cache.get(chave)) is not None:
        return cacheado

    requisicao = urllib.request.Request(
        BRASILAPI_URL.format(cnpj=numero),
        headers={"User-Agent": "samara-beach-admin"},
    )
    try:
        with urllib.request.urlopen(requisicao, timeout=TIMEOUT_SEGUNDOS) as resposta:
            dados = json.load(resposta)
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise NotFound("CNPJ não encontrado na base da Receita Federal.")
        raise ValidationError(
            {"cnpj": "Serviço de consulta indisponível no momento."}
        )
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        raise ValidationError(
            {"cnpj": "Não foi possível consultar o CNPJ (sem resposta do serviço)."}
        )

    razao_social = (dados.get("razao_social") or "").strip()
    nome_fantasia = (dados.get("nome_fantasia") or "").strip()

    resultado = {
        "cnpj": formatar_cnpj(numero),
        "razao_social": razao_social,
        "nome_fantasia": nome_fantasia,
        # O nome usado no dia a dia: fantasia quando existe, senão razão social.
        "nome": nome_fantasia or razao_social,
        "email": (dados.get("email") or "").strip().lower(),
        "telefone": _telefone(dados),
        "cep": (dados.get("cep") or "").strip(),
        "logradouro": (dados.get("logradouro") or "").strip(),
        "numero": (dados.get("numero") or "").strip(),
        "complemento": (dados.get("complemento") or "").strip(),
        "bairro": (dados.get("bairro") or "").strip(),
        "cidade": (dados.get("municipio") or "").strip(),
        "uf": (dados.get("uf") or "").strip(),
        "situacao_cadastral": (dados.get("descricao_situacao_cadastral") or "").strip(),
        "atividade_principal": (
            (dados.get("cnae_fiscal_descricao") or "").strip()
        ),
    }
    cache.set(chave, resultado, CACHE_SEGUNDOS)
    return resultado


def consultar_cep(cep: str) -> dict:
    """
    Endereço a partir do CEP (BrasilAPI). Mesmo contrato da consulta de CNPJ:
    erros de rede viram mensagem clara e o preenchimento manual continua valendo.
    """
    numero = apenas_digitos(cep)
    if len(numero) != 8:
        raise ValidationError({"cep": "CEP deve ter 8 dígitos."})

    chave = f"cep:{numero}"
    if (cacheado := cache.get(chave)) is not None:
        return cacheado

    requisicao = urllib.request.Request(
        BRASILAPI_CEP_URL.format(cep=numero),
        headers={"User-Agent": "samara-beach-admin"},
    )
    try:
        with urllib.request.urlopen(requisicao, timeout=TIMEOUT_SEGUNDOS) as resposta:
            dados = json.load(resposta)
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise NotFound("CEP não encontrado.")
        raise ValidationError({"cep": "Serviço de consulta indisponível."})
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        raise ValidationError(
            {"cep": "Não foi possível consultar o CEP (sem resposta do serviço)."}
        )

    resultado = {
        "cep": f"{numero[:5]}-{numero[5:]}",
        "logradouro": (dados.get("street") or "").strip(),
        "bairro": (dados.get("neighborhood") or "").strip(),
        "cidade": (dados.get("city") or "").strip(),
        "uf": (dados.get("state") or "").strip(),
    }
    cache.set(chave, resultado, CACHE_SEGUNDOS)
    return resultado


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
def marcar_paga(conta, pago_em: date | None = None):
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
