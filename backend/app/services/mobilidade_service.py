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
from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.utils.gtfs_loader import Rede, carregar, distancia_m, segundos_a_pe

log = logging.getLogger("roommatch.mobilidade")

TROCA_MIN_S = 3 * 60  # tempo mínimo para trocar de ônibus no mesmo ponto
# Penalidade “suave” por embarque: prefere 1 linha direta a 3 baldeações
# que chegam só alguns minutos antes (chegada real no relógio não muda).
PENALIDADE_EMBARQUE_S = 10 * 60
JANELA_S = 3 * 3600  # não procura viagens que saem mais de 3 h depois
# Só devolve "vá a pé" quando a caminhada direta é curta o bastante para
# competir de verdade com ônibus. Longe disso, sem linha = indisponível
# (evita mostrar 3 h a pé como se fosse "mais rápido que ônibus").
LIMIAR_SOMENTE_CAMINHADA_S = 25 * 60
# Se origem/destino ficam fora do raio curto, ainda enxergamos paradas até aqui
# (caminhada longa até o ponto — melhor que falhar com geocode “errado”).
RAIO_SNAP_M = 2800
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
    # Sempre relativo à pasta backend/ (no Render o cwd pode não ser rootDir).
    raiz = Path(__file__).resolve().parents[2]
    configurados = [c.strip() for c in (settings.gtfs_paths or "").split(",") if c.strip()]
    if configurados:
        resolvidos: list[str] = []
        for bruto in configurados:
            caminho = Path(bruto)
            if not caminho.is_absolute():
                caminho = (raiz / caminho).resolve()
            resolvidos.append(str(caminho))
        return resolvidos
    # Sem GTFS_PATHS: usa zips em backend/data/gtfs/ (gerados por scripts/gerar_gtfs_rmc.py).
    pasta = raiz / "data" / "gtfs"
    if pasta.is_dir():
        return sorted(str(p) for p in pasta.glob("*.zip"))
    return []


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
    custo = [INF] * n  # chegada + penalidade por nº de embarques
    embarques_n = [0] * n
    como: list = [None] * n
    de_onibus = [False] * n
    aviso_snap: Optional[str] = None

    inicios = list(rede.paradas_perto(*origem, raio))
    if not inicios:
        inicios = list(rede.paradas_perto(*origem, RAIO_SNAP_M))
        if inicios:
            idx0, d0 = min(inicios, key=lambda x: x[1])
            aviso_snap = (
                f"Origem longe da rede de ônibus; caminhada até {rede.nomes[idx0]} "
                f"(~{int(round(d0))} m)."
            )
            inicios = [(idx0, d0)]
    for idx, d in inicios:
        chega = partida_s + segundos_a_pe(d)
        chegada[idx], custo[idx], embarques_n[idx] = chega, chega, 0
        como[idx] = ("origem", d)

    finais = dict(rede.paradas_perto(*destino, raio))
    if not finais:
        longe = list(rede.paradas_perto(*destino, RAIO_SNAP_M))
        if longe:
            idx_f, d_f = min(longe, key=lambda x: x[1])
            finais = {idx_f: d_f}
            msg = (
                f"Destino longe da rede; desembarque em {rede.nomes[idx_f]} "
                f"(~{int(round(d_f))} m a pé)."
            )
            aviso_snap = f"{aviso_snap} {msg}".strip() if aviso_snap else msg

    direto = distancia_m(*origem, *destino)
    walk_s = segundos_a_pe(direto)
    # Caminhada longa não entra como "melhor" — assim qualquer ônibus que
    # chegue na janela ganha, em vez de o algoritmo desistir cedo e devolver a pé.
    if walk_s <= LIMIAR_SOMENTE_CAMINHADA_S:
        melhor = partida_s + walk_s
        melhor_custo = melhor
        melhor_como: Optional[tuple] = ("direto",)
    else:
        melhor = INF
        melhor_custo = INF
        melhor_como = None

    # viagem → (índice da 1ª conexão embarcada, nº de embarques ao subir)
    embarque: dict[int, tuple[int, int]] = {}
    limite = partida_s + JANELA_S
    partidas, chegadas, des, paras, viagens = rede.partida, rede.chegada, rede.de, rede.para, rede.viagem

    def _melhorar_destino(chega_rel: int, n_emb: int, como_dest: tuple) -> None:
        nonlocal melhor, melhor_custo, melhor_como
        c = chega_rel + n_emb * PENALIDADE_EMBARQUE_S
        if c < melhor_custo or (c == melhor_custo and chega_rel < melhor):
            melhor, melhor_custo, melhor_como = chega_rel, c, como_dest

    for k in range(bisect_left(partidas, partida_s), len(partidas)):
        dep = partidas[k]
        if dep >= melhor or dep > limite:
            break
        v = viagens[k]
        if not viagem_ativa[v]:
            continue
        if v not in embarque:
            p0 = des[k]
            if chegada[p0] >= INF:
                continue
            folga = TROCA_MIN_S if de_onibus[p0] or (como[p0] and como[p0][0] == "caminhada") else 0
            # Caminhada de baldeação já consumiu tempo; ainda exige folga mínima se veio de ônibus.
            if como[p0] and como[p0][0] == "caminhada":
                folga = max(folga, 30)
            if chegada[p0] + folga > dep:
                continue
            embarque[v] = (k, embarques_n[p0] + 1)
        k0, n_emb = embarque[v]
        a, p = chegadas[k], paras[k]
        c_novo = a + n_emb * PENALIDADE_EMBARQUE_S
        if c_novo < custo[p] or (c_novo == custo[p] and a < chegada[p]):
            chegada[p], custo[p], embarques_n[p] = a, c_novo, n_emb
            como[p], de_onibus[p] = ("onibus", v, k0, k), True
            if p in finais:
                _melhorar_destino(a + segundos_a_pe(finais[p]), n_emb, ("parada", p))
            for q, w in rede.vizinhos[p]:
                chega_q = a + w
                c_q = chega_q + n_emb * PENALIDADE_EMBARQUE_S
                if c_q < custo[q] or (c_q == custo[q] and chega_q < chegada[q]):
                    chegada[q], custo[q], embarques_n[q] = chega_q, c_q, n_emb
                    como[q], de_onibus[q] = ("caminhada", p, w), False
                    if q in finais:
                        _melhorar_destino(
                            chega_q + segundos_a_pe(finais[q]), n_emb, ("parada", q),
                        )

    resultado = _montar(
        rede, origem, destino, nome_destino, partida_s, melhor, melhor_como, como, chegada, finais, direto,
    )
    if aviso_snap and resultado.get("disponivel"):
        resultado = dict(resultado)
        previo = resultado.get("aviso")
        resultado["aviso"] = f"{previo} {aviso_snap}".strip() if previo else aviso_snap
    return resultado


