from fastapi import APIRouter

from app.api.v1 import auth

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Routers dos próximos módulos (descomentar conforme forem implementados):
# from app.api.v1 import users, imoveis, matches, chat, mobilidade
# api_router.include_router(users.router, prefix="/users", tags=["users"])
# api_router.include_router(imoveis.router, prefix="/imoveis", tags=["imoveis"])
# api_router.include_router(matches.router, prefix="/matches", tags=["matches"])
# api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
# api_router.include_router(mobilidade.router, prefix="/mobilidade", tags=["mobilidade"])
