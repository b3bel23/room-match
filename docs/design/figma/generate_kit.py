#!/usr/bin/env python3
"""Generate RoomMatch MVP Figma kit — WEB desktop (1440×900)."""

from pathlib import Path

OUT = Path(__file__).parent
SCREENS = OUT / "screens"

C = {
    "menthe": "#5EA38F",
    "nectarine": "#FBB050",
    "salmon": "#F08070",
    "slate": "#141D22",
    "white": "#FFFFFF",
    "gray100": "#F4F6F7",
    "gray200": "#E2E8EB",
    "gray400": "#94A3AD",
    "gray600": "#4A5568",
    "blur": "rgba(20,29,34,0.85)",
}

W, H = 1440, 900
SIDEBAR_W = 220
HEADER_H = 64
TITLE_H = 48


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def svg_open(name: str) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<svg xmlns="http://www.w3.org/2000/svg" '
        'width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
        'data-screen="{name}">\n'
        '<rect id="bg" width="{w}" height="{h}" fill="{bg}"/>\n'
    ).format(w=W, h=H, name=esc(name), bg=C["gray100"])


def svg_close() -> str:
    return "</svg>\n"


# ── Components (reusable SVG groups) ──────────────────────────────

def comp_header(logged: bool = True) -> str:
    nav = ""
    if logged:
        nav = (
            f'<g id="component/header/nav">\n'
            f'<circle cx="{W - 120}" cy="32" r="18" fill="{C["gray200"]}"/>\n'
            f'<text x="{W - 120}" y="58" text-anchor="middle" '
            f'font-family="DM Sans,sans-serif" font-size="10" '
            f'fill="{C["gray600"]}">Perfil</text>\n'
            f'<circle cx="{W - 64}" cy="32" r="18" fill="{C["gray200"]}"/>\n'
            f'<text x="{W - 64}" y="58" text-anchor="middle" '
            f'font-family="DM Sans,sans-serif" font-size="10" '
            f'fill="{C["gray600"]}">Config</text>\n'
            f'</g>'
        )
    return (
        f'<g id="component/header">\n'
        f'<rect x="0" y="0" width="{W}" height="{HEADER_H}" '
        f'fill="{C["white"]}"/>\n'
        f'<line x1="0" y1="{HEADER_H}" x2="{W}" y2="{HEADER_H}" '
        f'stroke="{C["gray200"]}"/>\n'
        f'<text x="32" y="40" font-family="Comfortaa,sans-serif" '
        f'font-size="22" font-weight="700" fill="{C["menthe"]}">'
        f'RoomMatch</text>\n'
        f'{nav}'
        f'</g>'
    )


def comp_page_title(title: str) -> str:
    y = HEADER_H
    return (
        f'<g id="component/page-title">\n'
        f'<rect x="0" y="{y}" width="{W}" height="{TITLE_H}" '
        f'fill="{C["white"]}"/>\n'
        f'<text x="32" y="{y + 32}" font-family="Comfortaa,sans-serif" '
        f'font-size="18" font-weight="700" fill="{C["slate"]}">'
        f'{esc(title)}</text>\n'
        f'</g>'
    )


def comp_btn(x: int, y: int, bw: int, bh: int, label: str,
             variant: str = "primary", cid: str = "btn") -> str:
    fills = {
        "primary": (C["menthe"], C["white"], ""),
        "secondary": (C["white"], C["slate"], f'stroke="{C["gray200"]}"'),
        "danger": (C["salmon"], C["white"], ""),
        "ghost": (C["white"], C["gray600"],
                  f'stroke="{C["gray200"]}" stroke-dasharray="4 4"'),
    }
    fill, tf, stroke = fills.get(variant, fills["primary"])
    sw = ' stroke-width="1"' if stroke else ""
    return (
        f'<g id="component/button/{cid}">\n'
        f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" rx="10" '
        f'fill="{fill}" {stroke}{sw}/>\n'
        f'<text x="{x + bw // 2}" y="{y + bh // 2 + 5}" text-anchor="middle" '
        f'font-family="DM Sans,sans-serif" font-size="13" font-weight="600" '
        f'fill="{tf}">{esc(label)}</text>\n'
        f'</g>'
    )


def comp_tag(x: int, y: int, label: str, active: bool = False) -> str:
    fill = C["salmon"] if active else C["white"]
    stroke = C["salmon"] if active else C["gray200"]
    tf = C["white"] if active else C["slate"]
    tw = max(88, len(label) * 7 + 28)
    return (
        f'<g id="component/tag/{esc(label)}">\n'
        f'<rect x="{x}" y="{y}" width="{tw}" height="32" rx="16" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="1"/>\n'
        f'<text x="{x + tw // 2}" y="{y + 21}" text-anchor="middle" '
        f'font-family="DM Sans,sans-serif" font-size="12" '
        f'fill="{tf}">{esc(label)}</text>\n'
        f'</g>'
    )


def comp_badge(x: int, y: int, pct: str) -> str:
    return (
        f'<g id="component/badge-afinidade">\n'
        f'<rect x="{x}" y="{y}" width="72" height="32" rx="16" '
        f'fill="{C["menthe"]}"/>\n'
        f'<text x="{x + 36}" y="{y + 21}" text-anchor="middle" '
        f'font-family="DM Sans,sans-serif" font-size="13" font-weight="700" '
        f'fill="{C["white"]}">{esc(pct)} afinidade</text>\n'
        f'</g>'
    )


def comp_field(x: int, y: int, fw: int, label: str, placeholder: str,
               fid: str = "field") -> str:
    return (
        f'<g id="component/input/{fid}">\n'
        f'<text x="{x}" y="{y}" font-family="DM Sans,sans-serif" '
        f'font-size="12" font-weight="500" fill="{C["gray600"]}">'
        f'{esc(label)}</text>\n'
        f'<rect x="{x}" y="{y + 8}" width="{fw}" height="44" rx="8" '
        f'fill="{C["white"]}" stroke="{C["gray200"]}" stroke-width="1"/>\n'
        f'<text x="{x + 14}" y="{y + 36}" font-family="DM Sans,sans-serif" '
        f'font-size="14" fill="{C["gray400"]}">{esc(placeholder)}</text>\n'
        f'</g>'
    )


