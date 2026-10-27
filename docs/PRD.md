# RoomMatch · PRD (documento vivo)

Atualizado a cada funcionalidade concluída (ver `CLAUDE.md`). O PRD original em PDF
(`docs/RoomMatch_PRD.pdf`) e os requisitos (`docs/requirements/`) são a base de conteúdo;
este arquivo registra o que foi de fato implementado.

## Funcionalidades

### Tags de convivência no detalhe do imóvel

**Status:** concluída.

**O que faz:** no detalhe do imóvel, todas as tags de convivência (Pet Friendly, Silêncio
Noturno etc.) aparecem com o mesmo fundo vermelho, em vez de só a primeira.

**Telas:** `frontend/pages/detalhe.html` (`detalhe.js`, classe `tag-destaque`).

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

### Perfil do usuário e troca de modo (KAN-33)

**Status:** concluída no backend, testada contra o ORM (SQLite em memória); falta validar
no Postgres/Supabase.

**O que faz:** o usuário logado vê e edita o próprio perfil, define suas tags de
convivência e preferências de busca, troca entre Morador (locatário) e Locador, e pode
excluir a conta.

**Endpoints** (contrato em `docs/frontend/papeis-e-rotas-api-v1.md`)
- `GET /me`: perfil no formato do front (`papel`, `papel_schema`, `foto_url`, `tags`,
  `orcamento_maximo`, `limiar_compatibilidade` e aliases `orcamento`/`limiar`).
- `PATCH /me`: altera só os campos enviados. `id` e `senha` nunca são aceitos.
- `DELETE /me`: exclui a conta.

**Regras de negócio**
- Papel: Locador se existe registro em `locadores`; senão Morador (locatário).
- Trocar o papel migra o registro no banco (`locatarios` ↔ `locadores`). O token só carrega
  o id; o papel é resolvido a cada requisição, então permissões antigas deixam de valer.
- Virar Locador pela primeira vez exige `cpf_cnpj` (422 sem ele; 409 se já cadastrado).
- Locador com anúncios não vira Morador (409); Morador com favoritos ou conversas não vira
  Locador (409). Nada é apagado nesses casos.
- E-mail é gravado em minúsculas e deve ser único (409).
- Tags: `usuario_tags` é a fonte; `usuarios.tags_convivencia` é mantida em sincronia.
- Orçamento e limiar só valem para Morador. Limiar fica em `preferencias_moradia`
  (ver KAN-35).
- Excluir conta com anúncios, favoritos ou conversas é recusado (409).

**Divergências e pendências**
- `genero`, `ocupacao`, `emprego` e `faculdade` são aceitos mas **não persistidos**: o banco
  não tem essas colunas (exigem migração Alembic). A resposta devolve vazio.
- Os dados de Locador exigem CPF/CNPJ, que o front ainda não coleta na troca de papel.

### Anúncios do locador e fotos (KAN-34)

**Status:** concluída no backend, testada contra o ORM (SQLite em memória); falta validar
no Postgres/Supabase e com o front em modo `live`.

**O que faz:** o locador publica, edita, pausa e remove anúncios (imóvel, endereço, post e
tags) e envia fotos. O anúncio publicado aparece no mural (KAN-35).

**Endpoints** (contrato em `docs/frontend/papeis-e-rotas-api-v1.md`; todos exigem Locador)
- `GET /imoveis/meus`: anúncios da conta, sem os removidos.
- `POST /imoveis`: publica. Aceita o que o formulário envia: `titulo`, `tipo`, `endereco`
  (texto livre "Rua X, 450 · Bairro"), `bairro`, `aluguel`, `condominio`, `iptu`, `contas`,
  `tags` e `classificacao`; também os campos estruturados (`rua`, `numero`, `cidade`,
  `estado`, `cep`, `latitude`, `longitude`), `descricao`, `area_m2`, `quartos`, `vagas`.
- `PATCH /imoveis/{id}`: edita só o que foi enviado; também `status_anuncio` (`ativo` ou
  `pausado`). Só o dono.
