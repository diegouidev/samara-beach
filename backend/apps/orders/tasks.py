"""Tarefas Celery de e-mails transacionais de pedidos."""
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

from .models import Pedido


def _email_do_pedido(pedido: Pedido) -> str | None:
    cliente = pedido.cliente
    if cliente and cliente.usuario:
        return cliente.usuario.email
    return None


@shared_task
def enviar_email_confirmacao_pedido(pedido_id: str):
    """Confirmação de pedido (pagamento aprovado / pedido criado)."""
    pedido = (
        Pedido.objects.select_related("cliente__usuario")
        .filter(pk=pedido_id)
        .first()
    )
    if not pedido:
        return "pedido não encontrado"
    destino = _email_do_pedido(pedido)
    if not destino:
        return "sem e-mail de destino"

    send_mail(
        subject=f"Samara Beach — Pedido {pedido.id} confirmado",
        message=(
            f"Olá, {pedido.cliente.nome}!\n\n"
            f"Recebemos seu pedido {pedido.id}.\n"
            f"Total: R$ {pedido.total}\n\n"
            "Você receberá novas atualizações conforme o andamento."
        ),
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@samarabeach.com"),
        recipient_list=[destino],
        fail_silently=True,
    )
    return f"confirmação enviada para {destino}"


@shared_task
def enviar_email_status_pedido(pedido_id: str, novo_status: str):
    """Notifica mudança de status relevante (ex.: enviado, entregue)."""
    pedido = (
        Pedido.objects.select_related("cliente__usuario")
        .filter(pk=pedido_id)
        .first()
    )
    if not pedido:
        return "pedido não encontrado"
    destino = _email_do_pedido(pedido)
    if not destino:
        return "sem e-mail de destino"

    send_mail(
        subject=f"Samara Beach — Pedido {pedido.id}: {pedido.get_status_display()}",
        message=(
            f"Olá, {pedido.cliente.nome}!\n\n"
            f"O status do seu pedido {pedido.id} agora é: "
            f"{pedido.get_status_display()}."
        ),
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@samarabeach.com"),
        recipient_list=[destino],
        fail_silently=True,
    )
    return f"status enviado para {destino}"
