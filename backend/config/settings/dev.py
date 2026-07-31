"""Settings de desenvolvimento."""
from .base import *  # noqa: F401,F403
from .base import env

DEBUG = True

INSTALLED_APPS += ["django_extensions"]  # noqa: F405

# Em dev, liberamos CORS de forma mais ampla para facilitar os frontends locais.
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Executa tarefas Celery de forma síncrona se quiser depurar sem worker:
# CELERY_TASK_ALWAYS_EAGER = True
