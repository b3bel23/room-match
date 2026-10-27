"""Banco SQLite em memória para testar o ORM sem Postgres.

Os models usam ARRAY e JSONB (Postgres); aqui esses tipos viram JSON só nos testes.
"""

import pytest
from sqlalchemy import JSON, create_engine, event
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  (registra todos os models)
from app.core.database import Base

for _tabela in Base.metadata.tables.values():
    for _coluna in _tabela.columns:
        if isinstance(_coluna.type, (ARRAY, JSONB)):
            _coluna.type = JSON()


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def _fk_on(conexao, _):
        conexao.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    sessao = sessionmaker(bind=engine, autoflush=False)()
    try:
        yield sessao
    finally:
        sessao.close()
        engine.dispose()
