"""Campos de serializer reutilizáveis."""
from rest_framework import serializers


class RelativeImageField(serializers.ImageField):
    """
    Devolve o caminho relativo da imagem (ex.: `/media/produtos/foto.jpg`)
    em vez da URL absoluta.

    Motivo: a API é consumida de dois contextos com hosts diferentes — do
    browser (mesma origem, via proxy) e do SSR do Next dentro da rede Docker
    (`http://backend:8000`). Uma URL absoluta montada a partir do `Host` da
    requisição fica correta em um contexto e quebrada no outro. O caminho
    relativo funciona nos dois: os frontends prefixam a base quando precisam.
    """

    def to_representation(self, value):
        if not value:
            return None
        return value.url
