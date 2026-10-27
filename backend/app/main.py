from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers ficam em app/api/v1 (estrutura existente do repo, no lugar de app/routers).
app.include_router(api_router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
