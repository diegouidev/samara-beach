from rest_framework import serializers

from apps.common.serializers import RelativeImageField

from .models import Branding


class BrandingSerializer(serializers.ModelSerializer):
    logo = RelativeImageField(read_only=True)
    favicon = RelativeImageField(read_only=True)

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
            "whatsapp",
            "updated_at",
        ]


class BrandingUpdateSerializer(serializers.ModelSerializer):
    """Update parcial — aceita upload de logo/favicon (multipart)."""

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
            "whatsapp",
        ]
