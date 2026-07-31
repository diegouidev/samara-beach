from rest_framework import parsers, permissions
from rest_framework.generics import RetrieveUpdateAPIView

from apps.accounts.models import PapelInterno
from apps.common.permissions import IsInternalUser

from .models import Branding
from .serializers import BrandingSerializer, BrandingUpdateSerializer


class BrandingAdminPermission(IsInternalUser):
    """Somente admin edita o branding; leitura é pública (tratada na view)."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "is_interno", False)
            and user.papel == PapelInterno.ADMIN
        )


class BrandingView(RetrieveUpdateAPIView):
    """
    GET  /api/branding/  → configuração de identidade visual (pública).
    PATCH/PUT            → atualiza (somente admin). Aceita multipart p/ logo/favicon.
    """

    permission_classes = [BrandingAdminPermission]
    parser_classes = [
        parsers.JSONParser,
        parsers.MultiPartParser,
        parsers.FormParser,
    ]

    def get_object(self):
        return Branding.load()

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return BrandingUpdateSerializer
        return BrandingSerializer

    def get_serializer_context(self):
        return {"request": self.request}
