"""
Trilha de auditoria: quem alterou o quê, quando.

Registra apenas ALTERAÇÕES — criação, edição, exclusão e ações de negócio.
Leituras ficam de fora: o volume seria muito maior e não respondem a pergunta
que importa aqui, que é de responsabilização.

Decisões de modelagem:

- **Sem GenericForeignKey.** A trilha é histórico e precisa sobreviver ao
  objeto: se alguém exclui um produto, "fulano excluiu o produto X" é
  exatamente o que se quer ler depois — e com GFK a linha viria em branco.
  Campos textuais mais `objeto_repr` congelado mantêm o registro legível para
  sempre, sem depender de contenttypes.

- **Dados do usuário congelados.** `usuario` é SET_NULL, mas e-mail, nome e
  papel ficam gravados como texto: se a pessoa for removida um dia, ainda se
  sabe quem fez.

- **Tabela própria, não campo em cada model.** Além de centralizar, evita
  tocar em `MovimentacaoEstoque` — cuja idempotência depende de casar texto
  em `observacoes` (ver orders/services.baixar_estoque).
"""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel


class AcaoAuditoria(models.TextChoices):
    # CRUD genérico
    CRIAR = "criar", _("Criação")
    ATUALIZAR = "atualizar", _("Alteração")
    EXCLUIR = "excluir", _("Exclusão")
    # Acesso
    LOGIN = "login", _("Login")
    LOGOUT = "logout", _("Logout")
    # Ações de negócio — o que de fato importa auditar
    AJUSTE_ESTOQUE = "ajuste_estoque", _("Ajuste de estoque")
    MUDANCA_STATUS = "mudanca_status", _("Mudança de status de pedido")
    ABERTURA_CAIXA = "abertura_caixa", _("Abertura de caixa")
    FECHAMENTO_CAIXA = "fechamento_caixa", _("Fechamento de caixa")
    SANGRIA = "sangria", _("Sangria")
    SUPRIMENTO = "suprimento", _("Suprimento")
    VENDA = "venda", _("Venda no PDV")
    CANCELAMENTO_VENDA = "cancelamento_venda", _("Cancelamento de venda")
    DEVOLUCAO = "devolucao", _("Devolução")
    PAGAMENTO_CONTA = "pagamento_conta", _("Baixa de conta a pagar")
    ALTERACAO_PRECO = "alteracao_preco", _("Alteração de preço")
    RESET_SENHA = "reset_senha", _("Redefinição de senha por admin")
    MUDANCA_PAPEL = "mudanca_papel", _("Mudança de papel")
    DESATIVAR_USUARIO = "desativar_usuario", _("Desativação de usuário")
    REATIVAR_USUARIO = "reativar_usuario", _("Reativação de usuário")


class NivelAuditoria(models.TextChoices):
    """Severidade — é por aqui que a tela separa o rotineiro do que importa."""

    INFO = "info", _("Informativo")
    ATENCAO = "atencao", _("Atenção")
    CRITICO = "critico", _("Crítico")


#: Ações que ganham severidade própria; o resto fica em INFO.
NIVEL_POR_ACAO = {
    AcaoAuditoria.AJUSTE_ESTOQUE: NivelAuditoria.CRITICO,
    AcaoAuditoria.RESET_SENHA: NivelAuditoria.CRITICO,
    AcaoAuditoria.MUDANCA_PAPEL: NivelAuditoria.CRITICO,
    AcaoAuditoria.CANCELAMENTO_VENDA: NivelAuditoria.CRITICO,
    AcaoAuditoria.ALTERACAO_PRECO: NivelAuditoria.ATENCAO,
    AcaoAuditoria.FECHAMENTO_CAIXA: NivelAuditoria.ATENCAO,
    AcaoAuditoria.SANGRIA: NivelAuditoria.ATENCAO,
    AcaoAuditoria.PAGAMENTO_CONTA: NivelAuditoria.ATENCAO,
    AcaoAuditoria.DEVOLUCAO: NivelAuditoria.ATENCAO,
    AcaoAuditoria.DESATIVAR_USUARIO: NivelAuditoria.ATENCAO,
    AcaoAuditoria.EXCLUIR: NivelAuditoria.ATENCAO,
}


class RegistroAuditoria(BaseModel):
    """Uma linha da trilha. Nunca editada, nunca apagada pela aplicação."""

    # --- Quem ---
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registros_auditoria",
    )
    usuario_email = models.CharField(max_length=254, blank=True, db_index=True)
    usuario_nome = models.CharField(max_length=150, blank=True)
    usuario_papel = models.CharField(max_length=15, blank=True)

    # --- O quê ---
    acao = models.CharField(
        max_length=25, choices=AcaoAuditoria.choices, db_index=True
    )
    nivel = models.CharField(
        max_length=10,
        choices=NivelAuditoria.choices,
        default=NivelAuditoria.INFO,
        db_index=True,
    )

    # --- Sobre qual objeto ---
    app_label = models.CharField(max_length=50, blank=True, db_index=True)
    model_name = models.CharField(max_length=50, blank=True, db_index=True)
    objeto_id = models.CharField(max_length=64, blank=True, db_index=True)
    objeto_repr = models.CharField(
        max_length=200,
        blank=True,
        help_text=_("Descrição legível, congelada no momento do registro."),
    )

    # --- Detalhe ---
    descricao = models.CharField(
        max_length=255,
        blank=True,
        help_text=_("Frase pronta para a tela, sem precisar interpretar o JSON."),
    )
    dados = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Diff {campo: {de, para}} ou payload da ação de negócio."),
    )

    # --- Contexto da requisição ---
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)

    class Meta:
        verbose_name = _("registro de auditoria")
        verbose_name_plural = _("registros de auditoria")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"], name="audit_data_idx"),
            models.Index(fields=["usuario", "-created_at"], name="audit_usuario_idx"),
            models.Index(
                fields=["app_label", "model_name", "objeto_id", "-created_at"],
                name="audit_objeto_idx",
            ),
            models.Index(fields=["acao", "-created_at"], name="audit_acao_idx"),
            models.Index(fields=["nivel", "-created_at"], name="audit_nivel_idx"),
        ]

    def __str__(self):
        quem = self.usuario_email or "sistema"
        return f"{self.created_at:%d/%m/%Y %H:%M} — {quem} — {self.get_acao_display()}"
