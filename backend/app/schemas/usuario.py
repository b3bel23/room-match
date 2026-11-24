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


class RegistroIn(BaseModel):
    """Corpo do POST /auth/register, no formato que frontend/js/cadastro.js envia."""

    nome: str = Field(min_length=1, max_length=120)
    email: EmailStr
    # bcrypt considera no máximo 72 bytes da senha
    senha: str = Field(min_length=8, max_length=72)
    papel: str = "Morador"  # "Morador" (locatario) ou "Locador"
    papel_schema: Optional[str] = None  # ignorado: o papel vale
    cpf_cnpj: Optional[str] = Field(None, max_length=20)  # obrigatório para Locador
    telefone: Optional[str] = Field(None, max_length=20)
    genero: Optional[str] = None
    ocupacao: Optional[str] = None
    emprego: Optional[str] = None
    faculdade: Optional[str] = None
    foto_url: Optional[str] = None
    bio: Optional[str] = None
    cidade_atual: Optional[str] = Field(None, max_length=100)
    data_nascimento: Optional[date] = None
    raio_busca_km: Optional[float] = Field(None, ge=0, le=200)  # só Morador
    tags: List[str] = []
    orcamento_maximo: Optional[float] = Field(None, ge=0)
    limiar_compatibilidade: Optional[float] = Field(None, ge=0, le=100)
    orcamento: Optional[float] = Field(None, ge=0)  # alias legado
    limiar: Optional[float] = Field(None, ge=0, le=100)  # alias legado


class LoginIn(BaseModel):
    email: str
    senha: str
