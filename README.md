<div align="center">

  <!-- Adicione a logo do RoomMatch quando estiver pronta -->
  <!-- <img src="./assets/roommatch-logo.png" alt="RoomMatch" height="90"/> -->

  <h1>🏠 RoomMatch</h1>

  <h3>Plataforma de Matching para Moradia Compartilhada no Brasil</h3>

  <p>
    <img src="https://img.shields.io/badge/Status-Em%20Desenvolvimento-F59E0B?style=for-the-badge"/>
    <img src="https://img.shields.io/badge/Plataforma-Web-2563EB?style=for-the-badge"/>
    <img src="https://img.shields.io/badge/Banco-Relacional-4479A1?style=for-the-badge"/>
    <img src="https://img.shields.io/badge/OpenStreetMap-7EBC6F?style=for-the-badge&logo=openstreetmap&logoColor=white"/>
  </p>

  <p>
    <img src="https://img.shields.io/badge/ODS%203-Sa%C3%BAde%20e%20Bem--Estar-FD9D24?style=for-the-badge"/>
    <img src="https://img.shields.io/badge/ODS%2010-Redu%C3%A7%C3%A3o%20das%20Desigualdades-FD9D24?style=for-the-badge"/>
    <img src="https://img.shields.io/badge/ODS%2011-Cidades%20e%20Comunidades%20Sustentáveis-FD9D24?style=for-the-badge"/>
  </p>

  <br/>

  <sub>
    Projeto Integrador Extensionista · PUC-Campinas · 2026<br/>
    Ciência de Dados e Inteligência Artificial
  </sub>

</div>

---

## 📌 Sobre o Projeto

Encontrar uma moradia acessível próxima ao local de estudo ou trabalho é um desafio para jovens que chegam à Região Metropolitana de Campinas (RMC) — especialmente estudantes, estagiários e trabalhadores em início de carreira sem renda para arcar com um imóvel sozinhos.

Além do valor do aluguel, dividir uma residência envolve fatores como **hábitos, rotina, estilo de vida, localização, custos adicionais e compatibilidade entre moradores**. Hoje essa busca acontece de forma fragmentada — grupos de WhatsApp, indicações informais, cálculos manuais de rota — o que gera perda de tempo, insegurança contra anúncios falsos e desistências de vagas de estudo por falta de moradia compatível.

O **RoomMatch** é uma plataforma web que conecta pessoas interessadas em **quartos, kitnets e moradias compartilhadas** com usuários de perfis de convivência compatíveis, combinando três dimensões ao mesmo tempo:

- 🤝 **Afinidade de convivência**
- 💰 **Custo total e transparente da moradia**
- 🗺️ **Tempo de deslocamento até o local de estudo ou trabalho**

A plataforma também pretende orientar os usuários sobre **programas de auxílio-moradia e permanência estudantil** disponíveis, como recurso complementar ao MVP.

---

## 🎯 Público-Alvo e Setor

O RoomMatch é direcionado principalmente a:

- 🎓 Estudantes universitários sem renda própria para morar sozinhos
- 💼 Estagiários e jovens trabalhadores recém-chegados à região
- 🏠 Pessoas procurando moradia compartilhada compatível com seu estilo de vida
- 🔑 Moradores ou proprietários com quartos e vagas disponíveis

| Dimensão | Definição |
|---|---|
| 📍 Recorte geográfico | Região Metropolitana de Campinas (RMC) |
| 🏛️ Setor de impacto | **Terceiro Setor** — iniciativa de caráter social e extensionista |
| ⚠️ Problema central | Dificuldade de jovens estudantes e trabalhadores encontrarem moradia compartilhada com estilo de vida compatível na RMC |
| 😟 Consequência principal | Desistência de vaga na universidade por falta de moradia na região, ou aceitação de moradia incompatível por necessidade |

---

## 🌎 ODS — Impacto Sustentável

O projeto está associado a três Objetivos de Desenvolvimento Sustentável:

| ODS | Foco | Relação com o RoomMatch |
|---|---|---|
| 🏙️ **ODS 11** — Cidades e Comunidades Sustentáveis | Meta 11.1: acesso de todos à habitação segura, adequada e a preço acessível | Eixo principal do projeto: aproxima pessoas de opções de moradia mais acessíveis e bem localizadas |
| ⚖️ **ODS 10** — Redução das Desigualdades | Inclusão social e econômica | Reduz barreiras de acesso à moradia para quem chega à RMC sem rede de contatos ou renda para morar sozinho |
| 💚 **ODS 3** — Saúde e Bem-Estar | Bem-estar psicológico e segurança | Diminui a ansiedade e insegurança de morar com desconhecidos incompatíveis, por meio do matching de convivência |

