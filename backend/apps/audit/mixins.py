"""Mixin para auditar o CRUD de um ModelViewSet sem repetir código."""
from . import services
from .models import AcaoAuditoria


class AuditoriaMixin:
    """
    Registra criação, alteração e exclusão feitas pelo viewset.

    Uso:
        class VariacaoProdutoViewSet(AuditoriaMixin, viewsets.ModelViewSet):
            audit_acao_update = AcaoAuditoria.ALTERACAO_PRECO
            audit_campos = ["preco", "preco_promocional", "ativo"]
    """

    #: Sobrescreva para nomear melhor a ação na trilha.
    audit_acao_create = AcaoAuditoria.CRIAR
    audit_acao_update = AcaoAuditoria.ATUALIZAR
    audit_acao_destroy = AcaoAuditoria.EXCLUIR
    #: Quando definido, só estes campos entram no diff (menos ruído, menos custo).
    audit_campos: list[str] | None = None

    def perform_create(self, serializer):
        super().perform_create(serializer)
        instancia = serializer.instance
        services.registrar(
            request=self.request,
            acao=self.audit_acao_create,
            objeto=instancia,
            descricao=f"Criou {instancia._meta.verbose_name}: {instancia}",
            dados={"criado": services.snapshot(instancia, self.audit_campos)},
        )

    def perform_update(self, serializer):
        # `serializer.instance` é mutado in-place pelo save(): ler antes e
        # depois do mesmo objeto daria diff sempre vazio. Por isso o estado
        # anterior vem de uma leitura nova do banco.
        modelo = serializer.instance.__class__
        anterior = modelo.objects.filter(pk=serializer.instance.pk).first()
        antes = services.snapshot(anterior, self.audit_campos) if anterior else {}

        super().perform_update(serializer)

        instancia = serializer.instance
        mudancas = services.diff(
            antes, services.snapshot(instancia, self.audit_campos)
        )
        if not mudancas:
            # PATCH que não mudou nada não vira linha na trilha.
            return
        services.registrar(
            request=self.request,
            acao=self.audit_acao_update,
            objeto=instancia,
            descricao=f"Alterou {instancia}: {', '.join(sorted(mudancas))}",
            dados=mudancas,
        )

    def perform_destroy(self, instance):
        # O snapshot e o texto são capturados antes: depois do delete o objeto
        # pode não ter mais como ser descrito.
        dados = {"excluido": services.snapshot(instance, self.audit_campos)}
        descricao = f"Excluiu {instance._meta.verbose_name}: {instance}"
        services.registrar(
            request=self.request,
            acao=self.audit_acao_destroy,
            objeto=instance,
            descricao=descricao,
            dados=dados,
        )
        super().perform_destroy(instance)
