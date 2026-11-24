"""Denúncias (moderação): usa a tabela `denuncias` já no schema.

  POST /denuncias  { motivo, descricao?, usuario_id?, imovel_id?, conversa_id? }

Grava a denúncia e envia e-mail para a equipe (`MODERACAO_EMAIL` ou `SMTP_FROM`).
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.conversa import Conversa
from app.models.denuncia import Denuncia
from app.models.post import Post
from app.models.usuario import Usuario
from app.services import email_service

router = APIRouter(tags=["denuncias"])

MOTIVOS = (
    "assedio",
    "golpe_fraude",
    "conteudo_inadequado",
    "spam",
    "anuncio_falso",
    "outro",
)

ROTULOS = {
    "assedio": "Assédio ou comportamento abusivo",
    "golpe_fraude": "Golpe ou fraude",
    "conteudo_inadequado": "Conteúdo inadequado",
    "spam": "Spam ou propaganda",
    "anuncio_falso": "Anúncio falso ou enganoso",
    "outro": "Outro",
}


class DenunciaIn(BaseModel):
    motivo: str = Field(..., max_length=100)
    descricao: Optional[str] = Field(None, max_length=2000)
    usuario_id: Optional[int] = None  # usuário denunciado
    imovel_id: Optional[int] = None  # anúncio (resolve para id_post)
    conversa_id: Optional[int] = None  # contexto do chat


def _email_equipe() -> str:
    """Para quem a denúncia é enviada (equipe RoomMatch)."""
    destino = (getattr(settings, "moderacao_email", None) or "").strip()
    if destino:
        return destino
    # Extrai endereço de `RoomMatch <nao-responda@…>` se for o caso.
    bruto = (settings.smtp_from or "").strip()
    if "<" in bruto and ">" in bruto:
        return bruto.split("<", 1)[1].split(">", 1)[0].strip()
    return bruto or "moderacao@roommatch.app"


def _post_do_imovel(db: Session, id_imovel: int) -> Optional[Post]:
    return (
        db.query(Post)
        .filter(Post.id_imovel == id_imovel, Post.status_anuncio != "removido")
        .order_by(Post.id_post.desc())
        .first()
    )


@router.post("/denuncias", status_code=status.HTTP_201_CREATED)
def criar_denuncia(
    dados: DenunciaIn,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    motivo = (dados.motivo or "").strip().lower()
    if motivo not in MOTIVOS:
        raise HTTPException(422, f"Motivo inválido. Use: {', '.join(MOTIVOS)}.")

    id_usuario_denunciado = dados.usuario_id
    id_post = None
    contexto_txt = []

    if dados.imovel_id is not None:
        post = _post_do_imovel(db, dados.imovel_id)
        if post is None:
            raise HTTPException(404, "Anúncio não encontrado.")
        id_post = post.id_post
        contexto_txt.append(f"anúncio #{dados.imovel_id} “{post.titulo}” (post {post.id_post})")
        if id_usuario_denunciado is None:
            id_usuario_denunciado = post.id_locador

    if dados.conversa_id is not None:
        conversa = db.get(Conversa, dados.conversa_id)
        if conversa is None:
            raise HTTPException(404, "Conversa não encontrada.")
        participantes = {conversa.id_locatario, conversa.post.id_locador}
        if usuario.id_usuario not in participantes:
            raise HTTPException(404, "Conversa não encontrada.")
        contexto_txt.append(f"conversa #{conversa.id_conversa}")
        if id_post is None:
            id_post = conversa.id_post
            contexto_txt.append(f"anúncio/post {conversa.id_post}")
        if id_usuario_denunciado is None:
            id_usuario_denunciado = (
                conversa.post.id_locador
                if usuario.id_usuario == conversa.id_locatario
                else conversa.id_locatario
            )

    if id_usuario_denunciado is None and id_post is None:
        raise HTTPException(422, "Informe usuario_id, imovel_id ou conversa_id.")

    if id_usuario_denunciado == usuario.id_usuario:
        raise HTTPException(400, "Você não pode denunciar a si mesmo.")

    if id_usuario_denunciado is not None and db.get(Usuario, id_usuario_denunciado) is None:
        raise HTTPException(404, "Usuário denunciado não encontrado.")

    descricao = (dados.descricao or "").strip() or None
    denuncia = Denuncia(
        id_denunciante=usuario.id_usuario,
        id_usuario_denunciado=id_usuario_denunciado,
        id_post_denunciado=id_post,
        motivo=motivo[:100],
        descricao=descricao,
        status_denuncia="pendente",
    )
    db.add(denuncia)
    db.commit()
    db.refresh(denuncia)

    denunciado = db.get(Usuario, id_usuario_denunciado) if id_usuario_denunciado else None
    corpo = (
        f"Nova denúncia #{denuncia.id_denuncia}\n"
        f"Status: pendente\n"
        f"Motivo: {ROTULOS.get(motivo, motivo)}\n"
        f"Denunciante: {usuario.nome} <{usuario.email}> (id {usuario.id_usuario})\n"
        f"Denunciado: "
        + (
            f"{denunciado.nome} <{denunciado.email}> (id {denunciado.id_usuario})"
            if denunciado
            else "(nenhum usuário — só anúncio)"
        )
        + "\n"
        f"Contexto: {'; '.join(contexto_txt) or '—'}\n"
        f"Descrição:\n{descricao or '(sem detalhes)'}\n"
    )
    email_service.enviar(
        _email_equipe(),
        f"[RoomMatch] Denúncia #{denuncia.id_denuncia}: {ROTULOS.get(motivo, motivo)}",
        corpo,
    )

    return {
        "ok": True,
        "id": denuncia.id_denuncia,
        "status": denuncia.status_denuncia or "pendente",
        "motivo": motivo,
        "mensagem": "Denúncia registrada. Nossa equipe vai analisar.",
    }


@router.get("/denuncias/motivos")
def listar_motivos():
    return {
        "items": [{"valor": m, "rotulo": ROTULOS[m]} for m in MOTIVOS],
    }
