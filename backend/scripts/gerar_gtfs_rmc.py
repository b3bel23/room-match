#!/usr/bin/env python3
"""Gera um feed GTFS da RMC (Campinas + Paulínia) para o roteirizador.

Sem feed oficial EMDEC disponível como ZIP estável, montamos uma rede cobrindo
os corredores reais usados no produto (Barão, Cambuí, Taquaral, Sousas, Centro,
PUC, UNICAMP, Paulínia). Formato GTFS padrão — sem mudar o schema do banco.

Uso (de backend/):
  python -m scripts.gerar_gtfs_rmc
  # grava data/gtfs/rmc-emdec-emtu.zip
"""

from __future__ import annotations

import csv
import io
import zipfile
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data" / "gtfs" / "rmc-emdec-emtu.zip"

# Paradas próximas aos anúncios/destinos do seed (raio de caminhada ~1 km).
STOPS = [
    # id, nome, lat, lng
    ("tbarao", "Terminal Barão Geraldo", -22.8225, -47.0780),
    # Campus I (Barão) ≠ Campus Central ≠ Campus II (Av. John Boyd Dunlop).
    ("puc1", "PUC Campinas · Campus I (Barão)", -22.8345, -47.0525),
    ("puc_central", "PUC Campinas · Campus Central", -22.9095, -47.0668),
    ("puc2", "PUC Campinas · Campus II (John Boyd Dunlop)", -22.9199, -47.1208),
    ("boyd_jardim", "Av. John Boyd Dunlop · Jardim Paulicéia", -22.9100, -47.0950),
    ("unicamp", "UNICAMP · Portão 1", -22.8184, -47.0647),
    ("barao_rua", "R. Benedito Alves Aranha", -22.8190, -47.0760),
    ("taquaral", "Av. José Bonifácio · Taquaral", -22.8720, -47.0485),
    ("cambui", "R. Coronel Quirino · Cambuí", -22.8930, -47.0480),
    ("centro", "Centro de Campinas · Largo do Rosário", -22.9056, -47.0608),
    ("sousas", "R. das Orquídeas · Sousas", -22.8770, -47.0080),
    ("terminal_central", "Terminal Central (Campinas)", -22.9078, -47.0632),
    ("shopping_iguatemi", "Shopping Iguatemi Campinas", -22.8915, -47.0275),
    ("paulinia_morumbi", "Av. José Paulino · Morumbi (Paulínia)", -22.7613, -47.1542),
    ("paulinia_bressani", "Vila Bressani (Paulínia)", -22.7635, -47.1480),
    ("paulinia_centro", "Centro de Paulínia", -22.7610, -47.1548),
    ("anhanguera", "Acesso Anhanguera · Paulínia", -22.7705, -47.1400),
]

# Linhas: (route_id, short, long, stop_ids na ordem, minutos entre paradas, headway_secs, headsign)
# headway 12–20 min em horário comercial.
ROUTES = [
    ("R100", "100", "Barão Geraldo ↔ Centro",
     ["barao_rua", "tbarao", "unicamp", "puc1", "taquaral", "cambui", "centro", "puc_central", "terminal_central"],
     [3, 4, 8, 10, 8, 7, 4, 3], 720, "Centro"),
    ("R100V", "100", "Centro ↔ Barão Geraldo",
     ["terminal_central", "puc_central", "centro", "cambui", "taquaral", "puc1", "unicamp", "tbarao", "barao_rua"],
     [3, 4, 7, 8, 10, 8, 4, 3], 720, "Barão Geraldo"),
    ("R116", "116", "UNICAMP ↔ Terminal Central",
     ["unicamp", "tbarao", "puc1", "taquaral", "terminal_central"],
     [5, 7, 9, 12], 600, "Terminal Central"),
    ("R116V", "116", "Terminal Central ↔ UNICAMP",
     ["terminal_central", "taquaral", "puc1", "tbarao", "unicamp"],
     [12, 9, 7, 5], 600, "UNICAMP"),
    ("R332", "332", "Sousas ↔ Cambuí ↔ Centro",
     ["sousas", "shopping_iguatemi", "cambui", "centro", "puc_central"],
     [10, 8, 6, 4], 900, "PUC Central"),
    ("R332V", "332", "Centro ↔ Cambuí ↔ Sousas",
     ["puc_central", "centro", "cambui", "shopping_iguatemi", "sousas"],
     [4, 6, 8, 10], 900, "Sousas"),
    ("R213", "213", "Taquaral ↔ PUC ↔ Barão",
     ["taquaral", "puc1", "tbarao", "barao_rua"],
     [9, 6, 3], 780, "Barão Geraldo"),
    ("R213V", "213", "Barão ↔ PUC ↔ Taquaral",
     ["barao_rua", "tbarao", "puc1", "taquaral"],
     [3, 6, 9], 780, "Taquaral"),
    ("R650", "650", "Paulínia ↔ Campinas (EMTU)",
     ["paulinia_morumbi", "paulinia_bressani", "paulinia_centro", "anhanguera",
      "shopping_iguatemi", "cambui", "terminal_central", "puc_central"],
     [4, 3, 6, 18, 10, 8, 4], 1200, "Campinas"),
    ("R650V", "650", "Campinas ↔ Paulínia (EMTU)",
     ["puc_central", "terminal_central", "cambui", "shopping_iguatemi", "anhanguera",
      "paulinia_centro", "paulinia_bressani", "paulinia_morumbi"],
     [4, 8, 10, 18, 6, 3, 4], 1200, "Paulínia"),
    ("R422", "422", "Circular Cambuí · Taquaral · Centro",
     ["cambui", "taquaral", "centro", "puc_central", "cambui"],
     [6, 7, 4, 8], 840, "Circular"),
    # Corredor Boyd Dunlop (EMDEC): Cambuí/Terminal ↔ Campus II — baldeação
    # natural com a EMTU 650 (Paulínia) em Cambuí ou Terminal Central.
    ("R361", "361", "Cambuí / Terminal ↔ Campus II (Boyd Dunlop)",
     ["cambui", "terminal_central", "puc_central", "centro", "boyd_jardim", "puc2"],
     [8, 3, 4, 12, 10], 720, "Campus II"),
    ("R361V", "361", "Campus II (Boyd Dunlop) ↔ Terminal / Cambuí",
     ["puc2", "boyd_jardim", "centro", "puc_central", "terminal_central", "cambui"],
     [10, 12, 4, 3, 8], 720, "Cambuí"),
]


