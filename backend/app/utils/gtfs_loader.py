"""Leitura de feeds GTFS (EMDEC, EMTU) para o roteirizador de ônibus (RF31).

Aceita um ou mais feeds (arquivo .zip ou pasta com os .txt). Os IDs de cada feed recebem
um prefixo, então EMDEC e EMTU podem ser carregados juntos e a baldeação entre eles sai
pelos pontos próximos.

A rede fica em memória em estruturas compactas (`array`):
  - paradas: nome, latitude, longitude;
  - conexões: cada trecho entre duas paradas consecutivas de uma viagem, ordenado pelo
    horário de partida (é o que o Connection Scan Algorithm percorre);
  - viagens: linha, nome, sentido, serviço e a sequência de paradas;
  - vizinhos a pé entre paradas, para baldeação.
"""

from __future__ import annotations

import csv
import io
import logging
import math
import os
import zipfile
from array import array
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Iterable, Iterator

log = logging.getLogger("roommatch.gtfs")

VELOCIDADE_PE_MS = 1.2  # ~4,3 km/h
FATOR_DESVIO = 1.3  # ruas não são linha reta
RAIO_BALDEACAO_M = 250
CELULA_GRAUS = 0.01  # ~1,1 km


def distancia_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distância em linha reta (haversine), em metros."""
    r = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def segundos_a_pe(metros: float) -> int:
    return int(round(metros * FATOR_DESVIO / VELOCIDADE_PE_MS))


def hms_para_segundos(texto: str) -> int | None:
    """'25:10:00' → 90600 (GTFS permite passar de 24 h). Vazio → None."""
    texto = (texto or "").strip()
    if not texto:
        return None
    h, m, s = (int(x) for x in texto.split(":"))
    return h * 3600 + m * 60 + s


@dataclass
class Servico:
    dias: tuple[bool, ...] = (False,) * 7  # segunda..domingo
    inicio: date | None = None
    fim: date | None = None
    incluidos: set[date] = field(default_factory=set)
    excluidos: set[date] = field(default_factory=set)

    def ativo(self, dia: date) -> bool:
        if dia in self.excluidos:
            return False
        if dia in self.incluidos:
            return True
        if self.inicio and dia < self.inicio or self.fim and dia > self.fim:
            return False
        return self.dias[dia.weekday()]


@dataclass
class Rede:
    feeds: list[str] = field(default_factory=list)
    # paradas
    nomes: list[str] = field(default_factory=list)
    lat: array = field(default_factory=lambda: array("d"))
    lon: array = field(default_factory=lambda: array("d"))
    # conexões, ordenadas por partida
    partida: array = field(default_factory=lambda: array("i"))
    chegada: array = field(default_factory=lambda: array("i"))
    de: array = field(default_factory=lambda: array("i"))
    para: array = field(default_factory=lambda: array("i"))
    viagem: array = field(default_factory=lambda: array("i"))
    posicao: array = field(default_factory=lambda: array("i"))  # índice de `de` na viagem
    # viagens
    linha: list[str] = field(default_factory=list)
    nome_linha: list[str] = field(default_factory=list)
    sentido: list[str] = field(default_factory=list)
    servico: list[str] = field(default_factory=list)
    paradas_viagem: list[array] = field(default_factory=list)
    servicos: dict[str, Servico] = field(default_factory=dict)
    # espacial
    grade: dict[tuple[int, int], list[int]] = field(default_factory=dict)
    vizinhos: list[list[tuple[int, int]]] = field(default_factory=list)

    @property
    def total_paradas(self) -> int:
        return len(self.nomes)

    @property
    def total_conexoes(self) -> int:
        return len(self.partida)

    def servicos_ativos(self, dia: date) -> set[str]:
        return {sid for sid, s in self.servicos.items() if s.ativo(dia)}

    def _celula(self, lat: float, lon: float) -> tuple[int, int]:
        return int(math.floor(lat / CELULA_GRAUS)), int(math.floor(lon / CELULA_GRAUS))

    def paradas_perto(self, lat: float, lon: float, raio_m: float) -> list[tuple[int, float]]:
        """(índice da parada, distância em m) dentro do raio, da mais perto para a mais longe."""
        alcance = int(math.ceil(raio_m / 1000 / (CELULA_GRAUS * 111))) + 1
        ci, cj = self._celula(lat, lon)
        achadas = []
        for di in range(-alcance, alcance + 1):
            for dj in range(-alcance, alcance + 1):
                for idx in self.grade.get((ci + di, cj + dj), ()):
                    d = distancia_m(lat, lon, self.lat[idx], self.lon[idx])
                    if d <= raio_m:
                        achadas.append((idx, d))
        achadas.sort(key=lambda x: x[1])
        return achadas


# --------------------------------------------------------------------------- leitura


class _Fonte:
    """Lê os .txt de um feed em .zip ou em pasta (aceita subpasta dentro do zip)."""

    def __init__(self, caminho: str):
        self.caminho = caminho
        self.zip = zipfile.ZipFile(caminho) if zipfile.is_zipfile(caminho) else None
        if self.zip:
            self.nomes = {os.path.basename(n): n for n in self.zip.namelist() if n.endswith(".txt")}
        else:
            self.nomes = {n: os.path.join(caminho, n) for n in os.listdir(caminho) if n.endswith(".txt")}

    def tem(self, arquivo: str) -> bool:
        return arquivo in self.nomes

    def linhas(self, arquivo: str) -> Iterator[dict[str, str]]:
        if not self.tem(arquivo):
            return iter(())
        if self.zip:
            texto = io.TextIOWrapper(self.zip.open(self.nomes[arquivo]), encoding="utf-8-sig")
        else:
            texto = open(self.nomes[arquivo], encoding="utf-8-sig", newline="")
        return ({(k or "").strip(): (v or "").strip() for k, v in linha.items()} for linha in csv.DictReader(texto))


def _data(texto: str) -> date | None:
    return datetime.strptime(texto, "%Y%m%d").date() if texto else None


def carregar(caminhos: Iterable[str]) -> Rede:
    """Monta a rede a partir de um ou mais feeds GTFS."""
    rede = Rede()
    parada_idx: dict[str, int] = {}
    brutas: list[tuple[int, int, int, int, int, int]] = []  # (partida, chegada, de, para, viagem, pos)

    for n, caminho in enumerate(c for c in caminhos if c):
        fonte = _Fonte(caminho)
        prefixo = f"{n}:"
        rede.feeds.append(os.path.basename(caminho.rstrip("/")))

        for p in fonte.linhas("stops.txt"):
            if p.get("location_type", "0") not in ("", "0"):  # só pontos de embarque
                continue
            try:
                lat, lon = float(p["stop_lat"]), float(p["stop_lon"])
            except (KeyError, ValueError):
                continue
            parada_idx[prefixo + p["stop_id"]] = len(rede.nomes)
            rede.nomes.append(p.get("stop_name") or p["stop_id"])
            rede.lat.append(lat)
            rede.lon.append(lon)

        rotas = {
            prefixo + r["route_id"]: (r.get("route_short_name", ""), r.get("route_long_name", ""))
            for r in fonte.linhas("routes.txt")
        }

        for c in fonte.linhas("calendar.txt"):
            dias = tuple(c.get(d, "0") == "1" for d in (
                "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"))
            rede.servicos[prefixo + c["service_id"]] = Servico(dias, _data(c.get("start_date", "")), _data(c.get("end_date", "")))
        for c in fonte.linhas("calendar_dates.txt"):
            s = rede.servicos.setdefault(prefixo + c["service_id"], Servico())
            (s.incluidos if c.get("exception_type") == "1" else s.excluidos).add(_data(c["date"]))

        viagens: dict[str, tuple[str, str]] = {}  # trip_id -> (route_id, service_id), headsign
        sentidos: dict[str, str] = {}
        for t in fonte.linhas("trips.txt"):
            tid = prefixo + t["trip_id"]
            viagens[tid] = (prefixo + t["route_id"], prefixo + t["service_id"])
            sentidos[tid] = t.get("trip_headsign", "")

        horarios: dict[str, list[tuple[int, int, int, int]]] = {}  # trip -> (seq, chegada, partida, parada)
        for st in fonte.linhas("stop_times.txt"):
            tid = prefixo + st["trip_id"]
            pidx = parada_idx.get(prefixo + st["stop_id"])
            if tid not in viagens or pidx is None:
                continue
            cheg = hms_para_segundos(st.get("arrival_time", ""))
            part = hms_para_segundos(st.get("departure_time", ""))
            if cheg is None and part is None:
                continue  # horário interpolado não informado: o ponto é pulado
            horarios.setdefault(tid, []).append(
                (int(st["stop_sequence"]), cheg if cheg is not None else part, part if part is not None else cheg, pidx)
            )

        frequencias: dict[str, list[tuple[int, int, int]]] = {}
        for f in fonte.linhas("frequencies.txt"):
            frequencias.setdefault(prefixo + f["trip_id"], []).append(
                (hms_para_segundos(f["start_time"]), hms_para_segundos(f["end_time"]), int(f["headway_secs"]))
            )

        for tid, pontos in horarios.items():
            pontos.sort()
            if len(pontos) < 2:
                continue
            rota_id, servico_id = viagens[tid]
            curta, longa = rotas.get(rota_id, ("", ""))
            # Viagem com frequencies.txt vira várias, uma por intervalo.
            base = pontos[0][2]
            inicios = [base]
            if tid in frequencias:
                inicios = [t for ini, fim, passo in frequencias[tid] for t in range(ini, fim, max(passo, 60))]
            for inicio in inicios:
                desloc = inicio - base
                v = len(rede.linha)
                rede.linha.append(curta or longa)
                rede.nome_linha.append(longa)
                rede.sentido.append(sentidos.get(tid, ""))
                rede.servico.append(servico_id)
                rede.paradas_viagem.append(array("i", (p[3] for p in pontos)))
                for pos in range(len(pontos) - 1):
                    a, b = pontos[pos], pontos[pos + 1]
                    brutas.append((a[2] + desloc, b[1] + desloc, a[3], b[3], v, pos))
        log.info("GTFS %s: %d paradas, %d viagens", caminho, len(rede.nomes), len(rede.linha))

    brutas.sort()
    for campo, i in (("partida", 0), ("chegada", 1), ("de", 2), ("para", 3), ("viagem", 4), ("posicao", 5)):
        getattr(rede, campo).extend(b[i] for b in brutas)
    del brutas

    for idx in range(rede.total_paradas):
        rede.grade.setdefault(rede._celula(rede.lat[idx], rede.lon[idx]), []).append(idx)
    rede.vizinhos = [
        [(j, segundos_a_pe(d)) for j, d in rede.paradas_perto(rede.lat[i], rede.lon[i], RAIO_BALDEACAO_M) if j != i]
        for i in range(rede.total_paradas)
    ]
    return rede
