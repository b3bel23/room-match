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

### Tags de convivência — catálogo e conflitos

**Status:** concluída (front + validação no save).

**O que faz:** adesão e restrição vêm de um catálogo ampliado (sem coluna nova; nomes em
`tags`). Pares opostos se **auto-desmarcam** na UI (ex.: Aberto a Festas × Sem Festas;
Aceita Animais × Sem Animais). No save, o servidor também remove conflitos (`sem_conflitos`).
Cada tag mostra um **significado curto** na UI. Removidas: `Sem Casais`, `Rotina Matinal`,
`Cannabis ok` / `420 Friendly` (nada ilegal no catálogo). Nomes em português (com alias
de dados antigos): `Pet Friendly` → `Aceita Animais`, `Home Office` → `Trabalho em Casa`,
`Sem Pets` → `Sem Animais`, `LGBTQIA+ Safe` → `LGBTQIA+ Acolhedor`,
`Aceita Casais` → `Casais Bem-vindos`.

**Telas:** cadastro, preferências, publicar/editar anúncio.

### Tags de convivência no detalhe do imóvel

**Status:** concluída.

**O que faz:** no detalhe do imóvel, todas as tags de convivência (Aceita Animais, Silêncio
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

**Decisão (24/11):** o banco guarda **só dígitos** (sem máscara), para não duplicar
`104.525.336-77` vs `10452533677`. A máscara continua só na UI.

**Telas / arquivos:** `cadastro.html`, `cadastro.js`, `mock-api.js`, `utils/documento.py`.

### Cadastro: campos opcionais + foto no Storage

**Status:** concluída.

- Cadastro exige `data_nascimento`, `cidade_atual` e `ocupacao` (além de nome, e-mail,
  telefone, gênero, foto e senha). `bio`, `emprego` e `faculdade` seguem opcionais;
  Morador ainda envia `raio_busca_km` quando informado.
- Ordem da etapa 1: nome → e-mail + telefone → CPF (Locador) → gênero → nascimento +
  cidade → ocupação → emprego → faculdade → bio → foto → senha.
- Tags do Morador sincronizam `usuario_tags`, `tags_convivencia` e a coluna legada
  `locatarios.tags_estilo_vida`. Tags **não** têm mínimo/máximo na UI: no schema são
  opcionais (`RegistroIn.tags = []`, anúncio `tags` opcional). Só o que é NOT NULL /
  required no banco fica obrigatório no formulário (ex.: orçamento do Morador).
- Foto de perfil em data URL é convertida e gravada no Storage (`perfis/{id}/…`); o
  banco fica só com a URL pública (não o base64). Anúncio: **mínimo 3 fotos**, máximo 10
  (`MAX_FOTOS` no backend) — regra de produto na UI (publicar e editar).

### Orçamento mensal em formato brasileiro (cadastro)

**Status:** concluída.

**O que faz:** o campo de orçamento máximo mensal no cadastro mostra valores com
separador de milhar e vírgula decimal (`1.200,00`, `10.000,00`), com dica
explicando mil vs dez mil.

**Telas / arquivos:** `cadastro.html`, `cadastro.js`, `cadastro.css`.

### Performance do mural com Supabase remoto

**Status:** concluída (parcial quanto à região do banco).

**O que faz:** reduz a lentidão do `GET /imoveis` e telas ligadas quando o Postgres
está no pooler remoto (RTT alto). Sem modo mock no fluxo padrão: só API live.

**Regras / decisões**
- Carga eager (`selectinload`/`joinedload`) de imóvel, endereço e fotos; moradores
  só no detalhe (mural não lista moradores).
- Cache em memória TTL ~20s para mural/stats; invalida ao criar/editar/remover/fotos.
- Stats sem carregar fotos (só ids + tags + counts).
- Pool SQLAlchemy (`pool_size=5`, `pool_recycle=280`, `pool_pre_ping`); `/health`
  cache 30s; `GZipMiddleware`.
- Front: `modoPadrao = live`; home em `Promise.all`; sino atrasa 800ms.
- Limite restante: latência geográfica (`us-west-2`).

**Arquivos:** `mural_service.py`, `matches.py`, `imovel_service.py`, `contexto.py`,
`cache_resposta.py`, `database.py`, `main.py`, `home.js`, `api.js`, `sessao.js`.

### Afinidade e mural de imóveis (KAN-35)

**Status:** concluída. Validada em Postgres 16 e com o site em modo `live` (ver
"Integração ponta a ponta"). Falta só repetir no Supabase do projeto.

**O que faz:** o locatário vê o mural de imóveis com a % de afinidade entre as suas
tags de convivência e as tags de cada imóvel. O visitante vê o mural sem personalização.
Para o locatário, cada imóvel traz a elegibilidade para abrir chat.

**Regras de negócio**
- Só entram tags **marcadas do catálogo** (adesão + restrição). Comodidades, aliases
  resolvidos para o canônico, e texto fora do catálogo **não** entram no %.
- **Não marcar = neutro**. Tags a mais no anúncio **não baixam** o %.
- **Adesão** (“o que combina”): ponto se o anúncio também tem (ou equivalente,
  ex. Vegano cobre Vegetariano). Senão 0 naquela tag.
- **Restrição** (“meus limites”): ponto se o anúncio **não conflita**; silêncio no
  anúncio = ok. Explicitar a mesma restrição também vale. Deixar desmarcado ≠ rejeitar.
- **Conflito duro** (pares do catálogo, ex. Aceita Animais × Sem Animais): a tag
  vale 0 e o % final é limitado a **35%** (abaixo do limiar típico de chat).
- `match% = round(100 × pontos / |tags_catálogo_do_morador|)` com a semântica acima
  (não é mais um simples ∩ / |morador| cego à restrição).
- Aliases legados no banco (`Pet Friendly`, `Home Office`, `LGBTQIA+ Safe`) são
  canonicizados no match e no seed (`_canonicalizar_tags_legado`).
- UI (cadastro, Preferências, Como funciona) deixa essa regra explícita e recomenda
  **marcar 3 ou mais** hábitos (não é mínimo obrigatório).
- Hábitos no Explorar (filtro) e Preferências/cadastro/anúncio mostram **ícone + texto**;
  seleção com transição suave (respeita `prefers-reduced-motion`).
- Ocupação e situação de emprego (cadastro/perfil): **duas colunas** no BD
  (`usuarios.ocupacao`, `usuarios.emprego`) sem migração. UI sem duplicar significado:
  ocupação = papel/área (estudante, CBO…); emprego = vínculo (CLT, estágio, sem
  vínculo…). Estágio e aposentadoria só em emprego; `ocupacao=estagiario` legado
  normaliza para `estudante`. Chips + “Mais opções”; `<select>` oculto envia os
  mesmos valores da API.
- Faculdade (cadastro/perfil): **caixa de busca** (nome/sigla/campus) + atalhos
  Nenhuma / Outra em SP; lista filtrável; mesmos valores estáveis do catálogo SP.
- **Comodidades** (Wi-Fi, Ar-condicionado, Mobiliado, etc.) **não entram** no match.
- Sem tags de catálogo no perfil: 0% em live (mock pode usar `seed_match`).
- Teto artificial **só** no conflito duro (35%); sem piso mínimo.
- Aliases canônicos no match (ex. Pet Friendly → Aceita Animais; Vegano cobre Vegetariano).
- Tags do imóvel: tabela `imovel_tags` (convivência + comodidades no mesmo vínculo;
  a API separa em `tags` e `comodidades` na resposta). Tags do usuário, da mais
  específica para a mais genérica: `usuario_tags` → `locatarios.tags_estilo_vida` →
  `usuarios.tags_convivencia` (só convivência, via `filtrar_convivencia`).
- Chat liberado somente se `match ≥ limiar` **e** `preço ≤ orçamento` (papel locatário).
  Limiar ou orçamento ausentes (ou orçamento ≤ 0) não bloqueiam.
- `preco` é o custo total mensal: aluguel + condomínio + IPTU + contas extras.

**Endpoints** (contrato em `docs/frontend/papeis-e-rotas-api-v1.md`)
- `GET /imoveis`: mural; filtros `tipo`, `bairro` (ou `q`), `preco_max`, `tag`.
  No Explorar, hábitos são **multi-seleção** (caixa com checkboxes); `tag` aceita várias
  separadas por vírgula e o mural exige **todas** (AND). Pares incompatíveis
  **auto-desmarcam** (mesmo catálogo do cadastro/preferências). Busca por texto no painel.
  Público;
- `GET /imoveis/locais?q=`: bairros e cidades **já cadastrados** nos anúncios ativos
  (autocomplete do campo “Bairro ou cidade” no Explorar). Sem inventar locais novos.

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
- Endereço público é **aproximado** (estilo Airbnb): `rua · bairro`, sem número/CEP; coordenadas
  arredondadas (~100 m). Número/CEP e pin exato só para o **dono** (`endereco_exato: true` em
  Meus anúncios / detalhe do próprio anúncio).
- O mural também devolve `rua`, `estado`, `latitude`, `longitude` (e `numero`/`cep` só se exato)
  (usados pelo mapa), `badge`, `classificacao`, `status_anuncio`.
- Detalhe **não** lista moradores atuais (privacidade): mostra só o perfil da moradia
  (`imoveis.classificacao`: Mista / Feminina / Masculina) e se é compartilhada/individual.
  **Mista** = homem ou mulher (ou ambos). Feminina/Masculina = só aquele gênero. Texto do
  anúncio e `classificacao` precisam bater (ex.: kitnet “homem ou mulher” → Mista).
  pelo tipo do anúncio. `moradores_atuais` fica vazio na API do detalhe.

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
8 segundos, leva o usuário automaticamente à ação principal do seu papel.

**Regras de negócio e decisões**
- Morador vai para o Explorar (`home.html`); Locador é convidado a publicar o primeiro
  anúncio (`publicar-imovel.html`) — não cria o anúncio no cadastro e não cai no mural.
- O papel vem de `?papel=` (enviado pelo cadastro) ou da sessão.
- Contagem + barra de progresso; botão "Ir agora para o Explorar" / "Publicar meu primeiro
  anúncio".
- O redirecionamento usa `location.replace`: o botão Voltar do navegador não retorna a esta
  tela.

**Telas:** `frontend/pages/conta-criada.html` (`conta-criada.js`, `conta-criada.css`).

### Cadastro personalizado por papel (Morador × Locador)

**Status:** concluída (UI; schema do banco inalterado).

**O que faz:** o mesmo formulário adapta textos e campos conforme `?papel=`. Orçamento máximo
e limiar de compatibilidade aparecem **só no Morador**. No Locador, a etapa 2 fala de estilo
e regras da casa; o preço entra depois, no anúncio.

**Regras de negócio e decisões**
- Campos obrigatórios do banco seguem iguais: Locador continua com CPF/CNPJ; Morador com
  `orcamento_maximo` / `limiar_compatibilidade` no `locatarios`.
- O payload de Locador **não envia** orçamento/limiar (o backend já só os grava para Morador).
- Preferências (`preferencias.html`) espelham a etapa 2 do cadastro: Locador vê
  *O que a casa oferece* + *Regras da casa* (sem orçamento/limiar/destino); Morador
  vê adesão + restrição com orçamento/limiar/destino. Comodidades **não** entram
  em Preferências — só no anúncio.

**Telas:** `cadastro.html`, `cadastro.js`, `preferencias.html` / `preferencias.js`,
`conta-criada.js`.

### Comodidades do anúncio × tags de convivência

**Status:** concluída (schema intacto).

**O que faz:** separa infraestrutura do imóvel (Wi-Fi, garagem, mobiliado…) das tags
de convivência usadas no match. Locador publica/edita os dois blocos; no detalhe,
`tags` = convivência e `comodidades` = infra. Preferências/cadastro só tratam convivência.

**Regras**
- Catálogo único: `frontend/js/tags-catalogo.js` + `backend/app/services/tags_catalogo.py`.
- Persistência: convivência + comodidades em `imovel_tags` (mesma tabela). Sem coluna nova.
- `POST/PATCH` aceitam `tags` e `comodidades`; o servidor mescla ao gravar. No PATCH,
  se só um lado vier, o outro já gravado é preservado.
- Match e `tags_correspondentes` ignoram comodidades. Perfil do usuário também.

**Telas / endpoints:** `publicar-imovel`, `editar-anuncio`, `preferencias`, `detalhe`;
resposta de `GET /imoveis` e `GET /imoveis/{id}` com `tags` + `comodidades`.

### Verificadores de telefone, e-mail e CEP

**Status:** concluída (front + backend).

**O que faz:** cadastro, perfil e anúncio só aceitam contato/endereço em formato
brasileiro válido — com feedback na tela e rejeição no servidor.

**Regras de negócio e decisões**
- **Telefone:** DDD ANATEL, 10/11 dígitos, celular com 9 após o DDD; rejeita
  fictícios (99999-9999, sequências). Obrigatório no cadastro e no `PATCH /me`.
  Front: `telefone-ui.js` (`RoomMatchTelefone`). Backend: `app/utils/contato.py`.
- **E-mail:** formato rigoroso (`nome@dominio.tld`), minúsculas; rejeita `..`,
  domínio incompleto etc. Front: `email-ui.js`. Backend: `normalizar_email` (além
  do `EmailStr` do Pydantic).
- **CEP:** 8 dígitos, rejeita sequência repetida; ViaCEP preenche rua/bairro/
  cidade/UF. Front: `cep-ui.js`. Backend: `validar_cep` em `resolver_endereco`.
- Mock espelha as mesmas regras (422).

**Telas:** cadastro, perfil, publicar anúncio.

### Verificação rigorosa de foto de perfil

**Status:** concluída (front).

**O que faz:** no cadastro e no perfil, a foto só é aceita se for um retrato individual
de pessoa em boas condições — um rosto nítido, de frente, bem iluminado e enquadrado.

**Regras de negócio e decisões**
- Motor principal: BlazeFace (TensorFlow.js via CDN); `FaceDetector` nativo só como reserva.
- Exatamente **1** rosto; vários rostos → rejeita (sem foto de grupo).
- Confiança BlazeFace ≥ **0,88**; abaixo disso → rejeita (rosto fraco / borrado / oblíquo).
- Geometria: área do rosto ≥ 10% da imagem; largura ≥ 22% da largura; centro na faixa
  22–78%; aspecto do box entre 0,55 e 1,45; margem mínima nas bordas (evita corte de
  testa/queixo).
- Arquivo: JPG/PNG, ≤ 5 MB, lado mínimo **400×400**, proporção entre 0,45 e 2,2
  (retrato/quase quadrado; rejeita faixas panorâmicas).
- Mensagens de erro orientam o usuário (sem grupo, sem filtro pesado, sem óculos escuros
  ou máscara, luz boa, de frente).
- A verificação roda **antes** de gravar; cadastro/perfil usam `RoomMatchFaceCheck`.

**Telas / arquivos:** `frontend/js/face-check.js`, `cadastro.html`/`cadastro.js`,
`perfil.html`/`perfil.js`, aquecimento via `chrome.js`.

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
- **Sleep de papel (sem coluna nova):** a conta pode ter linhas em `locatarios` **e**
  `locadores` ao mesmo tempo. O papel ativo fica em
  `locatarios.preferencias_moradia.papel_ativo` (`Morador`|`Locador`, JSONB).
  - Morador→Locador: cria/mantém `locadores`; **não apaga** `locatarios` — favoritos e
    conversas dormem e voltam ao reativar Morador.
  - Locador→Morador: 409 se ainda há anúncio não removido; senão reativa Morador e o
    CPF/perfil de Locador permanece dormindo (não precisa reenviar CPF).
  - Preferências de busca (orçamento, limiar, destinos, modo) só leem/gravam com
    papel Morador ativo; no Locador a API as omite (0/vazio) sem apagar no banco.
- UI Perfil: cards Morador/Locador; o painel explica sleep (não pede cancelar
  favoritos/conversas na mão).

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

**Anti-duplicata (24/11):** publicar o mesmo título+endereço em menos de 2 minutos
reutiliza o anúncio já criado (lock por locador). No front, clique duplo fica travado e, se
só o upload de fotos falhar, o retry não cria outro anúncio. Cópias já gravadas de
“Quarto em república · Paulínia” foram removidas logicamente (ficou só o mais recente).

**Descrição do anúncio:** o campo `descricao` já existia em `posts`/`imoveis` (nullable) —
sem migração. Foi exposto em Publicar e Editar; o detalhe já exibia. O anúncio Paulínia
recebeu texto e 4 fotos novas em alta qualidade no Storage.


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
- 8 usuários `@demo.com` com perfil completo (schema `usuarios`): nome, telefone realista,
  gênero, ocupação/emprego (CBO), faculdade, cidade, data de nascimento, bio e foto de
  perfil. Papéis: 2 locadores, 3 moradores (orçamento, limiar, destino, tags) e 3
  residentes nos imóveis. Fotos em `frontend/assets/perfis/` e no Storage
  (`perfis/demo/{slug}.jpg`).
- 4 anúncios com as fotos que já existem em `frontend/assets/imoveis/` (república Barão
  Geraldo, kitnet Cambuí, casa Sousas, suíte Taquaral), com endereço, tags, 4 fotos cada,
  moradores atuais e os mesmos preços totais do mock (850, 1200, 720, 980).
- 2 favoritos.

**Regras e decisões**
- Idempotente: cada registro é buscado pela chave natural e só criado se faltar; o re-seed
  de usuários demo **alinha** bio/tags/foto/perfil ao catálogo (sem inventar colunas).
- A senha dos usuários de demonstração não fica no repositório: vem de `--senha` ou
  `SEED_PASSWORD`; o padrão `demo12345` existe só para desenvolvimento.
- Fotos de imóvel: caminho relativo do front (`../assets/imoveis/{slug}/{n}.jpg`) ou URL
  pública do Storage. Fotos de perfil: URL do Storage (live) ou
  `../assets/perfis/perfil-*.jpg` (mock).

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
- E-mail ou CPF/CNPJ já cadastrado: **409**, conta **não** é criada. Mensagem:
  “já está cadastrado… Se achar que é um erro, contate o suporte pela página Contato.”
  No front, o 409 oferece abrir `contato.html`. Race de unicidade no banco também vira 409
  (IntegrityError → mesma mensagem).
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

### Arquivar conversas (pasta Arquivadas)

**Status:** concluída.

**O que faz:** em Mensagens, o botão Arquivar move a conversa para a aba **Arquivadas**
(sem apagar). Dá para desarquivar e voltar às Ativas. Feedback com link “Ver arquivadas”.

**Regras**
- Schema: coluna existente `conversas.status_conversa` (`ativa` | `arquivada`).
- `GET /conversas` (padrão) = só ativas; `?arquivadas_apenas=true` = só arquivadas;
  `?incluir_arquivadas=true` = todas.
- `PATCH /conversas/{id}` `{ status_conversa }`.

**Telas:** `mensagens.html` / `mensagens.js` (abas Ativas | Arquivadas).

### Favoritos, chat e senha no servidor

**Status:** concluída no servidor e testada (SQLite e Postgres local). Antes só existiam no
modo demonstração; com o site ligado ao servidor, essas telas davam 404.

**Favoritos (RF25)** — `GET /favoritos` → `{ items, ids }`; `POST /favoritos/{id_imovel}`
liga/desliga (como o mock); `DELETE /favoritos/{id_imovel}` só desliga → `{ favorito, ids }`.
- Só Morador (403 para Locador). Usa a tabela `likes`. Anúncio pausado ou removido some da
  lista, mas o like fica guardado.

**Chat (RF27/RF34)** — `GET /conversas`, `GET /conversas/{id}`, `POST /conversas`
`{ imovel_id, texto? }`, `POST /conversas/{id}/mensagens` `{ texto }`,
`POST /conversas/{id}/lidas`, `PATCH /conversas/{id}` `{ status_conversa }`.
- Só Morador abre conversa, e só se `match ≥ limiar` e `preço ≤ orçamento`; senão 403 com o
  motivo ("match 33% abaixo do limiar 70%; preço R$ 1000 acima do orçamento R$ 500").
- Uma conversa por morador e anúncio; abrir de novo devolve a mesma.
- Só os participantes (morador e locador do anúncio) leem e escrevem; para os demais, 404.
- Abrir a conversa **ou** `POST …/lidas` marca como lidas as mensagens recebidas e as
  notificações daquele thread; a lista traz `nao_lidas` (badge na UI).
- Lista/topo do chat: foto do outro, `match_percent` (mesma fórmula do mural) e troca
  instantânea (cache local + destaque ativo); no mobile, lista e thread em telas
  separadas com “← Conversas”.
- `status_conversa` (`ativa` | `arquivada`) usa a coluna já existente — arquivar some da
  lista padrão; `?incluir_arquivadas=true` lista tudo. Reabrir/enviar desarquiva.
- O outro participante aparece só com nome, iniciais e foto: e-mail e telefone não vão no
  chat (RF36 prevê compartilhar contato só com consentimento).
- Mensagem vazia: 400; até 2000 caracteres; anúncio removido não recebe mensagens (409).
- Segurança no site: mensagens, títulos de anúncio, tags e nomes passam por escape antes de
  ir para a tela (antes, o texto de outra pessoa entrava como HTML).
- Estado vazio (sem conversas): o painel lateral não mostra foto/botão “Ver anúncio” soltos.
  Locador vê convite para **Meus anúncios** (pode ter vários) e publicar outro; Morador, para
  o mural e favoritos. Com conversa aberta, o painel mostra só o anúncio daquela conversa.
- Chat bloqueado no detalhe: botão curto (“Conversa indisponível”) + aviso amigável com o
  motivo (afinidade abaixo do limiar e/ou preço acima do orçamento) e link para Preferências.

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

**Status:** concluída. Feed RMC em `backend/data/gtfs/rmc-emdec-emtu.zip` (corredores
Campinas + Paulínia / EMDEC+EMTU) gerado por `python -m scripts.gerar_gtfs_rmc`. Sem
`GTFS_PATHS`, a API carrega automaticamente os `.zip` de `data/gtfs/`.

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
  `lat,lng@hora`, tempo, distância, `detalhes`, `fonte`, `calculado_em`). O mural/`stats`
  leem a chave da hora mural `07:30` (ou `destino.hora`). Toda rota bem-sucedida também
  grava essa chave mural, para o card “X min · PUC” aparecer mesmo se o usuário calculou
  em outro horário.
