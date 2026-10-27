# Onde os dados vão hoje · Como sobe no ar · Como ligar o banco

## Resposta direta

| Pergunta | Resposta |
|----------|----------|
| Os dados da demo já vão para o MySQL/Postgres? | **Não.** |
| Onde ficam login, anúncios, favoritos, chat? | No **navegador**: `localStorage` (`roommatch-mock-db-v5`). |
| O FastAPI já está ligado? | **Não.** `api.js` usa modo `mock` por padrão. |
| Personalizar telas quebra o backend? | **Não**, se variáveis/campos seguirem o schema. |
| Dá para publicar o front agora? | **Sim** — site estático; ver `frontend/README.md`. |

Telas podem ter nav/copy diferentes por papel.  
**Campos e JSON** devem espelhar o banco (`locatario`, `locador`, `imovel`, …).

Contrato runtime no browser: `RoomMatchApi.CONTRATO`.

---

## Fluxo atual (demo)

```text
Browser (HTML/JS)
    │
    ├─ RoomMatchApi (api.js)
    │       modo = mock  ──►  RoomMatchMock (mock-api.js)
    │                              │
    │                              └─ localStorage (roommatch-mock-db-v5)
    │
    └─ modo = live  ──►  HTTP ──► FastAPI ──► banco
                         (ainda não é o padrão)
```

- Fotos: arquivos estáticos em `frontend/assets/imoveis/…`
- Seed: usuários e imóveis definidos em `mock-api.js`
- Limpar demo: `RoomMatchMock.reset()` no console ou apagar o localStorage

---

## Como “sobe no ar” depois do commit

O front é **site estático**. Não precisa de Node nem de API.

1. **Commit + push** no GitHub.
2. **GitHub Pages** (Settings → Pages):
   - Source: Deploy from a branch
   - Folder: **`/` (root)** — `index.html` redireciona para `frontend/pages/home.html`
3. Abrir a URL do Pages. Enquanto `roommatch-api-mode` for `mock` (padrão), **tudo funciona sem banco**.

Local:

```bash
cd frontend && python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/pages/home.html
```

Não há deploy automático de API neste estado: o backend ainda está incompleto.

---

## Como ligar o banco depois (simples)

Objetivo: **não reescrever as telas** — só trocar o transporte.

1. Implementar no FastAPI as mesmas rotas de `api.js`  
   (`/api/v1/auth/login`, `/imoveis`, `/favoritos`, `/visitas`, `/conversas`, `/me`, …).  
   Ver `docs/frontend/papeis-e-rotas-api-v1.md`.
2. Mapear JSON ↔ tabelas (nomes do schema):

| JSON (API / front) | Tabela / coluna |
|--------------------|-----------------|
| `papel_schema: locatario\|locador` | `locatario` / `locador` |
| `orcamento_maximo` | `locatario.orcamento_maximo` |
| `limiar_compatibilidade` | `locatario.limiar_compatibilidade` |
| `tags` | `usuario_tag` / tags do imóvel |
| `aluguel`, `condominio`, `iptu`, `contas` | `imovel.valor_*` |
| favoritos | `interesse` (`tipo_interesse`) ou likes |
| visitas / conversas / mensagens | tabelas homônimas |

**Riscos de conflito (backend deve espelhar):**

- Prefixo e paths: `/api/v1` + tabela em `papeis-e-rotas-api-v1.md`.
- Query mural: `tipo`, `bairro`, `preco_max`, `tag` (não inventar `precoMax` / `max_price`).
- Preferências: sempre `orcamento_maximo` e `limiar_compatibilidade` no JSON.
- `PATCH /me` com `papel`: migrar entidade locatario↔locador; nunca aceitar `id`/`senha` nesse body.
- Visitas: `POST /visitas` só locatário; front agenda a partir do chat (`?id=`).
- Auth: `Authorization: Bearer` + `{ access_token, user }` no login/register.
- Fotos imóvel: `capa` + `fotos[]` (URLs); front ainda tem fallback estático.

3. No browser (ou config de deploy), uma vez:

```js
localStorage.setItem('roommatch-api-mode', 'live');
localStorage.setItem('roommatch-api-base', 'https://sua-api.exemplo.com');
location.reload();
```

4. `api.js` passa a chamar a API real; o mock deixa de ser usado.

Aliases aceitos no mock: `orcamento` ≡ `orcamento_maximo`,  
`limiar` ≡ `limiar_compatibilidade`. Preferir os nomes do schema na API nova.

---

## O que NÃO fazer (para não dificultar o backend)

- Renomear campos por papel na UI (`orcamento` → “aluguel mínimo” só no locador).
- Inventar entidades que não existem no schema.
- Endpoints diferentes só para demo sem documentar.
- Assumir que `localStorage` = banco de produção.

---

## Checklist “mostra o que precisa” na demo

- [ ] Servir `frontend/` por HTTP (não `file://`).
- [ ] Login demo: `morador@demo.com` / `locador@demo.com` · `demo123`.
- [ ] Locatário → mural; locador → meus anúncios (só chrome/UI).
- [ ] Cadastro novo na demo → 403 (usar Entrar).
- [ ] Se algo parecer “velho”: `RoomMatchMock.reset()` + hard refresh.
- [ ] Fotos: pasta `assets/imoveis/{id}/1.jpg`…`4.jpg` presentes no deploy.
- [ ] Pages: root `/` + `.nojekyll` na raiz do repo.
