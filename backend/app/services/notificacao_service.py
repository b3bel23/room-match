"""Notificações dentro do site (RF17/RF35).

`notificar` só adiciona na sessão: quem chama faz o commit junto com a ação que gerou o
aviso, para nunca existir aviso de algo que não foi gravado.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.notificacao import Notificacao

LIMITE_TEXTO = 255


def notificar(db: Session, id_usuario: int, tipo: str, texto: str, link: str | None = None) -> None:
    if len(texto) > LIMITE_TEXTO:
        texto = texto[: LIMITE_TEXTO - 1] + "…"
    db.add(Notificacao(id_usuario=id_usuario, tipo=tipo, texto=texto, link=link))


def resumo(texto: str, limite: int = 80) -> str:
    texto = " ".join(texto.split())
    return texto if len(texto) <= limite else texto[: limite - 1] + "…"
