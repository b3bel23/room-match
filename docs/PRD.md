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
- Locatário: Explorar, Favoritos, Mensagens, sino, Sair, foto.
  Locador: Meus anúncios, Publicar, Mensagens, sino, Sair, foto.
  (Descobrir e Visitas saíram do produto; ver "Removidos do produto".)
- O sino de notificações (RF17/RF35) fica antes do "Sair"; mostra a contagem de não lidas e
  abre a lista. Ver "Notificações no site".
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

### Detalhe do imóvel exige `?id=` (sem fallback Kitnet Cambuí)

**Status:** concluída.

**O que faz:** a tela de detalhe deixa de abrir sempre o anúncio demo
“Kitnet mobiliada · Cambuí” quando o `id` falta na URL. Sem `?id=`, mostra erro;
com `id`, carrega o imóvel correspondente (mock ou live).

**Regras de negócio e decisões**
- Removido o fallback `kitnet-cambui` em `detalhe.js` e no chat de `chrome.js`.
- O botão “Ver detalhes” dos favoritos passa a incluir `?id=` do imóvel.
- O HTML estático do detalhe usa placeholders neutros (“Carregando…”) em vez do
  copy da kitnet demo.

**Telas / arquivos:** `detalhe.html`, `detalhe.js`, `favoritos.js`,
`favoritos.html`, `chrome.js`.

### CPF no cadastro do Locador

**Status:** concluída.

**O que faz:** no fluxo Locador (`escolha-papel` → `cadastro.html?papel=locador`),
o formulário exibe o campo CPF obrigatório com máscara, valida 11/14 dígitos e
envia `cpf_cnpj` no `POST /auth/register`. O mock aplica a mesma exigência.

**Telas / arquivos:** `cadastro.html`, `cadastro.js`, `mock-api.js`.

### Afinidade e mural de imóveis (KAN-35)

**Status:** concluída. Validada em Postgres 16 e com o site em modo `live` (ver
"Integração ponta a ponta"). Falta só repetir no Supabase do projeto.

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
- `locatarios.limiar_compatibilidade` virou coluna (migração `9fe30732904e`), que copia o
  valor antigo de `preferencias_moradia` e o retira de lá. O servidor não lê mais o JSON.
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
- O teste anterior "pelo Supabase" chamava a API direto com formulário OAuth2; pelo site o
  login nunca tinha funcionado (ver "Login e cadastro no contrato do front").
- O mural agora também devolve `rua`, `numero`, `cep`, `estado`, `latitude`, `longitude`
  (usados pelo mapa), `badge`, `classificacao`, `status_anuncio` e `moradores_atuais` (RF23:
  primeiro nome, iniciais, ocupação ou faculdade e idade; sem contato).

### Transição entre telas

**Status:** concluída.

**O que faz:** as telas esmaecem ao sair e aparecem suavemente ao entrar.

**Regras de negócio e decisões**
- Ao voltar pelo histórico do navegador (botão Voltar do site ou do navegador), a tela
  restaurada volta visível; antes, ela voltava esmaecida e a página aparecia em branco.

**Telas:** todas as páginas (`frontend/js/page-motion.js`).

### Página "Como funciona" animada

**Status:** concluída. Sem ticket no Jira.

**O que faz:** a página "Como funciona" ganha movimento conforme a pessoa rola, sem perder
nenhum conteúdo. As fotos do topo e do fim ampliam devagar e se movem mais lentamente que a
página; títulos, cartões Morador/Locador, quadro de afinidade e regras entram em sequência; o
passo a passo abre e fecha deslizando, com uma linha que acompanha o passo aberto; o anel de
afinidade enche até o valor e o número conta a cada hábito ligado ou desligado.

**Regras de negócio e decisões**
- A fórmula de afinidade do exemplo não mudou: hábitos em comum ÷ hábitos do morador. Por
  isso, desligar um hábito que o anúncio também tem mantém 100%; o número só cai ao ligar um
  hábito que o anúncio não tem. Para deixar claro que o toque foi registrado, o anel pulsa a
  cada toque, mesmo quando a porcentagem fica igual.
