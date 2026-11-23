"""Onde ficam as fotos dos anúncios.

- `local` (padrão): pasta backend/uploads, servida pela própria API em /uploads. Serve para
  desenvolvimento; em hospedagem sem disco persistente (Render, Railway) os arquivos somem
  a cada deploy.
- `supabase`: bucket público do Supabase Storage. A URL gravada no banco é a URL pública
  completa, então o site exibe a foto direto do Supabase.

Escolha com STORAGE_BACKEND=local|supabase (ver .env.example).
"""

from __future__ import annotations

import json
import logging
import mimetypes
import urllib.error
import urllib.request
from pathlib import Path

from app.core.config import settings

log = logging.getLogger("roommatch.storage")

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
URL_UPLOADS = "/uploads"


class ErroStorage(RuntimeError):
    pass


def _supabase() -> bool:
    return settings.storage_backend.lower() == "supabase"


def _requisicao(metodo: str, url: str, corpo: bytes | None, tipo: str) -> None:
    pedido = urllib.request.Request(
        url,
        data=corpo,
        method=metodo,
        headers={
            "Authorization": f"Bearer {settings.supabase_service_key}",
            "apikey": settings.supabase_service_key,
            "Content-Type": tipo,
            "x-upsert": "false",
        },
    )
    try:
        with urllib.request.urlopen(pedido, timeout=20) as resposta:
            resposta.read()
    except urllib.error.HTTPError as erro:
        raise ErroStorage(f"Supabase Storage respondeu {erro.code}: {erro.read()[:200]!r}") from erro
    except OSError as erro:
        raise ErroStorage(f"Supabase Storage fora do ar: {erro}") from erro


def salvar(caminho_relativo: str, conteudo: bytes) -> str:
    """Grava o arquivo e devolve a URL que vai para carrossel_imagens.url_imagem."""
    if _supabase():
        base = settings.supabase_url.rstrip("/")
        bucket = settings.supabase_bucket
        tipo = mimetypes.guess_type(caminho_relativo)[0] or "application/octet-stream"
        _requisicao("POST", f"{base}/storage/v1/object/{bucket}/{caminho_relativo}", conteudo, tipo)
        return f"{base}/storage/v1/object/public/{bucket}/{caminho_relativo}"
    destino = UPLOAD_DIR / caminho_relativo
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(conteudo)
    return f"{URL_UPLOADS}/{caminho_relativo}"


def apagar(url: str) -> None:
    """Apaga o arquivo de uma URL gravada por `salvar`. Falha só vai para o log: a foto já
    saiu do anúncio e um arquivo órfão não quebra nada."""
    try:
        if url.startswith(URL_UPLOADS + "/"):
            caminho = (UPLOAD_DIR / url.removeprefix(URL_UPLOADS + "/")).resolve()
            if UPLOAD_DIR.resolve() in caminho.parents:  # nunca apaga fora da pasta de uploads
                caminho.unlink(missing_ok=True)
            return
        base = settings.supabase_url.rstrip("/")
        prefixo = f"{base}/storage/v1/object/public/{settings.supabase_bucket}/"
        if _supabase() and url.startswith(prefixo):
            corpo = json.dumps({"prefixes": [url.removeprefix(prefixo)]}).encode()
            _requisicao("DELETE", f"{base}/storage/v1/object/{settings.supabase_bucket}", corpo, "application/json")
    except (ErroStorage, OSError):
        log.exception("Não foi possível apagar %s", url)
