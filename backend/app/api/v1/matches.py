from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user  # KAN-32
from app.models.locatario import Locatario
from app.models.post import Post
from app.models.usuario import Usuario
from app.services import matching_service

router = APIRouter(prefix="/matches", tags=["matches"])


class PostComAfinidade(BaseModel):
    id_post: int
    id_imovel: int
    titulo: str
    percentual_afinidade: int
    tags_correspondentes: List[str]


@router.get("", response_model=List[PostComAfinidade])
def anuncios_por_afinidade(
    min_afinidade: int = Query(0, ge=0, le=100, description="Limiar mínimo de afinidade (%)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Anúncios ativos ordenados por % de afinidade com o locatário logado."""
    locatario = db.get(Locatario, usuario.id_usuario)
    if locatario is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Ative o modo locatário para ver afinidades")

    tags_usuario = matching_service.tags_do_locatario(db, locatario)
    normalizadas = {matching_service.normalizar_tag(t) for t in tags_usuario}

    resultado = []
    for post in db.query(Post).filter(Post.status_anuncio == "ativo").all():
        tags_imovel = matching_service.tags_do_imovel(db, post.id_imovel)
        percentual = matching_service.match_percent(tags_usuario, tags_imovel)
        if percentual < min_afinidade:
            continue
        resultado.append(
            PostComAfinidade(
                id_post=post.id_post,
                id_imovel=post.id_imovel,
                titulo=post.titulo,
                percentual_afinidade=percentual,
                tags_correspondentes=[
                    t for t in tags_imovel if matching_service.normalizar_tag(t) in normalizadas
                ],
            )
        )
    resultado.sort(key=lambda r: r.percentual_afinidade, reverse=True)
    return resultado[skip : skip + limit]
