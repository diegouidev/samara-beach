"""
Documentos e endereços brasileiros: validação, formatação e consulta pública.

Fica em `common` porque vale para qualquer domínio — fornecedor tem CNPJ, a
empresa também, e amanhã o cliente pessoa jurídica terá. As consultas usam a
BrasilAPI (dados públicos da Receita/Correios), sem chave de API.

Ficam no backend (e não no browser) para centralizar o cache e não depender da
rede do cliente.
"""
import json
import re
import urllib.error
import urllib.request

from django.core.cache import cache
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


def formatar_cpf(cpf: str) -> str:
    """00000000000 → 000.000.000-00 (devolve como veio se não tiver 11)."""
    d = apenas_digitos(cpf)
    if len(d) != 11:
        return cpf
    return f"{d[:3]}.{d[3:6]}.{d[6:9]}-{d[9:]}"


def cpf_valido(cpf: str) -> bool:
    """Validação pelos dois dígitos verificadores."""
    d = apenas_digitos(cpf)
    if len(d) != 11 or d == d[0] * 11:
        return False

    def digito(base: str) -> str:
        pesos = range(len(base) + 1, 1, -1)
        soma = sum(int(n) * p for n, p in zip(base, pesos))
        resto = (soma * 10) % 11
        return "0" if resto == 10 else str(resto)

    return d[9] == digito(d[:9]) and d[10] == digito(d[:10])


def _telefone(dados: dict) -> str:
    ddd = (dados.get("ddd_telefone_1") or "").strip()
    if ddd:
        return ddd
    return (dados.get("ddd_telefone_2") or "").strip()


def consultar_cnpj(cnpj: str) -> dict:
    """
    Devolve os dados cadastrais do CNPJ já no formato dos campos de cadastro.

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