- Destinos do Morador (até 3): lugares de **interesse** — `tipo` `trabalho` | `faculdade` |
  `outro` (+ `nome`; em `outro` o título é personalizado). `PATCH /me` com
  `destinos: [{ nome, lat, lng, tipo? }, …]` → `preferencias_moradia.destinos` (JSONB;
  schema intacto). Espelha `destino` = primeiro. Ao salvar, aquece `rotas_mobilidade`.
- Meio de transporte padrão: `PATCH /me` com `modo_transporte` (`foot` | `bike` | `car` |
  `bus`) → `preferencias_moradia.modo_transporte` (JSONB; **sem coluna nova**). Padrão
  `foot`. Gravação de destinos/modo faz **commit antes** de aquecer `rotas_mobilidade`
  (GTFS lento não impede o transporte de salvar). O Explorar usa esse meio nos tempos;
  ônibus lê `rotas_mobilidade`; a pé / bike / carro usam estimativa pelas coordenadas
  do anúncio. O mapa do detalhe abre nesse modo e ainda permite trocar.
- Mural (Explorar): por destino, **só o meio padrão** (`modo_transporte`) — ex.
  `62 min de carro`. A API ainda pode enviar `tempos_modos` (a pé/bike/carro/ônibus);
  o card do Explorar usa só o preferido. Sem endereço completo do Photon.
