from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import app.models  # noqa: F401  (registra todos os models antes do primeiro uso)
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine
from app.services.imovel_service import UPLOAD_DIR


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tabelas são gerenciadas pelo Alembic: rode "alembic upgrade head" antes de subir a API.
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
app.include_router(api_router)

# Fotos enviadas pelos locadores (KAN-34); url_imagem é guardada como /uploads/...
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
