from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str | int, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload: dict[str, Any] = {"sub": str(subject), "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> Optional[str]:
    """Retorna o 'sub' do token, ou None se o token for inválido ou estiver expirado."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None
    if payload.get("fin"):  # tokens de redefinição/verificação não autenticam
        return None
    return payload.get("sub")


def _impressao(senha_hash: str) -> str:
    """Pedaço do hash atual: o link de redefinição deixa de valer depois que a senha muda."""
    return senha_hash[-12:]


def create_reset_token(id_usuario: int, senha_hash: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.reset_token_expire_minutes)
    payload = {"sub": str(id_usuario), "exp": expire, "fin": "reset", "h": _impressao(senha_hash)}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_reset_token(token: str) -> Optional[tuple[int, str]]:
    """(id_usuario, impressão do hash) ou None se inválido, vencido ou de outra finalidade."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None
    sub = payload.get("sub")
    if payload.get("fin") != "reset" or not str(sub or "").isdigit():
        return None
    return int(sub), payload.get("h", "")


def reset_token_confere(senha_hash: str, impressao: str) -> bool:
    return _impressao(senha_hash) == impressao


def create_verify_token(id_usuario: int, email: str, dias: int = 7) -> str:
    """Link de confirmação de e-mail: deixa de valer se o e-mail da conta mudar."""
    expire = datetime.now(timezone.utc) + timedelta(days=dias)
    payload = {"sub": str(id_usuario), "exp": expire, "fin": "verificar", "email": email.lower()}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_verify_token(token: str) -> Optional[tuple[int, str]]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None
    sub = payload.get("sub")
    if payload.get("fin") != "verificar" or not str(sub or "").isdigit():
        return None
    return int(sub), payload.get("email", "")
