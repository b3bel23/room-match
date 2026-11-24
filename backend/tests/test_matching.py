"""Unit tests for matching.service — afinidade adesão/restrição + conflitos."""

from __future__ import annotations

from app.services import matching_service as matching

match_percent = matching.match_percent
avaliar_elegibilidade_chat = matching.avaliar_elegibilidade_chat
match_medio = matching.match_medio
normalizar_tag = matching.normalizar_tag

MORADOR_TAGS = ["Aceita Animais", "Silêncio Noturno", "Trabalho em Casa"]


def test_normalizar_tag_aliases():
    assert normalizar_tag("Vegano/Vegetariano") == "vegetariano"
    assert normalizar_tag("Silêncio") == "silêncio noturno"
    assert normalizar_tag("Pet Friendly") == "aceita animais"


def test_match_full_overlap():
    assert match_percent(
        MORADOR_TAGS,
        ["Aceita Animais", "Silêncio Noturno", "Trabalho em Casa"],
    ) == 100


def test_match_aliases_antigos_contam():
    """Pet Friendly / Home Office no anúncio cobrem o catálogo canônico."""
    assert match_percent(
        MORADOR_TAGS,
        ["Pet Friendly", "Home Office", "Silêncio Noturno"],
    ) == 100


def test_match_partial_adesao():
    # Aceita Animais falta; Silêncio (restrição) ok em silêncio; Trabalho ok → 2/3
    assert match_percent(
        MORADOR_TAGS,
        ["Silêncio Noturno", "Trabalho em Casa", "LGBTQIA+ Acolhedor"],
    ) == 67


def test_match_ignora_comodidades_e_lixo():
    assert match_percent(
        MORADOR_TAGS,
        ["Aceita Animais", "Silêncio Noturno", "Trabalho em Casa", "Wi-Fi", "Mobiliado"],
    ) == 100
    # Lixo no perfil não entra no denominador.
    assert match_percent(
        ["Aceita Animais", "enzo", "string", "Wi-Fi"],
        ["Aceita Animais", "Silêncio Noturno"],
    ) == 100
    assert match_percent(
        ["Wi-Fi", "Mobiliado"],
        ["Wi-Fi", "Mobiliado", "Aceita Animais"],
        seed_match=88,
    ) == 88


def test_restricao_silencio_no_anuncio_e_ok():
    """Sem Festas no morador + anúncio sem festas nem 'Aberto a Festas' = ok."""
    assert match_percent(
        ["Sem Festas", "Trabalho em Casa"],
        ["Trabalho em Casa", "Aceita Animais"],
    ) == 100


def test_restricao_conflito_dura_teto():
    """Sem Festas × Aberto a Festas → conflito duro (teto 35)."""
    m = match_percent(
        ["Sem Festas", "Trabalho em Casa"],
        ["Aberto a Festas", "Trabalho em Casa"],
    )
    assert m <= 35
    assert m == 35  # 1/2 = 50, cortado pelo teto


def test_adesao_conflito_com_restricao_do_anuncio():
    """Quer Aceita Animais × anúncio Sem Animais → conflito."""
    m = match_percent(
        ["Aceita Animais", "Trabalho em Casa"],
        ["Sem Animais", "Trabalho em Casa"],
    )
    assert m <= 35


def test_vegano_cobre_vegetariano():
    assert match_percent(
        ["Vegetariano", "Trabalho em Casa"],
        ["Vegano", "Trabalho em Casa"],
    ) == 100


def test_match_zero_catalog_sem_seed():
    # Anúncio sem convivência: restrição ok, adesões faltando → 1/3
    assert match_percent(
        MORADOR_TAGS,
        ["Wi-Fi", "Mobiliado"],
    ) == 33


def test_match_without_user_tags_uses_seed():
    assert match_percent([], ["Aceita Animais"], seed_match=92) == 92
    assert match_percent(None, ["Aceita Animais"], seed_match=78) == 78


def test_chat_requires_limiar_and_orcamento():
    eleg = avaliar_elegibilidade_chat(
        user_tags=MORADOR_TAGS,
        imovel_tags=["Aceita Animais", "Silêncio Noturno", "Trabalho em Casa"],
        limiar=70,
        orcamento=1200,
        preco=850,
        papel="Morador",
    )
    assert eleg["match"] == 100
    assert eleg["chat_liberado"] is True

    bloqueado = avaliar_elegibilidade_chat(
        user_tags=MORADOR_TAGS,
        imovel_tags=["Trabalho em Casa"],
        limiar=70,
        orcamento=1200,
        preco=850,
        papel="Morador",
    )
    # Trabalho ok + Silêncio (restrição) ok em silêncio + Aceita falta = 67 < 70
    assert bloqueado["match"] == 67
    assert bloqueado["limiar_ok"] is False
    assert bloqueado["chat_liberado"] is False

    caro = avaliar_elegibilidade_chat(
        user_tags=MORADOR_TAGS,
        imovel_tags=["Aceita Animais", "Silêncio Noturno", "Trabalho em Casa"],
        limiar=70,
        orcamento=800,
        preco=850,
        papel="Morador",
    )
    assert caro["orcamento_ok"] is False
    assert caro["chat_liberado"] is False


def test_match_medio_personalizado():
    imoveis = [
        {"tags": ["Aceita Animais", "Silêncio Noturno", "Trabalho em Casa"], "match_percent": 92},
        {"tags": ["Trabalho em Casa"], "match_percent": 78},
    ]
    assert match_medio(MORADOR_TAGS, imoveis) == round((100 + 67) / 2)


# --- camada de banco (imovel_tags / usuario_tags), com sessão falsa ---

from types import SimpleNamespace
from unittest.mock import MagicMock


def _db_com_linhas(linhas):
    """query(...).join(...).filter(...).all() devolve `linhas`."""
    db = MagicMock()
    db.query.return_value.join.return_value.filter.return_value.all.return_value = linhas
    return db


def test_tags_por_imovel_agrupa_e_canonicaliza():
    db = _db_com_linhas([
        (1, "Pet Friendly"),
        (1, "Home Office"),
        (1, "Wi-Fi"),
        (2, "Vegetariano"),
    ])
    assert matching.tags_por_imovel(db, [1, 2, 3]) == {
        1: ["Aceita Animais", "Trabalho em Casa"],
        2: ["Vegetariano"],
        3: [],
    }


def test_tags_por_imovel_sem_ids_nao_consulta_o_banco():
    db = MagicMock()
    assert matching.tags_por_imovel(db, []) == {}
    db.query.assert_not_called()


def test_tags_do_usuario_ignora_lixo(monkeypatch):
    db = _db_com_linhas([("enzo",), ("Aceita Animais",), ("Wi-Fi",)])
    # tags_do_usuario usa query.join.filter.all → nomes
    usuario = SimpleNamespace(id_usuario=1, tags_convivencia=[])
    assert matching.tags_do_usuario(db, usuario) == ["Aceita Animais"]
