"""Exceções compartilhadas da API."""
from rest_framework import status
from rest_framework.exceptions import APIException


class LojaOffline(APIException):
    """
    Loja online desligada pelo kill switch (`LOJA_ONLINE_ATIVA`).

    503 (e não 403) por dois motivos: é semanticamente correto — o serviço está
    indisponível, não proibido — e permite ao storefront distinguir "loja
    desligada" de "token expirado", que também daria 401/403.
    """

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = (
        "A loja online está temporariamente indisponível. "
        "Fale com a gente pelo WhatsApp."
    )
    default_code = "loja_offline"
