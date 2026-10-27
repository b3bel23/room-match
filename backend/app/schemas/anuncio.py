from typing import Annotated, Any, List, Optional

from pydantic import BaseModel, Field, StringConstraints, field_validator

Tag = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]

STATUS_EDITAVEIS = ("ativo", "pausado")


def _vazio_vira_zero(valor: Any) -> Any:
    """O formulário do front manda "" nos campos de valor em branco."""
    return 0 if valor is None or (isinstance(valor, str) and not valor.strip()) else valor


class _Campos(BaseModel):
    """Campos comuns de criação e edição (nomes do contrato do front)."""

    titulo: Optional[str] = Field(None, min_length=1, max_length=150)
    tipo: Optional[str] = Field(None, min_length=1, max_length=50)
    descricao: Optional[str] = None
    # Endereço: texto livre ("R. Benedito, 450 · Barão Geraldo") ou campos estruturados.
    endereco: Optional[str] = None
    rua: Optional[str] = Field(None, max_length=150)
    numero: Optional[str] = Field(None, max_length=20)
    bairro: Optional[str] = Field(None, max_length=100)
    cidade: Optional[str] = Field(None, max_length=100)
    estado: Optional[str] = Field(None, min_length=2, max_length=2)
    cep: Optional[str] = Field(None, max_length=9)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    aluguel: Optional[float] = Field(None, gt=0)
    condominio: Optional[float] = Field(None, ge=0)
    iptu: Optional[float] = Field(None, ge=0)
    contas: Optional[float] = Field(None, ge=0)
    area_m2: Optional[float] = Field(None, gt=0)
    quartos: Optional[int] = Field(None, ge=1)
    vagas: Optional[int] = Field(None, ge=0)
    tags: Optional[List[Tag]] = None
    # Aceito (o front envia), mas o banco ainda não tem coluna: não é persistido.
    classificacao: Optional[str] = None

    @field_validator("condominio", "iptu", "contas", "area_m2", mode="before")
    @classmethod
    def _opcionais_em_branco(cls, valor):
        return None if isinstance(valor, str) and not valor.strip() else valor


class AnuncioCreate(_Campos):
    titulo: str = Field(..., min_length=1, max_length=150)
    aluguel: float = Field(..., gt=0)

    @field_validator("condominio", "iptu", "contas", mode="before")
    @classmethod
    def _valores_em_branco_valem_zero(cls, valor):
        return _vazio_vira_zero(valor)


class AnuncioUpdate(_Campos):
    status_anuncio: Optional[str] = None

    @field_validator("condominio", "iptu", "contas", mode="before")
    @classmethod
    def _valores_em_branco_valem_zero(cls, valor):
        # igual ao mock: no PATCH, "" em condomínio/IPTU/contas zera o valor
        return _vazio_vira_zero(valor)

    @field_validator("status_anuncio")
    @classmethod
    def _status_valido(cls, valor):
        if valor is not None and valor not in STATUS_EDITAVEIS:
            raise ValueError(f"status_anuncio deve ser um de {STATUS_EDITAVEIS}")
        return valor
