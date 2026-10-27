# Papéis e rotas `/api/v1` (referência para o front mock e FastAPI)

O front usa `user.papel`: **`Morador`** ou **`Locador`**. No banco/modelo atual:

| Front (`papel`) | Backend (entidade) | Papel na plataforma |
|-----------------|--------------------|---------------------|
| Morador         | `locatarios`       | Busca moradia, favorita, agenda visita |
| Locador         | `locadores`        | Publica e edita anúncios (`posts` / imóveis) |

UI (nav/destinos) pode diferir por papel. **Campos e JSON = schema do banco**
(`orcamento_maximo`, `limiar_compatibilidade`, `locatario`/`locador`).  
Ver também `docs/frontend/dados-mock-e-api-live.md`.

| | Locatário (UI: Morador) | Locador |
|---|-------------------------|---------|
| Home pós-login | `home.html` | `meus-imoveis.html` |
| Nav | Explorar · Favoritos · Visitas · Mensagens | Meus anúncios · Publicar · Visitas · Mensagens |
| Preferências | mesmos campos `locatario.*` | mesmos campos (labels iguais) |

## Morador (locatário)

| Método | Rota | Uso |
|--------|------|-----|
| GET | `/imoveis` | Mural (match se autenticado). Query opcional: `tipo`, `bairro`, `preco_max`, `tag` |
| GET | `/imoveis/{id}` | Detalhe (`capa`, `fotos[]` — URLs ou paths) |
| GET/POST | `/favoritos`, `/favoritos/{id}` | Lista e toggle (≈ `likes`) |
| POST | `/visitas` | Solicitar visita |
| GET | `/visitas` | Próprios pedidos |
| GET/POST | `/conversas`, `/conversas/{id}/mensagens` | Chat com locador |
| GET/PATCH | `/me` | Perfil (nome, telefone, gênero, ocupação, emprego, faculdade, foto_url, e-mail; `papel` opcional) |

**PATCH `/me` + troca de `papel`:** backend deve migrar `locatario` ↔ `locador`, revogar escopos antigos e devolver `user` atualizado. Não confiar só no client.

**Não usa:** `/imoveis/meus`, POST/PATCH de imóvel próprio.

## Locador

| Método | Rota | Uso |
|--------|------|-----|
| GET | `/imoveis` | Explorar mural (opcional) |
| GET | `/imoveis/meus` | Anúncios da conta |
| POST | `/imoveis` | Publicar (body inclui endereço: `cep`, `rua`, `numero`, `complemento?`, `bairro`, `cidade`, `estado`) |
| PATCH | `/imoveis/{id}` | Editar (dono) |
| GET | `/visitas` | Visitas nos imóveis dele |
| GET/POST | `/conversas`, … | Chat com interessados |
| GET/PATCH | `/me` | Mesmos campos do morador (incl. troca de `papel` com migração no banco) |

**Não usa:** `/favoritos` (403 no mock). **Não** POST `/visitas` (quem agenda é o morador). Visita só via fluxo do chat no front.

## Visitante (sem token)

| Método | Rota | Uso |
|--------|------|-----|
| GET | `/imoveis`, `/imoveis/{id}` | Mural/detalhe (match genérico ou fixo) |
| POST | `/auth/login` | Entrar |
| GET | `/stats` | Totais públicos do mural |

## Implementação FastAPI (sugestão mínima)

- Resolver papel a partir do JWT + tabelas `locatarios` / `locadores`.
- Reutilizar os mesmos paths acima; retornar **403** quando o papel não bate
  (o front já trata redirect/UI).
- Favoritos: escopo `id_locatario` (modelo `likes`).
- Visitas POST: apenas `locatario`; GET filtra por locatário ou imóveis do locador.

O mock em `frontend/js/mock-api.js` segue esta tabela para facilitar trocar
`roommatch-api-mode` para `live` sem mudar `api.js`.

Deploy sem API: `frontend/README.md`. Contrato em runtime: `RoomMatchApi.CONTRATO`.

## Matching (contrato único)

Espelhado em `backend/app/services/matching.service.py` e no mock:

```
match% = round( |tags_usuario ∩ tags_imovel| / |tags_usuario| × 100 )
```

- Visitante / sem tags: usa `match_percent` do catálogo (preview).
- Zero overlap → **0** (nunca cai no seed).
- Sem piso 40% nem teto 99%.
- Chat (`POST /conversas`) só se `match >= limiar` **e** `preco <= orcamento`
  (papel Morador/locatário). Resposta inclui `elegibilidade` no GET imóvel.
- `GET /stats` → `match_medio` personalizado com as tags do usuário logado.
- Tags: catálogo `frontend/js/tags-catalogo.js` (inclui Vegetariano, 420 Friendly).
