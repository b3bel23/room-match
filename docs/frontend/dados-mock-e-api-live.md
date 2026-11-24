# Onde os dados vão hoje · Como sobe no ar · Como ligar o banco

## Resposta direta

| Pergunta | Resposta |
|----------|----------|
| Os dados vão para o Postgres? | **Sim, no modo `live`.** No modo `mock` (demonstração), ficam no navegador. |
| Onde ficam login, anúncios, favoritos, chat no mock? | No **navegador**: `localStorage` (`roommatch-mock-db-v5`). |
| O FastAPI já está ligado? | **Sim.** Todas as rotas de `api.js` existem em `/api/v1`. O site publicado usa a API quando `API_PRODUCAO` (topo de `api.js`) está preenchida; em localhost, use `?api=live`. |
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

## Como o front fala com o banco

As telas não mudam entre os modos; só o transporte. O FastAPI implementa as mesmas rotas de
`api.js` (ver `docs/frontend/papeis-e-rotas-api-v1.md`) e o PRD registra cada uma.

Mapa JSON ↔ tabelas:

| JSON (API / front) | Tabela / coluna |
|--------------------|-----------------|
| `papel_schema: locatario\|locador` | `locatario` / `locador` |
| `orcamento_maximo` | `locatario.orcamento_maximo` |
| `limiar_compatibilidade` | `locatario.limiar_compatibilidade` |
| `tags` | `usuario_tag` / tags do imóvel |
| `aluguel`, `condominio`, `iptu`, `contas` | `imovel.valor_*` |
| `cep`, `rua`, `numero`, `complemento?`, `bairro`, `cidade`, `estado` | `enderecos_imovel` / `EnderecoImovel` |
| favoritos / curtidas | `likes` |
| recusados (descobrir) | `recusas` |
| visitas / conversas / mensagens / notificações | tabelas homônimas (plural) |
| `destino` (perfil) | `locatarios.preferencias_moradia.destino` |

**Riscos de conflito (backend deve espelhar):**

- Prefixo e paths: `/api/v1` + tabela em `papeis-e-rotas-api-v1.md`.
- Query mural: `tipo`, `bairro`, `preco_max`, `tag` (não inventar `precoMax` / `max_price`).
- Preferências: sempre `orcamento_maximo` e `limiar_compatibilidade` no JSON.
- `PATCH /me` com `papel`: migrar entidade locatario↔locador; nunca aceitar `id`/`senha` nesse body.
- Visitas: `POST /visitas` só locatário; front agenda a partir do chat (`?id=`).
- Auth: `Authorization: Bearer` + `{ access_token, user }` no login/register.
- Fotos imóvel: `capa` + `fotos[]` (URLs); front ainda tem fallback estático.

Ligar ou desligar a API no navegador:

- `?api=live` ou `?api=mock` em qualquer página (a escolha fica guardada);
- ou, no console: `localStorage.setItem('roommatch-api-mode', 'live')` e
  `localStorage.setItem('roommatch-api-base', 'https://sua-api.exemplo.com')`.

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
- [ ] Login teste: `morador@demo.com` / `locador@demo.com` · `demo123` no mock; com a API,
      a senha passada ao seed (padrão `demo12345`).
- [ ] Locatário → mural; locador → meus anúncios (só chrome/UI).
- [ ] Se algo parecer “velho”: `RoomMatchMock.reset()` + hard refresh.
- [ ] Fotos: pasta `assets/imoveis/{id}/1.jpg`…`4.jpg` presentes no deploy.
- [ ] Pages: root `/` + `.nojekyll` na raiz do repo.