- Filtro Explorar **Tempo máximo**: slider (10–90 min; 90+ = sem teto) + meio
  (a pé/bike/carro/ônibus). Filtra no front pelo 1º destino (`tempos_modos` ou
  `deslocamento_min`). Meio inicial = `modo_transporte` do perfil.
- Hero Campinas (mural, login, recuperar/redefinir/verificar e-mail, Como funciona):
  mesmo carrossel de fotos + degradê com movimento suave (`prefers-reduced-motion`
  desliga animação).
- Preferências: tipo → buscar lugar → (Outro: título) → adicionar; seletor de transporte
  padrão. Destinos legados **sem** `tipo` não aparecem como “Outro”: badge “Definir tipo”
  (clique cicla trabalho/faculdade/outro); nomes óbvios (PUC, UNICAMP…) sugerem
  `faculdade` ao carregar. Ao sair com mudanças pendentes, diálogo oferece salvar /
  descartar / continuar. **Não** é salvar anúncio como destino; o mapa do detalhe
  só explora rota.
- Seed demo: destinos tipados; imóveis com lat/lng e rotas aquecidas.
- Anúncios ativos (Campinas + Paulínia) com descrições longas, CEP, área m², classificação
  alinhada ao texto, tags de comodidade (Wi-Fi, Ar-condicionado, Mobiliado) e 4 fotos
  realistas por anúncio no Storage (e assets locais dos seeds).
