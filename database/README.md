# Banco de dados

O banco é **PostgreSQL** (Supabase em produção). A fonte da verdade do schema são as
**migrações Alembic** em `backend/alembic/versions/`, geradas a partir dos models em
`backend/app/models/`.

| Arquivo | Para quê |
|---|---|
| `backend/alembic/versions/*.py` | Migrações. Aplicar: `cd backend && alembic upgrade head` |
| `database/schema.sql` | Schema completo em SQL, **gerado** das migrações, para consulta e para o dicionário de dados. Não edite à mão. |
| `docs/dicionario_de_dados_roommatch.xlsx` | Dicionário de dados do projeto |

Regenerar o `schema.sql` depois de uma migração nova:

```bash
cd backend
alembic upgrade head --sql > ../database/schema.sql
```

Mudança no banco = mudar o model **e** criar a migração:

```bash
cd backend
alembic revision --autogenerate -m "descreva a mudança"
# revise o arquivo gerado (dados existentes, RLS em tabelas novas) e então:
alembic upgrade head
```

Os antigos `database/schema/*.sql` (um arquivo por tabela) e `database/teste.py` foram
removidos: estavam desatualizados em relação às migrações (nomes de tabela no singular,
colunas que não existem mais).
