"""Bloqueio de contato (reusa `denuncias`, sem migração).

  GET    /bloqueios              quem eu bloqueei
  POST   /bloqueios              { usuario_id, descricao? }  → bloqueia (ativo)
  DELETE /bloqueios/{usuario_id} → desfaz (status revogado)
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.usuario import Usuario
from app.services import bloqueio_service, contexto

router = APIRouter(tags=["bloqueios"])


class BloqueioIn(BaseModel):
    usuario_id: int
    descricao: Optional[str] = Field(None, max_length=500)


@router.get("/bloqueios")
def listar(usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    ids = bloqueio_service.listar_bloqueados(db, usuario.id_usuario)
    items = []
    for uid in ids:
        alvo = db.get(Usuario, uid)
        if alvo is None:
            continue
        items.append(contexto.perfil_publico(alvo, ""))
    return {"items": items, "total": len(items)}


@router.post("/bloqueios", status_code=status.HTTP_201_CREATED)
def bloquear(
    dados: BloqueioIn,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alvo = db.get(Usuario, dados.usuario_id)
    if alvo is None:
        raise HTTPException(404, "Usuário não encontrado.")
    try:
        row = bloqueio_service.bloquear(
            db, usuario.id_usuario, dados.usuario_id, descricao=dados.descricao
        )
    except ValueError as erro:
        raise HTTPException(400, str(erro)) from erro
    db.commit()
    return {
        "ok": True,
        "id": row.id_denuncia,
        "usuario_id": dados.usuario_id,
        "status": row.status_denuncia,
        "mensagem": "Pessoa bloqueada. Vocês não poderão conversar até desbloquear.",
    }


@router.delete("/bloqueios/{usuario_id}")
def desbloquear(
    usuario_id: int,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ok = bloqueio_service.desbloquear(db, usuario.id_usuario, usuario_id)
    db.commit()
    if not ok:
        return {"ok": True, "mensagem": "Não havia bloqueio ativo."}
    return {"ok": True, "mensagem": "Bloqueio removido. O contato pode voltar."}