def comp_sidebar(active: str, plus_items: bool = False) -> str:
    items = [
        ("Perfil", "perfil"),
        ("Preferências", "pref"),
        ("Favoritos", "fav"),
        ("Segurança", "seg"),
    ]
    if plus_items:
        items.append(("Notificações", "notif"))
    items.append(("Termos de Privacidade", "termos"))

    y0 = HEADER_H + TITLE_H
    sh = H - y0
    parts = [
        f'<g id="component/sidebar">\n'
        f'<rect x="0" y="{y0}" width="{SIDEBAR_W}" height="{sh}" '
        f'fill="{C["white"]}"/>\n'
        f'<line x1="{SIDEBAR_W}" y1="{y0}" x2="{SIDEBAR_W}" y2="{H}" '
        f'stroke="{C["gray200"]}"/>\n'
        f'<text x="24" y="{y0 + 28}" font-family="DM Sans,sans-serif" '
        f'font-size="10" letter-spacing="3" fill="{C["gray400"]}">MENU</text>\n',
    ]
    for i, (label, key) in enumerate(items):
        y = y0 + 48 + i * 48
        is_active = key == active
        fill = C["gray100"] if is_active else C["white"]
        stroke = (
            f'stroke="{C["menthe"]}" stroke-width="2"'
            if is_active else ""
        )
        is_plus = key == "notif"
        opacity = ' opacity="0.4"' if is_plus else ""
        parts.append(
            f'<g id="component/sidebar/item-{key}"{opacity}>\n'
            f'<rect x="12" y="{y}" width="{SIDEBAR_W - 24}" height="40" '
            f'rx="8" fill="{fill}" {stroke}/>\n'
            f'<text x="24" y="{y + 25}" font-family="DM Sans,sans-serif" '
            f'font-size="13" fill="{C["slate"]}">{esc(label)}</text>\n'
            f'</g>\n'
        )
    parts.append(comp_btn(12, H - 72, SIDEBAR_W - 24, 40, "Sair da conta",
                          "ghost", "sidebar-logout"))
    parts.append("</g>")
    return "\n".join(parts)


def comp_card_grid(x: int, y: int, cols: int, rows: int,
                   cw: int, ch: int, gap: int = 24) -> str:
    parts = ['<g id="component/card-grid">']
    for r in range(rows):
        for c in range(cols):
            cx = x + c * (cw + gap)
            cy = y + r * (ch + gap)
            parts.append(comp_card_imovel(cx, cy, cw, ch, f"card-{r}-{c}"))
    parts.append("</g>")
    return "\n".join(parts)


def comp_card_imovel(x: int, y: int, cw: int, ch: int,
                     cid: str = "card") -> str:
    img_h = int(ch * 0.55)
    return (
        f'<g id="component/card-imovel/{cid}">\n'
        f'<rect x="{x}" y="{y}" width="{cw}" height="{ch}" rx="12" '
        f'fill="{C["white"]}" stroke="{C["gray200"]}"/>\n'
        f'<rect x="{x}" y="{y}" width="{cw}" height="{img_h}" rx="12" '
        f'fill="{C["gray200"]}"/>\n'
        f'<text x="{x + cw // 2}" y="{y + img_h // 2}" text-anchor="middle" '
        f'font-family="DM Sans,sans-serif" font-size="12" '
        f'fill="{C["gray600"]}">img placeholder</text>\n'
        f'{comp_badge(x + cw - 88, y + 12, "85%")}\n'
        f'<rect x="{x + 16}" y="{y + img_h + 12}" width="120" height="8" '
        f'rx="4" fill="{C["gray200"]}"/>\n'
        f'<rect x="{x + 16}" y="{y + img_h + 28}" width="80" height="6" '
        f'rx="3" fill="{C["gray200"]}"/>\n'
        f'<text x="{x + 16}" y="{y + ch - 16}" font-family="DM Sans,sans-serif" '
        f'font-size="16" font-weight="700" fill="{C["menthe"]}">'
        f'R$ 850/mês</text>\n'
        f'</g>'
    )


def comp_card_horizontal(x: int, y: int, w: int, cid: str = "row") -> str:
    return (
        f'<g id="component/card-horizontal/{cid}">\n'
        f'<rect x="{x}" y="{y}" width="{w}" height="112" rx="12" '
        f'fill="{C["white"]}" stroke="{C["gray200"]}"/>\n'
        f'<rect x="{x + 12}" y="{y + 12}" width="88" height="88" rx="8" '
        f'fill="{C["gray200"]}"/>\n'
        f'<text x="{x + 120}" y="{y + 36}" font-family="DM Sans,sans-serif" '
        f'font-size="15" font-weight="600" fill="{C["slate"]}">'
        f'Quarto · Barão Geraldo</text>\n'
        f'<text x="{x + 120}" y="{y + 58}" font-family="DM Sans,sans-serif" '
        f'font-size="12" fill="{C["gray600"]}">Campinas · SP</text>\n'
        f'<text x="{x + 120}" y="{y + 80}" font-family="DM Sans,sans-serif" '
        f'font-size="14" font-weight="700" fill="{C["menthe"]}">'
        f'R$ 850/mês · 85% afinidade</text>\n'
        f'{comp_btn(x + w - 140, y + 68, 120, 36, "Ver detalhes", "secondary", "ver-detalhes")}\n'
        f'</g>'
    )


def comp_stepper(step: int, x: int, y: int, total: int = 3) -> str:
    parts = [f'<g id="component/stepper">']
    for i in range(total):
        fill = C["menthe"] if i < step else C["gray200"]
        parts.append(
            f'<rect x="{x + i * 56}" y="{y}" width="48" height="6" '
            f'rx="3" fill="{fill}"/>'
        )
    parts.append(
        f'<text x="{x + total * 56 + 16}" y="{y + 5}" '
        f'font-family="DM Sans,sans-serif" font-size="12" '
        f'fill="{C["gray600"]}">Etapa {step}/{total}</text>'
    )
    parts.append("</g>")
    return "\n".join(parts)


def content_x() -> int:
    return SIDEBAR_W + 32


def content_w() -> int:
    return W - SIDEBAR_W - 64


# ── Screens ───────────────────────────────────────────────────────

def screen_mural() -> str:
    s = svg_open("Locatário · Mural (Web)")
    s += comp_header()
    s += comp_page_title("Encontre sua moradia ideal")
    y = HEADER_H + TITLE_H + 24
    cats = ["Apart.", "Kitnet", "Casa", "República"]
    for i, c in enumerate(cats):
        fill = C["slate"] if i == 0 else C["white"]
        tf = C["white"] if i == 0 else C["slate"]
        s += (
            f'<g id="component/category-tab/{c}">\n'
            f'<rect x="{32 + i * 120}" y="{y}" width="108" height="40" '
            f'rx="8" fill="{fill}" stroke="{C["gray200"]}"/>\n'
            f'<text x="{86 + i * 120}" y="{y + 26}" text-anchor="middle" '
            f'font-size="13" fill="{tf}">{c}</text>\n</g>'
        )
    fy = y + 56
    s += (
        f'<g id="component/filter-bar">\n'
        f'<rect x="32" y="{fy}" width="{W - 200}" height="48" rx="8" '
        f'fill="{C["white"]}" stroke="{C["gray200"]}"/>\n'
        f'<rect x="48" y="{fy + 12}" width="160" height="24" rx="4" '
        f'fill="{C["gray200"]}"/>\n'
        f'<rect x="224" y="{fy + 12}" width="120" height="24" rx="4" '
        f'fill="{C["gray200"]}"/>\n'
        f'<rect x="360" y="{fy + 12}" width="120" height="24" rx="4" '
        f'fill="{C["gray200"]}"/>\n'
        f'</g>\n'
    )
    s += comp_btn(W - 152, fy + 4, 120, 40, "MATCH", "primary", "match")
    s += comp_card_grid(32, fy + 72, 3, 2, 420, 280)
    s += svg_close()
    return s


