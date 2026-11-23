from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class RotaMobilidade(Base):
    __tablename__ = "rotas_mobilidade"
    __table_args__ = (Index("ix_rotas_cache", "id_imovel", "destino", "meio_transporte"),)

    id_rota = Column(Integer, primary_key=True, index=True)
    id_imovel = Column(Integer, ForeignKey("imoveis.id_imovel"), nullable=False)
    destino = Column(String(150), nullable=False)
    meio_transporte = Column(String(30), nullable=False)
    distancia_km = Column(Numeric(6, 2))
    tempo_estimado_min = Column(Integer)
    # Cache do roteirizador (RF28/RF31): trechos da viagem e quando foi calculada.
    detalhes = Column(JSONB)
    calculado_em = Column(DateTime(timezone=True), server_default=func.now())

    imovel = relationship("Imovel", backref="rotas_mobilidade")
