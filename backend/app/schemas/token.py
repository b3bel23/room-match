from typing import Any, Optional

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    # Perfil no formato de GET /me; o front salva junto com o token (sessao.js).
    user: Optional[dict[str, Any]] = None
