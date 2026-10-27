from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.usuario import Usuario
from app.schemas.perfil import PerfilOut, PerfilUpdate
from app.services import perfil_service

router = APIRouter(tags=["perfil"])


@router.get("/me", response_model=PerfilOut)
def meu_perfil(usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    return perfil_service.montar_perfil(db, usuario)


@router.patch("/me", response_model=PerfilOut)
def atualizar_meu_perfil(
    dados: PerfilUpdate,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Atualiza o perfil. Com `papel`, migra locatário ↔ locador no banco."""
    return perfil_service.atualizar_perfil(db, usuario, dados)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def excluir_minha_conta(usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    perfil_service.excluir_conta(db, usuario)