- `DELETE /imoveis/{id}`: remoção lógica (`status_anuncio = removido`). Só o dono.
- `POST /imoveis/{id}/fotos`: upload multipart, campo `fotos`. `DELETE
  /imoveis/{id}/fotos/{id_imagem}` remove uma. As respostas trazem `fotos` e `fotos_ids`.

**Regras de negócio**
- `aluguel` deve ser maior que 0; valores em branco (`""`) valem 0 em condomínio, IPTU e
  contas; no PATCH, `""` também zera o valor, como no mock.
- Endereço: rua e bairro são obrigatórios (422). Cidade e estado assumem Campinas/SP quando
  não informados, porque o produto só atende Campinas por enquanto.
- Remoção é lógica: preserva favoritos, conversas e visitas. Reduz o contador de anúncios
  do locador e marca o imóvel como indisponível.
- Fotos: JPEG, PNG ou WebP identificados pelo conteúdo do arquivo (não pelo Content-Type);
  até 5 MB cada e 10 por imóvel; falha em qualquer arquivo não grava nenhum.
- Pausar um anúncio o tira do mural, mas ele continua em `/imoveis/meus`.

**Divergências e pendências**
- `classificacao` (Mista/Masculina/Feminina) é aceita mas **não persistida**: não há coluna.
- Fotos ficam em disco local (`backend/uploads/`, servido em `/uploads`). Em produção
  (Supabase/hospedagem sem disco persistente) precisa migrar para storage em nuvem; a coluna
  `url_imagem` já aceita URL absoluta.
- `GET /imoveis` e `GET /imoveis/{id}` (leitura pública) continuam em `matches.py` (KAN-35).
  `/imoveis/meus` precisa ser registrado antes de `/imoveis/{id}`; há teste para isso.
- Seed dos dados fictícios: ver "Dados fictícios (KAN-30)" abaixo.
- Correção: `Imovel.endereco` era uma lista (o `uselist=False` estava só no lado
  `EnderecoImovel.imovel`); passou a ser um único objeto. Sem isso o mural quebrava no
  banco real.

### Dados fictícios (KAN-30)

**Status:** concluída no código e testada contra o ORM (SQLite em memória); **ainda não
executada no Postgres/Supabase**.

**O que faz:** popula o banco com um catálogo de demonstração igual ao do front, para as
telas e a afinidade funcionarem sem cadastro manual.

**Como rodar** (de dentro de `backend/`, com `.env` e `alembic upgrade head`)
- `python -m scripts.seed` (opções: `--senha`, ou variável `SEED_PASSWORD`).
- Se `DB_HOST` não for local (ex.: Supabase), exige `--confirmar-banco-remoto`.

**O que cria**
- 14 tags do catálogo do front (`frontend/js/tags-catalogo.js`).
- 8 usuários `@demo.com`: 2 locadores (`locador@demo.com`, `locador2@demo.com`), 3 moradores
  (`morador@demo.com`, `morador2@demo.com`, `morador3@demo.com`, com orçamento, limiar e
  tags) e 3 residentes sem perfil de busca.
- 4 anúncios com as fotos que já existem em `frontend/assets/imoveis/` (república Barão
  Geraldo, kitnet Cambuí, casa Sousas, suíte Taquaral), com endereço, tags, 4 fotos cada,
  moradores atuais e os mesmos preços totais do mock (850, 1200, 720, 980).
- 2 favoritos.

**Regras e decisões**
- Idempotente: cada registro é buscado pela chave natural e só criado se faltar; rodar de
  novo completa o que faltar sem duplicar nem sobrescrever edições.
- A senha dos usuários de demonstração não fica no repositório: vem de `--senha` ou
  `SEED_PASSWORD`; o padrão `demo12345` existe só para desenvolvimento.
- Fotos guardam o caminho relativo do front (`../assets/imoveis/{slug}/{n}.jpg`), como o
  mock.

**Pendências**
- Executar no banco real e conferir com o front em modo `live`.
- Só há fotos para 4 imóveis; mais anúncios exigem novos arquivos em `frontend/assets/`.
