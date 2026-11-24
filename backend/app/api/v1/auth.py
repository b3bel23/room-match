from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from pydantic import BaseModel, EmailStr, Field

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_reset_token,
    decode_reset_token,
    hash_password,
    reset_token_confere,
)
from app.models.usuario import Usuario
from app.schemas.token import Token
from app.schemas.usuario import RegistroIn, UsuarioOut
from app.services import auth_service, email_service, perfil_service, verificacao_service

router = APIRouter()


def _sessao(db: Session, usuario: Usuario) -> Token:
    return Token(
        access_token=create_access_token(usuario.id_usuario),
        user=perfil_service.montar_perfil(db, usuario),
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(dados: RegistroIn, db: Session = Depends(get_db)):
    """Cria a conta e já devolve a sessão: `{ access_token, user }` (contrato do front).
    Com SMTP: envia link de confirmação (RF02). Sem SMTP: não promete e-mail."""
    usuario = auth_service.registrar(db, dados)
    if email_service.envio_ativo():
        verificacao_service.enviar_link(usuario)
    else:
        # Sem caixa de entrada real: não deixa a conta “pendente” de um e-mail que não chega.
        usuario.status_verificacao = True
        db.commit()
        db.refresh(usuario)
    return _sessao(db, usuario)


async def _credenciais(request: Request) -> tuple[str, str]:
    """Aceita JSON `{ email, senha }` (front) ou formulário OAuth2 `username`/`password`
    (botão Authorize do Swagger em /docs)."""
    if "application/json" in request.headers.get("content-type", ""):
        try:
            corpo = await request.json()
        except ValueError:
            corpo = {}
        corpo = corpo if isinstance(corpo, dict) else {}
    else:
        corpo = dict(await request.form())
    email = str(corpo.get("email") or corpo.get("username") or "").strip()
    senha = str(corpo.get("senha") or corpo.get("password") or "")
    return email, senha


@router.post("/login", response_model=Token)
async def login(request: Request, db: Session = Depends(get_db)):
    email, senha = await _credenciais(request)
    usuario = auth_service.authenticate_usuario(db, email, senha) if email and senha else None
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _sessao(db, usuario)


@router.get("/me", response_model=UsuarioOut)
def me(usuario: Usuario = Depends(get_current_user)):
    return usuario


class RecuperarIn(BaseModel):
    email: EmailStr


class RedefinirIn(BaseModel):
    token: str
    senha_nova: str = Field(min_length=8, max_length=72)


MSG_RECUPERAR = "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha."


@router.post("/recuperar")
def recuperar_senha(dados: RecuperarIn, db: Session = Depends(get_db)):
    """Sem SMTP: avisa indisponível. Com SMTP: 200 genérico (não revela se o e-mail existe)."""
    if not email_service.envio_ativo():
        return {
            "ok": False,
            "email_envio_disponivel": False,
            "message": "Recuperação por e-mail indisponível neste ambiente (SMTP não configurado).",
        }
    usuario = auth_service.get_usuario_by_email(db, dados.email)
    if usuario is not None:
        token = create_reset_token(usuario.id_usuario, usuario.senha_hash)
        link = f"{settings.frontend_url.rstrip('/')}/redefinir-senha.html?token={token}"
        email_service.enviar(
            usuario.email,
            "RoomMatch · redefinir senha",
            f"Olá, {usuario.nome}!\n\nPara criar uma nova senha, abra o link abaixo "
            f"(vale por {settings.reset_token_expire_minutes} minutos):\n\n{link}\n\n"
            "Se você não pediu, ignore este e-mail.",
        )
    return {"ok": True, "email_envio_disponivel": True, "message": MSG_RECUPERAR}


@router.post("/redefinir")
def redefinir_senha(dados: RedefinirIn, db: Session = Depends(get_db)):
    decodificado = decode_reset_token(dados.token)
    usuario = auth_service.get_usuario_by_id(db, decodificado[0]) if decodificado else None
    if usuario is None or not reset_token_confere(usuario.senha_hash, decodificado[1]):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Link inválido ou vencido. Peça um novo."
        )
    usuario.senha_hash = hash_password(dados.senha_nova)
    db.commit()
    return {"ok": True, "message": "Senha alterada. Entre com a nova senha."}


class VerificarIn(BaseModel):
    token: str


@router.post("/verificar")
def verificar_email(dados: VerificarIn, db: Session = Depends(get_db)):
    if not verificacao_service.confirmar(db, dados.token):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Link inválido ou vencido. Peça um novo no seu perfil."
        )
    return {"ok": True, "message": "E-mail confirmado."}
