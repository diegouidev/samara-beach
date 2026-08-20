"""
Permissões reutilizáveis da API.

Regras gerais do storefront/painel:
- Catálogo: leitura pública (SAFE_METHODS), escrita só para usuário interno
  com papel adequado.
- Estoque/fornecedores: leitura e escrita só para usuário interno com papel.
"""
from django.conf import settings
from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import PapelInterno

from .exceptions import LojaOffline


def loja_online_ativa() -> bool:
    """
    Kill switch da loja pública (`LOJA_ONLINE_ATIVA` no backend/.env).

    Lido com getattr a cada chamada — e não no import — para que
    @override_settings funcione nos testes.
    """
    return getattr(settings, "LOJA_ONLINE_ATIVA", True)


def eh_interno(user) -> bool:
    """Usuário da equipe da loja (painel, PDV, caixa)."""
    return bool(
        user and user.is_authenticated and getattr(user, "is_interno", False)
    )


class LojaOnlineRequerida(BasePermission):
    """
    Bloqueia o acesso público quando a loja online está desligada.

    Usuário INTERNO sempre passa: o painel usa as mesmas rotas do storefront
    (produtos, categorias, pedidos) e não pode ser afetado pelo kill switch.

    Componha com a permissão de negócio — o DRF exige que todas retornem True:
        permission_classes = [LojaOnlineRequerida, ReadOnlyOrInternalRole]
    """

    def has_permission(self, request, view):
        if eh_interno(request.user):
            return True
        if not loja_online_ativa():
            # Levantar (em vez de retornar False) dá 503 com mensagem própria,
            # em vez do 401/403 genérico do DRF.
            raise LojaOffline()
        return True


class IsInternalUser(BasePermission):
    """Permite acesso apenas a usuários internos (equipe da loja)."""

    message = "Acesso restrito a usuários internos."

    def has_permission(self, request, view):
        return eh_interno(request.user)


class HasInternalRole(BasePermission):
    """
    Permite acesso a usuários internos com um dos papéis exigidos.

    Uso na view:
        permission_classes = [HasInternalRole]
        required_roles = [PapelInterno.ESTOQUE, PapelInterno.ADMIN]

    Admin sempre passa.
    """

    message = "Você não tem o papel necessário para esta ação."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.is_interno):
            return False

        if user.papel == PapelInterno.ADMIN:
            return True

        required = getattr(view, "required_roles", None)
        if not required:
            # Nenhum papel específico exigido: basta ser interno.
            return True
        return user.papel in required


class IsCliente(BasePermission):
    """Permite acesso apenas a usuários do tipo cliente."""

    message = "Acesso restrito a clientes."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_cliente)


class ReadOnlyOrInternalRole(BasePermission):
    """
    Leitura liberada para qualquer um (público);
    escrita apenas para usuário interno com papel adequado.

    Configure `write_roles` na view para restringir a escrita, ex.:
        write_roles = [PapelInterno.ESTOQUE, PapelInterno.ADMIN]
    Sem `write_roles`, qualquer usuário interno pode escrever.
    """

    message = "Escrita restrita a usuários internos com papel adequado."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        user = request.user
        if not (user and user.is_authenticated and user.is_interno):
            return False

        if user.papel == PapelInterno.ADMIN:
            return True

        write_roles = getattr(view, "write_roles", None)
        if not write_roles:
            return True
        return user.papel in write_roles
