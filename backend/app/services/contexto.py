"""Papel do usuário logado e serialização de imóveis, compartilhados pelos routers."""

from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.locador import Locador
from app.models.locatario import Locatario
from app.models.post import Post
from app.models.usuario import Usuario
from app.services import matching_service, mural_service


def exigir_locatario(db: Session, usuario: Usuario) -> Locatario:
    locatario = db.get(Locatario, usuario.id_usuario)
    if locatario is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Disponível apenas para moradores (locatário)."
        )
    return locatario


def eh_locador(db: Session, usuario: Usuario) -> bool:
    return db.get(Locador, usuario.id_usuario) is not None


def contexto_usuario(db: Session, usuario: Optional[Usuario]):
    """(locatario, tags do usuário). Visitante: sem perfil e sem tags."""
    if usuario is None:
        return None, []
    locatario = db.get(Locatario, usuario.id_usuario)
    return locatario, matching_service.tags_do_usuario(db, usuario, locatario)


def montar_imoveis(db: Session, posts: list[Post], usuario: Optional[Usuario]) -> list[dict]:
    locatario, user_tags = contexto_usuario(db, usuario)
    if posts:
        # Garante carga eager mesmo se o caller trouxe posts "magros".
        ids = [p.id_post for p in posts]
        por_id = {
            p.id_post: p
            for p in mural_service.query_posts(db).filter(Post.id_post.in_(ids)).all()
        }
        posts = [por_id[i] for i in ids if i in por_id]
    tags = matching_service.tags_por_imovel(db, [p.id_imovel for p in posts])
    return [
        mural_service.montar_imovel(p, tags[p.id_imovel], user_tags, locatario) for p in posts
    ]


def post_ativo(db: Session, id_imovel: int) -> Post:
    post = (
        mural_service.query_posts(db)
        .filter(Post.id_imovel == id_imovel, Post.status_anuncio == "ativo")
        .first()
    )
    if post is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado.")
    return post


def perfil_publico(usuario: Optional[Usuario], papel: str) -> Optional[dict]:
    """O que um usuário vê do outro no chat: sem e-mail nem telefone (RF36: contato
    externo só com consentimento)."""
    if usuario is None:
        return None
    from app.services.perfil_service import iniciais

    return {
        "id": usuario.id_usuario,
        "nome": usuario.nome,
        "iniciais": iniciais(usuario.nome),
        "foto_url": usuario.foto_perfil or "",
        "papel": papel,
    }
