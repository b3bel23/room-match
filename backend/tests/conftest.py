"""Banco SQLite em memória para testar o ORM sem Postgres.

Os models usam ARRAY e JSONB (Postgres); aqui esses tipos viram JSON só nos testes.
"""

import pytest
from sqlalchemy import JSON, create_engine, event
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  (registra todos os models)
from app.core.config import settings
from app.core.database import Base

for _tabela in Base.metadata.tables.values():
    for _coluna in _tabela.columns:
        if isinstance(_coluna.type, (ARRAY, JSONB)):
            _coluna.type = JSON()


@pytest.fixture(autouse=True)
def _storage_local_nos_testes(monkeypatch):
    """Testes não devem falar com Supabase Storage (usa o .env da máquina)."""
    monkeypatch.setattr(settings, "storage_backend", "local")
    monkeypatch.setattr(settings, "supabase_service_key", "")


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


@pytest.fixture()
def client(db):
    """TestClient da API inteira usando a sessão SQLite do fixture `db`."""
    from fastapi.testclient import TestClient

    from app.core.database import get_db
    from app.main import app

    app.dependency_overrides[get_db] = lambda: db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def entrar(client, email, senha="senha12345"):
    """Faz login pelo contrato do front e devolve o header Authorization."""
    r = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def cadastrar(client, email="ana@x.com", papel="Morador", **extra):
    corpo = {
        "nome": "Ana Souza",
        "email": email,
        "senha": "senha12345",
        "papel": papel,
        "telefone": "(19) 98888-1001",
        "tags": ["Pet Friendly", "Silêncio Noturno"],
        "orcamento_maximo": 1500,
        "limiar_compatibilidade": 50,
        **extra,
    }
    if papel == "Locador":
        corpo.setdefault("cpf_cnpj", f"cpf-{email}")
    r = client.post("/api/v1/auth/register", json=corpo)
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