### Tipos de impacto gerado

- 🤝 **Social** — facilita o acesso à moradia compartilhada e reduz o medo de golpes/incompatibilidade
- 💰 **Econômico** — reduz custos por meio do compartilhamento de despesas com rateio transparente
- 🎓 **Educacional** — apoia estudantes na busca por moradia e programas de permanência estudantil

---

## 🧭 Entendimento do Problema (UX Research)

| Ferramenta | Principal achado |
|---|---|
| 🧩 **Matriz de Definição do Problema** | O problema afeta sobretudo estudantes sem renda para morar sozinhos e sem conhecimento prévio da região; a consequência mais grave é a desistência da vaga universitária por falta de moradia compatível |
| ❤️ **Mapa de Empatia** | Usuário sente frustração e medo de golpes; ouve alertas de amigos sobre "perrengues" de moradia; vê anúncios desorganizados em grupos de WhatsApp/Facebook; sua maior dor é o processo fragmentado (um grupo pro imóvel, outro pro colega de quarto, outro app pra rota) |
| 🔍 **SWOT** | Força: diferenciação por matching social + rateio com dados abertos (GTFS). Fraqueza: dependência de massa crítica de usuários para efeito de rede. Oportunidade: parcerias com faculdades e polos tecnológicos da RMC. Ameaça: necessidade de rigor no tratamento de dados pessoais (LGPD) |

---

## ✨ Funcionalidades

### 👤 Cadastro e Perfil

- Cadastro e autenticação de usuários
- Recuperação de senha
- Definição de orçamento máximo mensal
- Cadastro de ocupação e instituição/empresa
- Upload de fotos
- Edição e exclusão da conta
- Seleção de preferências de convivência

Entre as tags disponíveis poderão estar:

`Pet Friendly` · `420 Friendly` · `Vegetariano/Vegano` · `Silêncio Noturno` · `LGBTQIA+ Safe` · `Home Office/Estudo Intensivo` · `Sem Festas/Social Moderado`

---

### 💚 Matching por Afinidade — CardSwipe

O sistema apresenta perfis e imóveis em uma interface de cards no modelo swipe, seguindo um **modelo figurativo com limiar mínimo**:

- 📏 O usuário define sua própria régua de corte (ex.: mínimo de 70% de compatibilidade) para habilitar o envio/recebimento de mensagens
- ⚡ O match **não depende de "dupla curtida"** — funciona como um indicador técnico de afinidade entre hábitos do perfil e as regras da vaga
- 🚀 Ao atingir o limiar de compatibilidade **e** o teto orçamentário, o chat interno é liberado diretamente para contato
- ❤️ / ❌ Curtir ou recusar perfil/imóvel
- 🔎 Filtros por preferências de convivência
- 📜 Histórico de curtidas e matches
- 🚫 Denúncia e bloqueio de perfis

**Exemplo de simulação:** perfil com 85% de afinidade calculada, limiar do usuário em 70% (aprovado), tags em comum (Silêncio, Home Office, Pet Friendly) e orçamento dentro do limite → chat habilitado automaticamente.

---

### 🏠 Mural de Vagas e Imóveis

Moradores atuais e proprietários poderão publicar quartos, kitnets, vagas em repúblicas e casas compartilhadas. Cada anúncio segue o princípio de **transparência total de custos** (inspirado no Booking.com):

- 📸 Fotos do imóvel
- 💵 Aluguel + 🏢 Condomínio + 🧾 IPTU + 💡 Estimativa de contas — detalhados diretamente no card, sem taxas ocultas
- 👥 Perfil dos moradores atuais
- 🏷️ Tags de convivência
- 📍 Localização
- 📊 Badge de percentual de afinidade

A plataforma também permite: busca por bairro, filtro por preço/tipo/tags, favoritar anúncios e comparar até **3 imóveis lado a lado** (grade multicritério: afinidade, orçamento e tempo de rota).

---

### 🗺️ Mobilidade Urbana (Roteirizador GTFS)

Um dos principais diferenciais do RoomMatch é considerar o deslocamento entre a moradia e os destinos frequentes do usuário (faculdade, trabalho, curso, estágio), com **cálculo automático de tempo e rotas de transporte público ou a pé**.

- 🚶 Trajeto a pé · 🚌 Transporte público · 📏 Distância · ⏱️ Tempo estimado · 🗺️ Visualização em mapa
- Integração com dados públicos abertos **GTFS** da **EMDEC** e **EMTU**
- Meta de desempenho: cálculo de rota em até 5 segundos, com cache de rotas frequentes

