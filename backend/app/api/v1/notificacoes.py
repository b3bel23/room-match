"""Notificações do usuário logado: GET /notificacoes e POST /notificacoes/lidas.

Resposta agrupada (sem mudar schema):
- `mensagem`: 1 item por conversa (`link`), texto da última, `nao_lidas` = msgs não lidas,
  `foto_url`/`nome`/`iniciais` da outra pessoa.
- `favorito`: 1 item por remetente (`?de=`), com foto quando possível.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.conversa import Conversa
from app.models.mensagem import Mensagem
from app.models.notificacao import Notificacao
from app.models.usuario import Usuario
from app.services import notificacao_service
from app.services.perfil_service import iniciais

router = APIRouter(tags=["notificacoes"])


class LidasIn(BaseModel):
    ids: Optional[List[int]] = None  # sem ids: marca todas


def _perfil_mini(usuario: Optional[Usuario]) -> dict:
    if usuario is None:
        return {"foto_url": "", "nome": "", "iniciais": "?"}
    return {
        "foto_url": usuario.foto_perfil or "",
        "nome": (usuario.nome or "").split()[0] or usuario.nome or "",
        "iniciais": iniciais(usuario.nome or ""),
    }


def _montar_bruto(n: Notificacao) -> dict:
    return {
        "id": n.id_notificacao,
        "tipo": n.tipo,
        "texto": n.texto,
        "link": n.link,
        "lida": bool(n.lida),
        "criada_em": n.criada_em.isoformat() if n.criada_em else None,
    }


def _outro_da_conversa(db: Session, id_conversa: int, eu: Usuario) -> Optional[Usuario]:
    conversa = db.get(Conversa, id_conversa)
    if conversa is None or conversa.post is None:
        return None
    if eu.id_usuario == conversa.id_locatario:
        locador = conversa.post.locador
        return locador.usuario if locador else None
    locatario = conversa.locatario
    return locatario.usuario if locatario else None


def _msgs_nao_lidas(db: Session, id_conversa: int, eu: Usuario) -> int:
    return (
        db.query(Mensagem)
        .filter(
            Mensagem.id_conversa == id_conversa,
            Mensagem.id_remetente != eu.id_usuario,
            Mensagem.status_leitura.is_(False),
        )
        .count()
    )


def _agrupar(db: Session, itens: list[Notificacao], usuario: Usuario) -> list[dict]:
    """Uma entrada por conversa (mensagem) ou por remetente (favorito); resto individual."""
    grupos: dict[str, dict] = {}
    avulsos: list[dict] = []

    for n in itens:
        base = _montar_bruto(n)
        if n.tipo == "mensagem" and n.link:
            chave = f"mensagem:{n.link}"
            g = grupos.get(chave)
            if g is None:
                id_conv = notificacao_service.id_conversa_do_link(n.link)
                outro = _outro_da_conversa(db, id_conv, usuario) if id_conv else None
                mini = _perfil_mini(outro)
                nao_lidas = _msgs_nao_lidas(db, id_conv, usuario) if id_conv else (0 if n.lida else 1)
                grupos[chave] = {
                    **base,
                    "ids": [n.id_notificacao],
                    "foto_url": mini["foto_url"],
                    "nome": mini["nome"],
                    "iniciais": mini["iniciais"],
                    "nao_lidas": max(nao_lidas, 0 if n.lida else 1),
                }
            else:
                g["ids"].append(n.id_notificacao)
                # itens já vêm do mais novo → o primeiro do grupo é o texto atual
                if not n.lida:
                    g["lida"] = False
            continue

        if n.tipo == "favorito":
            id_de = notificacao_service.id_usuario_do_link_favorito(n.link)
            chave = f"favorito:{id_de or n.id_notificacao}"
            g = grupos.get(chave)
            if g is None:
                outro = db.get(Usuario, id_de) if id_de else None
                mini = _perfil_mini(outro)
                if not mini["nome"] and n.texto:
                    mini["nome"] = n.texto.split()[0]
                    mini["iniciais"] = iniciais(mini["nome"])
                grupos[chave] = {
                    **base,
                    "ids": [n.id_notificacao],
                    "foto_url": mini["foto_url"],
                    "nome": mini["nome"],
                    "iniciais": mini["iniciais"],
                    "nao_lidas": 0 if n.lida else 1,
                }
            else:
                g["ids"].append(n.id_notificacao)
                if not n.lida:
                    g["lida"] = False
                    g["nao_lidas"] = max(g.get("nao_lidas", 0), 1)
            continue

        avulsos.append({
            **base,
            "ids": [n.id_notificacao],
            "foto_url": "",
            "nome": "",
            "iniciais": "!",
            "nao_lidas": 0 if n.lida else 1,
        })

    saida = list(grupos.values()) + avulsos
    saida.sort(key=lambda x: x.get("criada_em") or "", reverse=True)
    return saida


@router.get("/notificacoes")
def listar(
    limite: int = Query(40, ge=1, le=100),
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = db.query(Notificacao).filter(Notificacao.id_usuario == usuario.id_usuario)
    # Busca um pouco a mais para agrupar sem perder itens recentes.
    brutos = (
        base.order_by(Notificacao.criada_em.desc(), Notificacao.id_notificacao.desc())
        .limit(min(limite * 3, 120))
        .all()
    )
    items = _agrupar(db, brutos, usuario)[:limite]
    nao_lidas = sum(int(i.get("nao_lidas") or 0) for i in items if not i.get("lida"))
    # Fallback: se tudo lido no agrupamento, ainda mostra contagem real de linhas.
    if nao_lidas == 0:
        nao_lidas = base.filter(Notificacao.lida.is_(False)).count()
    return {"items": items, "nao_lidas": nao_lidas}


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