def screen_imovel_expandido(blur: bool) -> str:
    name = "Imóvel expandido (blur)" if blur else "Imóvel expandido (logado)"
    s = svg_open(f"Locatário · {name}")
    s += comp_header(logged=not blur)
    s += comp_page_title("Detalhes do imóvel")
    y = HEADER_H + TITLE_H + 24
    main_w = 680
    s += (
        f'<g id="content-main">\n'
        f'<rect x="32" y="{y}" width="{main_w}" height="320" rx="12" '
        f'fill="{C["gray200"]}"/>\n'
        f'<text x="{32 + main_w // 2}" y="{y + 160}" text-anchor="middle" '
        f'font-size="14" fill="{C["gray600"]}">Galeria de fotos</text>\n'
        f'</g>\n'
    )
    info_x = 32 + main_w + 32
    info_w = W - info_x - 32
    s += (
        f'<g id="content-info">\n'
        f'<text x="{info_x}" y="{y + 24}" font-family="Comfortaa,sans-serif" '
        f'font-size="22" font-weight="700" fill="{C["slate"]}">'
        f'Quarto em república</text>\n'
        f'<text x="{info_x}" y="{y + 52}" font-family="DM Sans,sans-serif" '
        f'font-size="13" fill="{C["gray600"]}">Barão Geraldo · Campinas</text>\n'
        f'{comp_badge(info_x, y + 64, "85%")}\n'
    )
    rows = [("Aluguel", "R$ 600"), ("Condomínio", "R$ 120"),
            ("IPTU", "R$ 45"), ("Contas (est.)", "R$ 85")]
    s += (
        f'<text x="{info_x}" y="{y + 120}" font-family="DM Sans,sans-serif" '
        f'font-size="13" font-weight="600" fill="{C["slate"]}">'
        f'Rateio transparente</text>\n'
    )
    for i, (k, v) in enumerate(rows):
        ry = y + 140 + i * 28
        s += (
            f'<text x="{info_x}" y="{ry}" font-size="13" '
            f'fill="{C["gray600"]}">{k}</text>\n'
            f'<text x="{info_x + info_w - 16}" y="{ry}" text-anchor="end" '
            f'font-size="13" font-weight="600" fill="{C["slate"]}">{v}</text>\n'
        )
    s += (
        f'<text x="{info_x}" y="{y + 260}" font-size="20" font-weight="700" '
        f'fill="{C["menthe"]}">Total: R$ 850/mês</text>\n'
        f'<text x="{info_x}" y="{y + 290}" font-size="12" '
        f'fill="{C["gray600"]}">32 min até PUC · 4,2 km (GTFS)</text>\n'
    )
    s += comp_tag(info_x, y + 304, "Pet Friendly", True)
    s += comp_tag(info_x + 120, y + 304, "Silêncio", False)
    if not blur:
        s += comp_btn(info_x, y + 352, 160, 44, "Favoritar", "secondary", "fav")
        s += comp_btn(info_x + 176, y + 352, 160, 44, "Conversar", "primary", "chat")
    s += "</g>"
    detail_y = y + 340
    s += (
        f'<g id="content-moradores">\n'
        f'<text x="32" y="{detail_y}" font-size="14" font-weight="600" '
        f'fill="{C["slate"]}">Moradores atuais</text>\n'
    )
    for i in range(3):
        mx = 32 + i * 200
        s += (
            f'<circle cx="{mx + 20}" cy="{detail_y + 36}" r="20" '
            f'fill="{C["gray200"]}"/>\n'
            f'<text x="{mx + 48}" y="{detail_y + 40}" font-size="12" '
            f'fill="{C["slate"]}">Morador {i + 1}</text>\n'
        )
    s += "</g>"
    if blur:
        s += (
            f'<g id="blur-overlay">\n'
            f'<rect x="0" y="{HEADER_H}" width="{W}" height="{H - HEADER_H}" '
            f'fill="{C["blur"]}"/>\n'
            f'<text x="{W // 2}" y="{H // 2 - 40}" text-anchor="middle" '
            f'font-family="Comfortaa,sans-serif" font-size="24" '
            f'fill="{C["white"]}">Cadastre-se para ver detalhes</text>\n'
            f'{comp_btn(W // 2 - 100, H // 2 + 8, 200, 48, "Criar conta", "primary", "cta")}\n'
            f'{comp_btn(W // 2 - 100, H // 2 + 68, 200, 48, "Entrar", "secondary", "login")}\n'
            f'</g>'
        )
    s += svg_close()
    return s


def screen_auth_centered(title: str, subtitle: str, is_login: bool) -> str:
    s = svg_open("Compartilhado · " + ("Login" if is_login else "Entrar ou cadastrar"))
    s += comp_header(logged=False)
    cx = W // 2
    card_w = 480
    card_x = cx - card_w // 2
    card_y = 180
    s += (
        f'<g id="component/auth-card">\n'
        f'<rect x="{card_x}" y="{card_y}" width="{card_w}" height="480" '
        f'rx="16" fill="{C["white"]}" stroke="{C["gray200"]}"/>\n'
        f'<text x="{cx}" y="{card_y + 48}" text-anchor="middle" '
        f'font-family="Comfortaa,sans-serif" font-size="24" font-weight="700" '
        f'fill="{C["slate"]}">{esc(title)}</text>\n'
        f'<text x="{cx}" y="{card_y + 76}" text-anchor="middle" '
        f'font-size="14" fill="{C["gray600"]}">{esc(subtitle)}</text>\n'
    )
    if is_login:
        s += comp_field(card_x + 32, card_y + 100, card_w - 64,
                        "E-mail", "seu@email.com", "email")
        s += comp_field(card_x + 32, card_y + 180, card_w - 64,
                        "Senha", "••••••••", "senha")
        s += (
            f'<text x="{card_x + 32}" y="{card_y + 260}" font-size="12" '
            f'fill="{C["menthe"]}">Esqueci minha senha</text>\n'
        )
        s += comp_btn(card_x + 32, card_y + 280, card_w - 64, 48,
                      "Entrar", "primary", "login")
    else:
        s += comp_btn(card_x + 32, card_y + 120, card_w - 64, 48,
                      "Criar conta", "primary", "criar")
        s += comp_btn(card_x + 32, card_y + 184, card_w - 64, 48,
                      "Entrar", "secondary", "entrar")
    s += "</g>"
    s += svg_close()
    return s


