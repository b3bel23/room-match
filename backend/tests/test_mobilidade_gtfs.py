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
    assert all(t.get("linha") != "202" for t in sab["trechos"])
    # quarta 25/11 foi excluída no calendar_dates
    qua = mob.calcular(PERTO_A, PERTO_E, date(2026, 11, 25), 7 * 3600 + 30 * 60, rede=rede)
    assert all(t.get("linha") not in ("101", "202") for t in qua["trechos"])


def test_perdeu_o_onibus(rede):
    r = mob.calcular(PERTO_A, PERTO_E, SEG, 7 * 3600 + 36 * 60, rede=rede)
    assert all(t.get("linha") != "101" for t in r["trechos"])


def test_perto_demais_vai_a_pe(rede):
    r = mob.calcular(PERTO_A, (-22.9003, -47.0600), SEG, 8 * 3600, rede=rede)
    assert r["somente_caminhada"] and [t["tipo"] for t in r["trechos"]] == ["a_pe"]


def test_sem_rede_indisponivel():
    mob.definir_rede(None)
    r = mob.calcular(PERTO_A, PERTO_E, SEG, 8 * 3600)
    assert r["disponivel"] is False and "GTFS" in r["motivo"]


def test_proximo_dia_util():
    assert mob.proximo_dia_util(SAB) == date(2026, 11, 30)
    assert mob.proximo_dia_util(SEG) == SEG
