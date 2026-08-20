"""
Remove reservas de estoque vencidas.

As consultas de disponibilidade já ignoram reservas fora do prazo, então isto
é higiene de tabela — não muda o que a loja mostra. Agendar na VPS:
    */30 * * * * cd ~/samara-beach && docker compose exec -T backend \
        python manage.py expurgar_reservas
"""
from django.core.management.base import BaseCommand

from apps.orders.reservas import expurgar_reservas_vencidas


class Command(BaseCommand):
    help = "Apaga reservas de estoque que passaram do prazo."

    def handle(self, *args, **opcoes):
        total = expurgar_reservas_vencidas()
        self.stdout.write(
            self.style.SUCCESS(f"{total} reserva(s) vencida(s) removida(s).")
        )
