from datetime import date
from typing import Annotated, List, Optional

from pydantic import BaseModel, EmailStr, Field, StringConstraints

Tag = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]


class PerfilOut(BaseModel):
    """Perfil do usuário logado, no formato de `publico()` em frontend/js/mock-api.js."""

    id: int
    email: str
    nome: str
    papel: str  # "Morador" (locatarios) ou "Locador" (locadores)
    papel_schema: str  # "locatario" ou "locador"
    iniciais: str
    telefone: str = ""
    genero: str = ""
    ocupacao: str = ""
    emprego: str = ""
    faculdade: str = ""
    foto_url: str = ""
    bio: str = ""
    cidade_atual: str = ""
    data_nascimento: Optional[date] = None
    tags: List[str] = []
    orcamento_maximo: float = 0
    limiar_compatibilidade: float = 0
    # aliases curtos que o front ainda lê
    orcamento: float = 0
    limiar: float = 0


class PerfilUpdate(BaseModel):
    """Corpo do PATCH /me. Só os campos enviados são alterados.

    `id` e `senha` não existem aqui de propósito: campos desconhecidos são ignorados.
    genero, ocupacao, emprego e faculdade são aceitos (o front envia), mas o banco ainda
    não tem colunas para eles, então não são persistidos.
    """

    nome: Optional[str] = Field(None, min_length=1, max_length=120)
    email: Optional[EmailStr] = None
    telefone: Optional[str] = Field(None, max_length=20)
    foto_url: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = None
    cidade_atual: Optional[str] = Field(None, max_length=100)
    data_nascimento: Optional[date] = None
    genero: Optional[str] = None
    ocupacao: Optional[str] = None
    emprego: Optional[str] = None
    faculdade: Optional[str] = None
    papel: Optional[str] = None
    cpf_cnpj: Optional[str] = Field(None, max_length=20)  # exigido ao virar Locador pela 1ª vez
    tags: Optional[List[Tag]] = None
    orcamento_maximo: Optional[float] = Field(None, ge=0)
    limiar_compatibilidade: Optional[float] = Field(None, ge=0, le=100)
    orcamento: Optional[float] = Field(None, ge=0)  # alias legado
    limiar: Optional[float] = Field(None, ge=0, le=100)  # alias legado
