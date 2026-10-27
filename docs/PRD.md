# RoomMatch · PRD (documento vivo)

Atualizado a cada funcionalidade concluída (ver `CLAUDE.md`). O PRD original em PDF
(`docs/RoomMatch_PRD.pdf`) e os requisitos (`docs/requirements/`) são a base de conteúdo;
este arquivo registra o que foi de fato implementado.

## Funcionalidades

### Afinidade e mural de imóveis (KAN-35)

**Status:** parcial. Código pronto e testado com banco falso; falta validar contra o
Postgres/Supabase e o front em modo `live`.

**O que faz:** o locatário vê o mural de imóveis com a % de afinidade entre as suas
tags de convivência e as tags de cada imóvel. O visitante vê o mural sem personalização.
Para o locatário, cada imóvel traz a elegibilidade para abrir chat.

**Regras de negócio**
- `match% = round(|tags do usuário ∩ tags do imóvel| / |tags do usuário| × 100)`.
- Zero tags em comum resulta em 0%; sem piso e sem teto artificiais.
- Visitante ou usuário sem tags: 0% (o banco não guarda `match_percent` de catálogo).
- Tags comparadas sem diferenciar caixa; aliases: "Vegano/Vegetariano" → "vegetariano",
  "Silêncio" → "silêncio noturno".
- Tags do imóvel: tabela `imovel_tags`. Tags do usuário, da mais específica para a mais
  genérica: `usuario_tags` → `locatarios.tags_estilo_vida` → `usuarios.tags_convivencia`.
- Chat liberado somente se `match ≥ limiar` **e** `preço ≤ orçamento` (papel locatário).
  Limiar ou orçamento ausentes (ou orçamento ≤ 0) não bloqueiam.
- `preco` é o custo total mensal: aluguel + condomínio + IPTU + contas extras.

**Endpoints** (contrato em `docs/frontend/papeis-e-rotas-api-v1.md`)
- `GET /imoveis`: mural; filtros `tipo`, `bairro` (ou `q`), `preco_max`, `tag`. Público;
  com token, devolve match e `elegibilidade`. Resposta `{ "items": [...] }`.
- `GET /imoveis/{id}`: detalhe (`capa`, `fotos[]`, `tags_correspondentes`, `elegibilidade`).
- `GET /stats`: `imoveis_ativos`, `match_medio` personalizado, `favoritos`, `meus_anuncios`,
  `conversas`.

**Decisões e divergências**
- `locatarios.limiar_compatibilidade` (usado pelo front) **não existe no banco**. Por ora o
  valor é lido de `locatarios.preferencias_moradia["limiar_compatibilidade"]`. Decidir se
  vira coluna (migração Alembic).
- `deslocamento_medio` devolve 0 até a integração GTFS (KAN-40).
- As rotas `GET /imoveis*` ficam em `api/v1/matches.py`. Quando o CRUD de imóvel (KAN-34)
  entrar em `imoveis.py`, não pode haver segunda rota `GET /imoveis`.
- O front chama `/api/v1/...`, mas `main.py` monta o `api_router` sem esse prefixo.

**Pendências**
- Testar contra o banco real e com o front em modo `live`.
- Seed (KAN-30) precisa popular `tags`, `imovel_tags` e `usuario_tags`; sem isso toda
  afinidade fica em 0%.