---

### 💬 Chat & Comparador

Após o match ou interesse em um imóvel, os usuários utilizam um sistema interno de comunicação:

- 💬 Chat direto habilitado automaticamente ao atingir o limiar de compatibilidade
- 🔔 Notificações de novas mensagens e novos matches
- 🏠 Atualizações sobre anúncios favoritados
- 📱 Compartilhamento de telefone/WhatsApp mediante consentimento mútuo
- ⚖️ Tabela comparativa de até 3 anúncios favoritados (preço total, tempo de rota, tags em comum)

---

### 🧮 Simulador de Auxílios Habitacionais — *Bônus Futuro (Pós-MVP)*

> Funcionalidade reservada para expansão após a entrega do MVP essencial.

O RoomMatch pretende cruzar dados socioeconômicos com bolsas de permanência e critérios de programas de apoio habitacional, exibindo informações e direcionando o usuário à fonte oficial.

> ⚠️ A simulação terá caráter exclusivamente orientativo e não substituirá a análise oficial realizada pelos órgãos responsáveis.

---

### 🛡️ Administração e Moderação

- Remoção de perfis inadequados e anúncios denunciados
- Moderação de conteúdo e registro de ações administrativas
- Indicadores de uso: número de matches, anúncios ativos, bairros com maior demanda

---

## 🧠 Como funciona o Matching

```text
                    ┌─────────────────────┐
                    │      Usuário        │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      🤝 Convivência       💰 Orçamento      🗺️ Mobilidade (GTFS)
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                 ┌───────────────────────────┐
                 │ % de Afinidade Calculada  │
                 │  vs. Limiar do Usuário    │
                 └─────────────┬─────────────┘
                               ▼
                  🏠 Chat liberado + ranking de
                     matches mais compatíveis
```

Uma opção mais barata não é necessariamente a melhor caso tenha baixa compatibilidade de convivência ou deslocamento muito elevado.

---

## 🖥️ Escopo do MVP vs. Roadmap Futuro

| Módulo / Funcionalidade | Classificação | Detalhamento |
|---|---|---|
| Matching por Limiar de Compatibilidade | 🟢 **MVP Essencial** | Algoritmo de % de afinidade por tags de convivência e liberação direta de mensagens |
| Mural de Vagas & Rateio Transparente | 🟢 **MVP Essencial** | Exibição aberta de aluguel + condomínio + IPTU + estimativa de contas, sem taxas ocultas |
| Roteirizador de Mobilidade Urbana (GTFS) | 🟢 **MVP Essencial** | Cálculo de tempo até o destino usando dados públicos GTFS (EMDEC/EMTU) |
| Chat Interno & Comparador Lado a Lado | 🟢 **MVP Essencial** | Troca de mensagens diretas e tabela comparativa de até 3 anúncios favoritados |
| Simulador de Auxílios Sociais/Habitacionais | 🟡 **Bônus Futuro (Pós-MVP)** | Cruzamento socioeconômico com bolsas de permanência — reservado para expansões futuras |

> 💡 O simulador de auxílios ficou fora do escopo inicial para garantir uma entrega ágil e consistente do MVP.

O sitemap funcional prevê **10 telas principais**, cobrindo desde onboarding em etapas até o painel administrativo, detalhadas no requisito funcional do projeto (38 RF + 20 RNF, distribuídos em 7 módulos, com priorização MoSCoW).

---

## 🎨 Identidade Visual

### Conceito da marca

O isotipo do RoomMatch nasceu da **desconstrução tipográfica** da própria marca: fusão geométrica das letras **"o" (room)** e **"a" (match)** por meio de um laço contínuo com haste de ancoragem central, simbolizando o ponto de encontro entre moradores. Curvas com sorrisos sutis nos arcos reforçam acolhimento, transparência e convivência leve.

### Paleta de cores

| Papel | Nome | Hex | Uso |
|---|---|---|---|
| 🟢 Primária | Menthe | `#5EA38F` | Símbolo principal, CTAs primários, indicadores de afinidade |
| 🟠 Secundária | Nectarine | `#FBB050` | Ponte central, destaques visuais, alertas amigáveis |
| 🔴 Acento | Salmão | `#F08070` | Interações sociais, tags ativas, engajamento na busca |
| ⚫ Fundo | Slate Charcoal | `#141D22` | Fundo escuro de alto contraste, conforto visual |

### Tipografia

| Uso | Fonte | Justificativa |
|---|---|---|
| Marca & Títulos | **Comfortaa** | Geometria arredondada — transmite modernidade, empatia e acolhimento para o público jovem |
| Corpo & Interface (UI) | **DM Sans** | Sans-serif limpa e altamente legível em telas mobile, ideal para valores de rateio, filtros e tabelas |