- Sem destino: mural convida a definir trabalho/faculdade em Preferências; Locador sem campo.
- No modo demonstração (mock) não há horários: o modo Ônibus explica que precisa do servidor.

**Endpoints:** `GET /mobilidade/rota` (`destino_lat`, `destino_lng`, `destino_nome`,
`imovel_id`, `origem_lat`/`origem_lng` quando o imóvel não tem coordenadas, `hora`, `dia`,
`ancora=partida|chegada`); `GET /mobilidade/status` (feeds, paradas e conexões carregados).

**UI ônibus (mapa do detalhe)**
- Painel de horário: dia da semana (Seg–Dom → próxima data), âncora **Saída às** /
  **Chegada às**, presets + input de hora selecionável. A rota GTFS só carrega ao
  clicar em **Calcular rota**. Resultado destaca o horário inverso (chegada→saída ou
  saída→chegada), linhas usadas e trajeto no mapa.
- `ancora=chegada`: backend busca a última saída que ainda chega até `hora` (janela GTFS).
- Roteador: penalidade por embarque (evita 3 baldeações “mais rápidas” que 1 linha
  direta); caminhada longa **não** se vende como “melhor que ônibus”; snap de
  origem/destino até ~2,8 km da rede. Feed RMC cobre **PUC Campus I (Barão)**,
  **Campus Central** e **Campus II (Av. John Boyd Dunlop)** + linha EMDEC **361**
  (Terminal ↔ Campus II); Paulínia → Campus II usa baldeação EMTU **650** + 361.
  Destinos conhecidos no mapa (Campus II ≠ Campus I) alinham o geocode ao GTFS.
