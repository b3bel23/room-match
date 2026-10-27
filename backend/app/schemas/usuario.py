from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None
    foto_perfil: Optional[str] = None
    bio: Optional[str] = None
    cidade_atual: Optional[str] = None
    tags_convivencia: Optional[List[str]] = None

class UsuarioCreate(UsuarioBase):
    # bcrypt considera no máximo 72 bytes da senha
    senha: str = Field(min_length=8, max_length=72)

class UsuarioOut(UsuarioBase):
    id_usuario: int
    data_cadastro: datetime
    status_verificacao: bool

    model_config = ConfigDict(from_attributes=True)
