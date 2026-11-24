"""Dados em `locatarios.preferencias_moradia` (JSONB — sem coluna nova).

Contrato:
  preferencias_moradia.destinos = [
    { nome, lat, lng, tipo? },  # tipo: trabalho | faculdade | outro
    ...
  ]  # até 3
  preferencias_moradia.destino  = primeiro da lista (compatível com mural/mapa antigos)
  preferencias_moradia.modo_transporte = foot | bike | car | bus  (padrão do mural/mapa)
  preferencias_moradia.papel_ativo = "Morador" | "Locador"
    # Quando a conta tem linhas em `locatarios` e `locadores` ao mesmo tempo
    # (troca de papel em “sleep”), este campo diz qual UI/API está ativa.
    # Favoritos/conversas ficam no locatário; anúncios no locador — nada é apagado.

São lugares de interesse do morador (trabalho, faculdade, outro com título).
No mural, cada anúncio mostra o tempo/distância até esses destinos — não é “salvar anúncio”.
"""

from __future__ import annotations

from typing import Any, Optional, Sequence

MAX_DESTINOS = 3
TIPOS = frozenset({"trabalho", "faculdade", "outro"})
# Alinhado aos botões do mapa no detalhe (foot/bike/car/bus).
MODOS_TRANSPORTE = frozenset({"foot", "bike", "car", "bus"})
MODO_TRANSPORTE_PADRAO = "foot"
PAPEIS_ATIVOS = frozenset({"Morador", "Locador"})


def _norm_destino(item: Any) -> Optional[dict]:
    if item is None:
        return None
    if hasattr(item, "model_dump"):
        item = item.model_dump()
    if not isinstance(item, dict):
        return None
    try:
        lat = float(item["lat"])
        lng = float(item["lng"])
        nome = str(item.get("nome") or "").strip()[:100]
    except (KeyError, TypeError, ValueError):
        return None
    if not nome or not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        return None
    out = {"nome": nome, "lat": lat, "lng": lng}
    tipo = str(item.get("tipo") or "").strip().lower()
    if tipo in TIPOS:
        out["tipo"] = tipo
    if item.get("hora"):
        out["hora"] = str(item["hora"])[:5]
    return out


def _mesmo_lugar(a: dict, b: dict) -> bool:
    return abs(a["lat"] - b["lat"]) < 1e-3 and abs(a["lng"] - b["lng"]) < 1e-3


def ler_destinos(prefs: Optional[dict]) -> list[dict]:
    """Lê até 3 destinos do JSONB; cai no legado `destino` se `destinos` estiver vazio."""
    prefs = prefs or {}
    brutos = prefs.get("destinos")
    lista: list[dict] = []
    if isinstance(brutos, list):
        for item in brutos:
            d = _norm_destino(item)
            if d and not any(_mesmo_lugar(d, x) for x in lista):
                lista.append(d)
            if len(lista) >= MAX_DESTINOS:
                break
    if not lista:
        unico = _norm_destino(prefs.get("destino"))
        if unico:
            lista = [unico]
    return lista[:MAX_DESTINOS]


def normalizar_lista(itens: Sequence[Any] | None) -> list[dict]:
    """Valida e deduplica uma lista enviada pelo cliente (máx. 3)."""
    lista: list[dict] = []
    for item in itens or []:
        d = _norm_destino(item)
        if d and not any(_mesmo_lugar(d, x) for x in lista):
            lista.append(d)
        if len(lista) >= MAX_DESTINOS:
            break
    return lista


def gravar_em_prefs(prefs: Optional[dict], destinos: Sequence[Any] | None) -> dict:
    """Atualiza preferencias_moradia com destinos + espelho destino=primeiro."""
    base = dict(prefs or {})
    lista = normalizar_lista(destinos)
    if lista:
        base["destinos"] = lista
        base["destino"] = lista[0]
    else:
        base.pop("destinos", None)
        base.pop("destino", None)
    return base


def normalizar_modo(valor: Any) -> str:
    modo = str(valor or "").strip().lower()
    # Aliases amigáveis do front.
    aliases = {
        "a_pe": "foot",
        "ape": "foot",
        "pe": "foot",
        "walk": "foot",
        "bicicleta": "bike",
        "bike": "bike",
        "carro": "car",
        "car": "car",
        "onibus": "bus",
        "ônibus": "bus",
        "bus": "bus",
    }
    modo = aliases.get(modo, modo)
    return modo if modo in MODOS_TRANSPORTE else MODO_TRANSPORTE_PADRAO


def ler_modo_transporte(prefs: Optional[dict]) -> str:
    prefs = prefs or {}
    return normalizar_modo(prefs.get("modo_transporte") or prefs.get("meio_transporte"))


def gravar_modo_em_prefs(prefs: Optional[dict], modo: Any) -> dict:
    base = dict(prefs or {})
    base["modo_transporte"] = normalizar_modo(modo)
    return base


def ler_papel_ativo(prefs: Optional[dict]) -> Optional[str]:
    """Papel ativo quando a conta mantém locatário + locador (sleep)."""
    prefs = prefs or {}
    papel = str(prefs.get("papel_ativo") or "").strip()
    return papel if papel in PAPEIS_ATIVOS else None


def gravar_papel_ativo_em_prefs(prefs: Optional[dict], papel: str) -> dict:
    base = dict(prefs or {})
    if papel not in PAPEIS_ATIVOS:
        raise ValueError("papel_ativo inválido")
    base["papel_ativo"] = papel
    return base


def rotulo_tipo(tipo: Optional[str]) -> str:
    return {
        "trabalho": "Trabalho",
        "faculdade": "Faculdade",
        "outro": "Outro",
    }.get(str(tipo or "").lower(), "")


def rotulo_curto(destino: Optional[dict]) -> str:
    """Nome curto para o mural: Trabalho / Faculdade / título sem endereço."""
    if not destino:
        return "destino"
    tipo = str(destino.get("tipo") or "").lower()
    if tipo in ("trabalho", "faculdade"):
        return rotulo_tipo(tipo)
    nome = str(destino.get("nome") or "").strip()
    if " — " in nome:
        nome = nome.split(" — ", 1)[0].strip()
    return nome[:40] or rotulo_tipo(tipo) or "destino"