- Com "reduzir movimento" ativado no sistema, ou sem JavaScript, não há animação: a página
  aparece completa de uma vez.
- O número que conta é só visual; o leitor de tela recebe apenas o valor final.
- Os números 1 a 4 do passo a passo, que ficavam cortados, agora aparecem.
- O fundo da página passou a ser um degradê único do topo ao fim; antes ele recomeçava a cada
  altura de tela e formava uma faixa mais escura no meio da rolagem.

**Telas:** `frontend/pages/como-funciona.html` (`frontend/css/como-funciona.css`,
`frontend/js/como-funciona.js`).

### Menu lateral das telas de conta

**Status:** concluída.

**O que faz:** o menu lateral das telas de Configurações lista os atalhos do papel do usuário.

**Regras de negócio e decisões**
- Locador: Perfil, Preferências, Meus anúncios, Mensagens, Segurança, Termos. "Publicar anúncio" saiu do menu lateral porque a tela Meus anúncios já tem o botão
  "Novo anúncio"; o atalho "Publicar" continua no menu do topo.
- Locatário: Perfil, Preferências, Favoritos, Mensagens, Segurança, Termos.

**Telas:** `frontend/js/config-shell.js` (usado em todas as telas com `aside.sidebar`).

### Mapa de rota no detalhe do imóvel (KAN-59)

**Status:** concluída. Mapa, busca, rotas a pé, de bicicleta, de carro e de ônibus (ver
"Rota de ônibus com GTFS").

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

- Botão "Ônibus" ligado ao servidor (antes desativado com "Em breve"), com campo "Saindo às".
- Morador pode salvar o destino ("Salvar … como meu destino"); ao abrir o mapa de novo, o
  destino salvo vira o padrão no lugar do Centro.
- `detalhe.html` carrega CSS e JS com número de versão (ver "Cache dos arquivos do site").

**Pendências:** os serviços públicos do OpenStreetMap têm limite de uso; com muito tráfego,
será preciso um servidor próprio.

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
- Orçamento e limiar só valem para Morador. Limiar fica em `locatarios.limiar_compatibilidade`.
- Excluir conta com anúncios, favoritos ou conversas é recusado (409).

- Foto de perfil é obrigatória: a tela de perfil só oferece "Trocar foto" (não há "Remover") e
  "Salvar perfil" é recusado se a conta ficar sem foto. Vale para Morador e Locador. Foi uma
  decisão do front; o servidor ainda aceita `foto_url` vazio em `PATCH /me`.

**Divergências e pendências**
- `genero`, `ocupacao`, `emprego` e `faculdade` agora são colunas de `usuarios` (migração
  `9fe30732904e`) e são gravados no cadastro e no `PATCH /me`.
- Troca de Morador para Locador: a tela de perfil mostra o campo CPF/CNPJ quando o tipo
  escolhido é Locador e a conta ainda não é; o servidor exige (422 sem ele).

### Botão Voltar nas telas de imóvel e de mensagens

**Status:** concluída.

**O que faz:** as telas de visualizar um imóvel têm um botão "← Voltar" que leva o usuário à
tela em que ele estava imediatamente antes (mural, favoritos, meus anúncios etc.).

**Regras de negócio e decisões**
- O botão usa o histórico do navegador; se a página foi aberta direto (link externo ou nova
  aba, sem tela anterior no site), ele leva à página inicial.
- Presente em: Detalhe do imóvel (visitante, morador e "ver como locador") e Mensagens (no topo da conversa, para morador e locador).
- Em Mensagens, sem tela anterior no site, o Voltar leva à página principal do papel: Explorar
  para o morador, Meus anúncios para o locador.
- O comportamento fica em `frontend/js/chrome.js` e é ativado pelo atributo `data-voltar`
  no link; outras telas podem usá-lo da mesma forma.

**Telas:** `frontend/pages/detalhe.html`, `frontend/pages/mensagens.html`.

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
- Remoção é lógica: preserva favoritos e conversas. Reduz o contador de anúncios
  do locador e marca o imóvel como indisponível.
