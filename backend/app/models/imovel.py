from sqlalchemy import Column, Integer, Numeric, String, Text

from app.core.database import Base


class Imovel(Base):
    __tablename__ = "imoveis"

    id_imovel = Column(Integer, primary_key=True, index=True)
    valor_aluguel = Column(Numeric(10, 2), nullable=False)
    valor_condominio = Column(Numeric(10, 2), default=0)
    valor_iptu = Column(Numeric(10, 2), default=0)
    valor_contas_extras = Column(Numeric(10, 2), default=0)
    tipo_imovel = Column(String(50), nullable=False)
    quantidade_quartos = Column(Integer, nullable=False)
    vagas_disponiveis = Column(Integer, nullable=False)
    area_m2 = Column(Numeric(6, 2))
    descricao = Column(Text)
    status_disponibilidade = Column(String(20), default="disponivel")
    # Mista, Masculina ou Feminina (quem pode morar na vaga).
    classificacao = Column(String(20), default="Mista")