- Resumo em card: tempo grande, chips (dia / âncora / Sai / Chega / baldeação / a pé),
  badges de linha com cor própria; legenda sob o mapa.
- Mapa: cada linha de ônibus com cor distinta; trechos a pé em tracejado cinza.
- Passos: badge colorido da linha + horários + meta (paradas/distância); abre automaticamente.
- Schema intacto: só enriquece o JSON de `/mobilidade/rota` (`linhas`, `ponto_embarque`,
  `distancia_ponto_m`, `papel` nos trechos a pé, `ancora`, `hora_alvo`).

**Pendências**
- Trocar o feed RMC pelo ZIP oficial quando a EMDEC/EMTU publicar URL estável (mesmo
  `GTFS_PATHS`).
- Com feed grande, medir o tempo de cálculo contra a meta de 5 s (RNF12); o cache cobre as
  repetições.
- RF30: até **3 destinos** (trabalho / faculdade / outro+título) em Preferências.
  Mural/`deslocamentos[]` mostra tempo até cada um (rótulo curto + `tipo`); campos
  legados = 1º. `modo_transporte` no mesmo JSONB.

### Denúncias (moderação)

**Status:** concluída (servidor + botões no chat e no detalhe).

**O que faz:** usuário logado denuncia pessoa (chat) ou anúncio (detalhe). A denúncia
é gravada na tabela já existente `denuncias` e a equipe recebe e-mail
(`MODERACAO_EMAIL` ou `SMTP_FROM`). Sem SMTP, o aviso vai para o log do servidor.