def screen_cadastro_form(title: str, fields: list, step: int,
                         role: str) -> str:
    s = svg_open(f"{role} · Cadastro · {title}")
    s += comp_header(logged=False)
    cx = W // 2
    fw = 560
    fx = cx - fw // 2
    fy = 120
    s += comp_stepper(step, fx, fy)
    s += (
        f'<text x="{fx}" y="{fy + 40}" font-family="Comfortaa,sans-serif" '
        f'font-size="22" font-weight="700" fill="{C["slate"]}">'
        f'{esc(title)}</text>\n'
    )
    for i, (label, ph) in enumerate(fields):
        s += comp_field(fx, fy + 72 + i * 76, fw, label, ph, f"f{i}")
    s += comp_btn(fx, fy + 72 + len(fields) * 76 + 16, fw, 48,
                  "Continuar" if step < 3 else "Finalizar cadastro",
                  "primary", "continuar")
    s += svg_close()
    return s


def screen_settings(title: str, active: str, body_fn) -> str:
    s = svg_open(f"Compartilhado · {title}")
    s += comp_header()
    s += comp_page_title("Configurações")
    s += comp_sidebar(active)
    s += body_fn()
    s += svg_close()
    return s


def body_perfil() -> str:
    x, w = content_x(), content_w()
    y = HEADER_H + TITLE_H + 32
    return (
        f'<g id="content/perfil">\n'
        f'<text x="{x}" y="{y}" font-family="Comfortaa,sans-serif" '
        f'font-size="18" font-weight="700" fill="{C["slate"]}">Perfil</text>\n'
        f'<text x="{x}" y="{y + 24}" font-size="12" '
        f'fill="{C["gray600"]}">Dados da sua conta</text>\n'
        f'<circle cx="{x + 40}" cy="{y + 80}" r="40" fill="{C["gray200"]}"/>\n'
        f'<text x="{x + 96}" y="{y + 72}" font-size="16" font-weight="600" '
        f'fill="{C["slate"]}">Maria Silva</text>\n'
        f'<text x="{x + 96}" y="{y + 94}" font-size="12" '
        f'fill="{C["gray600"]}">maria@email.com · Estudante PUC</text>\n'
        f'{comp_field(x, y + 140, w // 2 - 16, "Nome", "Maria Silva", "nome")}\n'
        f'{comp_field(x + w // 2, y + 140, w // 2 - 16, "Instituição", "PUC", "inst")}\n'
        f'{comp_field(x, y + 240, w, "Ocupação / Renda", "Estudante", "ocup")}\n'
        f'{comp_btn(x + w - 240, y + 340, 100, 40, "Cancelar", "secondary", "cancel")}\n'
        f'{comp_btn(x + w - 128, y + 340, 120, 40, "SALVAR", "primary", "save")}\n'
        f'</g>'
    )


def body_preferencias() -> str:
    x = content_x()
    y = HEADER_H + TITLE_H + 32
    s = (
        f'<g id="content/preferencias">\n'
        f'<text x="{x}" y="{y}" font-family="Comfortaa,sans-serif" '
        f'font-size="18" font-weight="700" fill="{C["slate"]}">Preferências</text>\n'
        f'<text x="{x}" y="{y + 24}" font-size="12" fill="{C["gray600"]}">'
        f'Suas tags de convivência · 5/12</text>\n'
    )
    tags = ["Pet Friendly", "Silêncio Noturno", "Home Office",
            "LGBTQIA+ Safe", "Vegetariano"]
    tx, ty = x, y + 48
    for i, t in enumerate(tags):
        s += comp_tag(tx, ty, t, True)
        tx += 140
        if tx > x + 560:
            tx = x
            ty += 44
    s += comp_field(x, ty + 32, 400, "Orçamento máximo", "R$ 900", "orc")
    s += comp_field(x + 420, ty + 32, 200, "Limiar mínimo", "70%", "limiar")
    s += (
        f'<text x="{x}" y="{ty + 120}" font-size="13" font-weight="600" '
        f'fill="{C["slate"]}">Em alta na sua região</text>\n'
    )
    trending = ["420 Friendly", "Sem Festas", "Pet Friendly", "Vegano"]
    tx = x
    for t in trending:
        s += comp_tag(tx, ty + 136, t, False)
        tx += 130
    s += comp_btn(x + content_w() - 128, H - 80, 120, 40, "SALVAR", "primary", "save")
    s += "</g>"
    return s


def body_favoritos() -> str:
    x, w = content_x(), content_w()
    y = HEADER_H + TITLE_H + 32
    s = (
        f'<g id="content/favoritos">\n'
        f'<text x="{x}" y="{y}" font-family="Comfortaa,sans-serif" '
        f'font-size="18" font-weight="700" fill="{C["slate"]}">Favoritos</text>\n'
        f'<text x="{x}" y="{y + 24}" font-size="12" fill="{C["gray600"]}">'
        f'Imóveis que você favoritou</text>\n'
        f'<g id="component/search-bar">\n'
        f'<rect x="{x}" y="{y + 40}" width="320" height="40" rx="8" '
        f'fill="{C["white"]}" stroke="{C["gray200"]}"/>\n'
        f'<text x="{x + 16}" y="{y + 66}" font-size="13" '
        f'fill="{C["gray400"]}">Buscar imóvel</text>\n'
        f'</g>\n'
    )
    for i in range(4):
        s += comp_card_horizontal(x, y + 100 + i * 128, w, f"fav-{i}")
    s += (
        f'<text x="{x}" y="{H - 48}" font-size="11" fill="{C["gray400"]}">'
        f'[Plus] Comparador 3 imóveis — RF37</text>\n'
        f'</g>'
    )
    return s


def body_seguranca() -> str:
    x, w = content_x(), content_w()
    y = HEADER_H + TITLE_H + 32
    return (
        f'<g id="content/seguranca">\n'
        f'<text x="{x}" y="{y}" font-family="Comfortaa,sans-serif" '
        f'font-size="18" font-weight="700" fill="{C["slate"]}">Segurança</text>\n'
        f'{comp_field(x, y + 40, 400, "Senha atual", "••••••••", "atual")}\n'
        f'{comp_field(x, y + 120, 400, "Nova senha", "••••••••", "nova")}\n'
        f'{comp_btn(x, y + 210, 200, 44, "Alterar senha", "primary", "alterar")}\n'
        f'<text x="{x}" y="{y + 290}" font-size="13" fill="{C["salmon"]}">'
        f'Excluir minha conta (LGPD)</text>\n'
        f'</g>'
    )


