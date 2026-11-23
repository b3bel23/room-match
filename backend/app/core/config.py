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

    # Origens do site que podem chamar a API (vírgula). Inclui o GitHub Pages do projeto e os
    # servidores locais mais usados (Live Server 5500, python -m http.server 8765).
    cors_origins: str = (
        "https://silverwying.github.io,"
        "http://localhost:5500,http://127.0.0.1:5500,http://localhost:8765,http://127.0.0.1:8765"
    )

    # Endereço público do site (links nos e-mails de recuperação e verificação).
    frontend_url: str = "http://127.0.0.1:5500/frontend/pages"
    # E-mail: sem SMTP_HOST, os e-mails só vão para o log (desenvolvimento).
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "RoomMatch <nao-responda@roommatch.app>"
    # Fotos dos anúncios: "local" (backend/uploads) ou "supabase" (Supabase Storage).
    storage_backend: str = "local"
    supabase_url: str = ""  # https://<projeto>.supabase.co
    supabase_service_key: str = ""  # chave service_role (só no servidor, nunca no site)
    supabase_bucket: str = "imoveis"
    # Horários de ônibus: um ou mais feeds GTFS (.zip ou pasta), separados por vírgula.
    gtfs_paths: str = ""
    # Maior caminhada aceita até o primeiro ponto e do último ponto ao destino.
    gtfs_raio_caminhada_m: int = 1000
    # Validade do link de redefinição de senha.
    reset_token_expire_minutes: int = 30

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

if not settings.secret_key:
    # Sem SECRET_KEY os tokens seriam assinados com chave vazia (qualquer um forjaria um
    # login). Gera uma chave só desta execução: funciona, mas todos saem ao reiniciar.
    import logging
    import secrets

    settings.secret_key = secrets.token_urlsafe(48)
    logging.getLogger("roommatch").warning(
        "SECRET_KEY não definida: usando uma chave temporária. Defina SECRET_KEY no .env."
    )
