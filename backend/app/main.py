import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

import app.models  # noqa: F401  (registra todos os models antes do primeiro uso)
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine
from app.services.imovel_service import UPLOAD_DIR


log = logging.getLogger("uvicorn.error")  # aparece no terminal do uvicorn

# /health não deve bater no banco a cada probe (pooler remoto = ~1s+).
_banco_cache: tuple[float, bool, str] | None = None
_BANCO_CACHE_S = 30.0


def checar_banco(*, forcar: bool = False) -> tuple[bool, str]:
    """Conecta e conta usuários. Devolve (ok, mensagem para o terminal)."""
    import time

    global _banco_cache
    agora = time.monotonic()
    if not forcar and _banco_cache is not None:
        quando, ok, mensagem = _banco_cache
        if agora - quando < _BANCO_CACHE_S:
            return ok, mensagem

    destino = f"{settings.db_host}:{settings.db_port}/{settings.db_name} (usuário {settings.db_user})"
    try:
        with engine.connect() as conexao:
            usuarios = conexao.execute(text("select count(*) from usuarios")).scalar()
        ok, mensagem = True, f"Banco conectado: {destino} · {usuarios} usuários"
    except Exception as erro:  # noqa: BLE001 - qualquer falha vira aviso no terminal
        motivo = str(getattr(erro, "orig", erro)).strip().splitlines()[0][:300]
        dica = (
            " Rode 'alembic upgrade head'." if "usuarios" in motivo and "does not exist" in motivo
            else " Confira o .env na raiz do repositório (DB_HOST, DB_USER, DB_PASSWORD, DB_SSLMODE)."
        )
        ok, mensagem = False, f"SEM BANCO: {destino} · {motivo}.{dica}"
    _banco_cache = (agora, ok, mensagem)
    return ok, mensagem


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tabelas são gerenciadas pelo Alembic: rode "alembic upgrade head" antes de subir a API.
    from app.services import mobilidade_service

    ok, mensagem = checar_banco(forcar=True)
    (log.info if ok else log.error)(mensagem)

    mobilidade_service.carregar_em_segundo_plano()  # GTFS_PATHS: horários de ônibus
    yield
    engine.dispose()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers ficam em app/api/v1 (estrutura existente do repo, no lugar de app/routers).
app.include_router(api_router, prefix="/api/v1")

# Fotos enviadas pelos locadores (KAN-34); url_imagem é guardada como /uploads/...
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health", tags=["health"])
def health():
    """`status` é da API; `banco` diz se ela alcança o banco (detalhes no terminal)."""
    ok, _ = checar_banco()
    return {"status": "ok", "banco": "ok" if ok else "erro"}