def _montar(rede, origem, destino, nome_destino, partida_s, melhor, melhor_como, como, chegada, finais, direto) -> dict:
    ponto_origem = {"nome": "Imóvel", "lat": origem[0], "lng": origem[1]}
    ponto_destino = {"nome": nome_destino, "lat": destino[0], "lng": destino[1]}
    walk_min = max(1, round(segundos_a_pe(direto) / 60)) if direto else 1

    if melhor_como is None or melhor >= INF:
        return {
            "disponivel": False,
            "motivo": (
                f"Não encontramos ônibus até {nome_destino} nesta faixa de horário "
                f"(próximas 3 h). A caminhada direta levaria cerca de {walk_min} min — "
                "tente outro horário, dia ou destino."
            ),
            "tempo_min_caminhada": walk_min,
        }

    def a_pe(de_ponto, para_ponto, metros, inicio, papel="caminhada"):
        dist = round(metros * 1.3) if metros else 0
        return {
            "tipo": "a_pe",
            "papel": papel,  # ate_ponto | baldeacao | ate_destino | caminhada
            "de": de_ponto,
            "para": para_ponto,
            "distancia_m": dist,
            "minutos": 0 if dist == 0 else max(1, round(segundos_a_pe(metros) / 60)),
            "partida": _hhmm(inicio),
        }

    trechos: list[dict] = []
    if melhor_como[0] == "direto":
        trechos.append(a_pe(ponto_origem, ponto_destino, direto, partida_s, "caminhada"))
    else:
        atual = melhor_como[1]
        trechos.append(
            a_pe(_ponto(rede, atual), ponto_destino, finais[atual], chegada[atual], "ate_destino")
        )
        for _ in range(100):  # cada passo volta no tempo; o limite só protege contra dado ruim
            passo = como[atual]
            if passo[0] == "origem":
                trechos.append(
                    a_pe(ponto_origem, _ponto(rede, atual), passo[1], partida_s, "ate_ponto")
                )
                break
            if passo[0] == "caminhada":
                _, anterior, _w = passo
                metros = distancia_m(
                    rede.lat[anterior], rede.lon[anterior], rede.lat[atual], rede.lon[atual]
                )
                trechos.append(
                    a_pe(
                        _ponto(rede, anterior),
                        _ponto(rede, atual),
                        metros,
                        chegada[anterior],
                        "baldeacao",
                    )
                )
                atual = anterior
                continue
            _, v, k0, k1 = passo
            seq = rede.paradas_viagem[v][rede.posicao[k0]: rede.posicao[k1] + 2]
            caminho = [[rede.lat[i], rede.lon[i]] for i in seq]
            metros = sum(distancia_m(*caminho[i], *caminho[i + 1]) for i in range(len(caminho) - 1))
            espera = max(0, rede.partida[k0] - (chegada[rede.de[k0]] if chegada[rede.de[k0]] < INF else partida_s))
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
                "espera_min": max(0, round(espera / 60)),
                "caminho": caminho,
            })
            atual = rede.de[k0]
        trechos.reverse()

    onibus = [t for t in trechos if t["tipo"] == "onibus"]
    caminhada_min = sum(t["minutos"] for t in trechos if t["tipo"] == "a_pe")
    total_min = max(1, round((melhor - partida_s) / 60))
    ate_ponto = next((t for t in trechos if t.get("papel") == "ate_ponto"), None)
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
        "linhas": [t["linha"] for t in onibus],
        "ponto_embarque": ate_ponto["para"] if ate_ponto else (onibus[0]["de"] if onibus else None),
        "distancia_ponto_m": ate_ponto["distancia_m"] if ate_ponto else None,
        "trechos": trechos,
        "fonte": "GTFS " + " + ".join(rede.feeds) if rede.feeds else "GTFS",
    }