- Fotos: JPEG, PNG ou WebP identificados pelo conteúdo do arquivo (não pelo Content-Type);
  até 5 MB cada e 10 por imóvel; falha em qualquer arquivo não grava nenhum.
- Pausar um anúncio o tira do mural, mas ele continua em `/imoveis/meus`.

**Divergências e pendências**
- `classificacao` (Mista/Masculina/Feminina) é gravada em `imoveis.classificacao` (padrão
  Mista; outro valor: 422) e volta no mural e no detalhe.
- Anúncio pausado: o detalhe (`GET /imoveis/{id}`) só abre para o dono; para os demais, 404.
- Fotos: `STORAGE_BACKEND=local` grava em `backend/uploads/` (servido em `/uploads`);
  `STORAGE_BACKEND=supabase` grava no bucket público do Supabase Storage e guarda a URL
  pública completa em `url_imagem` (ver "Deploy e configuração").
- `GET /imoveis` e `GET /imoveis/{id}` (leitura pública) continuam em `matches.py` (KAN-35).
  `/imoveis/meus` precisa ser registrado antes de `/imoveis/{id}`; há teste para isso.
- Seed dos dados fictícios: ver "Dados fictícios (KAN-30)" abaixo.
- Correção: `Imovel.endereco` era uma lista (o `uselist=False` estava só no lado
  `EnderecoImovel.imovel`); passou a ser um único objeto. Sem isso o mural quebrava no
  banco real.

### Meus anúncios do locador (tela)

**Status:** parcial. Lista os anúncios do locador; a publicação em si está em KAN-34.

**O que faz:** o locador vê seus anúncios e a contagem de anúncios ativos, cria um novo pelo
botão "Novo anúncio" no topo da tela e, em cada cartão, edita, abre o anúncio como locador ou
o exclui.

**Regras de negócio e decisões**
- Sem anúncios, a tela mostra só a mensagem "Você ainda não publicou nenhum imóvel."; o botão
  "Publicar anúncio" do estado vazio foi retirado por duplicar o "Novo anúncio" do topo.
- Ações do cartão: "Editar" (contorno verde) fica à vista; "Ver como locador" e
  "Excluir anúncio" ficam no menu "⋯" do cartão. Clicar no nome do imóvel também abre a visão
  de locador (`detalhe.html`).
- Excluir pede confirmação ("Você tem certeza que quer excluir este anúncio?") e não pode ser
  desfeito. Só o locador dono do anúncio exclui (`DELETE /imoveis/{id}`, já existente no
  servidor; resposta 204). Ao excluir, o anúncio some do mural e dos favoritos dos moradores.
- No modo de demonstração (mock), um anúncio de exemplo excluído não volta ao recarregar.

**Telas:** `frontend/pages/meus-imoveis.html`.

### Editar anúncio: fotos (tela do locador)

**Status:** concluída. Funciona no modo demonstração e com o servidor.

**O que faz:** na tela "Editar anúncio", o locador vê as fotos atuais do imóvel e adiciona
novas pelo quadrado "+" (várias de uma vez). As novas aparecem na hora e entram no anúncio
(a primeira foto continua sendo a capa) ao clicar em "Salvar".

**Regras de negócio e decisões**
- Só o locador dono do anúncio edita (mesma regra do `PATCH /imoveis/{id}`).
- No mock, as fotos novas são reduzidas (lado maior de 1200 px, JPEG) e guardadas no próprio
  anúncio; fotos enviadas pelo locador não são sobrescritas pelo catálogo de exemplo.
- Com o servidor, "Salvar" envia as fotos novas em `POST /imoveis/{id}/fotos` (multipart) e
  apaga as retiradas em `DELETE /imoveis/{id}/fotos/{id_imagem}`.
- Cada foto tem um botão "×" para remover. A tela aplica os limites do servidor: JPEG, PNG ou
  WebP, até 5 MB cada e 10 por anúncio (o "+" some ao chegar em 10).
- Fotos salvas no servidor (`/uploads/...`) são exibidas a partir do endereço da API.

**Telas:** `frontend/pages/editar-anuncio.html`.

### Dados fictícios (KAN-30)

**Status:** concluída. Executada em Postgres 16 local junto com as migrações; falta
rodar no Supabase do projeto.

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