**Regras**
- Motivos: assédio, golpe/fraude, conteúdo inadequado, spam, anúncio falso, outro.
- Exige `usuario_id`, `imovel_id` ou `conversa_id`. Não dá para denunciar a si mesmo.
- Schema intacto: colunas `motivo`, `descricao`, `status_denuncia=pendente`, FKs.
- Após denunciar no chat: opção **Também bloquear** (usa o fluxo de bloqueio abaixo).

**Endpoints:** `POST /denuncias`, `GET /denuncias/motivos`.
**Telas:** `mensagens.html` (Denunciar), `detalhe.html` (Denunciar), `denuncia-ui.js`.

### Bloqueio de contato (reuso de `denuncias`)

**Status:** concluída (sem migração).

**O que faz:** bloquear corta o chat nos dois sentidos. Quem bloqueia vê **Desbloquear**
(fácil de desfazer). Quem foi bloqueado vê a outra pessoa como **Indisponível**.

**Regras / schema**
- Mesma tabela `denuncias`: `motivo=bloqueio_contato`, `status_denuncia=ativo|revogado`.
- Desfazer = `revogado` (pode bloquear de novo). Não envia e-mail de moderação.
- Enforcement em `POST /conversas` e `POST /conversas/{id}/mensagens` (403).

**Endpoints:** `GET/POST /bloqueios`, `DELETE /bloqueios/{usuario_id}`.
**Telas:** `mensagens.html` (Bloquear/Desbloquear + checkbox na denúncia).

