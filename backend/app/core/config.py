from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

ENV_FILE = Path(__file__).resolve().parents[3] / ".env"

class Settings(BaseSettings):
    app_name: str = "RoomMatch API"

    # Divergência: README cita MySQL, mas o repositório já migrou para PostgreSQL (commit aaa5320).
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "postgres"
    db_password: str = ""
    db_name: str = "roommatch"
    # "require" para bancos na nuvem (ex.: Supabase); "prefer" funciona no PostgreSQL local.
    db_sslmode: str = "prefer"

    # Defina SECRET_KEY no .env (nunca commitar valor real).
    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    cors_origins: str = "http://localhost:5500,http://127.0.0.1:5500"

    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    @property
    def database_url(self) -> URL:
        # URL.create escapa caracteres especiais da senha (@, #, / etc.).
        return URL.create(
            "postgresql+psycopg2",
            username=self.db_user,
            password=self.db_password,
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
            query={"sslmode": self.db_sslmode},
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

settings = Settings()
