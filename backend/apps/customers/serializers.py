from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import TipoUsuario, User

from .models import Cliente, Endereco


class EnderecoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Endereco
        fields = [
            "id",
            "tipo",
            "logradouro",
            "numero",
            "complemento",
            "bairro",
            "cidade",
            "uf",
            "cep",
            "principal",
        ]
        read_only_fields = ["id"]


class ClienteSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="usuario.email", read_only=True)
    enderecos = EnderecoSerializer(many=True, read_only=True)

    class Meta:
        model = Cliente
        fields = ["id", "email", "nome", "cpf", "telefone", "enderecos", "created_at"]
        read_only_fields = ["id", "email", "enderecos", "created_at"]


class RegistroClienteSerializer(serializers.Serializer):
    """Self-service: cria User (tipo cliente) + Cliente."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    nome = serializers.CharField(max_length=200)
    cpf = serializers.CharField(max_length=14, required=False, allow_blank=True)
    telefone = serializers.CharField(max_length=30, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Já existe uma conta com este e-mail.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            tipo=TipoUsuario.CLIENTE,
            first_name=validated_data["nome"].split(" ")[0][:150],
        )
        cliente = Cliente.objects.create(
            usuario=user,
            nome=validated_data["nome"],
            cpf=validated_data.get("cpf", ""),
            telefone=validated_data.get("telefone", ""),
        )
        return cliente

    def to_representation(self, instance):
        return ClienteSerializer(instance, context=self.context).data
