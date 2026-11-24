"""Até 3 destinos em preferencias_moradia (JSONB) — sem coluna nova."""

from app.services.destinos_service import (
    MAX_DESTINOS,
    gravar_em_prefs,
    gravar_modo_em_prefs,
    ler_destinos,
    ler_modo_transporte,
    normalizar_lista,
    normalizar_modo,
    rotulo_curto,
)


def test_max_tres_e_dedup():
    lista = normalizar_lista(
        [
            {"nome": "PUC", "lat": -22.83, "lng": -47.05},
            {"nome": "UNICAMP", "lat": -22.82, "lng": -47.06},
            {"nome": "Centro", "lat": -22.90, "lng": -47.06},
            {"nome": "Extra", "lat": -22.87, "lng": -47.04},
            {"nome": "PUC duplicada", "lat": -22.8301, "lng": -47.0501},
        ]
    )
    assert len(lista) == MAX_DESTINOS
    assert lista[0]["nome"] == "PUC"


def test_legado_destino_unico():
    assert ler_destinos({"destino": {"nome": "PUC", "lat": -22.83, "lng": -47.05}}) == [
        {"nome": "PUC", "lat": -22.83, "lng": -47.05}
    ]


def test_gravar_espelha_primeiro():
    prefs = gravar_em_prefs(
        {},
        [
            {"nome": "A", "lat": -22.1, "lng": -47.1},
            {"nome": "B", "lat": -22.2, "lng": -47.2},
        ],
    )
    assert prefs["destino"]["nome"] == "A"
    assert len(prefs["destinos"]) == 2
    assert ler_destinos(prefs)[1]["nome"] == "B"


def test_limpar_destinos():
    prefs = gravar_em_prefs({"destino": {"nome": "X", "lat": 1, "lng": 2}}, [])
    assert "destino" not in prefs
    assert "destinos" not in prefs
    assert ler_destinos(prefs) == []


def test_preserva_tipo_trabalho_faculdade_outro():
    lista = normalizar_lista(
        [
            {"nome": "Escritório", "lat": -22.9, "lng": -47.0, "tipo": "trabalho"},
            {"nome": "PUC", "lat": -22.83, "lng": -47.05, "tipo": "faculdade"},
            {"nome": "Academia X", "lat": -22.88, "lng": -47.04, "tipo": "outro"},
        ]
    )
    assert [d["tipo"] for d in lista] == ["trabalho", "faculdade", "outro"]
    sem_tipo = normalizar_lista(
        [{"nome": "Centro", "lat": -22.9, "lng": -47.06, "tipo": "xyz"}]
    )
    assert "tipo" not in sem_tipo[0]


def test_modo_transporte_em_prefs_sem_coluna_nova():
    assert normalizar_modo("ônibus") == "bus"
    assert normalizar_modo("invalid") == "foot"
    prefs = gravar_modo_em_prefs({"fumante": False}, "bike")
    assert prefs["modo_transporte"] == "bike"
    assert prefs["fumante"] is False
    assert ler_modo_transporte(prefs) == "bike"
    assert ler_modo_transporte({}) == "foot"


def test_rotulo_curto_sem_endereco():
    assert rotulo_curto({"tipo": "trabalho", "nome": "X — Rua A, 1"}) == "Trabalho"
    assert rotulo_curto({"tipo": "faculdade", "nome": "PUC — Av. B"}) == "Faculdade"
    assert rotulo_curto(
        {"tipo": "outro", "nome": "Academia Fit — Rua Longa, 99, Campinas"}
    ) == "Academia Fit"
