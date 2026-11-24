"""Notificações dentro do site (RF17/RF35).

`notificar` só adiciona na sessão: quem chama faz o commit junto com a ação que gerou o
aviso, para nunca existir aviso de algo que não foi gravado.

Sem mudar o schema: mensagens do mesmo thread (`link`) atualizam a notificação não lida
existente (1 linha por conversa). O GET agrupa e devolve foto + contagem de não lidas.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.notificacao import Notificacao

LIMITE_TEXTO = 255
_RE_CONVERSA = re.compile(r"mensagens\.html\?id=(\d+)")
_RE_FAV_DE = re.compile(r"[?&]de=(\d+)")


def notificar(
    db: Session,
    id_usuario: int,
    tipo: str,
    texto: str,
    link: str | None = None,
    *,
    upsert: bool = False,
) -> Notificacao:
    if len(texto) > LIMITE_TEXTO:
        texto = texto[: LIMITE_TEXTO - 1] + "…"

    if upsert and link:
        existente = (
            db.query(Notificacao)
            .filter(
                Notificacao.id_usuario == id_usuario,
                Notificacao.tipo == tipo,
                Notificacao.link == link,
                Notificacao.lida.is_(False),
            )
            .order_by(Notificacao.criada_em.desc())
            .first()
        )
        if existente is not None:
            existente.texto = texto
            existente.criada_em = datetime.now(timezone.utc)
            return existente

    aviso = Notificacao(id_usuario=id_usuario, tipo=tipo, texto=texto, link=link)
    db.add(aviso)
    return aviso


def resumo(texto: str, limite: int = 80) -> str:
    texto = " ".join(texto.split())
    return texto if len(texto) <= limite else texto[: limite - 1] + "…"


def id_conversa_do_link(link: str | None) -> int | None:
    if not link:
        return None
    m = _RE_CONVERSA.search(link)
    return int(m.group(1)) if m else None


def id_usuario_do_link_favorito(link: str | None) -> int | None:
    if not link:
        return None
    m = _RE_FAV_DE.search(link)
    return int(m.group(1)) if m else None
