"""Favoritos do Morador (RF25): GET /favoritos, POST|DELETE /favoritos/{id_imovel}.

Usa a tabela `likes` (locatário × post). Formato igual ao mock: `{ items, ids }` e
`{ favorito, ids }`. Anúncios pausados ou removidos somem da lista, mas o like fica.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.like import Like
from app.models.post import Post
from app.models.usuario import Usuario
from app.services import contexto, notificacao_service

router = APIRouter(tags=["favoritos"])


def _posts_favoritos(db: Session, id_locatario: int) -> list[Post]:
    return (
        db.query(Post)
        .join(Like, Like.id_post == Post.id_post)
        .filter(Like.id_locatario == id_locatario, Post.status_anuncio == "ativo")
        .order_by(Like.data_like.desc(), Like.id_like.desc())
        .all()
    )


@router.get("/favoritos")
def listar_favoritos(usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    locatario = contexto.exigir_locatario(db, usuario)
    posts = _posts_favoritos(db, locatario.id_locatario)
    return {
        "items": contexto.montar_imoveis(db, posts, usuario),
        "ids": [p.id_imovel for p in posts],
    }


def _alternar(db: Session, usuario: Usuario, id_imovel: int, remover_apenas: bool) -> dict:
    locatario = contexto.exigir_locatario(db, usuario)
    post = contexto.post_ativo(db, id_imovel)
    like = (
        db.query(Like)
        .filter(Like.id_locatario == locatario.id_locatario, Like.id_post == post.id_post)
        .first()
    )
    if like is not None:
        db.delete(like)
    elif not remover_apenas:
        db.add(Like(id_locatario=locatario.id_locatario, id_post=post.id_post))
        notificacao_service.notificar(
            db, post.id_locador, "favorito",
            f"{usuario.nome.split()[0]} favoritou “{post.titulo}”.", "meus-imoveis.html",
        )
    db.commit()
    ids = [p.id_imovel for p in _posts_favoritos(db, locatario.id_locatario)]
    return {"favorito": id_imovel in ids, "ids": ids}


@router.post("/favoritos/{id_imovel}")
def alternar_favorito(
    id_imovel: int, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Liga/desliga o favorito (toggle), como o mock."""
    return _alternar(db, usuario, id_imovel, remover_apenas=False)


@router.delete("/favoritos/{id_imovel}")
def remover_favorito(
    id_imovel: int, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
):
    return _alternar(db, usuario, id_imovel, remover_apenas=True)