### Login e cadastro no contrato do front

**Status:** concluída. Testada no ORM (SQLite) e em Postgres 16 local.

**O que faz:** o site entra e cria conta falando com o servidor de verdade. Antes, o login
do servidor só aceitava formulário OAuth2 (`username`/`password`) e o site manda JSON
(`email`/`senha`); todo login pelo site recebia 422. O cadastro só criava o usuário básico,
sem papel, tags, orçamento, limiar ou foto, e não devolvia token.

**Regras de negócio e decisões**
- `POST /auth/login` aceita JSON `{ email, senha }` (site) e também o formulário OAuth2
  (botão Authorize do `/docs`). Resposta: `{ access_token, token_type, user }`, com `user`
  no formato de `GET /me`. Credencial errada ou ausente: 401 "E-mail ou senha inválidos."
- `POST /auth/register` recebe o que `cadastro.js` envia e cria, na mesma transação, o
  usuário e o perfil do papel: Morador → `locatarios` (orçamento, limiar padrão 70, tags);
  Locador → `locadores`. Resposta 201 com `{ access_token, user }`, como o mock.
- Locador precisa de CPF/CNPJ no cadastro (422 sem ele; 409 se repetido). O cadastro do
  site mostra o campo **CPF *** só quando `?papel=locador` (máscara automática; aceita
  CPF 11 dígitos ou CNPJ 14). O mock espelha a mesma regra e grava `cpf_cnpj` no usuário.
- E-mail repetido: 409 (antes 400), igual ao mock.
- Senha mínima de 8 caracteres no site e no servidor (antes o site aceitava 6 e o servidor
  recusava com 422). As contas do modo demonstração continuam com `demo123`; as do seed do
  banco usam a senha passada ao seed (padrão `demo12345`).
- `usuarios.foto_perfil` passou de `varchar(255)` para `text` (migração `d82d87d32801`): o
  site envia a foto como data URL, que não cabia. Guardar a foto no banco é provisório; ver
  storage na seção de deploy.
- Erros 401 agora mostram a mensagem do servidor na tela de login (antes, "Não autenticado.").

**Endpoints:** `POST /api/v1/auth/login`, `POST /api/v1/auth/register`.
**Telas:** `login.html`, `cadastro.html`.

### Favoritos, chat e senha no servidor

**Status:** concluída no servidor e testada (SQLite e Postgres local). Antes só existiam no
modo demonstração; com o site ligado ao servidor, essas telas davam 404.

**Favoritos (RF25)** — `GET /favoritos` → `{ items, ids }`; `POST /favoritos/{id_imovel}`
liga/desliga (como o mock); `DELETE /favoritos/{id_imovel}` só desliga → `{ favorito, ids }`.
- Só Morador (403 para Locador). Usa a tabela `likes`. Anúncio pausado ou removido some da
  lista, mas o like fica guardado.

**Chat (RF27/RF34)** — `GET /conversas`, `GET /conversas/{id}`, `POST /conversas`
`{ imovel_id, texto? }`, `POST /conversas/{id}/mensagens` `{ texto }`.
- Só Morador abre conversa, e só se `match ≥ limiar` e `preço ≤ orçamento`; senão 403 com o
  motivo ("match 33% abaixo do limiar 70%; preço R$ 1000 acima do orçamento R$ 500").
- Uma conversa por morador e anúncio; abrir de novo devolve a mesma.
- Só os participantes (morador e locador do anúncio) leem e escrevem; para os demais, 404.
- Abrir a conversa marca como lidas as mensagens recebidas; a lista traz `nao_lidas`.
- O outro participante aparece só com nome, iniciais e foto: e-mail e telefone não vão no
  chat (RF36 prevê compartilhar contato só com consentimento).
- Mensagem vazia: 400; até 2000 caracteres; anúncio removido não recebe mensagens (409).
- Segurança no site: mensagens, títulos de anúncio, tags e nomes passam por escape antes de
  ir para a tela (antes, o texto de outra pessoa entrava como HTML).

