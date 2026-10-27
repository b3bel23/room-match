from typing import Optional

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate


def get_usuario_by_email(db: Session, email: str) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.email == email.lower()).first()


def get_usuario_by_id(db: Session, id_usuario: int) -> Optional[Usuario]:
    return db.get(Usuario, id_usuario)


def register_usuario(db: Session, dados: UsuarioCreate) -> Usuario:
    usuario = Usuario(
        **dados.model_dump(exclude={"senha", "email"}),
        email=dados.email.lower(),
        senha_hash=hash_password(dados.senha),
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


def authenticate_usuario(db: Session, email: str, senha: str) -> Optional[Usuario]:
    usuario = get_usuario_by_email(db, email)
    if not usuario or not verify_password(senha, usuario.senha_hash):
        return None
    return usuario
