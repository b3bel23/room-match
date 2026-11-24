"""Catálogo espelhado do front (`frontend/js/tags-catalogo.js`).

Convivência entra no match; comodidades ficam só no anúncio (mesma tabela
`imovel_tags`, sem coluna nova). Nomes ≤ 50 chars (`tags.nome`).
"""

from __future__ import annotations

from typing import Iterable, Optional, Sequence

ADESAO: tuple[str, ...] = (
    "Aceita Animais",
    "Trabalho em Casa",
    "Aberto a Festas",
    "Vegetariano",
    "Vegano",
    "LGBTQIA+ Acolhedor",
    "Limpeza Compartilhada",
    "Visitas Bem-vindas",
    "Aceita Fumo",
    "Flexível com Horários",
    "Casais Bem-vindos",
    "Cozinha Compartilhada",
    "Amigável a Estudantes",
    "Vida Ativa / Esporte",
    "Organizado",
)

RESTRICAO: tuple[str, ...] = (
    "Silêncio Noturno",
    "Sem Festas",
    "Sem Fumo",
    "Sem Animais",
    "Visitas Restritas",
    "Itens Individuais",
    "Sem Álcool",
    "Sem Visitas Noturnas",
    "Cozinha Separada",
    "Quarto Individual",
)

COMODIDADES: tuple[str, ...] = (
    "Wi-Fi",
    "Ar-condicionado",
    "Lavanderia",
    "Garagem",
    "Mobiliado",
    "Área de Lazer",
    "Portaria 24h",
    "Elevador",
    "Varanda",
    "Armários",
)

CONVIVENCIA: tuple[str, ...] = ADESAO + RESTRICAO

# Nomes antigos → canônicos (ou None = removido do catálogo).
_ALIASES: dict[str, Optional[str]] = {
    "Pet Friendly": "Aceita Animais",
    "Home Office": "Trabalho em Casa",
    "Sem Pets": "Sem Animais",
    "LGBTQIA+ Safe": "LGBTQIA+ Acolhedor",
    "LGBTQIA+ acolhedor": "LGBTQIA+ Acolhedor",
    "Aceita Casais": "Casais Bem-vindos",
    "Casais bem-vindos": "Casais Bem-vindos",
    "Sem Casais": None,
    "Rotina Matinal": None,
    # Removidas: nada de substâncias ilegais no catálogo.
    "Cannabis ok": None,
    "420 Friendly": None,
}

# Pares incompatíveis (espelhados em conflitos_de).
_CONFLICTOS_BASE: dict[str, tuple[str, ...]] = {
    "Aberto a Festas": ("Sem Festas", "Silêncio Noturno"),
    "Aceita Animais": ("Sem Animais",),
    "Visitas Bem-vindas": ("Visitas Restritas", "Sem Visitas Noturnas"),
    "Aceita Fumo": ("Sem Fumo",),
    "Cozinha Compartilhada": ("Cozinha Separada",),
    "Limpeza Compartilhada": ("Itens Individuais",),
    "Flexível com Horários": ("Silêncio Noturno",),
}


def _norm(nome: str) -> str:
    import unicodedata

    texto = unicodedata.normalize("NFD", str(nome or ""))
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    return texto.lower().strip()


def canonico(nome: str | None) -> Optional[str]:
    bruto = str(nome or "").strip()
    if not bruto:
        return None
    if bruto in _ALIASES:
        return _ALIASES[bruto]
    for antigo, novo in _ALIASES.items():
        if _norm(antigo) == _norm(bruto):
            return novo
    return bruto


def _mapa_conflitos() -> dict[str, frozenset[str]]:
    mapa: dict[str, set[str]] = {}

    def add(a: str, b: str) -> None:
        if not a or not b or a == b:
            return
        mapa.setdefault(a, set()).add(b)
        mapa.setdefault(b, set()).add(a)

    for origem, lista in _CONFLICTOS_BASE.items():
        for alvo in lista:
            add(origem, alvo)
    return {k: frozenset(v) for k, v in mapa.items()}


CONFLICTOS = _mapa_conflitos()

_ALIASES_COMODIDADE = frozenset(
    {
        "wifi",
        "wi-fi",
        "ar condicionado",
        "ar-condicionado",
        "mobiliado",
        "lavanderia",
        "garagem",
        "area de lazer",
        "área de lazer",
        "portaria 24h",
        "elevador",
        "varanda",
        "armarios",
        "armários",
    }
)

_COMODIDADES_NORM = frozenset(_norm(t) for t in COMODIDADES) | _ALIASES_COMODIDADE


def eh_comodidade(nome: str | None) -> bool:
    c = canonico(nome)
    return bool(c) and _norm(c) in _COMODIDADES_NORM


def conflitos_de(nome: str | None) -> frozenset[str]:
    c = canonico(nome)
    if not c:
        return frozenset()
    return CONFLICTOS.get(c, frozenset())


_CONVIVENCIA_NORM = frozenset(_norm(t) for t in CONVIVENCIA)


def eh_convivencia_catalogo(nome: str | None) -> bool:
    """True se o nome (ou alias) é adesão/restrição do catálogo — não comodidade/lixo."""
    c = canonico(nome)
    return bool(c) and _norm(c) in _CONVIVENCIA_NORM


def filtrar_convivencia(nomes: Sequence[str] | None) -> list[str]:
    """Convivência canônica (aliases resolvidos). Aceita só catálogo + remove comodidade."""
    saida: list[str] = []
    vistos: set[str] = set()
    for t in nomes or []:
        c = canonico(t)
        if not c or eh_comodidade(c) or not eh_convivencia_catalogo(c):
            continue
        chave = _norm(c)
        if chave in vistos:
            continue
        vistos.add(chave)
        saida.append(c)
    return saida


def tags_para_match(nomes: Sequence[str] | None) -> list[str]:
    """Só tags do catálogo de convivência, canônicas — base do match%."""
    return filtrar_convivencia(nomes)


def filtrar_comodidades(nomes: Sequence[str] | None) -> list[str]:
    saida: list[str] = []
    vistos: set[str] = set()
    for t in nomes or []:
        c = canonico(t)
        if not c or not eh_comodidade(c):
            continue
        chave = _norm(c)
        if chave in vistos:
            continue
        vistos.add(chave)
        saida.append(c)
    return saida


def separar(nomes: Iterable[str] | None) -> tuple[list[str], list[str]]:
    return filtrar_convivencia(list(nomes or [])), filtrar_comodidades(list(nomes or []))


def mesclar_tags(
    tags: Sequence[str] | None,
    comodidades: Sequence[str] | None,
) -> list[str]:
    """Une convivência + comodidades preservando ordem e sem duplicar (case-fold)."""
    vistos: set[str] = set()
    saida: list[str] = []
    for t in list(tags or []) + list(comodidades or []):
        c = canonico(t)
        if not c:
            continue
        chave = _norm(c)
        if chave in vistos:
            continue
        vistos.add(chave)
        saida.append(c)
    return saida


def sem_conflitos(nomes: Sequence[str] | None) -> list[str]:
    """Remove tags conflitantes mantendo a ordem (primeira vista ganha)."""
    saida: list[str] = []
    bloqueados: set[str] = set()
    vistos: set[str] = set()
    for bruto in nomes or []:
        c = canonico(bruto)
        if not c or c in bloqueados:
            continue
        chave = _norm(c)
        if chave in vistos:
            continue
        vistos.add(chave)
        saida.append(c)
        if not eh_comodidade(c):
            bloqueados |= set(conflitos_de(c))
    return saida
