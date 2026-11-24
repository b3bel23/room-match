"""Roteirizador de ônibus (RF31) com um feed GTFS sintético."""

import zipfile
from datetime import date

import pytest

from app.services import mobilidade_service as mob
from app.utils.gtfs_loader import carregar, hms_para_segundos

SEG = date(2026, 11, 23)  # segunda-feira
SAB = date(2026, 11, 28)

ARQUIVOS = {
    "agency.txt": "agency_id,agency_name,agency_url,agency_timezone\nE,EMDEC,https://x,America/Sao_Paulo\n",
    "stops.txt": (
        "stop_id,stop_name,stop_lat,stop_lon\n"
        "A,Ponto A,-22.9000,-47.0600\n"
        "B,Ponto B,-22.9050,-47.0600\n"
        "C,Terminal C,-22.9200,-47.0600\n"
        "D,Ponto D,-22.9210,-47.0610\n"   # ~150 m de C: baldeação a pé
        "E,Ponto E,-22.9400,-47.0610\n"
        "F,Ponto F,-22.9000,-47.0700\n"
    ),
    "routes.txt": (
        "route_id,route_short_name,route_long_name,route_type\n"
        "R1,101,Centro - Terminal C,3\nR2,202,Terminal C - Bairro E,3\nR3,303,Circular,3\n"
    ),
    "calendar.txt": (
        "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n"
        "UTIL,1,1,1,1,1,0,0,20260101,20271231\nFDS,0,0,0,0,0,1,1,20260101,20271231\n"
    ),
    "calendar_dates.txt": "service_id,date,exception_type\nUTIL,20261125,2\n",  # quarta sem serviço útil
    "trips.txt": (
        "route_id,service_id,trip_id,trip_headsign\n"
        "R1,UTIL,T1,Terminal C\nR1,FDS,T1W,Terminal C\nR2,UTIL,T2,Bairro E\nR3,UTIL,T3,Circular\n"
    ),
    "stop_times.txt": (
        "trip_id,arrival_time,departure_time,stop_id,stop_sequence\n"
        "T1,07:35:00,07:35:00,A,1\nT1,07:40:00,07:40:00,B,2\nT1,07:50:00,07:50:00,C,3\n"
        "T1W,07:31:00,07:31:00,A,1\nT1W,07:46:00,07:46:00,C,2\n"
        "T2,07:58:00,07:58:00,D,1\nT2,08:10:00,08:10:00,E,2\n"
        "T3,06:00:00,06:00:00,A,1\nT3,06:10:00,06:10:00,F,2\n"
    ),
    "frequencies.txt": "trip_id,start_time,end_time,headway_secs\nT3,06:00:00,08:00:00,1800\n",
}

PERTO_A = (-22.8995, -47.0600)  # ~55 m do ponto A
PERTO_E = (-22.9405, -47.0610)


@pytest.fixture(scope="module")
def rede(tmp_path_factory):
    caminho = tmp_path_factory.mktemp("gtfs") / "emdec.zip"
    with zipfile.ZipFile(caminho, "w") as z:
        for nome, conteudo in ARQUIVOS.items():
            z.writestr(f"feed/{nome}", conteudo)  # subpasta dentro do zip também vale
    return carregar([str(caminho)])


def test_carrega_paradas_conexoes_e_frequencias(rede):
    assert rede.total_paradas == 6
    # T3 com frequência de 30 min entre 06:00 e 08:00 vira 4 viagens
    assert sum(1 for l in rede.linha if l == "303") == 4
    assert list(rede.partida) == sorted(rede.partida)
    assert hms_para_segundos("25:10:00") == 90600


def test_rota_com_baldeacao_a_pe(rede):
    r = mob.calcular(PERTO_A, PERTO_E, SEG, 7 * 3600 + 30 * 60, "Faculdade", rede=rede)
    assert r["disponivel"] and not r["somente_caminhada"]
    tipos = [t["tipo"] for t in r["trechos"]]
    assert tipos == ["a_pe", "onibus", "a_pe", "onibus", "a_pe"]
    bus1, bus2 = [t for t in r["trechos"] if t["tipo"] == "onibus"]
    assert (bus1["linha"], bus1["de"]["nome"], bus1["para"]["nome"], bus1["partida"], bus1["chegada"]) == (
        "101", "Ponto A", "Terminal C", "07:35", "07:50",
    )
    assert bus1["paradas"] == 2 and len(bus1["caminho"]) == 3
    assert (bus2["linha"], bus2["partida"], bus2["chegada"]) == ("202", "07:58", "08:10")
    assert r["baldeacoes"] == 1 and r["partida"] == "07:30"
    assert r["chegada"] == "08:11" and r["tempo_min"] == 41
    assert r["trechos"][-1]["para"]["nome"] == "Faculdade"


def test_respeita_calendario(rede):
    # sábado: só a viagem FDS da linha 101 roda; a 202 (útil) não, então não chega de ônibus
    sab = mob.calcular(PERTO_A, PERTO_E, SAB, 7 * 3600 + 30 * 60, rede=rede)
    assert sab.get("disponivel") is False or sab.get("somente_caminhada")
    assert all(t.get("linha") != "202" for t in sab.get("trechos") or [])
    # quarta 25/11 foi excluída no calendar_dates
    qua = mob.calcular(PERTO_A, PERTO_E, date(2026, 11, 25), 7 * 3600 + 30 * 60, rede=rede)
    assert qua.get("disponivel") is False or qua.get("somente_caminhada")
    assert all(t.get("linha") not in ("101", "202") for t in qua.get("trechos") or [])


