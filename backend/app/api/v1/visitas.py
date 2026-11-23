"""Visitas: POST /visitas (Morador pede), GET /visitas (Morador vê as suas; Locador vê as
dos seus imóveis), PATCH /visitas/{id} (Locador confirma/recusa; Morador cancela).

Formato igual ao mock (frontend/js/mock-api.js): `data` "AAAA-MM-DD", `hora` "10h".
"""

from __future__ import annotations

import re
from datetime import date, time, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.post import Post
from app.models.usuario import Usuario
from app.models.visita import Visita
from app.services import contexto, notificacao_service

router = APIRouter(tags=["visitas"])

STATUS_VALIDOS = {"pendente", "confirmada", "recusada", "cancelada"}


class VisitaIn(BaseModel):
    imovel_id: int
    horario: str = Field("Amanhã, 10h", max_length=60)  # rótulo da tela: "Sábado, 11h"
    data: Optional[date] = None
    hora: Optional[str] = Field(None, max_length=10)  # "10h" ou "10:30"


class VisitaPatch(BaseModel):
    status: str


def interpretar_horario(rotulo: str, hoje: Optional[date] = None) -> tuple[date, time]:
    """Mesma regra do mock: "Amanhã, 16h" → amanhã 16:00; "Sábado, 11h" → próximo sábado."""
    hoje = hoje or date.today()
    dia = hoje
    if re.search(r"amanh", rotulo, re.I):
        dia = hoje + timedelta(days=1)
    if re.search(r"s[aá]bado", rotulo, re.I):
        dia = dia + timedelta(days=((5 - dia.weekday()) % 7) or 7)
    return dia, _hora(rotulo) or time(10, 0)


def _hora(texto: Optional[str]) -> Optional[time]:
    m = re.search(r"(\d{1,2})(?:[h:](\d{2}))?\s*h?", texto or "", re.I)
    if not m or int(m.group(1)) > 23:
        return None
    return time(int(m.group(1)), int(m.group(2) or 0))


def _rotulo_hora(t: time) -> str:
    return f"{t.hour}h" if t.minute == 0 else f"{t.hour}h{t.minute:02d}"


def montar_visita(v: Visita, titulos: dict[int, str]) -> dict:
    usuario = v.locatario.usuario if v.locatario else None
    return {
        "id": v.id_visita,
        "imovel_id": v.id_imovel,
        "imovel_titulo": titulos.get(v.id_imovel, f"Imóvel {v.id_imovel}"),
        "usuario_id": v.id_locatario,
        "nome": usuario.nome if usuario else "Morador",
        "data": v.data_agendada.isoformat(),
        "hora": _rotulo_hora(v.horario),
        "status": v.status_visita or "pendente",
    }


def _titulos(db: Session, ids_imovel: set[int]) -> dict[int, str]:
    if not ids_imovel:
        return {}
    posts = db.query(Post).filter(Post.id_imovel.in_(ids_imovel)).all()
    return {p.id_imovel: p.titulo for p in posts}


@router.get("/visitas")
def listar_visitas(usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    consulta = db.query(Visita)
    if contexto.eh_locador(db, usuario):
        ids = [
            p.id_imovel
            for p in db.query(Post).filter(
                Post.id_locador == usuario.id_usuario, Post.status_anuncio != "removido"
            )
        ]
        consulta = consulta.filter(Visita.id_imovel.in_(ids or [-1]))
    else:
        consulta = consulta.filter(Visita.id_locatario == usuario.id_usuario)
    visitas = consulta.order_by(Visita.data_agendada, Visita.horario).all()
    titulos = _titulos(db, {v.id_imovel for v in visitas})
    return {"items": [montar_visita(v, titulos) for v in visitas]}


@router.post("/visitas", status_code=status.HTTP_201_CREATED)
def criar_visita(
    dados: VisitaIn, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
):
    locatario = contexto.exigir_locatario(db, usuario)
    post = contexto.post_ativo(db, dados.imovel_id)
    dia, hora = interpretar_horario(dados.horario)
    if dados.data is not None:
        dia = dados.data
    if dados.hora:
        hora = _hora(dados.hora) or hora
    if dia < date.today():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Escolha uma data a partir de hoje.")
    repetida = (
        db.query(Visita)
        .filter(
            Visita.id_locatario == locatario.id_locatario,
            Visita.id_imovel == post.id_imovel,
            Visita.data_agendada == dia,
            Visita.horario == hora,
            Visita.status_visita.in_(("pendente", "confirmada")),
        )
        .first()
    )
    if repetida is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Você já pediu visita neste horário.")
    visita = Visita(
        id_locatario=locatario.id_locatario,
        id_imovel=post.id_imovel,
        data_agendada=dia,
        horario=hora,
        status_visita="pendente",
    )
    db.add(visita)
    notificacao_service.notificar(
        db, post.id_locador, "visita",
        f"{usuario.nome.split()[0]} pediu visita em “{post.titulo}” "
        f"({dia.strftime('%d/%m')} às {_rotulo_hora(hora)}).",
        "calendario-visitas.html",
    )
    db.commit()
    db.refresh(visita)
    resposta = montar_visita(visita, {post.id_imovel: post.titulo})
    resposta["horario_rotulo"] = dados.horario
    return resposta


@router.patch("/visitas/{id_visita}")
def atualizar_visita(
    id_visita: int,
    dados: VisitaPatch,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Locador dono do imóvel: confirmada/recusada. Morador que pediu: cancelada."""
    visita = db.get(Visita, id_visita)
    if visita is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Visita não encontrada.")
    novo = dados.status.strip().lower()
    if novo not in STATUS_VALIDOS - {"pendente"}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Status inválido.")
    post = db.query(Post).filter(Post.id_imovel == visita.id_imovel).first()
    dono = post is not None and post.id_locador == usuario.id_usuario
    quem_pediu = visita.id_locatario == usuario.id_usuario
    if not (dono or quem_pediu):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Visita não encontrada.")
    if (novo == "cancelada" and not quem_pediu) or (novo != "cancelada" and not dono):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Sem permissão para esta mudança.")
    visita.status_visita = novo
    titulo = post.titulo if post else "o imóvel"
    quando = f"{visita.data_agendada.strftime('%d/%m')} às {_rotulo_hora(visita.horario)}"
    if novo == "cancelada":
        if post is not None:
            notificacao_service.notificar(
                db, post.id_locador, "visita",
                f"{usuario.nome.split()[0]} cancelou a visita em “{titulo}” ({quando}).",
                "calendario-visitas.html",
            )
    else:
        notificacao_service.notificar(
            db, visita.id_locatario, "visita",
            f"Sua visita em “{titulo}” ({quando}) foi {novo}.", "calendario-visitas.html",
        )
    db.commit()
    return montar_visita(visita, {visita.id_imovel: post.titulo if post else ""})