### Referências visuais e de UX

| Referência | Conceito aplicado |
|---|---|
| 🏠 **Airbnb** | Divulgação progressiva de filtros, agrupamento de tags por categoria, cards visuais com destaque para fotos |
| 🏨 **Booking.com** | Transparência total de custos direto no card, zero taxas ocultas, badges de flexibilidade contratual |
| 🔎 **Trivago** | Comparador em colunas de até 3 imóveis, algoritmo que cruza % de afinidade, orçamento e tempo GTFS |

A interface segue abordagem **mobile-first**, minimalista e responsiva.

---

## 🛠️ Tecnologias e Arquitetura

| Camada | Tecnologia definida |
|---|---|
| 🌐 Plataforma | Aplicação Web · Responsiva · Mobile-first |
| 🎨 Front-end | HTML5, CSS3, JavaScript |
| ⚙️ Back-end | FastAPI (Python) |
| 🗃️ Banco de Dados | MySQL (relacional) |
| 🧪 Testes | Jest |
| 🗺️ Mapas | OpenStreetMap |
| 🚌 Mobilidade | GTFS · EMDEC · EMTU |
| 🔐 Segurança | Hash de senhas com bcrypt ou Argon2 |
| 🔒 Comunicação | TLS |
| 🏗️ Arquitetura | Modular |
| ♿ Acessibilidade | WCAG 2.1 AA |
| 🛡️ Privacidade | LGPD |
| 🔀 Versionamento | Git / GitHub |

---

## 🗃️ Modelo de Dados

Modelo relacional conceitual com **13 entidades**, mantendo integridade entre usuários, imóveis, matches, mensagens, rotas e auxílios.

```text
Usuario
   │
   ├── Usuario_Tag ───── Tag
   │
   ├── Imovel
   │      ├── Imovel_Tag ───── Tag
   │      ├── MoradorAtual
   │      └── RotaMobilidade
   │
   ├── Match
   │      └── Mensagem
   │
   ├── Destino
   │      └── RotaMobilidade
   │
   ├── ElegibilidadeUsuario
   │      └── ProgramaAuxilio
   │
   └── Denuncia
```

### Principais entidades

| Entidade | Responsabilidade |
|---|---|
| `Usuario` | Dados de perfil, renda e orçamento |
| `Tag` | Preferências de convivência |
| `Usuario_Tag` | Relação entre usuários e preferências |
| `Imovel` | Dados dos anúncios |
| `Imovel_Tag` | Preferências associadas ao imóvel |
| `MoradorAtual` | Moradores associados ao anúncio |
| `Match` | Compatibilidade e conexão entre usuários |
| `Mensagem` | Comunicação interna |
| `Destino` | Faculdade, trabalho ou outro destino |
| `RotaMobilidade` | Distância e tempo de deslocamento |
| `ProgramaAuxilio` | Programas habitacionais cadastrados |
| `ElegibilidadeUsuario` | Resultado das simulações |
| `Denuncia` | Registro de denúncias |

---

## 🔐 Segurança e Privacidade

- 🔑 Hash criptográfico de senhas (bcrypt/Argon2)
- 🔒 Comunicação via TLS, em trânsito e repouso
- 🛡️ Adequação à **LGPD**, com consentimento explícito e transparência de dados
- 🗑️ Possibilidade de exclusão dos dados pessoais
- 👥 Controle de acesso por papéis
- 💾 Backup periódico do banco de dados
- 🚫 Sistema de denúncia e bloqueio

```text
Usuário comum
      │
      ├── Anunciante
      │
      └── Administrador
```

---

## 📁 Estrutura Sugerida do Repositório

```text
RoomMatch/
│
├── 📂 docs/
│   ├── README.md
│   ├── design/
│   │   └── figma/              # Kit editável para Figma (SVG + HTML + tokens)
│   ├── requisitos-funcionais.md
│   ├── requisitos-nao-funcionais.md
│   ├── modelo-de-dados.md
│   ├── ui-ux.md
│   └── arquitetura.md
│
├── 📂 assets/
│   ├── logo/
│   ├── diagrams/
│   └── screenshots/
│
├── 📂 frontend/               # HTML, CSS e JavaScript
│
├── 📂 backend/                # API FastAPI e regras de negócio
│
├── 📂 database/                # Scripts MySQL e modelo relacional
│
├── 📂 tests/                  # Testes com Jest
│
├── .gitignore
├── README.md
└── LICENSE
```

---

## 📚 Documentação