### Notificações no site (RF17, RF35)

**Status:** concluída (servidor e tela). No mock, a lista vem vazia.

**O que faz:** o sino no menu mostra quantas notificações não lidas a pessoa tem e abre a lista;
cada aviso leva à tela certa. Atualiza a cada minuto com a aba aberta.

**Regras de negócio e decisões**
- Geram aviso: mensagem nova (para o outro participante; inclui a primeira mensagem de uma
  conversa nova) e favorito no anúncio (para o locador).
- O aviso é gravado na mesma transação da ação; não existe aviso de algo que falhou.
- **Sem mudar schema:** mensagens do mesmo `link` (mesma conversa) fazem upsert da
  notificação não lida — uma linha por pessoa/thread. O GET agrupa e devolve `foto_url`,
  `nome`, `iniciais`, `nao_lidas` (msgs não lidas) e `ids` para marcar o grupo.
- Favorito: link `meus-imoveis.html?de={id}` para foto do autor; upsert por remetente.
- Sino: avatar + última mensagem + badge vermelho com a quantidade; "Marcar todas como
  lidas" zera. Abrir um item marca os `ids` do grupo.
- Notificação por e-mail (parte do RF35) fica para depois; o serviço de e-mail já existe.

**Endpoints:** `GET /notificacoes` (`items` enriquecidos, `nao_lidas`), `POST /notificacoes/lidas`
(`{ ids? }`). Tabela `notificacoes` (inalterada).

