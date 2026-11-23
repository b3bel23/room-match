"""Confirmação de e-mail (RF02). Não bloqueia o uso no MVP: o perfil mostra o status e
permite reenviar o link."""

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_verify_token, decode_verify_token
from app.models.usuario import Usuario
from app.services import email_service


def enviar_link(usuario: Usuario) -> None:
    token = create_verify_token(usuario.id_usuario, usuario.email)
    link = f"{settings.frontend_url.rstrip('/')}/verificar-email.html?token={token}"
    email_service.enviar(
        usuario.email,
        "RoomMatch · confirme seu e-mail",
        f"Olá, {usuario.nome}!\n\nConfirme seu e-mail abrindo o link abaixo (vale por 7 dias):"
        f"\n\n{link}\n\nSe você não criou uma conta no RoomMatch, ignore este e-mail.",
    )


def confirmar(db: Session, token: str) -> bool:
    dados = decode_verify_token(token)
    if dados is None:
        return False
    usuario = db.get(Usuario, dados[0])
    if usuario is None or usuario.email.lower() != dados[1]:
        return False
    usuario.status_verificacao = True
    db.commit()
    return True
