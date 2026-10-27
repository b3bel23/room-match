from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

# Divergência: o prompt pede app/db/database.py e MySQL; o repo usa app/core/database.py e PostgreSQL.
engine = create_engine(settings.database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Toda classe de modelo (Usuario, Imovel, Tag...) vai herdar de Base.
Base = declarative_base()


def create_tables() -> None:
    """Registra todos os models e cria as tabelas que ainda não existem."""
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency do FastAPI: abre uma sessão por requisição e fecha no final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
