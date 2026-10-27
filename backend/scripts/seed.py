"""
Popula o banco com dados fictícios (KAN-30).

Rode de dentro de backend/, com o .env configurado e as migrações aplicadas
(`alembic upgrade head`):

    python -m scripts.seed
    python -m scripts.seed --senha minhasenha123
    python -m scripts.seed --confirmar-banco-remoto      # obrigatório se DB_HOST não for local

Pode ser executado várias vezes: não duplica registros. A senha dos usuários de demonstração
vem de --senha, da variável SEED_PASSWORD ou, na falta delas, de um padrão só para
desenvolvimento. Nunca use este script em produção com dados reais.
"""

import argparse
import os
import sys

from app.core.config import settings
from app.core.database import SessionLocal
from app.services import seed_service

SENHA_PADRAO_DEV = "demo12345"


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Popula o banco com dados fictícios.")
    parser.add_argument("--senha", default=os.environ.get("SEED_PASSWORD", SENHA_PADRAO_DEV))
    parser.add_argument(
        "--confirmar-banco-remoto",
        action="store_true",
        help="necessário quando DB_HOST não é localhost (ex.: Supabase)",
    )
    args = parser.parse_args(argv)

    if len(args.senha) < 8 or len(args.senha) > 72:
        print("A senha deve ter entre 8 e 72 caracteres.", file=sys.stderr)
        return 2

    print(f"Banco de destino: {settings.db_host}:{settings.db_port}/{settings.db_name}")
    if seed_service.banco_e_remoto(settings.db_host) and not args.confirmar_banco_remoto:
        print(
            "O banco não é local. Para inserir dados fictícios nele, rode de novo com "
            "--confirmar-banco-remoto.",
            file=sys.stderr,
        )
        return 1

    with SessionLocal() as db:
        try:
            resumo = seed_service.popular(db, args.senha)
        except Exception:
            db.rollback()
            raise

    print("Seed concluído:")
    for nome, quantidade in resumo.items():
        print(f"  {nome}: {quantidade}")
    print("Login de demonstração: morador@demo.com e locador@demo.com (senha: a informada).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
