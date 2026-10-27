"""
Mural de imóveis com match (KAN-35), no contrato que o front espera:
docs/frontend/papeis-e-rotas-api-v1.md e frontend/js/mock-api.js.

  GET /imoveis        mural; match personalizado se autenticado (filtros: tipo, bairro, preco_max, tag)
  GET /imoveis/{id}   detalhe, com `elegibilidade` para chat se o usuário for locatário
  GET /stats          totais públicos do mural (match_medio personalizado)
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.conversa import Conversa
from app.models.like import Like
from app.models.locador import Locador
from app.models.locatario import Locatario
from app.models.post import Post
from app.models.usuario import Usuario
from app.services import matching_service, mural_service
from app.services.auth_service import get_usuario_by_id

router = APIRouter(tags=["mural"])

# Mural e detalhe são públicos: sem token (ou token inválido) o usuário é visitante.
oauth2_opcional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def usuario_opcional(
    token: Optional[str] = Depends(oauth2_opcional), db: Session = Depends(get_db)
) -> Optional[Usuario]:
    if not token:
        return None
    sub = decode_access_token(token)
    if sub is None or not sub.isdigit():
        return None
    return get_usuario_by_id(db, int(sub))


class Elegibilidade(BaseModel):
    match: int
    limiar_compatibilidade: Optional[float] = None
    orcamento_maximo: Optional[float] = None
    limiar: Optional[float] = None
    orcamento: Optional[float] = None
    limiar_ok: bool
    orcamento_ok: bool
    chat_liberado: bool


class ImovelMural(BaseModel):
    id: int
    id_post: int
    titulo: str
    tipo: str
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    endereco: Optional[str] = None
    preco: float
    aluguel: float
    condominio: float
    iptu: float
    contas: float
    area_m2: Optional[float] = None
    descricao: Optional[str] = None
    vagas: int
    quartos: int
    tags: List[str]
    capa: Optional[str] = None
    fotos: List[str]
    fotos_ids: List[int] = []
    locador_id: int
    match_percent: int
    match: int
    tags_correspondentes: List[str]
    elegibilidade: Optional[Elegibilidade] = None


class ListaImoveis(BaseModel):
    items: List[ImovelMural]


class Stats(BaseModel):
    imoveis_ativos: int
    match_medio: int
    deslocamento_medio: int
    favoritos: int
    meus_anuncios: int
    conversas: int


def _contexto_usuario(db: Session, usuario: Optional[Usuario]):
    """(locatario, tags do usuário). Visitante: sem perfil e sem tags."""
    if usuario is None:
        return None, []
    locatario = db.get(Locatario, usuario.id_usuario)
    return locatario, matching_service.tags_do_usuario(db, usuario, locatario)


def _anuncios_ativos(db: Session) -> List[Post]:
    return (
        db.query(Post)
        .filter(Post.status_anuncio == "ativo")
        .order_by(Post.data_publicacao.desc())
        .all()
    )


def _montar_todos(db: Session, posts: List[Post], locatario, user_tags) -> List[dict]:
    tags = matching_service.tags_por_imovel(db, [p.id_imovel for p in posts])
    return [
        mural_service.montar_imovel(p, tags[p.id_imovel], user_tags, locatario) for p in posts
    ]


@router.get("/imoveis", response_model=ListaImoveis)
def listar_imoveis(
    tipo: str = "",
    bairro: str = "",
    q: str = "",
    preco_max: float = Query(0, ge=0),
    tag: str = "",
    usuario: Optional[Usuario] = Depends(usuario_opcional),
    db: Session = Depends(get_db),
):
    locatario, user_tags = _contexto_usuario(db, usuario)
    itens = _montar_todos(db, _anuncios_ativos(db), locatario, user_tags)
    itens = mural_service.filtrar_imoveis(
        itens, tipo=tipo, bairro=bairro or q, tag=tag, preco_max=preco_max
    )
    return {"items": itens}


@router.get("/imoveis/{id_imovel}", response_model=ImovelMural)
def detalhe_imovel(
    id_imovel: int,
    usuario: Optional[Usuario] = Depends(usuario_opcional),
    db: Session = Depends(get_db),
):
    post = (
        db.query(Post)
        .filter(Post.id_imovel == id_imovel, Post.status_anuncio == "ativo")
        .first()
    )
    if post is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado.")
    locatario, user_tags = _contexto_usuario(db, usuario)
    return _montar_todos(db, [post], locatario, user_tags)[0]


@router.get("/stats", response_model=Stats)
def stats(
    usuario: Optional[Usuario] = Depends(usuario_opcional), db: Session = Depends(get_db)
):
    locatario, user_tags = _contexto_usuario(db, usuario)
    posts = _anuncios_ativos(db)
    tags = matching_service.tags_por_imovel(db, [p.id_imovel for p in posts])
    match_medio = matching_service.match_medio(
        user_tags, [{"tags": tags[p.id_imovel]} for p in posts]
    )

    favoritos = conversas = meus_anuncios = 0
    if locatario is not None:
        favoritos = db.query(Like).filter(Like.id_locatario == locatario.id_locatario).count()
        conversas = (
            db.query(Conversa).filter(Conversa.id_locatario == locatario.id_locatario).count()
        )
    elif usuario is not None and db.get(Locador, usuario.id_usuario) is not None:
        meus_anuncios = sum(1 for p in posts if p.id_locador == usuario.id_usuario)

    return Stats(
        imoveis_ativos=len(posts),
        match_medio=match_medio,
        deslocamento_medio=0,  # sem dado de deslocamento no banco ainda (vem do GTFS, KAN-40)
        favoritos=favoritos,
        meus_anuncios=meus_anuncios,
        conversas=conversas,
    )
