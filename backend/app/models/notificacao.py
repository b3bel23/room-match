from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class Notificacao(Base):
    """Aviso dentro do site (RF17/RF35): mensagem nova, interesse no anúncio, visita."""

    __tablename__ = "notificacoes"

    id_notificacao = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(
        Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), nullable=False, index=True
    )
    tipo = Column(String(30), nullable=False)  # mensagem, conversa, favorito, visita
    texto = Column(String(255), nullable=False)
    link = Column(String(255))  # caminho relativo a frontend/pages (ex.: mensagens.html?id=3)
    lida = Column(Boolean, nullable=False, default=False)
    criada_em = Column(DateTime(timezone=True), server_default=func.now(), index=True)
