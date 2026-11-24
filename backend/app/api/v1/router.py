from fastapi import APIRouter

from app.api.v1 import auth, chat, descobrir, favoritos, imoveis, matches, mobilidade, notificacoes, users, visitas

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
# CRUD de anúncios (KAN-34). Vem antes do mural: /imoveis/meus não pode cair em /imoveis/{id}.
api_router.include_router(imoveis.router)
# Mural com match (KAN-35): GET /imoveis, GET /imoveis/{id}, GET /stats (paths completos no router).
api_router.include_router(matches.router)
# Perfil do usuário logado (KAN-33): GET/PATCH/DELETE /me e POST /me/senha.
api_router.include_router(users.router)
# Favoritos, visitas e chat (paths completos nos routers, como o front chama).
api_router.include_router(favoritos.router)
api_router.include_router(visitas.router)
api_router.include_router(chat.router)
# Avisos no site (RF17/RF35), descobrir em cards (RF12–14) e rotas de ônibus (RF31).
api_router.include_router(notificacoes.router)
api_router.include_router(descobrir.router)
api_router.include_router(mobilidade.router)
