"""
Permissões reutilizáveis da API.

Regras gerais do storefront/painel:
- Catálogo: leitura pública (SAFE_METHODS), escrita só para usuário interno
  com papel adequado.
- Estoque/fornecedores: leitura e escrita só para usuário interno com papel.
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import PapelInterno


class IsInternalUser(BasePermission):
    """Permite acesso apenas a usuários internos (equipe da loja)."""

    message = "Acesso restrito a usuários internos."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_interno)


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
