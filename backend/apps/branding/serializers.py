from rest_framework import serializers

from .models import Branding


class BrandingSerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(read_only=True)
    favicon = serializers.ImageField(read_only=True)

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
        ]
