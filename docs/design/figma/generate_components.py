#!/usr/bin/env python3
"""Generate RoomMatch design system components SVG for Figma."""

from pathlib import Path

OUT = Path(__file__).parent / "components" / "design-system.svg"

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
}

W, H = 1200, 600

parts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
    f'viewBox="0 0 {W} {H}" data-screen="Design System Components">',
    f'<rect width="{W}" height="{H}" fill="{C["gray100"]}"/>',
    f'<text x="24" y="36" font-family="Comfortaa,sans-serif" font-size="20" '
    f'font-weight="700" fill="{C["slate"]}">RoomMatch · Design System</text>',
]

# Colors
colors = [
    ("Menthe / Primary", C["menthe"]),
    ("Nectarine / Secondary", C["nectarine"]),
    ("Salmon / Accent", C["salmon"]),
    ("Slate / Background", C["slate"]),
]
for i, (name, hexv) in enumerate(colors):
    x = 24 + i * 140
    parts += [
        f'<g id="color-{name.split()[0].lower()}">',
        f'<rect x="{x}" y="60" width="120" height="60" rx="8" fill="{hexv}"/>',
        f'<text x="{x}" y="140" font-family="DM Sans,sans-serif" font-size="10" '
        f'fill="{C["slate"]}">{name}</text>',
        f'<text x="{x}" y="154" font-family="DM Sans,sans-serif" font-size="9" '
        f'fill="{C["gray600"]}">{hexv}</text>',
        f'</g>',
    ]

# Buttons
parts += [
    f'<g id="btn-primary">',
    f'<rect x="24" y="180" width="140" height="44" rx="12" fill="{C["menthe"]}"/>',
    f'<text x="94" y="207" text-anchor="middle" font-family="DM Sans,sans-serif" '
    f'font-size="13" font-weight="600" fill="{C["white"]}">Primary</text>',
    f'</g>',
    f'<g id="btn-secondary">',
    f'<rect x="180" y="180" width="140" height="44" rx="12" fill="{C["white"]}" '
    f'stroke="{C["gray200"]}"/>',
    f'<text x="250" y="207" text-anchor="middle" font-family="DM Sans,sans-serif" '
    f'font-size="13" font-weight="600" fill="{C["slate"]}">Secondary</text>',
    f'</g>',
]

# Tags
for i, (label, active) in enumerate([
    ("Pet Friendly", True), ("Silêncio", False), ("Home Office", False),
]):
    fill = C["salmon"] if active else C["white"]
    stroke = C["salmon"] if active else C["gray200"]
    tf = C["white"] if active else C["slate"]
    x = 24 + i * 120
    parts += [
        f'<g id="tag-{i}">',
        f'<rect x="{x}" y="250" width="100" height="28" rx="14" fill="{fill}" '
        f'stroke="{stroke}"/>',
        f'<text x="{x + 50}" y="268" text-anchor="middle" '
        f'font-family="DM Sans,sans-serif" font-size="10" fill="{tf}">{label}</text>',
        f'</g>',
    ]

# Badge afinidade
parts += [
    f'<g id="badge-afinidade">',
    f'<rect x="24" y="300" width="64" height="28" rx="14" fill="{C["menthe"]}"/>',
    f'<text x="56" y="318" text-anchor="middle" font-family="DM Sans,sans-serif" '
    f'font-size="12" font-weight="700" fill="{C["white"]}">85%</text>',
    f'</g>',
]

# Typography
parts += [
    f'<g id="typography">',
    f'<text x="24" y="370" font-family="Comfortaa,sans-serif" font-size="24" '
    f'font-weight="700" fill="{C["slate"]}">Comfortaa — Título</text>',
    f'<text x="24" y="400" font-family="DM Sans,sans-serif" font-size="14" '
    f'fill="{C["slate"]}">DM Sans — Corpo e UI</text>',
    f'<text x="24" y="424" font-family="DM Sans,sans-serif" font-size="11" '
    f'fill="{C["gray600"]}">Rateio · Filtros · Tags</text>',
    f'</g>',
]

# Card preview
parts += [
    f'<g id="card-imovel-preview">',
    f'<rect x="400" y="60" width="280" height="380" rx="16" fill="{C["white"]}"/>',
    f'<rect x="400" y="60" width="280" height="180" rx="16" fill="{C["gray200"]}"/>',
    f'<rect x="416" y="256" width="64" height="28" rx="14" fill="{C["menthe"]}"/>',
    f'<text x="448" y="274" text-anchor="middle" font-size="12" font-weight="700" '
    f'fill="{C["white"]}">85%</text>',
    f'<text x="416" y="310" font-family="Comfortaa,sans-serif" font-size="14" '
    f'font-weight="700" fill="{C["slate"]}">Quarto · República</text>',
    f'<text x="416" y="334" font-family="DM Sans,sans-serif" font-size="18" '
    f'font-weight="700" fill="{C["menthe"]}">R$ 850/mês</text>',
    f'</g>',
]

# Header
parts += [
    f'<g id="header-component">',
    f'<rect x="720" y="60" width="390" height="56" fill="{C["white"]}"/>',
    f'<text x="740" y="94" font-family="Comfortaa,sans-serif" font-size="18" '
    f'font-weight="700" fill="{C["menthe"]}">RoomMatch</text>',
    f'<circle cx="1060" cy="88" r="16" fill="{C["gray200"]}"/>',
    f'<circle cx="1090" cy="88" r="16" fill="{C["gray200"]}"/>',
    f'</g>',
]

# Input
parts += [
    f'<g id="input-field">',
    f'<text x="720" y="150" font-family="DM Sans,sans-serif" font-size="11" '
    f'fill="{C["gray600"]}">Label</text>',
    f'<rect x="720" y="156" width="280" height="40" rx="8" fill="{C["white"]}" '
    f'stroke="{C["gray200"]}"/>',
    f'<text x="732" y="182" font-family="DM Sans,sans-serif" font-size="12" '
    f'fill="{C["gray400"]}">Placeholder</text>',
    f'</g>',
]

parts.append("</svg>")

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text("\n".join(parts) + "\n", encoding="utf-8")
print("Wrote", OUT)
