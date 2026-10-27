from sqlalchemy import Column, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import backref, relationship

from app.core.database import Base


class EnderecoImovel(Base):
    __tablename__ = "enderecos_imovel"

    id_endereco = Column(Integer, primary_key=True, index=True)
    id_imovel = Column(Integer, ForeignKey("imoveis.id_imovel"), nullable=False, unique=True)
    rua = Column(String(150), nullable=False)
    numero = Column(String(20))
    bairro = Column(String(100), nullable=False)
    cidade = Column(String(100), nullable=False)
    estado = Column(String(2), nullable=False)
    cep = Column(String(9))
    latitude = Column(Numeric(9, 6))
    longitude = Column(Numeric(9, 6))

    # uselist=False no backref: Imovel.endereco é um único objeto (1:1), não uma lista.
    imovel = relationship("Imovel", backref=backref("endereco", uselist=False))