def test_perdeu_o_onibus(rede):
    r = mob.calcular(PERTO_A, PERTO_E, SEG, 7 * 3600 + 36 * 60, rede=rede)
    assert all(t.get("linha") != "101" for t in r.get("trechos") or [])
    # Sem a 101, o destino longe não vira "3 h a pé = melhor que ônibus".
    if r.get("somente_caminhada"):
        assert r["tempo_min"] <= 25
    elif not r.get("disponivel"):
        assert "ônibus" in (r.get("motivo") or "").lower()


def test_perto_demais_vai_a_pe(rede):
    r = mob.calcular(PERTO_A, (-22.9003, -47.0600), SEG, 8 * 3600, rede=rede)
    assert r["somente_caminhada"] and [t["tipo"] for t in r["trechos"]] == ["a_pe"]


def test_longe_sem_onibus_nao_finge_pe(rede):
    longe = (-22.9800, -47.1000)  # sem parada no raio de caminhada
    r = mob.calcular(PERTO_A, longe, SEG, 8 * 3600, "Longe demais", rede=rede)
    assert r["disponivel"] is False
    assert "ônibus" in r["motivo"].lower()
    assert r.get("tempo_min_caminhada", 0) > 25


def test_rmc_barao_centro_uma_linha():
    """Feed RMC: Barão → Centro deve preferir a linha 100 direta (sem baldeação inútil)."""
    from pathlib import Path

    from app.utils.gtfs_loader import carregar

    zip_rmc = Path(__file__).resolve().parents[1] / "data" / "gtfs" / "rmc-emdec-emtu.zip"
    if not zip_rmc.is_file():
        pytest.skip("GTFS RMC ausente")
    rede_rmc = carregar([str(zip_rmc)])
    origem = (-22.8190, -47.0760)
    centro = (-22.9056, -47.0608)
    r = mob.calcular(origem, centro, SEG, 7 * 3600 + 30 * 60, "Centro", rede=rede_rmc)
    assert r["disponivel"] and r["baldeacoes"] == 0
    assert r["linhas"] == ["100"]


def test_rmc_puc_geocode_snap():
    """Geocode sul da PUC (fora do ponto GTFS) ainda encontra ônibus via snap."""
    from pathlib import Path

    from app.utils.gtfs_loader import carregar

    zip_rmc = Path(__file__).resolve().parents[1] / "data" / "gtfs" / "rmc-emdec-emtu.zip"
    if not zip_rmc.is_file():
        pytest.skip("GTFS RMC ausente")
    rede_rmc = carregar([str(zip_rmc)])
    origem = (-22.8190, -47.0760)
    puc_sul = (-22.9210, -47.0680)
    r = mob.calcular(origem, puc_sul, SEG, 7 * 3600 + 30 * 60, "PUC", rede=rede_rmc)
    assert r["disponivel"] and r["linhas"]
    assert not r.get("somente_caminhada")
    assert "Destino longe" in (r.get("aviso") or "")


def test_rmc_paulinia_campus_ii_com_baldeacao():
    """Paulínia (Vila Bressani) → PUC Campus II: EMTU 650 + EMDEC 361 (baldeação)."""
    from pathlib import Path

    from app.utils.gtfs_loader import carregar

    zip_rmc = Path(__file__).resolve().parents[1] / "data" / "gtfs" / "rmc-emdec-emtu.zip"
    if not zip_rmc.is_file():
        pytest.skip("GTFS RMC ausente")
    rede_rmc = carregar([str(zip_rmc)])
    origem = (-22.7640, -47.1480)  # kitnet id=13
    campus_ii = (-22.9199, -47.1208)
    r = mob.calcular(origem, campus_ii, SEG, 7 * 3600 + 30 * 60, "PUC Campus II", rede=rede_rmc)
    assert r["disponivel"] and not r.get("somente_caminhada")
    assert r["baldeacoes"] >= 1
    assert "650" in r["linhas"] and "361" in r["linhas"]
    assert r["tempo_min"] < 120
    # Preferível: uma baldeação (650→361), não três linhas.
    assert r["baldeacoes"] == 1 or len(r["linhas"]) == 2


def test_sem_rede_indisponivel():
    mob.definir_rede(None)
    r = mob.calcular(PERTO_A, PERTO_E, SEG, 8 * 3600)
    assert r["disponivel"] is False and "GTFS" in r["motivo"]


def test_proximo_dia_util():
    assert mob.proximo_dia_util(SAB) == date(2026, 11, 30)
    assert mob.proximo_dia_util(SEG) == SEG


def test_ancora_chegada_atrasa_saida(rede):
    # Chegar até 08:15: a busca deve achar uma saída (não necessariamente 07:30).
    alvo = 8 * 3600 + 15 * 60
    r = mob.calcular_ate_chegar(PERTO_A, PERTO_E, SEG, alvo, "Faculdade", rede=rede)
    assert r["disponivel"] and r.get("ancora") == "chegada"
    assert r["hora_alvo"] == "08:15"
    # Chegada efetiva ≤ alvo (tempo_min a partir da partida escolhida).
    h, m = map(int, r["partida"].split(":"))
    partida_s = h * 3600 + m * 60
    assert partida_s + r["tempo_min"] * 60 <= alvo
