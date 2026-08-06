from rest_framework import serializers

from apps.common.documentos import cnpj_valido

from .models import Empresa

# Campos fiscais/cadastrais completos — só para usuário interno.
CAMPOS_INTERNOS = [
    "razao_social",
    "nome_fantasia",
    "cnpj",
    "inscricao_estadual",
    "inscricao_municipal",
    "regime_tributario",
    "cep",
    "logradouro",
    "numero",
    "complemento",
    "bairro",
    "cidade",
    "uf",
    "telefone",
    "whatsapp",
    "email",
    "site",
    "instagram",
    "facebook",
    "tiktok",
    "horario_funcionamento",
]


class EmpresaSerializer(serializers.ModelSerializer):
    """Visão interna: tudo, mais os derivados usados no recibo."""

    endereco_linha = serializers.CharField(read_only=True)
    esta_completa = serializers.BooleanField(read_only=True)

    class Meta:
        model = Empresa
        fields = [*CAMPOS_INTERNOS, "endereco_linha", "esta_completa", "updated_at"]


class EmpresaPublicaSerializer(serializers.ModelSerializer):
    """
    Visão pública (rodapé da loja): identificação exigida por lei e contato.

    Fora daqui de propósito: inscrições, regime tributário e e-mail interno —
    não há motivo para expor a quem só está navegando na loja.
    """

    endereco_linha = serializers.CharField(read_only=True)

    class Meta:
        model = Empresa
        fields = [
            "razao_social",
            "nome_fantasia",
            "cnpj",
            "endereco_linha",
            "cidade",
            "uf",
            "telefone",
            "whatsapp",
            "email",
            "instagram",
            "facebook",
            "tiktok",
            "horario_funcionamento",
        ]


class EmpresaUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = CAMPOS_INTERNOS

    def validate_cnpj(self, valor):
        # Vazio é permitido: o cadastro pode ser preenchido aos poucos.
        if valor and not cnpj_valido(valor):
            raise serializers.ValidationError("CNPJ inválido.")
        return valor

    def validate_uf(self, valor):
        if valor and len(valor.strip()) != 2:
            raise serializers.ValidationError("UF deve ter 2 letras, ex.: CE.")
        return valor
