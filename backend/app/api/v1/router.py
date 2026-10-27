from fastapi import APIRouter

api_router = APIRouter()

# Routers dos módulos (descomentar conforme forem implementados):
# from app.api.v1 import auth, users, imoveis, matches, chat, mobilidade
# api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
# api_router.include_router(users.router, prefix="/users", tags=["users"])
# api_router.include_router(imoveis.router, prefix="/imoveis", tags=["imoveis"])
# api_router.include_router(matches.router, prefix="/matches", tags=["matches"])
# api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
# api_router.include_router(mobilidade.router, prefix="/mobilidade", tags=["mobilidade"])