def calcular_ate_chegar(
    origem: tuple[float, float],
    destino: tuple[float, float],
    dia: date,
    chegada_alvo_s: int,
    nome_destino: str = "Destino",
    rede: Optional[Rede] = None,
) -> dict:
    """Última saída possível para chegar até `chegada_alvo_s` (ancora=chegada).

    Busca binária em partidas no intervalo [alvo − JANELA, alvo], reusando o CSA
    de partida. Sem coluna/schema novo — só parâmetro de consulta.
    """
    rede = rede or _rede
    if rede is None:
        return {"disponivel": False, "motivo": motivo_indisponivel()}

    alvo = max(0, min(int(chegada_alvo_s), 27 * 3600))  # GTFS pode passar de 24h
    lo = max(0, alvo - JANELA_S)
    hi = alvo
    melhor: Optional[dict] = None

    def _score(cand: dict) -> tuple:
        # Prefere sair mais tarde; empatando, menos baldeações e menos tempo.
        try:
            h, m = (int(x) for x in str(cand.get("partida") or "0:0").split(":")[:2])
            partida = h * 3600 + m * 60
        except ValueError:
            partida = 0
        return (partida, -int(cand.get("baldeacoes") or 0), -int(cand.get("tempo_min") or 0))

    # Passos de 1 min; ~11 iterações cobrem a janela de 3 h.
    while lo <= hi:
        mid = ((lo + hi) // 2 // 60) * 60
        cand = calcular(origem, destino, dia, mid, nome_destino, rede=rede)
        if not cand.get("disponivel"):
            hi = mid - 60
            continue
        chegada_est = mid + int(cand.get("tempo_min") or 0) * 60
        if chegada_est <= alvo:
            if melhor is None or _score(cand) > _score(melhor):
                melhor = cand
            lo = mid + 60
        else:
            hi = mid - 60

    if melhor is None:
        # Tenta sair no início da janela (melhor esforço).
        fallback = calcular(origem, destino, dia, max(0, alvo - JANELA_S), nome_destino, rede=rede)
        if fallback.get("disponivel"):
            fallback = dict(fallback)
            fallback["ancora"] = "chegada"
            fallback["hora_alvo"] = _hhmm(alvo)
            fallback["aviso"] = (
                f"Não há saída que chegue até {_hhmm(alvo)}; mostrando a melhor na janela."
            )
            return fallback
        return {
            "disponivel": False,
            "motivo": f"Não há ônibus que chegue até {_hhmm(alvo)} neste dia.",
        }

    out = dict(melhor)
    out["ancora"] = "chegada"
    out["hora_alvo"] = _hhmm(alvo)
    return out


def chave_destino(lat: float, lng: float, hora: str) -> str:
    """Chave do cache em rotas_mobilidade.destino (até 150 caracteres)."""
    return f"{lat:.4f},{lng:.4f}@{hora}"
