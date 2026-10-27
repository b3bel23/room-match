from fastapi import APIRouter

from app.api.v1 import auth, imoveis, matches, users

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
# CRUD de anúncios (KAN-34). Vem antes do mural: /imoveis/meus não pode cair em /imoveis/{id}.
api_router.include_router(imoveis.router)
# Mural com match (KAN-35): GET /imoveis, GET /imoveis/{id}, GET /stats (paths completos no router).
api_router.include_router(matches.router)
# Perfil do usuário logado (KAN-33): GET/PATCH/DELETE /me (paths completos no router).
api_router.include_router(users.router)

# Routers dos próximos módulos (descomentar conforme forem implementados):
# from app.api.v1 import chat, mobilidade
# api_router.include_router(imoveis.router, prefix="/imoveis", tags=["imoveis"])
# api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
# api_router.include_router(mobilidade.router, prefix="/mobilidade", tags=["mobilidade"])
