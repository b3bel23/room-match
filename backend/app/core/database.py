from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

# Divergência: o prompt pede app/db/database.py e MySQL; o repo usa app/core/database.py e PostgreSQL.
# Pool mantém conexões quentes com o Supabase (RTT alto). pre_ping evita conexão morta do pooler.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=280,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Toda classe de modelo (Usuario, Imovel, Tag...) vai herdar de Base.
# As tabelas são criadas/alteradas pelas migrações do Alembic (backend/alembic), não pelo app.
Base = declarative_base()


def get_db():
    """Dependency do FastAPI: abre uma sessão por requisição e fecha no final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