**Senha** — `POST /me/senha` `{ senha_atual, senha_nova }`; `POST /auth/recuperar` `{ email }`;
`POST /auth/redefinir` `{ token, senha_nova }`.
- Recuperar sempre responde 200 com a mesma mensagem, exista ou não a conta.
- O link vai por e-mail (`SMTP_*` no `.env`; sem SMTP, o e-mail só aparece no log do
  servidor) e leva à nova tela `redefinir-senha.html`. Vale 30 minutos e uma única vez (deixa
  de valer quando a senha muda). Não serve como login.

**Telas:** `favoritos.html`, `detalhe.html`, `mensagens.html`, `seguranca.html`, `recuperar-senha.html`, `redefinir-senha.html` (nova).

### Integração ponta a ponta (site em modo `live` + API + Postgres)

**Status:** concluída em ambiente local (Postgres 16, API em `uvicorn`, site servido por HTTP,
Chrome headless). Falta repetir contra o Supabase e a API publicada.

**Como foi testado**
- Banco zerado → `alembic upgrade head` → `python -m scripts.seed`.
- `tests/e2e/fluxos_navegador.py` (Playwright) percorre no navegador, com o site em `live`:
  login de morador e locador, mural, favoritar, conversar com o locador (mensagem com HTML
  aparece como texto), preferências, locador lendo e respondendo,
  publicar anúncio com 3 fotos e classificação, editar removendo 1 foto e enviando 2, e o
  cadastro completo de Morador e de Locador. Resultado: todos os passos OK, nenhum erro de
  JavaScript e nenhuma resposta 4xx/5xx inesperada da API.
- `backend/tests/fumaca/test_fumaca_api.py` faz o mesmo percurso só pela API (inclui
  pausar e remover). Roda com `SMOKE_API_URL=...`; sem ela, é pulado.
- O modo demonstração (mock) foi varrido de novo: todas as telas abrem sem erro.

**Divergências encontradas e corrigidas**
- Publicar anúncio não enviava as fotos escolhidas (só contava quantas eram). Agora envia
  para `POST /imoveis/{id}/fotos` (no mock, ficam no anúncio) e cada foto tem "×" para remover.
- O card de trajeto mostrava "null min · null" quando não há destino calculado; agora mostra
  "Tempo até seu destino · Abra o mapa e escolha a faculdade ou o trabalho".
- Conversa aberta por link (`mensagens.html?id=1`) não era selecionada porque o ID da API é
  número e o da URL é texto; mesma correção na checagem de favorito.
- A lista de conversas não atualizava a última mensagem depois de enviar.

**Telas:** todas; em especial `publicar-imovel.html`, `detalhe.html`, `mensagens.html`.

### Rota de ônibus com GTFS (RF28, RF29, RF31; KAN-40)

**Status:** concluída no código e testada com feed GTFS sintético (testes e navegador). Falta
carregar o GTFS real da EMDEC/EMTU no servidor publicado.

**O que faz:** no mapa do detalhe, o modo "Ônibus" mostra a viagem que chega mais cedo:
caminhada até o ponto, linha, sentido, horário de embarque e desembarque, número de paradas,
baldeações e caminhada final, com o trajeto desenhado no mapa. O tempo calculado vai para o
card de trajeto e, se o destino estiver salvo, para o mural e para o "deslocamento médio".

**Regras de negócio e decisões**
- Algoritmo: Connection Scan Algorithm (`backend/app/services/mobilidade_service.py`) sobre os
  feeds em memória (`backend/app/utils/gtfs_loader.py`).
- Caminhada: até 1 km até o primeiro ponto e do último ponto ao destino
  (`GTFS_RAIO_CAMINHADA_M`), 4,3 km/h com fator de desvio 1,3 sobre a linha reta.
- Baldeação: a pé entre pontos a até 250 m; 1 min mínimo para trocar de ônibus no mesmo ponto.
- Só valem viagens cujo serviço roda no dia (`calendar.txt` + `calendar_dates.txt`);
  `frequencies.txt` é expandido em viagens. Dia padrão: hoje, ou o próximo dia útil no fim
  de semana. Hora padrão de saída: 07:30.
- Se andar for mais rápido, a resposta diz `somente_caminhada` e o site mostra "A pé é mais
  rápido".
