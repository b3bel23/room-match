"""Roteirizador de ônibus com dados GTFS (RF28/RF31).

Usa o Connection Scan Algorithm (CSA): percorre as conexões (trechos entre paradas
consecutivas de cada viagem) em ordem de partida e guarda a chegada mais cedo em cada
parada. Inclui caminhada até o primeiro ponto, baldeação a pé entre pontos próximos
(até 250 m) e caminhada do último ponto até o destino. Só valem as viagens cujo serviço
roda no dia pedido (calendar.txt e calendar_dates.txt).

A rede é carregada uma vez (GTFS_PATHS no .env) em segundo plano ao subir a API.
Enquanto não houver dados, a resposta diz `disponivel: false` com o motivo.
"""

from __future__ import annotations

import logging
import threading
import time
from bisect import bisect_left
from datetime import date, timedelta
from typing import Optional

from app.core.config import settings
from app.utils.gtfs_loader import Rede, carregar, distancia_m, segundos_a_pe

log = logging.getLogger("roommatch.mobilidade")

TROCA_MIN_S = 60  # tempo mínimo para trocar de ônibus no mesmo ponto
JANELA_S = 3 * 3600  # não procura viagens que saem mais de 3 h depois
INF = 1 << 30

_rede: Optional[Rede] = None
_erro: Optional[str] = None
_carregando = False
_trava = threading.Lock()


# --------------------------------------------------------------------------- rede


def definir_rede(rede: Optional[Rede]) -> None:
    """Usado pelos testes (e por quem já tiver a rede carregada)."""
    global _rede, _erro
    _rede, _erro = rede, None


def caminhos_configurados() -> list[str]:
    return [c.strip() for c in (settings.gtfs_paths or "").split(",") if c.strip()]


def carregar_em_segundo_plano() -> None:
    global _carregando
    if not caminhos_configurados() or _rede is not None:
        return
    with _trava:
        if _carregando:
            return
        _carregando = True
    threading.Thread(target=_carregar, name="gtfs", daemon=True).start()


def _carregar() -> None:
    global _rede, _erro, _carregando
    inicio = time.monotonic()
    try:
        rede = carregar(caminhos_configurados())
        _rede, _erro = rede, None
        log.info(
            "GTFS carregado em %.1fs: %d paradas, %d conexões",
            time.monotonic() - inicio, rede.total_paradas, rede.total_conexoes,
        )
    except Exception as erro:  # arquivo ausente, CSV quebrado etc.: a API segue sem ônibus
        _erro = f"{type(erro).__name__}: {erro}"
        log.exception("Falha ao carregar GTFS")
    finally:
        _carregando = False


def status() -> dict:
    return {
        "carregado": _rede is not None,
        "carregando": _carregando,
        "feeds": _rede.feeds if _rede else caminhos_configurados(),
        "paradas": _rede.total_paradas if _rede else 0,
        "conexoes": _rede.total_conexoes if _rede else 0,
        "erro": _erro,
    }


def motivo_indisponivel() -> Optional[str]:
    if _rede is not None:
        return None
    if _carregando:
        return "Os horários de ônibus ainda estão carregando no servidor. Tente em alguns segundos."
    if _erro:
        return "Não foi possível ler os horários de ônibus (GTFS) no servidor."
    return "O servidor ainda não tem os horários de ônibus (GTFS da EMDEC/EMTU)."


# --------------------------------------------------------------------------- rota


def proximo_dia_util(hoje: Optional[date] = None) -> date:
    dia = hoje or date.today()
    while dia.weekday() >= 5:
        dia += timedelta(days=1)
    return dia


def _hhmm(segundos: int) -> str:
    segundos %= 24 * 3600
    return f"{segundos // 3600:02d}:{segundos % 3600 // 60:02d}"


def _ponto(rede: Rede, idx: int) -> dict:
    return {"nome": rede.nomes[idx], "lat": rede.lat[idx], "lng": rede.lon[idx]}


