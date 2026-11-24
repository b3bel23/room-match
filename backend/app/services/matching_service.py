"""
Matching por tags de convivência — contrato alinhado ao frontend.

Semântica (papéis do catálogo):
  - **Adesão** (o que busco): só conta se o anúncio também marcou (ou equivalente).
  - **Restrição** (o que não aceito): satisfeita se o anúncio **não** tem conflito;
    anúncio em silêncio = neutro (ok). Explicitar a mesma restrição também vale.
  - **Não marcado** = neutro (não entra na conta).
  - Tags fora do catálogo / comodidades / lixo digitado **não** entram no %.
  - Conflito duro (ex.: quero Aceita Animais × anúncio Sem Animais): teto 35%.

score = média das tags marcadas do morador (adesão coberta 0/1, restrição ok 0/1)
Chat: match >= limiar AND preço <= orçamento.
"""

from __future__ import annotations

from typing import Iterable, Mapping, Optional, Sequence

from sqlalchemy.orm import Session

from app.models.imovel_tag import ImovelTag
from app.models.locatario import Locatario
from app.models.tag import Tag
from app.models.usuario import Usuario
from app.models.usuario_tag import UsuarioTag
from app.services.tags_catalogo import (
    ADESAO,
    RESTRICAO,
    canonico,
    conflitos_de,
    filtrar_convivencia,
    tags_para_match,
)

# Adesão coberta por outra tag do anúncio (ex.: casa vegana atende quem busca vegetariano).
_COBRE: dict[str, frozenset[str]] = {
    "Vegetariano": frozenset({"Vegano"}),
}

_TETO_CONFLITO = 35


def normalizar_tag(tag: str) -> str:
    """Chave estável (legado dos testes); preferir tags_para_match no score."""
    c = canonico(tag)
    t = (c or tag or "").strip().lower()
    if t in {"vegano/vegetariano", "vegetariano/vegano"}:
        return "vegetariano"
    if t in {"silêncio", "silencio"}:
        return "silêncio noturno"
    return t


def _tags_marcadas(tags: Optional[Sequence[str]]) -> set[str]:
    return {normalizar_tag(t) for t in tags_para_match(tags)}


def _adesao_coberta(tag: str, no_anuncio: set[str]) -> bool:
    if tag in no_anuncio:
        return True
    return any(alt in no_anuncio for alt in _COBRE.get(tag, ()))


def _tem_conflito(tag: str, no_anuncio: set[str]) -> bool:
    return any(c in no_anuncio for c in conflitos_de(tag))


def match_percent(
    user_tags: Optional[Sequence[str]],
    imovel_tags: Optional[Sequence[str]],
    *,
    seed_match: Optional[float] = None,
) -> int:
    """
    % inteligente das tags de catálogo marcadas pelo morador.
    Sem tags de catálogo no perfil: seed_match (preview) ou 0.
    """
    do_morador = tags_para_match(user_tags)
    if not do_morador:
        return int(seed_match or 0)

    no_anuncio = set(tags_para_match(imovel_tags))
    adesao = set(ADESAO)
    restricao = set(RESTRICAO)

    pontos = 0.0
    conflito_duro = False

    for tag in do_morador:
        if _tem_conflito(tag, no_anuncio):
            conflito_duro = True
            # 0 ponto nesta tag
            continue

        if tag in restricao:
            # Silêncio no anúncio ou mesma restrição = ok.
            pontos += 1.0
        elif tag in adesao:
            pontos += 1.0 if _adesao_coberta(tag, no_anuncio) else 0.0
        else:
            # Catálogo só deveria ser adesão/restrição; fallback = exige presença.
            pontos += 1.0 if tag in no_anuncio else 0.0

    score = int(round(100.0 * pontos / len(do_morador)))
    if conflito_duro:
        score = min(score, _TETO_CONFLITO)
    return score


