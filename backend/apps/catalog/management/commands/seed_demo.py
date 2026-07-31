"""
Popula o banco com dados de demonstração:
usuários internos (por papel), um cliente, categorias, produtos/variações,
estoque inicial e um cupom.

Uso: python manage.py seed_demo
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import PapelInterno, TipoUsuario, User
from apps.catalog.models import Categoria, Produto, TipoOrigem, VariacaoProduto
from apps.customers.models import Cliente
from apps.inventory.models import MovimentacaoEstoque
from apps.orders.models import Cupom, TipoCupom


class Command(BaseCommand):
    help = "Popula dados de demonstração (idempotente)."

    @transaction.atomic
    def handle(self, *args, **options):
        # --- Usuários internos ---
        internos = {
            "admin@samarabeach.com": PapelInterno.ADMIN,
            "estoque@samarabeach.com": PapelInterno.ESTOQUE,
            "financeiro@samarabeach.com": PapelInterno.FINANCEIRO,
            "atendimento@samarabeach.com": PapelInterno.ATENDIMENTO,
        }
        for email, papel in internos.items():
            user, _ = User.objects.get_or_create(email=email)
            # Idempotente: garante tipo/papel/senha mesmo se o usuário já existia.
            user.tipo = TipoUsuario.INTERNO
            user.papel = papel
            user.is_staff = True
            user.is_superuser = papel == PapelInterno.ADMIN
            user.set_password("senha12345")
            user.save()

        # --- Cliente demo ---
        cli_user, created = User.objects.get_or_create(
            email="cliente@demo.com",
            defaults={"tipo": TipoUsuario.CLIENTE},
        )
        if created:
            cli_user.set_password("senha12345")
            cli_user.save()
        Cliente.objects.get_or_create(
            usuario=cli_user,
            defaults={"nome": "Cliente Demo", "cpf": "00000000000"},
        )

        # --- Categorias ---
        cat_biquini, _ = Categoria.objects.get_or_create(
            slug="biquinis", defaults={"nome": "Biquínis"}
        )
        cat_saida, _ = Categoria.objects.get_or_create(
            slug="saidas-de-praia", defaults={"nome": "Saídas de Praia"}
        )

        # --- Produtos + variações + estoque ---
        demo = [
            {
                "slug": "biquini-ipanema",
                "nome": "Biquíni Ipanema",
                "categoria": cat_biquini,
                "tipo": TipoOrigem.PRODUCAO_PROPRIA,
                "sku": "BIK-IPA-AZ-M",
                "preco": "199.90",
                "custo": "70.00",
                "saldo": 15,
            },
            {
                "slug": "saida-boho",
                "nome": "Saída Boho",
                "categoria": cat_saida,
                "tipo": TipoOrigem.REVENDA,
                "sku": "SAI-BOH-BR-U",
                "preco": "149.90",
                "custo": "95.00",
                "saldo": 3,
            },
        ]
        for d in demo:
            produto, _ = Produto.objects.get_or_create(
                slug=d["slug"],
                defaults={
                    "nome": d["nome"],
                    "categoria": d["categoria"],
                    "tipo_origem": d["tipo"],
                },
            )
            variacao, v_created = VariacaoProduto.objects.get_or_create(
                sku=d["sku"],
                defaults={
                    "produto": produto,
                    "cor": "Padrão",
                    "tamanho": "M",
                    "preco": d["preco"],
                    "custo_medio": d["custo"],
                    "estoque_minimo": 5,
                },
            )
            if v_created:
                MovimentacaoEstoque.objects.create(
                    variacao=variacao,
                    tipo="entrada",
                    origem="ajuste",
                    quantidade=d["saldo"],
                    saldo_resultante=d["saldo"],
                    observacoes="Estoque inicial (seed).",
                )

        # --- Cupom ---
        Cupom.objects.get_or_create(
            codigo="PROMO10",
            defaults={"tipo": TipoCupom.PERCENTUAL, "valor": "10.00", "ativo": True},
        )

        self.stdout.write(self.style.SUCCESS("Dados de demonstração criados."))
        self.stdout.write("Login interno: admin@samarabeach.com / senha12345")
        self.stdout.write("Login cliente: cliente@demo.com / senha12345")
