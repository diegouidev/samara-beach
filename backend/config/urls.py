from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    # Django admin sob /django-admin/ para não colidir com o painel Next em /admin
    # (ambos passam pelo mesmo proxy em produção).
    path("django-admin/", admin.site.urls),
    # Auth (JWT)
    path("api/auth/", include("apps.accounts.urls")),
    # Apps
    path("api/", include("apps.catalog.urls")),
    path("api/", include("apps.inventory.urls")),
    path("api/", include("apps.suppliers.urls")),
    path("api/", include("apps.customers.urls")),
    path("api/", include("apps.orders.urls")),
    path("api/", include("apps.reports.urls")),
    path("api/", include("apps.branding.urls")),
    # OpenAPI / docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