A documentação técnica do projeto é mantida na pasta [`docs/`](./docs) e inclui: especificação do projeto, 38 requisitos funcionais + 20 requisitos não funcionais (7 módulos, priorização MoSCoW), modelo de dados, diretrizes de UI/UX, arquitetura do sistema e estratégia de testes.

---

## 🚀 Como Executar

> 🚧 **Projeto em desenvolvimento**

1. Clonar o repositório
2. Instalar as dependências do back-end (FastAPI) e do front-end
3. Configurar as variáveis de ambiente
4. Configurar o banco de dados MySQL
5. Inicializar o back-end (`uvicorn`)
6. Servir o front-end (HTML/CSS/JS)
7. Rodar a suíte de testes com Jest

---

## 📈 Requisitos de Qualidade (ISO/IEC 25010)

| Requisito | Meta |
|---|---|
| ⚡ Carregamento dos cards | Até **2 segundos** em rede móvel 4G |
| 🗺️ Cálculo de rota GTFS | Até **5 segundos**, com cache de rotas frequentes |
| ⏱️ Onboarding + primeira busca | Até **5 minutos** |
| 👥 Usuários simultâneos | Pelo menos **500** |
| 🟢 Disponibilidade | Mínimo de **99%** em horário comercial |
| ♿ Acessibilidade | **WCAG 2.1 AA** de contraste e navegabilidade |
| 🌐 Navegadores | Chrome, Firefox, Edge e Safari |

---

## 🧩 Viabilidade do Projeto

```text
RoomMatch
│
├── 👤 Cadastro e Perfil
├── 💚 Matching
├── 🏠 Mural de Imóveis
├── 🗺️ Mobilidade (GTFS)
├── 💬 Chat & Comparador
├── 🛡️ Administração
└── 🧮 Auxílios Habitacionais (pós-MVP)
```

Desenvolvimento modular, priorizando as funcionalidades essenciais do MVP e expandindo a plataforma de forma incremental.

---

## 🔍 Análise SWOT

| | Interno | Externo |
|---|---|---|
| **Positivo** | **Forças:** uso de dados abertos (GTFS), diferenciação por matching social + rateio, redução do tempo de busca, maior filtro de acesso aos anúncios | **Oportunidades:** parcerias com faculdades e polos tecnológicos da RMC, indicação por programas de estágio/trainee, parceria com empresas de transporte público |
| **Negativo** | **Fraquezas:** dependência de massa crítica de usuários para efeito de rede, omissão de informações pessoais no cadastro | **Ameaças:** anúncios fraudulentos em redes concorrentes informais, concorrência de grupos de WhatsApp/Telegram/Instagram, rigor exigido pela LGPD |

---

## 🔮 Próximas Etapas

Ações prioritárias do grupo de trabalho:

- [ ] **Wireframes (Figma):** importar kit em `docs/design/figma/` e evoluir protótipos mobile-first
- [ ] **Modelo Relacional:** validar entidades, chaves e relacionamentos do banco
- [ ] **Integração GTFS:** mapear linhas da EMDEC/EMTU para testes de rotas
- [ ] Validação dos requisitos com usuários do público-alvo
- [ ] Desenvolvimento do MVP
- [ ] Testes de usabilidade e de segurança
- [ ] Deploy da aplicação

---

## 👥 Integrantes

<div align="center">

| | Nome | GitHub | LinkedIn |
|---|---|---|---|
| 👩‍💻 | Julia Leandro | [@leasju](https://github.com/leasju) | [Perfil](https://linkedin.com/in/juliasleandro) |
| 👩‍💻 | Lavínia Oliveira | [@LaviniaOliveira-2007](https://github.com/LaviniaOliveira-2007) | [Perfil](https://linkedin.com/in/laviniaoliveiras) |
| 👩‍💻 | Alice Pasolini | [@paso-lini](https://github.com/paso-lini) | [Perfil](https://linkedin.com/in/aliceaguiarp) |
| 👨‍💻 | Enzo Guerra | [@vooort](https://github.com/vooort) | [Perfil](https://linkedin.com/in/enzo-guerra-b16110275) |

</div>

---

## ⚠️ Aviso

O **RoomMatch não atua como imobiliária** e não garante a segurança jurídica de contratos de aluguel firmados entre os usuários.

O simulador de auxílios (bônus futuro) possui caráter exclusivamente informativo e seus resultados devem ser confirmados junto aos órgãos responsáveis.

---

<div align="center">

  <sub>
    🏠 RoomMatch · Projeto Integrador Extensionista · Terceiro Setor<br/>
    Ciência de Dados e Inteligência Artificial · PUC-Campinas · 2026
  </sub>

</div>
