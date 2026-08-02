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
    # Cliente de balcão não tem usuário — o e-mail vem vazio, não quebra.
    email = serializers.EmailField(
        source="usuario.email", read_only=True, default=""
    )
    enderecos = EnderecoSerializer(many=True, read_only=True)

    class Meta:
        model = Cliente
        fields = ["id", "email", "nome", "cpf", "telefone", "enderecos", "created_at"]
        read_only_fields = ["id", "email", "enderecos", "created_at"]


class ClienteAdminSerializer(serializers.ModelSerializer):
    """Visão do painel interno: inclui métricas agregadas na view."""

    # Conta da loja quando existe; senão, o e-mail do cadastro de balcão.
    email = serializers.CharField(source="email_contato", read_only=True)
    enderecos = EnderecoSerializer(many=True, read_only=True)
    total_pedidos = serializers.IntegerField(read_only=True, default=0)
    total_gasto = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, default=0
    )

    class Meta:
        model = Cliente
        fields = [
            "id",
            "email",
            "nome",
            "cpf",
            "telefone",
            "data_nascimento",
            "observacoes",
            "enderecos",
            "total_pedidos",
            "total_gasto",
            "created_at",
        ]
        read_only_fields = fields


class EnderecoEntradaSerializer(serializers.Serializer):
    """Endereço enviado junto com o cadastro do cliente (tudo opcional)."""

    cep = serializers.CharField(max_length=9, required=False, allow_blank=True)
    logradouro = serializers.CharField(max_length=200, required=False, allow_blank=True)
    numero = serializers.CharField(max_length=20, required=False, allow_blank=True)
    complemento = serializers.CharField(max_length=100, required=False, allow_blank=True)
    bairro = serializers.CharField(max_length=100, required=False, allow_blank=True)
    cidade = serializers.CharField(max_length=100, required=False, allow_blank=True)
    uf = serializers.CharField(max_length=2, required=False, allow_blank=True)


class ClienteBalcaoSerializer(serializers.ModelSerializer):
    """
    Cadastro completo pelo painel (balcão), sem exigir conta na loja.

    Aceita o endereço no mesmo POST: quem está atendendo preenche tudo numa
    tela só, em vez de salvar o cliente e depois abrir outro formulário.
    """

    endereco = EnderecoEntradaSerializer(required=False, write_only=True)

    class Meta:
        model = Cliente
        fields = [
            "id",
            "nome",
            "cpf",
            "telefone",
            "email",
            "data_nascimento",
            "observacoes",
            "endereco",
        ]
        read_only_fields = ["id"]

    def validate_cpf(self, value):
        cpf = (value or "").strip()
        if not cpf:
            return ""
        existente = Cliente.objects.filter(cpf=cpf)
        if self.instance:
            existente = existente.exclude(pk=self.instance.pk)
        if existente.exists():
            raise serializers.ValidationError(
                "Já existe um cliente com este CPF — localize-o pela busca."
            )
        return cpf

    def _salvar_endereco(self, cliente, dados):
        # Só grava se algo de fato foi preenchido; cidade é o mínimo útil.
        if not dados or not any((v or "").strip() for v in dados.values()):
            return
        Endereco.objects.update_or_create(
            cliente=cliente,
            principal=True,
            defaults={
                "logradouro": dados.get("logradouro", ""),
                "numero": dados.get("numero", ""),
                "complemento": dados.get("complemento", ""),
                "bairro": dados.get("bairro", ""),
                "cidade": dados.get("cidade", ""),
                "uf": (dados.get("uf") or "").upper(),
                "cep": dados.get("cep", ""),
            },
        )

    @transaction.atomic
    def create(self, validated_data):
        endereco = validated_data.pop("endereco", None)
        cliente = super().create(validated_data)
        self._salvar_endereco(cliente, endereco)
        return cliente

    @transaction.atomic
    def update(self, instance, validated_data):
        endereco = validated_data.pop("endereco", None)
        cliente = super().update(instance, validated_data)
        self._salvar_endereco(cliente, endereco)
        return cliente

    def to_representation(self, instance):
        return ClienteAdminSerializer(instance, context=self.context).data


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
