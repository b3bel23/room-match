"""Unit tests for matching.service — mirrors frontend mock contract."""

from __future__ import annotations

from app.services import matching_service as matching

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


# --- camada de banco, com sessão falsa (não precisa de Postgres) ---

from types import SimpleNamespace
from unittest.mock import MagicMock


def _db_com_moradores(moradores):
    """Sessão falsa: query(...).filter(...).all() devolve integrantes; get() devolve o usuário."""
    integrantes = [SimpleNamespace(id_pessoa=i) for i in moradores]
    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = integrantes
    db.get.side_effect = lambda _model, pk: SimpleNamespace(tags_convivencia=moradores[pk])
    return db


def test_tags_do_imovel_une_moradores_sem_duplicar():
    db = _db_com_moradores({1: ["Pet Friendly", "Home Office"], 2: ["pet friendly", "Vegetariano"]})
    assert matching.tags_do_imovel(db, 10) == ["Pet Friendly", "Home Office", "Vegetariano"]


def test_tags_do_imovel_sem_moradores_e_vazio():
    assert matching.tags_do_imovel(_db_com_moradores({}), 10) == []


def test_tags_do_locatario_usa_estilo_de_vida_e_cai_no_perfil():
    db = MagicMock()
    db.get.return_value = SimpleNamespace(tags_convivencia=["Pet Friendly"])
    com_estilo = SimpleNamespace(id_locatario=1, tags_estilo_vida=["Home Office"])
    sem_estilo = SimpleNamespace(id_locatario=1, tags_estilo_vida=None)
    assert matching.tags_do_locatario(db, com_estilo) == ["Home Office"]
    assert matching.tags_do_locatario(db, sem_estilo) == ["Pet Friendly"]


def test_match_para_post_integra_as_pecas():
    db = _db_com_moradores({1: ["Pet Friendly", "Home Office"]})
    locatario = SimpleNamespace(id_locatario=9, tags_estilo_vida=["Pet Friendly", "Festas"])
    assert matching.match_para_post(db, locatario, 10) == 50
