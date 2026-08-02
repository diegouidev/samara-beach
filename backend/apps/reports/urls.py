from django.urls import path

from .views import DashboardView, MargemView, RelatorioView, ResultadoView

urlpatterns = [
    path("relatorios/dashboard/", DashboardView.as_view(), name="relatorio-dashboard"),
    path("relatorios/margem/", MargemView.as_view(), name="relatorio-margem"),
    path("relatorios/resultado/", ResultadoView.as_view(), name="relatorio-resultado"),
    # Genérica: vendas | produtos | clientes | financeiro (+ ?formato=csv).
    path(
        "relatorios/<str:nome>/",
        RelatorioView.as_view(),
        name="relatorio-detalhado",
    ),
]
