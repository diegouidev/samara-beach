from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
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


class PerfilUpdateSerializer(serializers.ModelSerializer):
    """
    Edição do próprio cadastro (aba "Meu perfil").

    `tipo` e `papel` ficam de fora de propósito: ninguém promove a si mesmo.
    """

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email"]

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("Já existe uma conta com este e-mail.")
        return value

    def to_representation(self, instance):
        return UserSerializer(instance).data


class AlterarSenhaSerializer(serializers.Serializer):
    """Troca de senha exigindo a senha atual."""

    senha_atual = serializers.CharField(write_only=True)
    nova_senha = serializers.CharField(write_only=True)

    def validate_senha_atual(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Senha atual incorreta.")
        return value

    def validate_nova_senha(self, value):
        user = self.context["request"].user
        try:
            validate_password(value, user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["nova_senha"])
        user.save(update_fields=["password", "updated_at"])
        return user


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
