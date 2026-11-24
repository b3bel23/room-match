"""Mobilidade (RF28–RF31): rota de ônibus imóvel → destino com GTFS da EMDEC/EMTU.

  GET /mobilidade/status   feeds carregados (público, para diagnóstico)
  GET /mobilidade/rota     rota de ônibus; guarda o resultado em rotas_mobilidade (cache)

Cache (`rotas_mobilidade.destino`): chave `lat,lng@HH:MM`. O mural e `/stats` leem a
hora padrão `07:30` (ou `destino.hora` salvo em `preferencias_moradia`). Toda rota
bem-sucedida também grava essa chave mural, para o card “X min · PUC” aparecer.
"""

from __future__ import annotations

import logging
import re
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.endereco_imovel import EnderecoImovel
from app.models.post import Post
from app.models.rota_mobilidade import RotaMobilidade
from app.models.usuario import Usuario
from app.services import mobilidade_service
from app.utils.gtfs_loader import distancia_m

router = APIRouter(prefix="/mobilidade", tags=["mobilidade"])
log = logging.getLogger("roommatch.mobilidade")

MEIO = "onibus"
# Hora que o mural/`deslocamentos_salvos` usa quando o destino salvo não traz `hora`.
HORA_MURAL = "07:30"


@router.get("/status")
def status_gtfs():
    return mobilidade_service.status()


def _hora(texto: str) -> tuple[str, int]:
    m = re.fullmatch(r"(\d{1,2}):(\d{2})", texto.strip())
    if not m or int(m.group(1)) > 23 or int(m.group(2)) > 59:
        raise HTTPException(422, "Use a hora no formato HH:MM.")
    h, mi = int(m.group(1)), int(m.group(2))
    return f"{h:02d}:{mi:02d}", h * 3600 + mi * 60