### Confirmação de e-mail (RF02)

**Status:** concluída (servidor e tela) — **só com SMTP**.

**O que faz:** com `SMTP_HOST` (e demais `SMTP_*` + `FRONTEND_URL`), ao criar a conta a
pessoa recebe um link; o perfil mostra status e “Reenviar link”. Sem SMTP: a conta já
nasce confirmada, o perfil **não** mostra reenviar, e recuperar senha avisa
indisponível (não promete e-mail que não chega).

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

Todas as páginas carregam CSS e JS com `?v=20261124` (ou superior). Sem isso, o navegador
podia misturar o HTML novo com um JS antigo guardado em cache (por exemplo, o campo de CPF
do cadastro do Locador não aparecia). Ao mudar CSS ou JS, troque o número em todas as
páginas.

### Carregamento e transições fluidas

**Status:** concluída.

**O que faz:** em qualquer espera da API ou navegação entre telas, a pessoa vê feedback visual
contínuo — overlay de página, skeleton no mural, estado inline em listas e botões ocupados —
em vez de tela “travada”.

**Regras de negócio e decisões**
- Overlay global (`RoomMatchLoading` em `frontend/js/loading-ui.js`): usado em login, cadastro,
  perfil, preferências, publicar/editar anúncio, detalhe (favorito), mensagens (enviar,
  marcar como lida, arquivar, bloquear), denúncia, sino (marcar notificações como lidas),
  exclusão de anúncio, abrir conversa e cálculo de ônibus. Regra: **toda espera de API**
  mostra loading (overlay e/ou botão ocupado). O centro é o **logo animado**
  (`assets/logo-animado.svg`) em loop (ondas mint → âmbar → coral + “respiração”); % e
  barra leve ficam abaixo. Splash de entrada (1× por aba em `page-motion.js`) toca o loop
  ao entrar no site. Respeita `prefers-reduced-motion`.
- Login mantém overlay até abrir a home/meus anúncios; no mural logado, overlay
  “Carregando afinidade e mural…” + shimmer em afinidade média / deslocamento / imóveis.
- Mural (`home`) e listas (favoritos, meus anúncios, chat) usam skeleton ou inline enquanto
  buscam dados live.
- Transição entre páginas (`page-motion.js`): fade de saída + overlay “Abrindo…”; ao voltar
  pelo histórico (bfcache) a página reaparece e o overlay some.
- Respeita `prefers-reduced-motion`.
- Continua **sem mock** no fluxo do produto: o loading só cobre a espera real da API.

**Telas:** todas as páginas HTML com `loading-ui.js` + `page-motion.js`; fluxos async em
`home`, `detalhe`, `favoritos`, `meus-imoveis`, `mensagens`, `login`, `cadastro`, `perfil`,
`preferencias`, `publicar-imovel`, `editar-anuncio`, `seguranca`, mapa de rota.
