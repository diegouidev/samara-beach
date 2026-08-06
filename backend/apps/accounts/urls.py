from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import (
    AlterarSenhaView,
    CustomTokenObtainPairView,
    LogoutView,
    MeView,
    UsuarioInternoViewSet,
)

app_name = "accounts"

router = DefaultRouter()
router.register("usuarios", UsuarioInternoViewSet, basename="usuario-interno")

urlpatterns = [
    path("token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("alterar-senha/", AlterarSenhaView.as_view(), name="alterar_senha"),
    path("", include(router.urls)),
]