def screen_chat(role: str) -> str:
    title = "Chat locador" if role == "Locatário" else "Chat com Candidatos"
    s = svg_open(f"{role} · {title}")
    s += comp_header()
    y0 = HEADER_H
    list_w, info_w = 280, 320
    chat_x = list_w
    chat_w = W - list_w - info_w
    s += (
        f'<g id="component/chat/list">\n'
        f'<rect x="0" y="{y0}" width="{list_w}" height="{H - y0}" '
        f'fill="{C["white"]}"/>\n'
        f'<line x1="{list_w}" y1="{y0}" x2="{list_w}" y2="{H}" '
        f'stroke="{C["gray200"]}"/>\n'
        f'<text x="24" y="{y0 + 36}" font-size="15" font-weight="600" '
        f'fill="{C["slate"]}">Mensagens</text>\n'
        f'<rect x="16" y="{y0 + 52}" width="{list_w - 32}" height="36" '
        f'rx="18" fill="{C["gray100"]}"/>\n'
        f'<text x="32" y="{y0 + 75}" font-size="12" '
        f'fill="{C["gray400"]}">buscar conversa</text>\n'
        f'<text x="24" y="{y0 + 108}" font-size="10" letter-spacing="1" '
        f'fill="{C["gray400"]}">FIXADAS</text>\n'
    )
    for i in range(5):
        cy = y0 + 120 + i * 64
        fill = C["gray100"] if i == 0 else C["white"]
        s += (
            f'<g id="component/chat/item-{i}">\n'
            f'<rect x="8" y="{cy}" width="{list_w - 16}" height="56" '
            f'rx="8" fill="{fill}"/>\n'
            f'<circle cx="32" cy="{cy + 28}" r="16" fill="{C["gray200"]}"/>\n'
            f'<text x="56" y="{cy + 22}" font-size="12" font-weight="600" '
            f'fill="{C["slate"]}">João · 85%</text>\n'
            f'<rect x="56" y="{cy + 30}" width="100" height="6" rx="3" '
            f'fill="{C["gray200"]}"/>\n'
        )
        if i == 0:
            s += (
                f'<circle cx="{list_w - 24}" cy="{cy + 16}" r="10" '
                f'fill="{C["salmon"]}"/>\n'
                f'<text x="{list_w - 24}" y="{cy + 20}" text-anchor="middle" '
                f'font-size="9" fill="{C["white"]}">3</text>\n'
            )
        s += "</g>"
    s += "</g>"

    s += (
        f'<g id="component/chat/thread">\n'
        f'<rect x="{chat_x}" y="{y0}" width="{chat_w}" height="{H - y0}" '
        f'fill="{C["gray100"]}"/>\n'
        f'<rect x="{chat_x}" y="{y0}" width="{chat_w}" height="56" '
        f'fill="{C["white"]}"/>\n'
        f'<circle cx="{chat_x + 28}" cy="{y0 + 28}" r="16" fill="{C["gray200"]}"/>\n'
        f'<text x="{chat_x + 52}" y="{y0 + 24}" font-size="14" font-weight="600" '
        f'fill="{C["slate"]}">João Silva</text>\n'
        f'<text x="{chat_x + 52}" y="{y0 + 42}" font-size="11" '
        f'fill="{C["menthe"]}">digitando...</text>\n'
        f'<text x="{chat_x + 24}" y="{y0 + 100}" text-anchor="start" '
        f'font-size="10" fill="{C["gray400"]}">hoje</text>\n'
        f'<rect x="{chat_x + 24}" y="{y0 + 112}" width="280" height="56" '
        f'rx="12" fill="{C["white"]}"/>\n'
        f'<text x="{chat_x + 40}" y="{y0 + 144}" font-size="13" '
        f'fill="{C["slate"]}">Olá! Tenho interesse no quarto.</text>\n'
        f'<rect x="{chat_x + chat_w - 304}" y="{y0 + 180}" width="280" '
        f'height="56" rx="12" fill="{C["menthe"]}"/>\n'
        f'<text x="{chat_x + chat_w - 288}" y="{y0 + 212}" font-size="13" '
        f'fill="{C["white"]}">Oi! Quando pode visitar?</text>\n'
        f'<rect x="{chat_x + 16}" y="{H - 64}" width="{chat_w - 80}" '
        f'height="44" rx="22" fill="{C["white"]}" stroke="{C["gray200"]}"/>\n'
        f'<text x="{chat_x + 32}" y="{H - 36}" font-size="13" '
        f'fill="{C["gray400"]}">escreva uma mensagem...</text>\n'
        f'{comp_btn(chat_x + chat_w - 56, H - 60, 40, 36, ">", "primary", "send")}\n'
        f'<text x="{chat_x + 24}" y="{H - 72}" font-size="10" '
        f'fill="{C["gray400"]}">[Plus] Compartilhar WhatsApp — RF36</text>\n'
        f'</g>'
    )

    ix = W - info_w
    s += (
        f'<g id="component/chat/info-imovel">\n'
        f'<rect x="{ix}" y="{y0}" width="{info_w}" height="{H - y0}" '
        f'fill="{C["white"]}"/>\n'
        f'<line x1="{ix}" y1="{y0}" x2="{ix}" y2="{H}" '
        f'stroke="{C["gray200"]}"/>\n'
        f'<text x="{ix + 24}" y="{y0 + 36}" font-size="14" font-weight="600" '
        f'fill="{C["slate"]}">Info do imóvel</text>\n'
        f'<rect x="{ix + 24}" y="{y0 + 52}" width="{info_w - 48}" height="120" '
        f'rx="8" fill="{C["gray200"]}"/>\n'
        f'<text x="{ix + 24}" y="{y0 + 196}" font-size="13" font-weight="600" '
        f'fill="{C["slate"]}">Quarto · Barão Geraldo</text>\n'
        f'<text x="{ix + 24}" y="{y0 + 220}" font-size="12" '
        f'fill="{C["gray600"]}">RATEIO</text>\n'
    )
    for i, (k, v) in enumerate([("Aluguel", "R$ 600"), ("Total", "R$ 850")]):
        ry = y0 + 240 + i * 24
        s += (
            f'<text x="{ix + 24}" y="{ry}" font-size="11" '
            f'fill="{C["gray600"]}">{k}</text>\n'
            f'<text x="{ix + info_w - 24}" y="{ry}" text-anchor="end" '
            f'font-size="11" font-weight="600" fill="{C["slate"]}">{v}</text>\n'
        )
    s += (
        f'<text x="{ix + 24}" y="{y0 + 300}" font-size="12" font-weight="600" '
        f'fill="{C["slate"]}">TAGS EM COMUM</text>\n'
    )
    s += comp_tag(ix + 24, y0 + 312, "Pet Friendly", True)
    s += comp_tag(ix + 140, y0 + 312, "Silêncio", True)
    s += comp_btn(ix + 24, H - 80, info_w - 48, 44, "VER IMÓVEL", "primary", "ver")
    s += "</g>"
    s += svg_close()
    return s


