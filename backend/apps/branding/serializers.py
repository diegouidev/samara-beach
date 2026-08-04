from rest_framework import serializers

from apps.common.serializers import RelativeImageField

from .models import Branding


HERO_FIELDS = [
    "hero_modo",
    "hero_imagem_link",
    "hero_badge",
    "hero_titulo",
    "hero_subtitulo",
    "hero_cta_texto",
    "hero_cta_link",
]


class BrandingSerializer(serializers.ModelSerializer):
    logo = RelativeImageField(read_only=True)
    favicon = RelativeImageField(read_only=True)
    hero_imagem = RelativeImageField(read_only=True)

    class Meta:
        model = Branding
        fields = [
            "nome_loja",
            "cor_primaria",
            "cor_secundaria",
            "cor_destaque",
            "cor_fundo",
            "cor_texto",
            "logo",
            "favicon",
            "hero_imagem",
            *HERO_FIELDS,
            "whatsapp",
            "updated_at",
        ]


class BrandingUpdateSerializer(serializers.ModelSerializer):
    """Update parcial — aceita upload de logo/favicon/hero (multipart)."""

    class Meta:
        model = Branding
        fields = [
            "nome_loja",
            "cor_primaria",
            "cor_secundaria",
            "cor_destaque",
            "cor_fundo",
            "cor_texto",
            "logo",
            "favicon",
            "hero_imagem",
            *HERO_FIELDS,
            "whatsapp",
        ]
