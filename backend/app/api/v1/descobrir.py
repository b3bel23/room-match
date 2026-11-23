"""Descobrir em cards (RF12–14, RF18): o Morador curte ou recusa um imóvel por vez.

  GET    /descobrir                 próximos cards: ativos, sem os já curtidos/recusados,
                                    da maior para a menor afinidade
  POST   /imoveis/{id}/recusar      recusa (some do mural e do descobrir); tira o favorito
  DELETE /imoveis/{id}/recusar      desfaz a recusa
  GET    /historico                 { curtidos, recusados }

Curtir é o mesmo que favoritar (POST /favoritos/{id}).
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.like import Like
from app.models.post import Post
from app.models.recusa import Recusa
from app.models.usuario import Usuario
from app.services import contexto

router = APIRouter(tags=["descobrir"])


def ids_recusados(db: Session, id_locatario: int) -> set[int]:
    return {r.id_post for r in db.query(Recusa.id_post).filter(Recusa.id_locatario == id_locatario)}


def _ids_curtidos(db: Session, id_locatario: int) -> set[int]:
    return {l.id_post for l in db.query(Like.id_post).filter(Like.id_locatario == id_locatario)}


@router.get("/descobrir")
def descobrir(
    limite: int = Query(20, ge=1, le=50),
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    locatario = contexto.exigir_locatario(db, usuario)
    vistos = ids_recusados(db, locatario.id_locatario) | _ids_curtidos(db, locatario.id_locatario)
    posts = [
        p for p in db.query(Post).filter(Post.status_anuncio == "ativo").all()
        if p.id_post not in vistos
    ]
    itens = contexto.montar_imoveis(db, posts, usuario)
    itens.sort(key=lambda i: (-i["match"], i["preco"]))
    return {"items": itens[:limite], "restantes": max(0, len(itens) - limite)}


@router.post("/imoveis/{id_imovel}/recusar")
def recusar(id_imovel: int, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    locatario = contexto.exigir_locatario(db, usuario)
    post = contexto.post_ativo(db, id_imovel)
    if post.id_post not in ids_recusados(db, locatario.id_locatario):
        db.add(Recusa(id_locatario=locatario.id_locatario, id_post=post.id_post))
    db.query(Like).filter(
        Like.id_locatario == locatario.id_locatario, Like.id_post == post.id_post
    ).delete(synchronize_session=False)
    db.commit()
    return {"recusado": True, "imovel_id": id_imovel}


@router.delete("/imoveis/{id_imovel}/recusar")
def desfazer_recusa(
    id_imovel: int, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
):
    locatario = contexto.exigir_locatario(db, usuario)
    post = db.query(Post).filter(Post.id_imovel == id_imovel).first()
    if post is not None:
        db.query(Recusa).filter(
            Recusa.id_locatario == locatario.id_locatario, Recusa.id_post == post.id_post
        ).delete(synchronize_session=False)
        db.commit()
    return {"recusado": False, "imovel_id": id_imovel}


@router.get("/historico")
def historico(usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    locatario = contexto.exigir_locatario(db, usuario)

    def posts(modelo, coluna_data):
        return (
            db.query(Post)
            .join(modelo, modelo.id_post == Post.id_post)
            .filter(modelo.id_locatario == locatario.id_locatario, Post.status_anuncio == "ativo")
            .order_by(coluna_data.desc())
            .all()
        )

    return {
        "curtidos": contexto.montar_imoveis(db, posts(Like, Like.data_like), usuario),
        "recusados": contexto.montar_imoveis(db, posts(Recusa, Recusa.data_recusa), usuario),
    }