def screen_meus_anuncios() -> str:
    s = svg_open("Locador · Meus Anúncios")
    s += comp_header()
    s += comp_page_title("Meus Anúncios")
    y = HEADER_H + TITLE_H + 24
    s += comp_btn(W - 180, HEADER_H + 8, 148, 36, "+ Publicar", "primary", "pub")
    for i in range(3):
        s += comp_card_horizontal(32, y + i * 136, W - 64, f"anuncio-{i}")
    s += svg_close()
    return s


def screen_publicar() -> str:
    s = svg_open("Locador · Publicar Anúncio")
    s += comp_header()
    s += comp_page_title("Publicar Anúncio")
    x = 32
    w = W - 680
    y = HEADER_H + TITLE_H + 32
    s += comp_field(x, y, w, "Título", "Quarto em república", "titulo")
    s += comp_field(x, y + 80, w, "Endereço / Bairro", "Barão Geraldo", "end")
    s += comp_field(x, y + 160, w // 2 - 8, "Aluguel", "R$ 600", "aluguel")
    s += comp_field(x + w // 2, y + 160, w // 2 - 8, "Condomínio", "R$ 120", "cond")
    s += comp_field(x, y + 240, w // 2 - 8, "IPTU", "R$ 45", "iptu")
    s += comp_field(x + w // 2, y + 240, w // 2 - 8, "Contas (est.)", "R$ 85", "contas")
    px = W - 600
    s += (
        f'<g id="content/fotos">\n'
        f'<text x="{px}" y="{y}" font-size="14" font-weight="600" '
        f'fill="{C["slate"]}">Fotos do imóvel</text>\n'
        f'<rect x="{px}" y="{y + 16}" width="536" height="280" rx="12" '
        f'fill="{C["white"]}" stroke="{C["gray200"]}" stroke-dasharray="8 4"/>\n'
        f'<text x="{px + 268}" y="{y + 160}" text-anchor="middle" font-size="14" '
        f'fill="{C["gray400"]}">+ Adicionar fotos</text>\n'
        f'</g>\n'
    )
    s += (
        f'<g id="content/tags">\n'
        f'<text x="{px}" y="{y + 320}" font-size="14" font-weight="600" '
        f'fill="{C["slate"]}">Tags de convivência</text>\n'
    )
    tags = ["Pet Friendly", "Silêncio", "Home Office"]
    for i, t in enumerate(tags):
        s += comp_tag(px + i * 140, y + 336, t, i == 0)
    s += "</g>"
    s += comp_btn(32, H - 80, 200, 48, "Publicar", "primary", "publicar")
    s += svg_close()
    return s


SCREENS_DEF = [
    ("01-locatario-mural", screen_mural),
    ("02-locatario-imovel-blur", lambda: screen_imovel_expandido(True)),
    ("03-locatario-imovel-logado", lambda: screen_imovel_expandido(False)),
    ("04-compartilhado-auth-gate",
     lambda: screen_auth_centered("Bem-vindo ao RoomMatch",
                                  "Encontre moradia compatível na RMC", False)),
    ("05-compartilhado-login",
     lambda: screen_auth_centered("Entrar", "Acesse sua conta", True)),
    ("06-locatario-cadastro-dados",
     lambda: screen_cadastro_form("Dados pessoais",
         [("Nome completo", "Seu nome"), ("E-mail", "seu@email.com"),
          ("Telefone", "(19) 99999-9999"),
          ("Ocupação / Instituição", "Estudante · PUC")], 1, "Locatário")),
    ("07-locatario-cadastro-preferencias",
     lambda: screen_cadastro_form("Preferências",
         [("Tags de convivência", "Selecione abaixo"),
          ("Orçamento máximo", "R$ 900"),
          ("Limiar de compatibilidade", "70%")], 2, "Locatário")),
    ("08-locatario-cadastro-termos",
     lambda: screen_cadastro_form("Termos e LGPD",
         [("Consentimento", "Li e aceito os termos de uso")], 3, "Locatário")),
    ("09-locador-cadastro-dados",
     lambda: screen_cadastro_form("Dados pessoais",
         [("Nome completo", "Seu nome"), ("E-mail", "seu@email.com"),
          ("Telefone", "(19) 99999-9999")], 1, "Locador")),
    ("10-locador-cadastro-imovel",
     lambda: screen_cadastro_form("Dados do imóvel",
         [("Endereço / Bairro", "Barão Geraldo"),
          ("Tipo", "Quarto · República"),
          ("Aluguel", "R$ 600"), ("Condomínio + IPTU", "R$ 165")], 2, "Locador")),
    ("11-locador-cadastro-termos",
     lambda: screen_cadastro_form("Termos e LGPD",
         [("Consentimento", "Li e aceito os termos de uso")], 3, "Locador")),
    ("12-compartilhado-config-perfil",
     lambda: screen_settings("Config · Perfil", "perfil", body_perfil)),
    ("13-locatario-preferencias",
     lambda: screen_settings("Config · Preferências", "pref", body_preferencias)),
    ("14-locatario-favoritos",
     lambda: screen_settings("Config · Favoritos", "fav", body_favoritos)),
    ("15-compartilhado-seguranca",
     lambda: screen_settings("Config · Segurança", "seg", body_seguranca)),
    ("16-locatario-chat", lambda: screen_chat("Locatário")),
    ("17-locador-meus-anuncios", screen_meus_anuncios),
    ("18-locador-publicar", screen_publicar),
    ("19-locador-chat", lambda: screen_chat("Locador")),
]


def write_components_library() -> str:
    """Standalone components page for Figma import."""
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" '
        f'viewBox="0 0 1600 1200" data-screen="Components Library">',
        f'<rect width="1600" height="1200" fill="{C["gray100"]}"/>',
        f'<text x="32" y="40" font-family="Comfortaa,sans-serif" font-size="24" '
        f'font-weight="700" fill="{C["slate"]}">RoomMatch · Component Library</text>',
    ]
    y = 80
    parts.append(
        f'<text x="32" y="{y}" font-size="14" font-weight="600" '
        f'fill="{C["slate"]}">Colors</text>'
    )
    for i, (name, hexv) in enumerate([
        ("Menthe", C["menthe"]), ("Nectarine", C["nectarine"]),
        ("Salmon", C["salmon"]), ("Slate", C["slate"]),
    ]):
        x = 32 + i * 140
        parts += [
            f'<rect x="{x}" y="{y + 16}" width="120" height="48" rx="8" fill="{hexv}"/>',
            f'<text x="{x}" y="{y + 84}" font-size="11" fill="{C["slate"]}">{name}</text>',
        ]
    y += 120
    parts.append(f'<text x="32" y="{y}" font-size="14" font-weight="600" fill="{C["slate"]}">Buttons</text>')
    parts.append(comp_btn(32, y + 16, 140, 44, "Primary", "primary", "lib-primary"))
    parts.append(comp_btn(184, y + 16, 140, 44, "Secondary", "secondary", "lib-secondary"))
    parts.append(comp_btn(336, y + 16, 140, 44, "Danger", "danger", "lib-danger"))
    parts.append(comp_btn(488, y + 16, 140, 44, "Ghost", "ghost", "lib-ghost"))
    y += 100
    parts.append(f'<text x="32" y="{y}" font-size="14" font-weight="600" fill="{C["slate"]}">Tags</text>')
    parts.append(comp_tag(32, y + 16, "Pet Friendly", True))
    parts.append(comp_tag(160, y + 16, "Silêncio", False))
    parts.append(comp_tag(260, y + 16, "Home Office", False))
    parts.append(comp_badge(400, y + 16, "85%"))
    y += 80
    parts.append(f'<text x="32" y="{y}" font-size="14" font-weight="600" fill="{C["slate"]}">Input</text>')
    parts.append(comp_field(32, y + 16, 320, "Label", "Placeholder", "lib-input"))
    y += 100
    parts.append(comp_card_imovel(32, y + 16, 280, 240, "lib-card"))
    parts.append(comp_card_horizontal(340, y + 16, 600, "lib-row"))
    y += 280
    parts.append(f'<text x="32" y="{y}" font-size="14" font-weight="600" fill="{C["slate"]}">Header (1440px)</text>')
    # Mini header preview
    parts += [
        f'<g transform="translate(32,{y + 16}) scale(0.5)">',
        comp_header(),
        f'</g>',
    ]
    parts.append('</svg>')
    content = "\n".join(parts)
    (OUT / "components" / "component-library.svg").write_text(content, encoding="utf-8")
    return content


def write_html_canvas(screens: list) -> None:
    cols = 2
    gap = 48
    fw, fh = W, H
    frames = []
    for i, (fname, svg) in enumerate(screens):
        col = i % cols
        row = i // cols
        x = col * (fw + gap)
        y = row * (fh + gap + 48)
        inner = svg.replace('<?xml version="1.0" encoding="UTF-8"?>\n', "")
        label = fname.replace("-", " · ", 1)
        frames.append(
            f'<section class="frame" data-name="{label}" '
            f'style="left:{x}px;top:{y}px;width:{fw}px;height:{fh}px">'
            f'<p class="frame-label">{label}</p>{inner}</section>'
        )
    canvas_w = cols * (fw + gap)
    canvas_h = ((len(screens) + cols - 1) // cols) * (fh + gap + 48)

    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=1440"/>
<title>RoomMatch MVP Web — Kit Figma</title>
<link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
:root {{
  --menthe: {C['menthe']};
  --nectarine: {C['nectarine']};
  --salmon: {C['salmon']};
  --slate: {C['slate']};
  --gray100: {C['gray100']};
  --gray200: {C['gray200']};
  --frame-w: {fw}px;
  --frame-h: {fh}px;
}}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ background: #1a1a1a; font-family: 'DM Sans', sans-serif; padding: 48px; }}
.canvas {{ position: relative; width: {canvas_w}px; height: {canvas_h}px; }}
.frame {{
  position: absolute;
  background: var(--gray100);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 0 1px #444;
}}
.frame-label {{
  position: absolute; top: -32px; left: 0;
  font-size: 12px; color: #ccc; white-space: nowrap;
  font-weight: 600;
}}
.badge {{
  position: fixed; top: 16px; right: 16px;
  background: var(--menthe); color: #fff;
  padding: 10px 20px; border-radius: 8px; font-size: 13px;
}}
</style>
</head>
<body>
<div class="badge">RoomMatch Web · 1440×900 · 19 telas · html.to.design</div>
<div class="canvas">
{''.join(frames)}
</div>
</body>
</html>
"""
    (OUT / "roommatch-mvp-canvas.html").write_text(html, encoding="utf-8")


def write_components_html() -> None:
    """Separate HTML page with only components for Figma component setup."""
    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>RoomMatch — Components</title>
<link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
:root {{
  --menthe: {C['menthe']};
  --nectarine: {C['nectarine']};
  --salmon: {C['salmon']};
  --slate: {C['slate']};
  --white: {C['white']};
  --gray100: {C['gray100']};
  --gray200: {C['gray200']};
  --gray400: {C['gray400']};
  --gray600: {C['gray600']};
}}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: 'DM Sans', sans-serif; padding: 48px; background: #1a1a1a; color: #fff; }}
.page {{ display: flex; flex-wrap: wrap; gap: 32px; max-width: 1600px; }}
.section {{ background: var(--gray100); border-radius: 12px; padding: 24px; min-width: 320px; }}
.section h2 {{ font-family: Comfortaa, sans-serif; color: var(--slate); font-size: 14px; margin-bottom: 16px; }}
.row {{ display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }}

/* component/button/primary */
.component-button-primary {{
  background: var(--menthe); color: #fff; border: none;
  padding: 12px 24px; border-radius: 10px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
  cursor: pointer;
}}
.component-button-secondary {{
  background: var(--white); color: var(--slate);
  border: 1px solid var(--gray200);
  padding: 12px 24px; border-radius: 10px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
}}
.component-button-danger {{
  background: var(--salmon); color: #fff; border: none;
  padding: 12px 24px; border-radius: 10px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
}}
.component-button-ghost {{
  background: var(--white); color: var(--gray600);
  border: 1px dashed var(--gray200);
  padding: 12px 24px; border-radius: 10px;
  font-family: 'DM Sans', sans-serif; font-size: 13px;
}}

/* component/tag */
.component-tag {{
  display: inline-block; padding: 6px 16px; border-radius: 16px;
  font-size: 12px; border: 1px solid var(--gray200);
  background: var(--white); color: var(--slate);
}}
.component-tag-active {{
  background: var(--salmon); color: #fff; border-color: var(--salmon);
}}

/* component/badge-afinidade */
.component-badge-afinidade {{
  display: inline-block; background: var(--menthe); color: #fff;
  padding: 6px 14px; border-radius: 16px;
  font-size: 13px; font-weight: 700;
}}

/* component/input */
.component-input-group {{ display: flex; flex-direction: column; gap: 6px; }}
.component-input-label {{ font-size: 12px; font-weight: 500; color: var(--gray600); }}
.component-input {{
  width: 280px; height: 44px; padding: 0 14px;
  border: 1px solid var(--gray200); border-radius: 8px;
  font-size: 14px; color: var(--gray400); background: var(--white);
}}

/* component/card-imovel */
.component-card-imovel {{
  width: 280px; background: var(--white);
  border: 1px solid var(--gray200); border-radius: 12px; overflow: hidden;
}}
.component-card-imovel-img {{
  height: 154px; background: var(--gray200);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: var(--gray600); position: relative;
}}
.component-card-imovel-body {{ padding: 16px; }}
.component-card-imovel-price {{ font-size: 16px; font-weight: 700; color: var(--menthe); margin-top: 8px; }}

/* component/header */
.component-header {{
  width: 1440px; height: 64px; background: var(--white);
  border-bottom: 1px solid var(--gray200);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 32px;
}}
.component-header-logo {{ font-family: Comfortaa, sans-serif; font-size: 22px; font-weight: 700; color: var(--menthe); }}
.component-header-nav {{ display: flex; gap: 32px; align-items: center; }}
.component-header-avatar {{ width: 36px; height: 36px; border-radius: 50%; background: var(--gray200); }}

/* Colors */
.swatch {{ width: 80px; height: 48px; border-radius: 8px; }}
.swatch-label {{ font-size: 11px; color: var(--slate); margin-top: 4px; }}
</style>
</head>
<body>
<h1 style="font-family:Comfortaa;color:#5EA38F;margin-bottom:32px;font-size:24px">
  RoomMatch · Component Library (Web)
</h1>
<div class="page">

  <div class="section" data-component="colors">
    <h2>Colors</h2>
    <div class="row">
      <div><div class="swatch" style="background:#5EA38F"></div><div class="swatch-label">Menthe</div></div>
      <div><div class="swatch" style="background:#FBB050"></div><div class="swatch-label">Nectarine</div></div>
      <div><div class="swatch" style="background:#F08070"></div><div class="swatch-label">Salmon</div></div>
      <div><div class="swatch" style="background:#141D22"></div><div class="swatch-label">Slate</div></div>
    </div>
  </div>

  <div class="section" data-component="buttons">
    <h2>Buttons</h2>
    <div class="row">
      <button class="component-button-primary">Primary</button>
      <button class="component-button-secondary">Secondary</button>
      <button class="component-button-danger">Danger</button>
      <button class="component-button-ghost">Ghost</button>
    </div>
  </div>

  <div class="section" data-component="tags">
    <h2>Tags & Badge</h2>
    <div class="row">
      <span class="component-tag component-tag-active">Pet Friendly</span>
      <span class="component-tag">Silêncio</span>
      <span class="component-tag">Home Office</span>
      <span class="component-badge-afinidade">85% afinidade</span>
    </div>
  </div>

  <div class="section" data-component="inputs">
    <h2>Input</h2>
    <div class="component-input-group">
      <label class="component-input-label">Label</label>
      <input class="component-input" placeholder="Placeholder" readonly/>
    </div>
  </div>

  <div class="section" data-component="card-imovel">
    <h2>Card Imóvel</h2>
    <div class="component-card-imovel">
      <div class="component-card-imovel-img">
        img placeholder
        <span class="component-badge-afinidade" style="position:absolute;top:12px;right:12px">85%</span>
      </div>
      <div class="component-card-imovel-body">
        <div style="height:8px;width:120px;background:#E2E8EB;border-radius:4px;margin-bottom:8px"></div>
        <div style="height:6px;width:80px;background:#E2E8EB;border-radius:3px"></div>
        <div class="component-card-imovel-price">R$ 850/mês</div>
      </div>
    </div>
  </div>

  <div class="section" data-component="header" style="min-width:100%;padding:0;overflow:hidden">
    <h2 style="padding:24px 24px 0">Header</h2>
    <header class="component-header">
      <span class="component-header-logo">RoomMatch</span>
      <nav class="component-header-nav">
        <div style="text-align:center"><div class="component-header-avatar"></div><span style="font-size:10px;color:#4A5568">Perfil</span></div>
        <div style="text-align:center"><div class="component-header-avatar"></div><span style="font-size:10px;color:#4A5568">Config</span></div>
      </nav>
    </header>
  </div>

</div>
</body>
</html>
"""
    (OUT / "roommatch-components.html").write_text(html, encoding="utf-8")


def write_tokens() -> None:
    import json
    tokens = {
        "RoomMatch/Web": {
            "color": {
                "primary": {"value": C["menthe"], "type": "color"},
                "secondary": {"value": C["nectarine"], "type": "color"},
                "accent": {"value": C["salmon"], "type": "color"},
                "background": {"value": C["slate"], "type": "color"},
                "surface": {"value": C["white"], "type": "color"},
                "surface-muted": {"value": C["gray100"], "type": "color"},
                "border": {"value": C["gray200"], "type": "color"},
                "text-primary": {"value": C["slate"], "type": "color"},
                "text-muted": {"value": C["gray600"], "type": "color"},
            },
            "font": {
                "brand": {"value": "Comfortaa", "type": "fontFamilies"},
                "ui": {"value": "DM Sans", "type": "fontFamilies"},
            },
            "frame": {
                "desktop-width": {"value": "1440", "type": "sizing"},
                "desktop-height": {"value": "900", "type": "sizing"},
                "sidebar-width": {"value": "220", "type": "sizing"},
                "header-height": {"value": "64", "type": "sizing"},
            },
            "spacing": {
                "xs": {"value": "4", "type": "spacing"},
                "sm": {"value": "8", "type": "spacing"},
                "md": {"value": "16", "type": "spacing"},
                "lg": {"value": "24", "type": "spacing"},
                "xl": {"value": "32", "type": "spacing"},
                "2xl": {"value": "48", "type": "spacing"},
            },
            "radius": {
                "sm": {"value": "8", "type": "borderRadius"},
                "md": {"value": "12", "type": "borderRadius"},
                "pill": {"value": "999", "type": "borderRadius"},
            },
        }
    }
    (OUT / "tokens" / "design-tokens.json").write_text(
        json.dumps(tokens, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    SCREENS.mkdir(parents=True, exist_ok=True)
    written = []
    for fname, builder in SCREENS_DEF:
        content = builder()
        (SCREENS / f"{fname}.svg").write_text(content, encoding="utf-8")
        written.append((fname, content))
    write_html_canvas(written)
    write_components_html()
    write_components_library()
    write_tokens()
    print("Web kit: {n} screens · 1440×900 · components ready".format(n=len(written)))
