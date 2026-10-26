# RoomMatch — Kit Figma Web Hi-Fi

Mockups **alta fidelidade** para web desktop (**1440×900**), com conteúdo
realista da RMC, rateio transparente, tags, chat e identidade visual.

## Arquivo principal

| Arquivo | Descrição |
|---------|-----------|
| **`roommatch-mvp-hifi.html`** | 19 telas hi-fi — **importar este** |
| `roommatch-mvp-canvas.html` | Cópia idêntica do hi-fi |
| `roommatch-components.html` | Biblioteca de componentes |
| `tokens/design-tokens.json` | Tokens de cor e tipografia |

## Importar no Figma

```bash
cd docs/design/figma
python3 -m http.server 8080
```

Plugin **html.to.design** → URL:
**`http://localhost:8080/roommatch-mvp-hifi.html`**

Opções recomendadas:
- ✅ Use Autolayout
- ✅ Create styles & variables
- ✅ HTML layer names

Regenerar após edições:

```bash
python3 docs/design/figma/generate_hifi.py
```

## Layout web (padrões)

| Padrão | Dimensão | Telas |
|--------|----------|-------|
| Frame desktop | 1440 × 900 | Todas |
| Header | 64px altura | Global |
| Sidebar config | 220px | Configurações |
| Chat 3 colunas | 280 + flex + 320 | Chat |
| Mural grid | 3 colunas × 420px cards | Mural |
| Auth card | 480px centrado | Login, cadastro |

## Componentes pré-configurados

Todos os grupos SVG usam prefixo `component/`:

```
component/header
component/page-title
component/sidebar
component/sidebar/item-{perfil|pref|fav|seg}
component/button/{primary|secondary|ghost}
component/tag/{nome}
component/badge-afinidade
component/input/{campo}
component/card-imovel/{id}
component/card-horizontal/{id}
component/card-grid
component/filter-bar
component/chat/list
component/chat/thread
component/chat/info-imovel
component/auth-card
component/stepper
```

## Telas incluídas (19)

### Locatário
- Mural (grid 3 colunas — ref. wireframe)
- Imóvel expandido (blur / logado)
- Cadastro (dados, preferências, termos)
- Config · Preferências, Favoritos
- Chat (3 colunas — ref. wireframe)

### Locador
- Cadastro (dados, imóvel, termos)
- Meus Anúncios, Publicar
- Chat com Candidatos

### Compartilhado
- Auth gate, Login
- Config · Perfil, Segurança

## Regenerar

```bash
python3 docs/design/figma/generate_kit.py
```
