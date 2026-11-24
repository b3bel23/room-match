from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.models.usuario import Usuario
from app.schemas.perfil import PerfilOut, PerfilUpdate
from app.services import perfil_service, verificacao_service

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


class SenhaIn(BaseModel):
    senha_atual: str
    senha_nova: Optional[str] = Field(None, min_length=8, max_length=72)
    nova_senha: Optional[str] = Field(None, min_length=8, max_length=72)  # alias


@router.post("/me/senha")
def alterar_senha(
    dados: SenhaIn, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
):
    nova = dados.senha_nova or dados.nova_senha
    if not nova:
        raise HTTPException(422, "Informe a nova senha (mínimo 8 caracteres).")
    if not verify_password(dados.senha_atual, usuario.senha_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Senha atual incorreta.")
    usuario.senha_hash = hash_password(nova)
    db.commit()
    return {"ok": True}


@router.post("/me/verificacao")
def reenviar_verificacao(usuario: Usuario = Depends(get_current_user)):
    """Reenvia o link de confirmação de e-mail (só com SMTP configurado)."""
    from app.services import email_service

    if usuario.status_verificacao:
        return {"ok": True, "message": "Seu e-mail já está confirmado."}
    if not email_service.envio_ativo():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Confirmação por e-mail indisponível neste ambiente (SMTP não configurado).",
        )
    verificacao_service.enviar_link(usuario)
    return {"ok": True, "message": f"Enviamos um novo link para {usuario.email}."}
