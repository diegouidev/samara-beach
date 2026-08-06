from django.urls import path

from .views import EmpresaPublicaView, EmpresaView, consultar_cep, consultar_cnpj

urlpatterns = [
    # As rotas específicas vêm antes da genérica para não serem capturadas.
    path("empresa/publica/", EmpresaPublicaView.as_view(), name="empresa-publica"),
    path("empresa/consultar-cep/", consultar_cep, name="empresa-consultar-cep"),
    path("empresa/consultar-cnpj/", consultar_cnpj, name="empresa-consultar-cnpj"),
    path("empresa/", EmpresaView.as_view(), name="empresa"),
]
