"""Mobilidade (RF28–RF31): rota de ônibus imóvel → destino com GTFS da EMDEC/EMTU.

  GET /mobilidade/status   feeds carregados (público, para diagnóstico)
  GET /mobilidade/rota     rota de ônibus; guarda o resultado em rotas_mobilidade (cache)
"""

from __future__ import annotations

import re
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.endereco_imovel import EnderecoImovel
from app.models.rota_mobilidade import RotaMobilidade
from app.models.usuario import Usuario
from app.services import mobilidade_service

router = APIRouter(prefix="/mobilidade", tags=["mobilidade"])

MEIO = "onibus"


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
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Origem: coordenadas do imóvel (se cadastradas) ou `origem_lat`/`origem_lng`
    (o site manda o endereço geocodificado). Dia padrão: hoje, ou o próximo dia útil."""
    hora_txt, partida_s = _hora(hora)
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
    resultado = mobilidade_service.calcular(origem, (destino_lat, destino_lng), dia, partida_s, destino_nome)
    resultado.update({"dia": dia.isoformat(), "hora": hora_txt})

    if resultado.get("disponivel") and imovel_id is not None:
        _guardar_cache(db, imovel_id, destino_lat, destino_lng, destino_nome, hora_txt, resultado)
    return resultado


def _guardar_cache(db, imovel_id, lat, lng, nome, hora, resultado) -> None:
    from app.models.imovel import Imovel

    if db.get(Imovel, imovel_id) is None:
        return
    chave = mobilidade_service.chave_destino(lat, lng, hora)
    linha = (
        db.query(RotaMobilidade)
        .filter(RotaMobilidade.id_imovel == imovel_id, RotaMobilidade.destino == chave,
                RotaMobilidade.meio_transporte == MEIO)
        .first()
    )
    if linha is None:
        linha = RotaMobilidade(id_imovel=imovel_id, destino=chave, meio_transporte=MEIO)
        db.add(linha)
    linha.tempo_estimado_min = resultado["tempo_min"]
    linha.distancia_km = resultado["distancia_km"]
    linha.detalhes = {"nome_destino": nome, "dia": resultado["dia"], "baldeacoes": resultado["baldeacoes"]}
    linha.calculado_em = datetime.now(timezone.utc)
    db.commit()


def deslocamentos_salvos(db: Session, ids_imovel: list[int], destino: Optional[dict]) -> dict[int, dict]:
    """Tempos em cache para o destino salvo do morador (usado no mural e em /stats)."""
    if not destino or not ids_imovel:
        return {}
    try:
        chave = mobilidade_service.chave_destino(float(destino["lat"]), float(destino["lng"]), destino.get("hora") or "07:30")
    except (KeyError, TypeError, ValueError):
        return {}
    linhas = (
        db.query(RotaMobilidade)
        .filter(RotaMobilidade.id_imovel.in_(ids_imovel), RotaMobilidade.destino == chave,
                RotaMobilidade.meio_transporte == MEIO)
        .all()
    )
    return {
        r.id_imovel: {
            "deslocamento_min": r.tempo_estimado_min,
            "distancia_km": float(r.distancia_km) if r.distancia_km is not None else None,
            "destino": destino.get("nome") or (r.detalhes or {}).get("nome_destino"),
        }
        for r in linhas
    }
