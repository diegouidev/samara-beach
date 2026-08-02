from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ClienteAdminViewSet,
    EnderecoViewSet,
    MeuPerfilView,
    RegistroClienteView,
)

router = DefaultRouter()
router.register("enderecos", EnderecoViewSet, basename="endereco")
router.register("clientes", ClienteAdminViewSet, basename="cliente")

urlpatterns = [
    path("clientes/registro/", RegistroClienteView.as_view(), name="cliente-registro"),
    path("clientes/eu/", MeuPerfilView.as_view(), name="cliente-eu"),
] + router.urls
