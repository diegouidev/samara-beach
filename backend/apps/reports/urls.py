from django.urls import path

from .views import DashboardView, MargemView

urlpatterns = [
    path("relatorios/dashboard/", DashboardView.as_view(), name="relatorio-dashboard"),
    path("relatorios/margem/", MargemView.as_view(), name="relatorio-margem"),
]
