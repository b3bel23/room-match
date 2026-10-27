"""
CRUD de anúncios do locador (KAN-34), no contrato do front
(docs/frontend/papeis-e-rotas-api-v1.md). A leitura pública (GET /imoveis e
GET /imoveis/{id}) fica em matches.py, junto do match.

  GET    /imoveis/meus                         anúncios da conta (locador)
  POST   /imoveis                              publicar
  PATCH  /imoveis/{id}                         editar (dono)
  DELETE /imoveis/{id}                         remover (dono; remoção lógica)
  POST   /imoveis/{id}/fotos                   enviar fotos (multipart, campo "fotos")
  DELETE /imoveis/{id}/fotos/{id_imagem}       remover uma foto
"""

from typing import List

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.v1.matches import ImovelMural, ListaImoveis
from app.core.database import get_db
from app.models.post import Post
from app.models.usuario import Usuario
from app.schemas.anuncio import AnuncioCreate, AnuncioUpdate
from app.services import imovel_service, matching_service, mural_service
from app.services.imovel_service import MAX_BYTES_FOTO

router = APIRouter(tags=["imoveis"])


def _serializar(db: Session, post: Post, usuario: Usuario) -> dict:
    tags = matching_service.tags_do_imovel(db, post.id_imovel)
    return mural_service.montar_imovel(post, tags, matching_service.tags_do_usuario(db, usuario), None)


@router.get("/imoveis/meus", response_model=ListaImoveis)
def meus_imoveis(usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    imovel_service.exigir_locador(db, usuario)
    return {"items": [_serializar(db, p, usuario) for p in imovel_service.anuncios_do_locador(db, usuario)]}


@router.post("/imoveis", response_model=ImovelMural, status_code=status.HTTP_201_CREATED)
def publicar_imovel(
    dados: AnuncioCreate,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    locador = imovel_service.exigir_locador(db, usuario)
    return _serializar(db, imovel_service.criar_anuncio(db, locador, dados), usuario)


@router.patch("/imoveis/{id_imovel}", response_model=ImovelMural)
def editar_imovel(
    id_imovel: int,
    dados: AnuncioUpdate,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    imovel_service.exigir_locador(db, usuario)
    post = imovel_service.obter_post_do_dono(db, id_imovel, usuario)
    return _serializar(db, imovel_service.atualizar_anuncio(db, post, dados), usuario)


@router.delete("/imoveis/{id_imovel}", status_code=status.HTTP_204_NO_CONTENT)
def remover_imovel(
    id_imovel: int, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
):
    imovel_service.exigir_locador(db, usuario)
    imovel_service.remover_anuncio(db, imovel_service.obter_post_do_dono(db, id_imovel, usuario))


@router.post("/imoveis/{id_imovel}/fotos", response_model=ImovelMural, status_code=status.HTTP_201_CREATED)
def enviar_fotos(
    id_imovel: int,
    fotos: List[UploadFile] = File(...),
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    imovel_service.exigir_locador(db, usuario)
    post = imovel_service.obter_post_do_dono(db, id_imovel, usuario)
    # lê no máximo 1 byte além do limite: basta para rejeitar arquivos grandes sem carregá-los inteiros
    conteudos = [f.file.read(MAX_BYTES_FOTO + 1) for f in fotos]
    return _serializar(db, imovel_service.adicionar_fotos(db, post, conteudos), usuario)


@router.delete("/imoveis/{id_imovel}/fotos/{id_imagem}", response_model=ImovelMural)
def remover_foto(
    id_imovel: int,
    id_imagem: int,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    imovel_service.exigir_locador(db, usuario)
    post = imovel_service.obter_post_do_dono(db, id_imovel, usuario)
    return _serializar(db, imovel_service.remover_foto(db, post, id_imagem), usuario)