- Vários feeds juntos (EMDEC + EMTU): `GTFS_PATHS` separado por vírgula; os IDs recebem
  prefixo por feed e a baldeação entre sistemas sai pelos pontos próximos.
- A rede carrega em segundo plano ao subir a API. Sem GTFS (ou carregando), a rota responde
  200 com `disponivel: false` e o motivo, e o site mostra a mensagem.
- Cache: cada cálculo com `imovel_id` é guardado em `rotas_mobilidade` (chave
  `lat,lng@hora`, tempo, distância, `detalhes`, `calculado_em`). O mural só lê o cache, para
  não calcular dezenas de rotas a cada carregamento.
- Destino salvo do Morador: `PATCH /me` com `destino: { nome, lat, lng }` (fica em
  `locatarios.preferencias_moradia.destino`); `GET /me` devolve `destino`.
- No modo demonstração (mock) não há horários: o modo Ônibus explica que precisa do servidor.

**Endpoints:** `GET /mobilidade/rota` (`destino_lat`, `destino_lng`, `destino_nome`,
`imovel_id`, `origem_lat`/`origem_lng` quando o imóvel não tem coordenadas, `hora`, `dia`);
`GET /mobilidade/status` (feeds, paradas e conexões carregados).

**Pendências**
- Obter o GTFS: a EMTU publica dados abertos (inclui as linhas metropolitanas da RMC); para as
  linhas municipais de Campinas, há o gerador comunitário `paulo-raca/emdec-gtfs`, que monta o
  feed a partir do site da EMDEC, ou pedir o arquivo à EMDEC. Ver README.
- Com feed grande, medir o tempo de cálculo contra a meta de 5 s (RNF12); o cache cobre as
  repetições.
- RF30 (vários destinos) fica para depois: hoje é um destino salvo.

### Notificações no site (RF17, RF35)

**Status:** concluída (servidor e tela). No mock, a lista vem vazia.

**O que faz:** o sino no menu mostra quantas notificações não lidas a pessoa tem e abre a lista;
cada aviso leva à tela certa. Atualiza a cada minuto com a aba aberta.

**Regras de negócio e decisões**
- Geram aviso: mensagem nova (para o outro participante; inclui a primeira mensagem de uma
  conversa nova) e favorito no anúncio (para o locador).
- O aviso é gravado na mesma transação da ação; não existe aviso de algo que falhou.
- Abrir um aviso marca como lido; "Marcar todas como lidas" zera a contagem. Ninguém marca
  avisos de outra pessoa.
- Notificação por e-mail (parte do RF35) fica para depois; o serviço de e-mail já existe.

**Endpoints:** `GET /notificacoes` (`items`, `nao_lidas`), `POST /notificacoes/lidas`
(`{ ids? }`). Tabela nova `notificacoes`.

### Confirmação de e-mail (RF02)

**Status:** concluída (servidor e tela).

**O que faz:** ao criar a conta, a pessoa recebe um link para confirmar o e-mail. O perfil
mostra se o e-mail está confirmado e tem "Reenviar link de confirmação". A tela
`verificar-email.html` confirma o link.

**Regras de negócio e decisões**
- Não bloqueia o uso no MVP: quem não confirmou continua usando o site.
- O link vale 7 dias e só para o e-mail atual da conta: trocar o e-mail no perfil desmarca a
  confirmação e envia um link novo; o link antigo deixa de valer.
- Os links de confirmação e de redefinição de senha não servem como login.
- As contas do seed já vêm confirmadas.

**Endpoints:** `POST /auth/verificar` (`{ token }`), `POST /me/verificacao`; `GET /me` traz
`email_verificado`.

**Migração:** `3654f88a6b5c` cria `recusas` e `notificacoes` (com RLS, como as demais) e
acrescenta `detalhes` e `calculado_em` em `rotas_mobilidade`. `recusas` saiu depois, na
`aca7d178206c` (ver "Removidos do produto").

### Deploy e configuração

**Status:** pronto para publicar; o deploy em si depende das credenciais do grupo (Render e
Supabase), que não estão no repositório.

