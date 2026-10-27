from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Denuncia(Base):
    __tablename__ = "denuncias"

    id_denuncia = Column(Integer, primary_key=True, index=True)
    id_denunciante = Column(Integer, ForeignKey("pessoas.id_pessoa"), nullable=False)
    id_usuario_denunciado = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    id_post_denunciado = Column(Integer, ForeignKey("posts.id_post"), nullable=True)
    motivo = Column(String(100), nullable=False)
    descricao = Column(Text)
    data_denuncia = Column(DateTime(timezone=True), server_default=func.now())
    status_denuncia = Column(String(20), default="pendente")

    denunciante = relationship("Pessoa", foreign_keys=[id_denunciante])
    usuario_denunciado = relationship("Usuario", foreign_keys=[id_usuario_denunciado])
    post_denunciado = relationship("Post", backref="denuncias")
