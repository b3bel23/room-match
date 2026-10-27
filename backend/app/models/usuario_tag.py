from sqlalchemy import Column, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base


class UsuarioTag(Base):
    __tablename__ = "usuario_tags"

    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), primary_key=True)
    id_tag = Column(Integer, ForeignKey("tags.id_tag", ondelete="CASCADE"), primary_key=True)

    usuario = relationship("Usuario", backref="usuario_tags")
    tag = relationship("Tag", backref="usuario_tags")