def _escrever(z: zipfile.ZipFile, nome: str, linhas: list[list[str]]) -> None:
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    for row in linhas:
        w.writerow(row)
    z.writestr(nome, buf.getvalue())


def gerar(destino: Path = OUT) -> Path:
    destino.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destino, "w", compression=zipfile.ZIP_DEFLATED) as z:
        _escrever(z, "agency.txt", [
            ["agency_id", "agency_name", "agency_url", "agency_timezone", "agency_lang"],
            ["EMDEC", "EMDEC Campinas (RMC)", "https://www.emdec.com.br", "America/Sao_Paulo", "pt"],
            ["EMTU", "EMTU Região Metropolitana de Campinas", "https://www.emtu.sp.gov.br", "America/Sao_Paulo", "pt"],
        ])
        _escrever(z, "stops.txt", [
            ["stop_id", "stop_name", "stop_lat", "stop_lon", "location_type"],
            *[[sid, nome, f"{lat:.6f}", f"{lng:.6f}", "0"] for sid, nome, lat, lng in STOPS],
        ])
        # Uma entrada por short_name distinto (ida/volta compartilham route_id base)
        vistas = set()
        rotas_rows = [["route_id", "agency_id", "route_short_name", "route_long_name", "route_type"]]
        for rid, short, long, *_rest in ROUTES:
            base = rid.rstrip("V")
            if base in vistas:
                continue
            vistas.add(base)
            agency = "EMTU" if short.startswith("6") else "EMDEC"
            rotas_rows.append([base, agency, short, long.split(" ↔ ")[0] + " / " + long.split(" ↔ ")[-1] if "↔" in long else long, "3"])
        _escrever(z, "routes.txt", rotas_rows)

        _escrever(z, "calendar.txt", [
            ["service_id", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "start_date", "end_date"],
            ["UTIL", "1", "1", "1", "1", "1", "0", "0", "20250101", "20281231"],
            ["TODOS", "1", "1", "1", "1", "1", "1", "1", "20250101", "20281231"],
        ])

        trips = [["route_id", "service_id", "trip_id", "trip_headsign", "direction_id"]]
        stop_times = [["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence"]]
        freqs = [["trip_id", "start_time", "end_time", "headway_secs"]]

        for rid, short, long, stops, gaps, headway, headsign in ROUTES:
            base = rid.rstrip("V")
            tid = f"T{rid}"
            direction = "1" if rid.endswith("V") else "0"
            trips.append([base, "TODOS", tid, headsign, direction])
            # Template às 06:00; frequencies expande 05:30–22:30
            t = 6 * 3600
            for seq, sid in enumerate(stops, start=1):
                hh = t // 3600
                mm = (t % 3600) // 60
                ss = t % 60
                hms = f"{hh:02d}:{mm:02d}:{ss:02d}"
                stop_times.append([tid, hms, hms, sid, str(seq)])
                if seq <= len(gaps):
                    t += gaps[seq - 1] * 60
            freqs.append([tid, "05:30:00", "22:30:00", str(headway)])

        _escrever(z, "trips.txt", trips)
        _escrever(z, "stop_times.txt", stop_times)
        _escrever(z, "frequencies.txt", freqs)
        _escrever(z, "feed_info.txt", [
            ["feed_publisher_name", "feed_publisher_url", "feed_lang", "feed_start_date", "feed_end_date", "feed_version"],
            ["RoomMatch RMC", "https://github.com/", "pt", "20250101", "20281231", "rmc-1.0"],
        ])
    return destino


if __name__ == "__main__":
    path = gerar()
    print(f"GTFS gerado: {path} ({path.stat().st_size // 1024} KB)")
