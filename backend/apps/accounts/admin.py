from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = (
        "email", "first_name", "last_name", "cargo", "tipo", "papel", "is_active",
    )
    list_filter = ("tipo", "papel", "is_active", "is_staff")
    search_fields = ("email", "first_name", "last_name", "cpf", "cargo")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Dados pessoais", {
            "fields": (
                "first_name", "last_name", "cpf", "telefone",
                "cargo", "data_admissao", "observacoes",
            )
        }),
        ("Tipo / Papel", {"fields": ("tipo", "papel")}),
        ("Permissões", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Datas", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "tipo", "papel"),
            },
        ),
    )
