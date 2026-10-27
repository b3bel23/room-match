# RoomMatch · Frontend (demo publicável)

Site **estático** (HTML/CSS/JS). Roda **sem backend**: `api.js` usa mock + `localStorage` por padrão.

## Publicar agora (GitHub Pages)

1. Push da branch (ex.: `feature/frontend-demo-mock-e-papeis` ou `main`).
2. GitHub → **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: a que contém este repo
   - Folder: **`/` (root)** — o `index.html` da raiz redireciona para `frontend/pages/home.html`
3. Aguarde 1–2 min e abra:
   - `https://<user>.github.io/<repo>/`  
   - ou direto `…/frontend/pages/home.html`

Alternativa: Pages com root em `/frontend` — use `frontend/index.html` → `pages/home.html`.

Local:

```bash
cd frontend && python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/pages/home.html
```

### Contas de teste (mock)

Só no front estático — **não** são credenciais de produção.

| Papel   | E-mail             | Senha   |
|---------|--------------------|---------|
| Morador | morador@demo.com   | demo123 |
| Locador | locador@demo.com   | demo123 |

Também dá para **Criar conta**. Reset: `RoomMatchMock.reset()` + F5.

---

## Contrato com o backend (não quebrar o front)

Fonte da verdade das rotas:

- [`docs/frontend/papeis-e-rotas-api-v1.md`](../docs/frontend/papeis-e-rotas-api-v1.md)
- [`docs/frontend/dados-mock-e-api-live.md`](../docs/frontend/dados-mock-e-api-live.md)
- Constante `RoomMatchApi.CONTRATO` em `js/api.js` (console do browser)

### Regras

1. Prefixo: **`/api/v1`**
2. Auth: `Authorization: Bearer <access_token>`
3. Login: `POST /auth/login` body `{ email, senha }` → `{ access_token, user }`
4. `user.papel`: `"Morador"` | `"Locador"` (UI). Schema: `locatario` | `locador`
5. Preferências / perfil: **`orcamento_maximo`**, **`limiar_compatibilidade`**, **`tags`**
6. Imóvel: `aluguel`, `condominio`, `iptu`, `contas`, `preco` (+ `fotos[]` / `capa` quando houver)
7. Match: `|∩ tags| / |tags_usuario| × 100` — chat se match ≥ limiar **e** preço ≤ orçamento
8. Papel errado → **403** (o front redireciona)

### Ligar API real (quando existir)

No console do site publicado:

```js
localStorage.setItem('roommatch-api-mode', 'live');
localStorage.setItem('roommatch-api-base', 'https://sua-api.exemplo.com');
location.reload();
```

Voltar ao mock: `localStorage.setItem('roommatch-api-mode', 'mock'); location.reload();`

---

## Estrutura

```text
frontend/
  pages/          # telas
  js/api.js       # cliente HTTP (mock | live)
  js/mock-api.js  # seed + localStorage (roommatch-mock-db-v5)
  assets/         # logo, Campinas, fotos de imóveis
  design-tokens.css
```

Ordem de scripts nas páginas: `mock-api.js` → `api.js` → `sessao.js` → `papel-ui.js` → `chrome.js` → página.
