# RoomMatch · PRD (documento vivo)

Atualizado a cada funcionalidade concluída (ver `CLAUDE.md`). O PRD original em PDF
(`docs/RoomMatch_PRD.pdf`) e os requisitos (`docs/requirements/`) são a base de conteúdo;
este arquivo registra o que foi de fato implementado.

## Funcionalidades

### Menu do usuário logado

**Status:** concluída.

**O que faz:** simplifica o menu do topo para quem está logado. Os links de navegação do
papel e o "Sair" ficam agrupados à esquerda da foto de perfil, e a foto fica no canto direito.

**Regras de negócio e decisões**
- Locatário: Explorar, Favoritos, Minhas visitas, Mensagens, Sair, foto.
  Locador: Meus anúncios, Publicar, Visitas, Mensagens, Sair, foto.
- "Sobre nós", "FAQ" e "Contato" saem do menu de quem está logado; continuam no menu do
  visitante e no rodapé de todas as páginas.
- "Sair" continua no menu, pois é o único ponto de saída da conta.

**Telas:** todas as páginas com o cabeçalho (`sessao.js` monta o menu; `chrome.js` só
completa o menu do visitante).

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
- O front chama `/api/v1/...`. **Corrigido:** `main.py` agora monta o `api_router` com
  `prefix="/api/v1"` (antes as rotas saíam sem prefixo e o front recebia 404). Os caminhos
  documentados acima (`/imoveis`, `/stats`, `/me`, `/auth/*`) passam a ser servidos em
  `/api/v1/...`. `/health` e `/uploads` continuam sem prefixo.
- O front usa o mock por padrão; para falar com o back é preciso
  `localStorage.setItem('roommatch-api-mode', 'live')`.

**Pendências**
- Testado contra o Supabase real pela API (cadastro, login, `/auth/me`, `/me`, `/imoveis`,
  `/stats`: tudo 200 e gravação confirmada em conexão nova). Falta testar pelo navegador com o
  front em modo `live` e o CRUD de imóveis (KAN-34) com locador.
- Seed (KAN-30) precisa popular `tags`, `imovel_tags` e `usuario_tags`; sem isso toda
  afinidade fica em 0%.

### Transição entre telas

**Status:** concluída.

**O que faz:** as telas esmaecem ao sair e aparecem suavemente ao entrar.

**Regras de negócio e decisões**
- Ao voltar pelo histórico do navegador (botão Voltar do site ou do navegador), a tela
  restaurada volta visível; antes, ela voltava esmaecida e a página aparecia em branco.

**Telas:** todas as páginas (`frontend/js/page-motion.js`).

### Menu lateral das telas de conta

**Status:** concluída.

**O que faz:** o menu lateral das telas de Configurações lista os atalhos do papel do usuário.

**Regras de negócio e decisões**
- Locador: Perfil, Preferências, Meus anúncios, Calendário de visitas, Mensagens, Segurança,
  Termos. "Publicar anúncio" saiu do menu lateral porque a tela Meus anúncios já tem o botão
  "Novo anúncio"; o atalho "Publicar" continua no menu do topo.
- Locatário: Perfil, Preferências, Favoritos, Calendário de visitas, Mensagens, Segurança, Termos.

**Telas:** `frontend/js/config-shell.js` (usado em todas as telas com `aside.sidebar`).

### Mapa de rota no detalhe do imóvel (KAN-59)

**Status:** parcial. Mapa, busca, rotas a pé, de bicicleta e de carro prontos; falta a rota de
ônibus.

**O que faz:** quem está logado vê, no detalhe do imóvel, o tempo e a distância até um destino
e abre um mapa no estilo do Google Maps: busca com sugestões enquanto digita, escolha do
destino clicando no mapa ou arrastando o marcador, rota a pé, de bicicleta ou de carro, rotas
alternativas, passo a passo e link para abrir a rota no site do OpenStreetMap.

**Regras de negócio e decisões**
- Visitante (sem login ou cadastro) vê o card de trajeto, mas com tempo e distância
  borrados e o botão "Ver rota no mapa" desativado; só usuário logado vê os valores e
  abre o mapa.
