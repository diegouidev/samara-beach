"""
Exportação de relatórios em CSV.

Formatado para o Excel em português: separador `;`, decimal com vírgula e BOM
UTF-8 — sem o BOM o Excel abre os acentos quebrados.
"""
import csv
from datetime import date, datetime
from decimal import Decimal
from io import StringIO

from django.http import HttpResponse


def _formatar(valor) -> str:
    if valor is None:
        return ""
    if isinstance(valor, Decimal | float):
        # Vírgula decimal: é o que o Excel pt-BR entende como número.
        return f"{valor:.2f}".replace(".", ",")
    if isinstance(valor, datetime):
        return valor.strftime("%d/%m/%Y %H:%M")
    if isinstance(valor, date):
        return valor.strftime("%d/%m/%Y")
    return str(valor)


def csv_response(nome_arquivo: str, colunas: list[str], linhas: list[dict]) -> HttpResponse:
    buffer = StringIO()
    escritor = csv.writer(buffer, delimiter=";", quoting=csv.QUOTE_MINIMAL)

    # Cabeçalho legível: "ticket_medio" → "Ticket medio".
    escritor.writerow([c.replace("_", " ").capitalize() for c in colunas])
    for linha in linhas:
        escritor.writerow([_formatar(linha.get(c)) for c in colunas])

    resposta = HttpResponse(
        "﻿" + buffer.getvalue(),
        content_type="text/csv; charset=utf-8",
    )
    resposta["Content-Disposition"] = f'attachment; filename="{nome_arquivo}.csv"'
    return resposta
