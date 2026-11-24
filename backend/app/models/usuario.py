from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.pessoa import Pessoa


class Usuario(Pessoa):
    __tablename__ = "usuarios"

    # id_usuario é PK da própria tabela e, ao mesmo tempo, FK para pessoas.id_pessoa.
    # É esse par que liga as duas tabelas na herança "joined-table".
    id_usuario = Column(Integer, ForeignKey("pessoas.id_pessoa"), primary_key=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    telefone = Column(String(20))
    data_nascimento = Column(Date)
    # Text: o front envia a foto como data URL (base64); pode passar de 255 caracteres.
    foto_perfil = Column(Text)
    data_cadastro = Column(DateTime(timezone=True), server_default=func.now())
    bio = Column(Text)
    cidade_atual = Column(String(100))
    status_verificacao = Column(Boolean, default=False)
    # Lista de tags nativa do Postgres (ex: ["Aceita Animais", "Silêncio Noturno"]),
    # em vez de uma string CSV - ver observações no chat.
    tags_convivencia = Column(ARRAY(String))
    # Dados de perfil do cadastro (opcionais, exceto gênero no site).
    genero = Column(String(40))
    ocupacao = Column(String(120))
    emprego = Column(String(80))
    faculdade = Column(String(200))

    __mapper_args__ = {"polymorphic_identity": "usuario"}