- Origem (marcador A): o próprio imóvel. Usa `latitude`/`longitude` do anúncio; sem elas,
  localiza o endereço (rua, número, bairro, cidade) no Nominatim e, se não achar, o bairro.
  Corrige a versão anterior, em que a origem era sempre o Cambuí para qualquer imóvel.
- Destino (marcador B): Centro de Campinas por padrão. O usuário troca pela busca (a partir
  de 3 letras aparecem até 5 sugestões, navegáveis pelo teclado; Enter usa a primeira), por
  um clique no mapa ou arrastando o B; o nome do ponto clicado vem do endereço mais próximo.
- Busca: Photon (OpenStreetMap, feito para sugestões), com Nominatim como reserva; só
  lugares do Brasil, com preferência pelos próximos ao imóvel.
- Se o texto digitado não achar nada, a busca tenta de novo tirando a última palavra
  ("puc campinas campus 1" → "puc campinas campus" → "puc campinas") antes de avisar que o
  lugar não foi encontrado.
- `detalhe.html` carrega `detalhe.css`, `detalhe.js` e `mapa-rota.js` com `?v=2`, para o
  navegador não usar a versão antiga guardada em cache.
- Rotas: OSRM dos servidores do OpenStreetMap (FOSSGIS), um por meio de transporte. A rota
  escolhida fica verde; alternativas ficam cinza e viram a principal ao serem clicadas.
- O resultado também atualiza o card de trajeto acima do mapa (tempo, destino, distância e
  meio de transporte).
- Tudo roda no navegador, sem chave de API e sem mudança no servidor.

**Telas:** `frontend/pages/detalhe.html` (`detalhe.js`, `mapa-rota.js`).

**Pendências:** rota de ônibus (integração EMDEC/EMTU, KAN-40). Os serviços públicos do
OpenStreetMap têm limite de uso; com muito tráfego, será preciso um servidor próprio.

### Publicar anúncio (tela do locador)

**Status:** parcial. Tela e envio prontos; a persistência real depende do CRUD de anúncios (KAN-34).

**O que faz:** o locador preenche o formulário de novo anúncio (título, tipo, endereço, valores,
fotos, classificação e tags) e o publica.

**Regras de negócio e decisões**
- O botão "Publicar anúncio" fica no fim do formulário, depois de todos os campos, e não mais
  no topo da página; o envio só ocorre com os campos obrigatórios válidos.
- Botão "← Voltar" no topo da página leva à tela anterior; se o locador abriu a página
  direto (sem histórico do site), leva a "Meus anúncios".

**Telas:** `frontend/pages/publicar-imovel.html`.

### Tela "Conta criada" (pós-cadastro)

**Status:** concluída.

**O que faz:** logo após o cadastro, mostra que a conta foi criada com sucesso e, depois de
8 segundos, leva o usuário automaticamente à página principal do seu papel.

**Regras de negócio e decisões**
- Morador vai para o Explorar (`home.html`); Locador vai para Meus anúncios
  (`meus-imoveis.html`). O papel vem de `?papel=` (enviado pelo cadastro) ou da sessão.
- Uma contagem ("Você será levado ao Explorar em 8 segundos.") e uma barra de progresso
  mostram quanto falta.
- Um único botão, "Ir agora para o Explorar" / "Ir agora para Meus anúncios", permite ir na
  hora e serve de reserva se o redirecionamento automático falhar. Os dois botões antigos,
  que levavam ao mesmo lugar, foram retirados, assim como a nota extra do locador.
- O redirecionamento usa `location.replace`: o botão Voltar do navegador não retorna a esta
  tela.

**Telas:** `frontend/pages/conta-criada.html` (`conta-criada.js`, `conta-criada.css`).

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

- Foto de perfil é obrigatória: a tela de perfil só oferece "Trocar foto" (não há "Remover") e
  "Salvar perfil" é recusado se a conta ficar sem foto. Vale para Morador e Locador. Foi uma
  decisão do front; o servidor ainda aceita `foto_url` vazio em `PATCH /me`.

