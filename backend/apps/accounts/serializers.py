from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.common.exceptions import LojaOffline
from apps.common.permissions import loja_online_ativa

from .models import PapelInterno, TipoUsuario, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "nome_exibicao",
            "cargo",
            "tipo",
            "papel",
            "is_interno",
            "is_cliente",
        ]
        read_only_fields = fields


class UsuarioInternoSerializer(serializers.ModelSerializer):
    """Leitura na listagem/detalhe da equipe."""

    nome_exibicao = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "nome_exibicao",
            "papel",
            "cpf",
            "telefone",
            "cargo",
            "data_admissao",
            "observacoes",
            "is_active",
            "last_login",
            "created_at",
        ]
        read_only_fields = ["id", "nome_exibicao", "last_login", "created_at"]


class UsuarioInternoCreateSerializer(serializers.ModelSerializer):
    """
    Cadastro de um membro da equipe pelo painel.

    O admin define a senha e a repassa; a pessoa troca depois em "Meu perfil".
    """

    senha = serializers.CharField(write_only=True)
    # O model permite papel vazio (clientes não têm), mas todo interno precisa
    # de um: sem isso a pessoa loga no painel e não enxerga seção nenhuma.
    papel = serializers.ChoiceField(choices=PapelInterno.choices)

    class Meta:
        model = User
        fields = [
            "email",
            "senha",
            "first_name",
            "last_name",
            "papel",
            "cpf",
            "telefone",
            "cargo",
            "data_admissao",
            "observacoes",
            "is_active",
        ]

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Já existe uma conta com este e-mail.")
        return value

    def validate_senha(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data):
        senha = validated_data.pop("senha")
        # Sempre interno: este endpoint cadastra equipe, não cliente.
        usuario = User(**validated_data, tipo=TipoUsuario.INTERNO)
        usuario.set_password(senha)
        usuario.save()
        return usuario

    def to_representation(self, instance):
        return UsuarioInternoSerializer(instance).data


class UsuarioInternoUpdateSerializer(serializers.ModelSerializer):
    """
    Edição pelo admin. `tipo` fica de fora: um interno não vira cliente por
    edição — para tirar o acesso, desativa-se a conta.
    """

    papel = serializers.ChoiceField(choices=PapelInterno.choices, required=False)

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "papel",
            "cpf",
            "telefone",
            "cargo",
            "data_admissao",
            "observacoes",
            "is_active",
        ]

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("Já existe uma conta com este e-mail.")
        return value

    def validate(self, attrs):
        """
        Trava de segurança: o admin logado não pode se rebaixar nem se desativar
        — sem isso a loja pode ficar sem nenhum administrador.
        """
        usuario_logado = self.context["request"].user
        if self.instance and self.instance.pk == usuario_logado.pk:
            if "papel" in attrs and attrs["papel"] != PapelInterno.ADMIN:
                raise serializers.ValidationError(
                    {"papel": "Você não pode alterar o próprio papel."}
                )
            if attrs.get("is_active") is False:
                raise serializers.ValidationError(
                    {"is_active": "Você não pode desativar a própria conta."}
                )
        return attrs

    def to_representation(self, instance):
        return UsuarioInternoSerializer(instance).data


class DefinirSenhaSerializer(serializers.Serializer):
    """Reset de senha de um membro da equipe pelo admin (sem exigir a atual)."""

    nova_senha = serializers.CharField(write_only=True)

    def validate_nova_senha(self, value):
        try:
            validate_password(value, self.context.get("usuario"))
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value


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
        # O super() vem primeiro de propósito: credencial errada continua
        # dando 401 genérico, sem revelar que a loja está desligada (e, por
        # tabela, que aquele e-mail existe).
        data = super().validate(attrs)
        # Com a loja online desligada, só a equipe interna entra — o endpoint
        # de token é o mesmo para painel e storefront, então o corte é aqui.
        if not self.user.is_interno and not loja_online_ativa():
            raise LojaOffline()
        data["user"] = UserSerializer(self.user).data
        return data
