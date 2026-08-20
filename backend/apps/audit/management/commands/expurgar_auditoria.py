"""
Remove registros de auditoria além do prazo de retenção.

Agendar na VPS (o compose não sobe celery-beat):
    0 3 * * 0 cd ~/samara-beach && docker compose exec -T backend \
        python manage.py expurgar_auditoria
"""
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.audit.models import NivelAuditoria, RegistroAuditoria


class Command(BaseCommand):
    help = "Expurga registros de auditoria fora do prazo de retenção."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Só mostra quantos seriam removidos.",
        )
        parser.add_argument(
            "--lote",
            type=int,
            default=5000,
            help="Registros por lote (evita travar a tabela).",
        )

    def handle(self, *args, **opcoes):
        hoje = timezone.now()
        prazos = {
            NivelAuditoria.INFO: settings.AUDIT_RETENCAO_INFO_DIAS,
            NivelAuditoria.ATENCAO: settings.AUDIT_RETENCAO_ATENCAO_DIAS,
            NivelAuditoria.CRITICO: settings.AUDIT_RETENCAO_CRITICO_DIAS,
        }

        total = 0
        for nivel, dias in prazos.items():
            corte = hoje - timezone.timedelta(days=dias)
            qs = RegistroAuditoria.objects.filter(nivel=nivel, created_at__lt=corte)
            quantos = qs.count()
            if not quantos:
                continue

            if opcoes["dry_run"]:
                self.stdout.write(
                    f"{nivel}: {quantos} registro(s) antes de "
                    f"{corte:%d/%m/%Y} seriam removidos."
                )
                total += quantos
                continue

            # Em lotes: um delete de 100 mil linhas trava a tabela.
            while True:
                ids = list(qs.values_list("pk", flat=True)[: opcoes["lote"]])
                if not ids:
                    break
                RegistroAuditoria.objects.filter(pk__in=ids).delete()
                total += len(ids)

        acao = "seriam removidos" if opcoes["dry_run"] else "removidos"
        self.stdout.write(self.style.SUCCESS(f"{total} registro(s) {acao}."))
