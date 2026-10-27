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


# --- camada de banco (imovel_tags / usuario_tags), com sessão falsa ---

from types import SimpleNamespace
from unittest.mock import MagicMock


def _db_com_linhas(linhas):
    """query(...).join(...).filter(...).all() devolve `linhas`."""
    db = MagicMock()
    db.query.return_value.join.return_value.filter.return_value.all.return_value = linhas
    return db


def test_tags_por_imovel_agrupa_por_imovel_e_inclui_vazios():
    db = _db_com_linhas([(1, "Pet Friendly"), (1, "Home Office"), (2, "Vegetariano")])
    assert matching.tags_por_imovel(db, [1, 2, 3]) == {
        1: ["Pet Friendly", "Home Office"],
        2: ["Vegetariano"],
        3: [],
    }


def test_tags_por_imovel_sem_ids_nao_consulta_o_banco():
    db = MagicMock()
    assert matching.tags_por_imovel(db, []) == {}
    db.query.assert_not_called()


def test_tags_do_imovel():
    db = _db_com_linhas([(7, "Pet Friendly")])
    assert matching.tags_do_imovel(db, 7) == ["Pet Friendly"]


def test_tags_do_usuario_prefere_usuario_tags():
    db = _db_com_linhas([("Pet Friendly",)])
    usuario = SimpleNamespace(id_usuario=1, tags_convivencia=["Outra"])
    locatario = SimpleNamespace(tags_estilo_vida=["Home Office"])
    assert matching.tags_do_usuario(db, usuario, locatario) == ["Pet Friendly"]


def test_tags_do_usuario_cai_no_estilo_de_vida_e_depois_no_perfil():
    db = _db_com_linhas([])
    usuario = SimpleNamespace(id_usuario=1, tags_convivencia=["Pet Friendly"])
    com_estilo = SimpleNamespace(tags_estilo_vida=["Home Office"])
    sem_estilo = SimpleNamespace(tags_estilo_vida=None)
    assert matching.tags_do_usuario(db, usuario, com_estilo) == ["Home Office"]
    assert matching.tags_do_usuario(db, usuario, sem_estilo) == ["Pet Friendly"]
    assert matching.tags_do_usuario(db, usuario) == ["Pet Friendly"]


def test_tags_do_usuario_sem_nada_e_vazio():
    db = _db_com_linhas([])
    assert matching.tags_do_usuario(db, SimpleNamespace(id_usuario=1, tags_convivencia=None)) == []


def test_tags_correspondentes_normaliza():
    assert matching.tags_correspondentes(
        ["pet friendly", "Silêncio"], ["Pet Friendly", "Silêncio Noturno", "Festas"]
    ) == ["Pet Friendly", "Silêncio Noturno"]
    assert matching.tags_correspondentes([], ["Pet Friendly"]) == []