def calcular(
    origem: tuple[float, float],
    destino: tuple[float, float],
    dia: date,
    partida_s: int,
    nome_destino: str = "Destino",
    rede: Optional[Rede] = None,
) -> dict:
    """Viagem que chega mais cedo saindo de `origem` às `partida_s` (segundos do dia)."""
    rede = rede or _rede
    if rede is None:
        return {"disponivel": False, "motivo": motivo_indisponivel()}

    raio = settings.gtfs_raio_caminhada_m
    ativos = rede.servicos_ativos(dia)
    viagem_ativa = [s in ativos for s in rede.servico]

    n = rede.total_paradas
    chegada = [INF] * n
    como: list = [None] * n
    de_onibus = [False] * n
    for idx, d in rede.paradas_perto(*origem, raio):
        chegada[idx] = partida_s + segundos_a_pe(d)
        como[idx] = ("origem", d)
    finais = dict(rede.paradas_perto(*destino, raio))

    direto = distancia_m(*origem, *destino)
    melhor = partida_s + segundos_a_pe(direto)
    melhor_como: tuple = ("direto",)

    embarque: dict[int, int] = {}
    limite = partida_s + JANELA_S
    partidas, chegadas, des, paras, viagens = rede.partida, rede.chegada, rede.de, rede.para, rede.viagem
    for k in range(bisect_left(partidas, partida_s), len(partidas)):
        dep = partidas[k]
        if dep >= melhor or dep > limite:
            break
        v = viagens[k]
        if not viagem_ativa[v]:
            continue
        if v not in embarque:
            p0 = des[k]
            folga = TROCA_MIN_S if de_onibus[p0] else 0
            if chegada[p0] + folga > dep:
                continue
            embarque[v] = k
        a, p = chegadas[k], paras[k]
        if a < chegada[p]:
            chegada[p], como[p], de_onibus[p] = a, ("onibus", v, embarque[v], k), True
            if p in finais and a + segundos_a_pe(finais[p]) < melhor:
                melhor, melhor_como = a + segundos_a_pe(finais[p]), ("parada", p)
            for q, w in rede.vizinhos[p]:
                if a + w < chegada[q]:
                    chegada[q], como[q], de_onibus[q] = a + w, ("caminhada", p, w), False
                    if q in finais and a + w + segundos_a_pe(finais[q]) < melhor:
                        melhor, melhor_como = a + w + segundos_a_pe(finais[q]), ("parada", q)

    return _montar(rede, origem, destino, nome_destino, partida_s, melhor, melhor_como, como, chegada, finais, direto)


def _montar(rede, origem, destino, nome_destino, partida_s, melhor, melhor_como, como, chegada, finais, direto) -> dict:
    ponto_origem = {"nome": "Imóvel", "lat": origem[0], "lng": origem[1]}
    ponto_destino = {"nome": nome_destino, "lat": destino[0], "lng": destino[1]}

    def a_pe(de_ponto, para_ponto, metros, inicio):
        return {
            "tipo": "a_pe", "de": de_ponto, "para": para_ponto,
            "distancia_m": round(metros * 1.3), "minutos": max(1, round(segundos_a_pe(metros) / 60)),
            "partida": _hhmm(inicio),
        }

    trechos: list[dict] = []
    if melhor_como[0] == "direto":
        trechos.append(a_pe(ponto_origem, ponto_destino, direto, partida_s))
    else:
        atual = melhor_como[1]
        trechos.append(a_pe(_ponto(rede, atual), ponto_destino, finais[atual], chegada[atual]))
        for _ in range(100):  # cada passo volta no tempo; o limite só protege contra dado ruim
            passo = como[atual]
            if passo[0] == "origem":
                trechos.append(a_pe(ponto_origem, _ponto(rede, atual), passo[1], partida_s))
                break
            if passo[0] == "caminhada":
                _, anterior, _w = passo
                metros = distancia_m(rede.lat[anterior], rede.lon[anterior], rede.lat[atual], rede.lon[atual])
                trechos.append(a_pe(_ponto(rede, anterior), _ponto(rede, atual), metros, chegada[anterior]))
                atual = anterior
                continue
            _, v, k0, k1 = passo
            seq = rede.paradas_viagem[v][rede.posicao[k0]: rede.posicao[k1] + 2]
            caminho = [[rede.lat[i], rede.lon[i]] for i in seq]
            metros = sum(distancia_m(*caminho[i], *caminho[i + 1]) for i in range(len(caminho) - 1))
            trechos.append({
                "tipo": "onibus",
                "linha": rede.linha[v],
                "nome_linha": rede.nome_linha[v],
                "sentido": rede.sentido[v],
                "de": _ponto(rede, rede.de[k0]),
                "para": _ponto(rede, rede.para[k1]),
                "partida": _hhmm(rede.partida[k0]),
                "chegada": _hhmm(rede.chegada[k1]),
                "paradas": len(seq) - 1,
                "distancia_m": round(metros),
                "minutos": max(1, round((rede.chegada[k1] - rede.partida[k0]) / 60)),
                "caminho": caminho,
            })
            atual = rede.de[k0]
        trechos.reverse()

    onibus = [t for t in trechos if t["tipo"] == "onibus"]
    caminhada_min = sum(t["minutos"] for t in trechos if t["tipo"] == "a_pe")
    total_min = max(1, round((melhor - partida_s) / 60))
    return {
        "disponivel": True,
        "somente_caminhada": not onibus,
        "tempo_min": total_min,
        "distancia_km": round(sum(t["distancia_m"] for t in trechos) / 1000, 1),
        "caminhada_min": caminhada_min,
        "espera_min": max(0, total_min - caminhada_min - sum(t["minutos"] for t in onibus)),
        "baldeacoes": max(0, len(onibus) - 1),
        "partida": _hhmm(partida_s),
        "chegada": _hhmm(melhor),
        "trechos": trechos,
        "fonte": "GTFS " + " + ".join(rede.feeds) if rede.feeds else "GTFS",
    }


def chave_destino(lat: float, lng: float, hora: str) -> str:
    """Chave do cache em rotas_mobilidade.destino (até 150 caracteres)."""
    return f"{lat:.4f},{lng:.4f}@{hora}"