def avaliar_elegibilidade_chat(
    *,
    user_tags: Sequence[str],
    imovel_tags: Sequence[str],
    limiar: Optional[float],
    orcamento: Optional[float],
    preco: float,
    papel: str = "Morador",
) -> dict:
    match = match_percent(user_tags, imovel_tags)
    limiar_val = float(limiar) if limiar is not None else None
    orcamento_val = float(orcamento) if orcamento is not None else None

    limiar_ok = limiar_val is None or match >= limiar_val
    orcamento_ok = (
        orcamento_val is None
        or orcamento_val <= 0
        or float(preco) <= orcamento_val
    )
    chat_liberado = (
        papel in {"Morador", "Locatario", "locatario"}
        and limiar_ok
        and orcamento_ok
    )
    return {
        "match": match,
        "limiar": limiar_val,
        "orcamento": orcamento_val,
        "limiar_ok": limiar_ok,
        "orcamento_ok": orcamento_ok,
        "chat_liberado": chat_liberado,
    }


def match_medio(
    user_tags: Optional[Sequence[str]],
    imoveis: Iterable[Mapping],
    *,
    tags_key: str = "tags",
    seed_key: str = "match_percent",
) -> int:
    """Average personalized match across listings (for /stats)."""
    lista = list(imoveis)
    if not lista:
        return 0
    total = 0
    for imovel in lista:
        total += match_percent(
            user_tags,
            imovel.get(tags_key) or [],
            seed_match=imovel.get(seed_key),
        )
    return int(round(total / len(lista)))


def tags_por_imovel(db: Session, ids_imovel: Sequence[int]) -> dict[int, list[str]]:
    """Tags (tabela imovel_tags) de vários imóveis numa única consulta (canônicas)."""
    resultado: dict[int, list[str]] = {i: [] for i in ids_imovel}
    if not resultado:
        return resultado
    linhas = (
        db.query(ImovelTag.id_imovel, Tag.nome)
        .join(Tag, Tag.id_tag == ImovelTag.id_tag)
        .filter(ImovelTag.id_imovel.in_(list(resultado)))
        .all()
    )
    brutos: dict[int, list[str]] = {i: [] for i in resultado}
    for id_imovel, nome in linhas:
        brutos[id_imovel].append(nome)
    for id_imovel, nomes in brutos.items():
        # Convivência canônica na resposta de match; comodidades ficam fora.
        resultado[id_imovel] = filtrar_convivencia(nomes)
    return resultado


def tags_do_imovel(db: Session, id_imovel: int) -> list[str]:
    return tags_por_imovel(db, [id_imovel])[id_imovel]


def tags_do_usuario(
    db: Session, usuario: Usuario, locatario: Optional[Locatario] = None
) -> list[str]:
    """Só tags de convivência marcadas no perfil (nunca comodidade nem lixo solto).

    Fonte, da mais específica: usuario_tags → tags_estilo_vida → tags_convivencia.
    Sempre canônicas e do catálogo quando possível.
    """
    nomes = [
        nome
        for (nome,) in db.query(Tag.nome)
        .join(UsuarioTag, UsuarioTag.id_tag == Tag.id_tag)
        .filter(UsuarioTag.id_usuario == usuario.id_usuario)
        .all()
    ]
    if not nomes and locatario is not None and locatario.tags_estilo_vida:
        nomes = list(locatario.tags_estilo_vida)
    if not nomes:
        nomes = list(usuario.tags_convivencia or [])
    # Preferência: catálogo; se só houver aliases, filtrar_convivencia resolve.
    catalogadas = tags_para_match(nomes)
    return catalogadas if catalogadas else filtrar_convivencia(nomes)


def tags_correspondentes(
    user_tags: Optional[Sequence[str]], imovel_tags: Optional[Sequence[str]]
) -> list[str]:
    """Tags do anúncio que cobrem adesões (ou repetem restrições) do morador."""
    do_usuario = set(tags_para_match(user_tags))
    no_anuncio = tags_para_match(imovel_tags)
    saida: list[str] = []
    for t in no_anuncio:
        if t in do_usuario:
            saida.append(t)
            continue
        # Anúncio Vegano destaca se morador pediu Vegetariano
        for u in do_usuario:
            if t in _COBRE.get(u, ()):
                saida.append(t)
                break
    return saida