**O que foi feito**
- `render.yaml` (Blueprint do Render) sobe a API a partir de `backend/`, roda
  `alembic upgrade head` a cada deploy e usa `/health` como checagem. `SECRET_KEY` é gerada
  pelo Render; banco, Supabase e SMTP são preenchidos no painel.
- Fotos em nuvem: `backend/app/services/storage_service.py` grava no Supabase Storage
  (`STORAGE_BACKEND=supabase`, bucket público `imoveis`) ou em disco (`local`, padrão). Falha
  do Storage no upload: 502 e nenhuma foto gravada.
- Site publicado aponta para a API por padrão quando `API_PRODUCAO` (topo de
  `frontend/js/api.js`) está preenchida; em localhost continua no modo demonstração.
  `?api=live` e `?api=mock` trocam o modo e guardam a escolha.
- CORS: o padrão já inclui `https://silverwying.github.io` e os servidores locais
  (5500 e 8765); outras origens em `CORS_ORIGINS`.
- Segurança: sem `SECRET_KEY`, a API usa uma chave aleatória só daquela execução e avisa no log
  (antes, os tokens seriam assinados com chave vazia).
- `.env.example` lista todas as variáveis, com instruções para o Supabase (pooler,
  `DB_SSLMODE=require`); `backend/requirements-dev.txt` traz pytest e httpx.
- README: banco PostgreSQL (não MySQL), testes com pytest e Playwright (não Jest), "Como
  executar" com os comandos reais, GTFS e deploy.
- `database/`: removidos `schema/*.sql` e `teste.py`, que divergiam das migrações; no lugar,
  `database/schema.sql` gerado pelo Alembic e `database/README.md`.

**Pendências**
- Criar o serviço no Render e o bucket `imoveis` (público) no Supabase; preencher
  `API_PRODUCAO` com a URL do serviço.
- Rodar `alembic upgrade head` e o seed no Supabase (o Render roda as migrações; o seed é
  manual, com `--confirmar-banco-remoto`).
- Rodar `tests/fumaca` contra a API publicada (`SMOKE_API_URL=...`).
- Configurar SMTP para os e-mails de recuperação de senha e confirmação.
- Foto de perfil continua guardada no banco como data URL; levar para o Storage também.
- Plano gratuito do Render dorme sem uso; a primeira requisição depois disso demora.

### Removidos do produto: Descobrir e visitas

**Status:** removidos a pedido do grupo (23/11).

**O que saiu**
- **Descobrir em cards** (curtir/recusar um imóvel por vez, desfazer e histórico; RF12–14 e
  RF18): tela `descobrir.html`, rotas `GET /descobrir`, `POST|DELETE /imoveis/{id}/recusar`,
  `GET /historico` e o filtro que escondia recusados do mural. A tabela `recusas` é apagada
  pela migração `aca7d178206c`. Favoritar continua igual.
- **Visitas** (agendar, calendário, confirmar/recusar/cancelar): telas `agendar-visita.html` e
  `calendario-visitas.html`, rotas `/visitas`, itens "Minhas visitas"/"Visitas" do menu e do
  menu de Configurações, botão "Agendar visita" no chat, botões "Visitas" e "Agenda de
  visitas" do locador e as notificações de visita.

**Decisões**
- A visita passa a ser combinada pelo chat. Os textos de Como funciona, FAQ, Termos e do aceite
  do cadastro foram ajustados para não prometer agendamento na plataforma.
- A tabela `visitas` continua no banco: ela existe desde a migração inicial e consta no
  dicionário de dados; apagá-la perderia dados já gravados. O model `Visita` fica, sem rotas.
- A tag de convivência "Visitas Restritas" continua: é uma preferência, não a função de agenda.

### Cache dos arquivos do site

**Status:** concluída.

Todas as páginas carregam CSS e JS com `?v=20261123`. Sem isso, o navegador podia misturar o
HTML novo com um JS antigo guardado em cache (por exemplo, o campo de CPF do cadastro do
Locador não aparecia). Ao mudar CSS ou JS, troque o número em todas as páginas (o
`detalhe.html` antes usava `?v=3`).