@router.get("/rota")
def rota_onibus(
    destino_lat: float = Query(..., ge=-90, le=90),
    destino_lng: float = Query(..., ge=-180, le=180),
    destino_nome: str = Query("Destino", max_length=100),
    imovel_id: Optional[int] = None,
    origem_lat: Optional[float] = Query(None, ge=-90, le=90),
    origem_lng: Optional[float] = Query(None, ge=-180, le=180),
    hora: str = "07:30",
    dia: Optional[date] = None,
    ancora: str = Query("partida", pattern="^(partida|chegada)$"),
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Origem: coordenadas do imóvel (se cadastradas) ou `origem_lat`/`origem_lng`
    (o site manda o endereço geocodificado). Dia padrão: hoje, ou o próximo dia útil.

    `ancora=partida` (padrão): sai a partir de `hora`.
    `ancora=chegada`: última saída que ainda chega até `hora`.
    """
    hora_txt, hora_s = _hora(hora)
    origem = None
    if imovel_id is not None:
        endereco = db.query(EnderecoImovel).filter(EnderecoImovel.id_imovel == imovel_id).first()
        if endereco is not None and endereco.latitude is not None and endereco.longitude is not None:
            origem = (float(endereco.latitude), float(endereco.longitude))
    if origem is None and origem_lat is not None and origem_lng is not None:
        origem = (origem_lat, origem_lng)
    if origem is None:
        raise HTTPException(422, "Informe a origem (imóvel com coordenadas ou origem_lat/origem_lng).")

    dia = dia or mobilidade_service.proximo_dia_util()
    dest = (destino_lat, destino_lng)
    if ancora == "chegada":
        resultado = mobilidade_service.calcular_ate_chegar(
            origem, dest, dia, hora_s, destino_nome
        )
    else:
        resultado = mobilidade_service.calcular(origem, dest, dia, hora_s, destino_nome)
        if resultado.get("disponivel"):
            resultado = dict(resultado)
            resultado["ancora"] = "partida"
            resultado["hora_alvo"] = hora_txt

    resultado.update({"dia": dia.isoformat(), "hora": hora_txt})

    if resultado.get("disponivel") and imovel_id is not None:
        # Cache mural continua na chave da partida efetiva (não a âncora de chegada).
        hora_cache = resultado.get("partida") or hora_txt
        guardar_cache(db, imovel_id, destino_lat, destino_lng, destino_nome, hora_cache, resultado)
    return resultado


def estimativa_urbana(origem: tuple[float, float], destino: tuple[float, float], nome: str) -> dict:
    """Fallback quando o GTFS ainda não carregou: tempo ~ônibus urbano (linha reta)."""
    dist_m = distancia_m(origem[0], origem[1], destino[0], destino[1])
    dist_km = round(dist_m / 1000.0, 2)
    # ~18 km/h efetivo + 8 min de espera/caminhada até o ponto.
    tempo = max(5, int(round(dist_km / 18.0 * 60.0)) + 8)
    return {
        "disponivel": True,
        "tempo_min": tempo,
        "distancia_km": dist_km,
        "baldeacoes": 0,
        "dia": date.today().isoformat(),
        "fonte": "estimativa",
        "trechos": [],
        "nome_destino": nome,
    }


def _upsert_linha(db: Session, imovel_id: int, chave: str, nome: str, resultado: dict) -> None:
    linha = (
        db.query(RotaMobilidade)
        .filter(
            RotaMobilidade.id_imovel == imovel_id,
            RotaMobilidade.destino == chave,
            RotaMobilidade.meio_transporte == MEIO,
        )
        .first()
    )
    if linha is None:
        linha = RotaMobilidade(id_imovel=imovel_id, destino=chave, meio_transporte=MEIO)
        db.add(linha)
    linha.tempo_estimado_min = int(resultado["tempo_min"])
    linha.distancia_km = resultado.get("distancia_km")
    linha.detalhes = {
        "nome_destino": nome,
        "dia": resultado.get("dia"),
        "baldeacoes": resultado.get("baldeacoes", 0),
        "fonte": resultado.get("fonte") or "GTFS",
    }
    linha.calculado_em = datetime.now(timezone.utc)


def guardar_cache(db, imovel_id, lat, lng, nome, hora, resultado) -> None:
    """Persiste em `rotas_mobilidade` e espelha na chave do mural (`HORA_MURAL`)."""
    from app.core import cache_resposta
    from app.models.imovel import Imovel

    if db.get(Imovel, imovel_id) is None:
        return
    horas = {hora, HORA_MURAL}
    for h in horas:
        _upsert_linha(db, imovel_id, mobilidade_service.chave_destino(lat, lng, h), nome, resultado)
    db.commit()
    cache_resposta.invalidate_prefix("mural:")
    cache_resposta.invalidate_prefix("stats:")


def aquecer_cache_destino(db: Session, destino: dict, *, limite: int = 40) -> int:
    """Calcula (GTFS ou estimativa) e grava cache mural para anúncios ativos com coords.

    Chamado ao salvar `preferencias_moradia.destino` para o mural/`stats` não ficarem
    vazios até o usuário abrir cada detalhe.
    """
    try:
        lat = float(destino["lat"])
        lng = float(destino["lng"])
        nome = str(destino.get("nome") or "Destino")[:100]
        hora = str(destino.get("hora") or HORA_MURAL)
    except (KeyError, TypeError, ValueError):
        return 0

    _, partida_s = _hora(hora if re.fullmatch(r"\d{1,2}:\d{2}", hora) else HORA_MURAL)
    dest = (lat, lng)
    dia = mobilidade_service.proximo_dia_util()

    rows = (
        db.query(EnderecoImovel.id_imovel, EnderecoImovel.latitude, EnderecoImovel.longitude)
        .join(Post, Post.id_imovel == EnderecoImovel.id_imovel)
        .filter(
            Post.status_anuncio == "ativo",
            EnderecoImovel.latitude.isnot(None),
            EnderecoImovel.longitude.isnot(None),
        )
        .limit(limite)
        .all()
    )
    gravados = 0
    for id_imovel, o_lat, o_lng in rows:
        origem = (float(o_lat), float(o_lng))
        resultado = mobilidade_service.calcular(origem, dest, dia, partida_s, nome)
        if not resultado.get("disponivel"):
            resultado = estimativa_urbana(origem, dest, nome)
        else:
            resultado = {**resultado, "fonte": resultado.get("fonte") or "GTFS"}
        guardar_cache(db, id_imovel, lat, lng, nome, HORA_MURAL, resultado)
        gravados += 1
    if gravados:
        log.info("Cache de mobilidade aquecido: %s imóveis → %s", gravados, nome)
    return gravados


def deslocamentos_salvos(db: Session, ids_imovel: list[int], destino: Optional[dict]) -> dict[int, dict]:
    """Tempos em cache para o destino salvo do morador (usado no mural e em /stats)."""
    if not destino or not ids_imovel:
        return {}
    try:
        lat, lng = float(destino["lat"]), float(destino["lng"])
        hora = destino.get("hora") or HORA_MURAL
        chave = mobilidade_service.chave_destino(lat, lng, hora)
        nome = destino.get("nome")
    except (KeyError, TypeError, ValueError):
        return {}
    linhas = (
        db.query(RotaMobilidade)
        .filter(
            RotaMobilidade.id_imovel.in_(ids_imovel),
            RotaMobilidade.destino == chave,
            RotaMobilidade.meio_transporte == MEIO,
        )
        .all()
    )
    out = {
        r.id_imovel: {
            "deslocamento_min": r.tempo_estimado_min,
            "distancia_km": float(r.distancia_km) if r.distancia_km is not None else None,
            "destino": nome or (r.detalhes or {}).get("nome_destino"),
        }
        for r in linhas
    }
    # Sem cache ainda: pelo menos devolve o nome do destino (card convida a abrir o mapa).
    if nome:
        for id_imovel in ids_imovel:
            out.setdefault(id_imovel, {"deslocamento_min": None, "distancia_km": None, "destino": nome})
    return out
