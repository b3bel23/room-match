from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Recusa(Base):
    """Imóvel recusado no "descobrir" (RF14): some do mural do morador até desfazer."""

    __tablename__ = "recusas"
    __table_args__ = (UniqueConstraint("id_locatario", "id_post", name="uq_recusa_locatario_post"),)

    id_recusa = Column(Integer, primary_key=True, index=True)
    id_locatario = Column(Integer, ForeignKey("locatarios.id_locatario", ondelete="CASCADE"), nullable=False)
    id_post = Column(Integer, ForeignKey("posts.id_post", ondelete="CASCADE"), nullable=False)
    data_recusa = Column(DateTime(timezone=True), server_default=func.now())

    locatario = relationship("Locatario", backref="recusas")
    post = relationship("Post", backref="recusas")
