from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "tipo",
            "papel",
            "is_interno",
            "is_cliente",
        ]
        read_only_fields = fields


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adiciona tipo/papel ao payload do token e à resposta do login."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["tipo"] = user.tipo
        token["papel"] = user.papel
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
