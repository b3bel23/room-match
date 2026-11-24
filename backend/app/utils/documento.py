"""Normalização de documentos (CPF/CNPJ) e fotos de perfil em data URL."""

from __future__ import annotations

import base64
import re
import uuid
from typing import Optional

from fastapi import HTTPException, status

from app.services import storage_service

_DIGITO = re.compile(r"\D+")
MAX_BYTES_FOTO_PERFIL = 5 * 1024 * 1024


def so_digitos(valor: Optional[str]) -> str:
    return _DIGITO.sub("", valor or "")


def normalizar_cpf_cnpj(valor: Optional[str]) -> str:
    """Guarda e compara só com dígitos (evita duplicata máscara vs cru)."""
    digitos = so_digitos(valor)
    if digitos and len(digitos) not in (11, 14):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Informe um CPF (11 dígitos) ou CNPJ (14).",
        )
    return digitos


def _extensao_imagem(conteudo: bytes) -> Optional[str]:
    if conteudo.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if conteudo.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if conteudo[:4] == b"RIFF" and conteudo[8:12] == b"WEBP":
        return "webp"
    return None


def _decodificar_data_url(data_url: str) -> bytes:
    if "," not in data_url:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Foto de perfil inválida.")
    try:
        return base64.b64decode(data_url.split(",", 1)[1], validate=False)
    except Exception as erro:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Foto de perfil inválida.") from erro


def gravar_foto_perfil(id_usuario: int, foto_url: Optional[str]) -> Optional[str]:
    """Se vier data URL, sobe para o Storage e devolve a URL pública; senão mantém a URL."""
    if not foto_url:
        return None
    bruto = foto_url.strip()
    if not bruto.startswith("data:"):
        return bruto

    conteudo = _decodificar_data_url(bruto)
    if len(conteudo) > MAX_BYTES_FOTO_PERFIL:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Foto de perfil acima de {MAX_BYTES_FOTO_PERFIL // (1024 * 1024)} MB.",
        )
    ext = _extensao_imagem(conteudo)
    if ext is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Use JPEG, PNG ou WebP na foto de perfil.",
        )
    caminho = f"perfis/{id_usuario}/{uuid.uuid4().hex}.{ext}"
    try:
        return storage_service.salvar(caminho, conteudo)
    except storage_service.ErroStorage as erro:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "Não foi possível guardar a foto de perfil agora.",
        ) from erro
