"""Notificações do usuário logado: GET /notificacoes e POST /notificacoes/lidas."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.notificacao import Notificacao
from app.models.usuario import Usuario

router = APIRouter(tags=["notificacoes"])


class LidasIn(BaseModel):
    ids: Optional[List[int]] = None  # sem ids: marca todas


def _montar(n: Notificacao) -> dict:
    return {
        "id": n.id_notificacao,
        "tipo": n.tipo,
        "texto": n.texto,
        "link": n.link,
        "lida": bool(n.lida),
        "criada_em": n.criada_em.isoformat() if n.criada_em else None,
    }


@router.get("/notificacoes")
def listar(
    limite: int = Query(20, ge=1, le=100),
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = db.query(Notificacao).filter(Notificacao.id_usuario == usuario.id_usuario)
    itens = base.order_by(Notificacao.criada_em.desc(), Notificacao.id_notificacao.desc()).limit(limite).all()
    return {
        "items": [_montar(n) for n in itens],
        "nao_lidas": base.filter(Notificacao.lida.is_(False)).count(),
    }


@router.post("/notificacoes/lidas")
def marcar_lidas(
    dados: LidasIn, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
):
    consulta = db.query(Notificacao).filter(
        Notificacao.id_usuario == usuario.id_usuario, Notificacao.lida.is_(False)
    )
    if dados.ids:
        consulta = consulta.filter(Notificacao.id_notificacao.in_(dados.ids))
    marcadas = consulta.update({Notificacao.lida: True}, synchronize_session=False)
    db.commit()
    return {"ok": True, "marcadas": marcadas}