**Divergências e pendências**
- `genero`, `ocupacao`, `emprego` e `faculdade` são aceitos mas **não persistidos**: o banco
  não tem essas colunas (exigem migração Alembic). A resposta devolve vazio.
- Os dados de Locador exigem CPF/CNPJ, que o front ainda não coleta na troca de papel.

### Botão Voltar nas telas de imóvel e de mensagens

**Status:** concluída.

**O que faz:** as telas de visualizar um imóvel têm um botão "← Voltar" que leva o usuário à
tela em que ele estava imediatamente antes (mural, favoritos, meus anúncios etc.).

**Regras de negócio e decisões**
- O botão usa o histórico do navegador; se a página foi aberta direto (link externo ou nova
  aba, sem tela anterior no site), ele leva à página inicial.
- Presente em: Detalhe do imóvel (visitante, morador e "ver como locador"), Agendar visita e
  Mensagens (no topo da conversa, para morador e locador).
- Em Mensagens, sem tela anterior no site, o Voltar leva à página principal do papel: Explorar
  para o morador, Meus anúncios para o locador.
- O comportamento fica em `frontend/js/chrome.js` e é ativado pelo atributo `data-voltar`
  no link; outras telas podem usá-lo da mesma forma.

**Telas:** `frontend/pages/detalhe.html`, `frontend/pages/agendar-visita.html`,
`frontend/pages/mensagens.html`.

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

### Meus anúncios do locador (tela)

**Status:** parcial. Lista os anúncios do locador; a publicação em si está em KAN-34.

**O que faz:** o locador vê seus anúncios e a contagem de anúncios ativos, cria um novo pelo
botão "Novo anúncio" no topo da tela e, em cada cartão, vê as visitas, edita, abre o anúncio
como locador ou o exclui.

**Regras de negócio e decisões**
- Sem anúncios, a tela mostra só a mensagem "Você ainda não publicou nenhum imóvel."; o botão
  "Publicar anúncio" do estado vazio foi retirado por duplicar o "Novo anúncio" do topo.
- Ações do cartão: "Visitas" e "Editar" (contorno verde) ficam à vista; "Ver como locador" e
  "Excluir anúncio" ficam no menu "⋯" do cartão. Clicar no nome do imóvel também abre a visão
  de locador (`detalhe.html`).
- Excluir pede confirmação ("Você tem certeza que quer excluir este anúncio?") e não pode ser
  desfeito. Só o locador dono do anúncio exclui (`DELETE /imoveis/{id}`, já existente no
  servidor; resposta 204). Ao excluir, o anúncio some do mural e dos favoritos dos moradores e
  as visitas agendadas dele são removidas.
- No modo de demonstração (mock), um anúncio de exemplo excluído não volta ao recarregar.

**Telas:** `frontend/pages/meus-imoveis.html`.

### Editar anúncio: fotos (tela do locador)

**Status:** parcial. Adicionar fotos funciona na tela e no modo de demonstração (mock); falta
ligar ao `POST /imoveis/{id}/fotos` do servidor e permitir remover fotos.

**O que faz:** na tela "Editar anúncio", o locador vê as fotos atuais do imóvel e adiciona
novas pelo quadrado "+" (várias de uma vez). As novas aparecem na hora e entram no anúncio
(a primeira foto continua sendo a capa) ao clicar em "Salvar".

**Regras de negócio e decisões**
- Só o locador dono do anúncio edita (mesma regra do `PATCH /imoveis/{id}`).
- No mock, as fotos novas são reduzidas (lado maior de 1200 px, JPEG) e guardadas no próprio
  anúncio; fotos enviadas pelo locador não são sobrescritas pelo catálogo de exemplo.
- Divergência: o contrato do servidor prevê upload multipart em `POST /imoveis/{id}/fotos`
  (JPEG/PNG/WebP, até 5 MB, 10 por imóvel); o front ainda não aplica esses limites.

**Telas:** `frontend/pages/editar-anuncio.html`.

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
