"""Unit tests for matching.service — mirrors frontend mock contract."""

from __future__ import annotations

import importlib.util
from pathlib import Path

_SPEC = importlib.util.spec_from_file_location(
    "matching_service",
    Path(__file__).resolve().parents[1] / "app" / "services" / "matching.service.py",
)
matching = importlib.util.module_from_spec(_SPEC)
assert _SPEC.loader is not None
_SPEC.loader.exec_module(matching)

match_percent = matching.match_percent
avaliar_elegibilidade_chat = matching.avaliar_elegibilidade_chat
match_medio = matching.match_medio
normalizar_tag = matching.normalizar_tag

MORADOR_TAGS = ["Pet Friendly", "Silêncio Noturno", "Home Office"]


def test_normalizar_tag_aliases():
    assert normalizar_tag("Vegano/Vegetariano") == "vegetariano"
    assert normalizar_tag("Silêncio") == "silêncio noturno"


def test_match_full_overlap():
    assert match_percent(
        MORADOR_TAGS,
        ["Pet Friendly", "Silêncio Noturno", "Home Office"],
    ) == 100


def test_match_partial():
    assert match_percent(
        MORADOR_TAGS,
        ["Silêncio Noturno", "Home Office", "LGBTQIA+ Safe"],
    ) == 67


def test_match_zero_overlap_is_zero_not_seed():
    assert match_percent(
        MORADOR_TAGS,
        ["Festas Todo Dia"],
        seed_match=88,
    ) == 0


def test_match_without_user_tags_uses_seed():
    assert match_percent([], ["Pet Friendly"], seed_match=92) == 92
    assert match_percent(None, ["Pet Friendly"], seed_match=78) == 78


def test_no_artificial_floor_or_ceiling():
    assert match_percent(
        MORADOR_TAGS,
        ["Home Office", "Vegetariano", "LGBTQIA+ Safe"],
    ) == 33


def test_chat_requires_limiar_and_orcamento():
    eleg = avaliar_elegibilidade_chat(
        user_tags=MORADOR_TAGS,
        imovel_tags=["Pet Friendly", "Silêncio Noturno", "Home Office"],
        limiar=70,
        orcamento=1200,
        preco=850,
        papel="Morador",
    )
    assert eleg["match"] == 100
    assert eleg["chat_liberado"] is True

    bloqueado = avaliar_elegibilidade_chat(
        user_tags=MORADOR_TAGS,
        imovel_tags=["Home Office"],
        limiar=70,
        orcamento=1200,
        preco=850,
        papel="Morador",
    )
    assert bloqueado["match"] == 33
    assert bloqueado["limiar_ok"] is False
    assert bloqueado["chat_liberado"] is False

    caro = avaliar_elegibilidade_chat(
        user_tags=MORADOR_TAGS,
        imovel_tags=["Pet Friendly", "Silêncio Noturno", "Home Office"],
        limiar=70,
        orcamento=800,
        preco=850,
        papel="Morador",
    )
    assert caro["orcamento_ok"] is False
    assert caro["chat_liberado"] is False


def test_match_medio_personalizado():
    imoveis = [
        {"tags": ["Pet Friendly", "Silêncio Noturno", "Home Office"], "match_percent": 92},
        {"tags": ["Home Office"], "match_percent": 78},
    ]
    assert match_medio(MORADOR_TAGS, imoveis) == round((100 + 33) / 2)
