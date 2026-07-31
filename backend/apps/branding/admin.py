from django.contrib import admin

from .models import Branding


@admin.register(Branding)
class BrandingAdmin(admin.ModelAdmin):
    list_display = ("nome_loja", "cor_primaria", "cor_destaque", "updated_at")
