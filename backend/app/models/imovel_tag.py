from sqlalchemy import Column, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base


class ImovelTag(Base):
    __tablename__ = "imovel_tags"

    id_imovel = Column(Integer, ForeignKey("imoveis.id_imovel", ondelete="CASCADE"), primary_key=True)
    id_tag = Column(Integer, ForeignKey("tags.id_tag", ondelete="CASCADE"), primary_key=True)

    imovel = relationship("Imovel", backref="imovel_tags")
    tag = relationship("Tag", backref="imovel_tags")
