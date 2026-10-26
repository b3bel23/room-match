"""
Matching by convivência tags — same contract as frontend mock-api.js.

match% = round( |user_tags ∩ imovel_tags| / |user_tags| * 100 )
Chat opens when match >= limiar AND preco <= orcamento (morador/locatário).
"""

from __future__ import annotations

from typing import Iterable, Mapping, Optional, Sequence


def normalizar_tag(tag: str) -> str:
    t = (tag or "").strip().lower()
    if t in {"vegano/vegetariano", "vegetariano/vegano"}:
        return "vegetariano"
    if t in {"silêncio", "silencio"}:
        return "silêncio noturno"
    return t


def match_percent(
    user_tags: Optional[Sequence[str]],
    imovel_tags: Optional[Sequence[str]],
    *,
    seed_match: Optional[float] = None,
) -> int:
    """
    Personalized match for a logged-in user with tags.
    Without user tags, returns seed_match (catalog preview) or 0.
    Zero overlap returns 0 — never falls back to seed.
    """
    tags_user = [normalizar_tag(t) for t in (user_tags or []) if t]
    if not tags_user:
        return int(seed_match or 0)

    tags_imovel = {normalizar_tag(t) for t in (imovel_tags or []) if t}
    comum = sum(1 for t in tags_user if t in tags_imovel)
    return int(round((comum / len(tags_user)) * 100))


def avaliar_elegibilidade_chat(
    *,
    user_tags: Sequence[str],
    imovel_tags: Sequence[str],
    limiar: Optional[float],
    orcamento: Optional[float],
    preco: float,
    papel: str = "Morador",
) -> dict:
    match = match_percent(user_tags, imovel_tags)
    limiar_val = float(limiar) if limiar is not None else None
    orcamento_val = float(orcamento) if orcamento is not None else None

    limiar_ok = limiar_val is None or match >= limiar_val
    orcamento_ok = (
        orcamento_val is None
        or orcamento_val <= 0
        or float(preco) <= orcamento_val
    )
    chat_liberado = (
        papel in {"Morador", "Locatario", "locatario"}
        and limiar_ok
        and orcamento_ok
    )
    return {
        "match": match,
        "limiar": limiar_val,
        "orcamento": orcamento_val,
        "limiar_ok": limiar_ok,
        "orcamento_ok": orcamento_ok,
        "chat_liberado": chat_liberado,
    }


def match_medio(
    user_tags: Optional[Sequence[str]],
    imoveis: Iterable[Mapping],
    *,
    tags_key: str = "tags",
    seed_key: str = "match_percent",
) -> int:
    """Average personalized match across listings (for /stats)."""
    lista = list(imoveis)
    if not lista:
        return 0
    total = 0
    for imovel in lista:
        total += match_percent(
            user_tags,
            imovel.get(tags_key) or [],
            seed_match=imovel.get(seed_key),
        )
    return int(round(total / len(lista)))
