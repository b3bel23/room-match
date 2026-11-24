# Design System — extraído do Figma (roommatch)

Fonte: https://www.figma.com/design/i5KBOOplU4DoauF0D0DDSl/roommatch

## Cores

| Token | Hex | Uso |
|---|---|---|
| primary | `#5ea38f` | CTA principal, preço, links ativos |
| secondary | `#fbb050` | Destaque de stats (hero), faixa CTA |
| accent | `#f08070` | Tags especiais (ex: Aceita Animais) |
| background | `#141d22` | Fundo escuro / texto principal |
| surface | `#ffffff` | Cards, header, inputs |
| surface-muted | `#f4f6f7` | Fundo da página |
| border | `#e2e8eb` | Bordas de cards, chips, inputs |
| text-muted | `#4a5568` | Texto secundário |
| text-subtle | `#94a3ad` | Placeholder, texto terciário |
| neutral | `#757575` | Cinza auxiliar |

## Tipografia

- **Títulos (Comfortaa, bold):** hero 26px, h2 18px, título de card 14px
- **Corpo (DM Sans):** regular 400 / medium 500 / semibold 600 / bold 700, tamanhos de 11 a 18px

## Componentes catalogados no Figma

- `header.hdr-logged-out` / `header.hdr-logged-in` / `header.component-header`
- `button.component-button-primary` / `-secondary` / `-ghost` / `-danger`
- `article.card` / `div.component-card-imovel` (card de imóvel: imagem, badge de match %, tags, preço, localização)
- `span.component-badge-afinidade` (badge de % de match)
- `span.component-tag` (tags como Trabalho em Casa, Aceita Animais, LGBTQIA+ Acolhedor, República)
- `span.filter-input` (input de filtro com ícone)
- `div.auth-card` (card de login/cadastro)
- `div.chat-input-bar`, `div.chat-list-hdr`, `div.chat-main-hdr` (indica uma feature de chat/mensagens no design, ainda não implementada)

## Telas identificadas no arquivo

1. Home / listagem de imóveis (header, hero com stats, filtros, grid de cards, faixa de CTA)
2. Detalhes do imóvel
3. Login / cadastro (frame `login`)
4. Possivelmente chat (componentes de chat existem na seção de components, mas não uma tela completa vista até agora)

## Arquivo de tokens

Os valores acima foram exportados como CSS custom properties em [`frontend/design-tokens.css`](../../frontend/design-tokens.css).
