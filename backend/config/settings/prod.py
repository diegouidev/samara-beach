"""
Settings de produção.

Arquitetura: o app roda atrás de um proxy Caddy (HTTP interno) e é exposto
publicamente via **Cloudflare Tunnel** (que termina o TLS). Portanto:
- NÃO fazemos SSL redirect aqui (o Cloudflare já entrega HTTPS; redirecionar
  causaria loop). Confiamos no header X-Forwarded-Proto que o Caddy repassa.
- ALLOWED_HOSTS e CSRF_TRUSTED_ORIGINS vêm do .env (com o domínio real).
"""
from .base import *  # noqa: F401,F403
from .base import env

DEBUG = False

# Domínio(s) público(s) — ex.: "loja.seudominio.com,proxy,backend,localhost"
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["backend", "localhost"])

# Origens confiáveis para CSRF (necessário p/ Django admin e uploads via HTTPS).
# Ex.: "https://loja.seudominio.com"
CSRF_TRUSTED_ORIGINS = env.list("DJANGO_CSRF_TRUSTED_ORIGINS", default=[])

# O TLS é terminado pelo Cloudflare; o Caddy repassa X-Forwarded-Proto.
# Não redirecionar para https aqui (evita loop de redirect atrás do tunnel).
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

# Cookies seguros (a conexão pública é HTTPS via Cloudflare).
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# HSTS fica a cargo da Cloudflare; desligado aqui para não conflitar.
SECURE_HSTS_SECONDS = 0

# Servir estáticos do Django (admin/DRF) via WhiteNoise — sem servidor separado.
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")  # noqa: F405
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
