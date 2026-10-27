"""
Mural de imóveis no formato que o front espera (frontend/js/mock-api.js).

JSON ↔ banco: ver docs/frontend/papeis-e-rotas-api-v1.md. `preco` é o custo total
mensal (aluguel + condomínio + IPTU + contas), igual ao mock.
"""

from __future__ import annotations

from typing import Any, Mapping, Optional, Sequence

from app.models.locatario import Locatario
from app.models.post import Post
from app.services.matching_service import (
    avaliar_elegibilidade_chat,
    match_percent,
    normalizar_tag,
    tags_correspondentes,
)

# O banco ainda não tem a coluna locatarios.limiar_compatibilidade (o front usa).
# Enquanto não houver migração, o valor vem de locatarios.preferencias_moradia (JSONB).
CHAVE_LIMIAR = "limiar_compatibilidade"


def _num(valor: Any) -> float:
    return float(valor) if valor is not None else 0.0


def limiar_do_locatario(locatario: Optional[Locatario]) -> Optional[float]:
    prefs = (locatario.preferencias_moradia if locatario else None) or {}
    limiar = prefs.get(CHAVE_LIMIAR, prefs.get("limiar"))
    return float(limiar) if limiar is not None else None


def montar_imovel(
    post: Post,
    tags: Sequence[str],
    user_tags: Sequence[str],
    locatario: Optional[Locatario],
) -> dict:
    """Serializa um anúncio (post + imóvel + endereço + fotos) com match e elegibilidade."""
    imovel = post.imovel
    endereco = imovel.endereco
    fotos = [i.url_imagem for i in sorted(imovel.imagens, key=lambda i: i.ordem_exibicao or 0)]

    aluguel = _num(imovel.valor_aluguel)
    condominio = _num(imovel.valor_condominio)
    iptu = _num(imovel.valor_iptu)
    contas = _num(imovel.valor_contas_extras)
    preco = aluguel + condominio + iptu + contas

    match = match_percent(user_tags, tags)
    elegibilidade = None
    if locatario is not None:
        bruta = avaliar_elegibilidade_chat(
            user_tags=user_tags,
            imovel_tags=tags,
            limiar=limiar_do_locatario(locatario),
            orcamento=_num(locatario.orcamento_maximo),
            preco=preco,
            papel="Morador",
        )
        elegibilidade = {
            **bruta,
            "limiar_compatibilidade": bruta["limiar"],
            "orcamento_maximo": bruta["orcamento"],
        }

    return {
        "id": imovel.id_imovel,
        "id_post": post.id_post,
        "titulo": post.titulo,
        "tipo": imovel.tipo_imovel,
        "bairro": endereco.bairro if endereco else None,
        "cidade": endereco.cidade if endereco else None,
        "endereco": _endereco_texto(endereco),
        "preco": preco,
        "aluguel": aluguel,
        "condominio": condominio,
        "iptu": iptu,
        "contas": contas,
        "area_m2": _num(imovel.area_m2) if imovel.area_m2 is not None else None,
        "descricao": post.descricao or imovel.descricao,
        "vagas": imovel.vagas_disponiveis,
        "quartos": imovel.quantidade_quartos,
        "tags": list(tags),
        "capa": fotos[0] if fotos else None,
        "fotos": fotos,
        "locador_id": post.id_locador,
        "match_percent": match,
        "match": match,
        "tags_correspondentes": tags_correspondentes(user_tags, tags),
        "elegibilidade": elegibilidade,
    }


def _endereco_texto(endereco) -> Optional[str]:
    if endereco is None:
        return None
    rua = f"{endereco.rua}, {endereco.numero}" if endereco.numero else endereco.rua
    return f"{rua} · {endereco.bairro}"


def filtrar_imoveis(
    itens: Sequence[Mapping],
    *,
    tipo: str = "",
    bairro: str = "",
    tag: str = "",
    preco_max: float = 0,
) -> list[Mapping]:
    """Mesmos filtros do mural no mock: tipo, bairro (também busca em título/cidade/
    endereço), tag (igual ou contida) e preco_max."""
    tipo = (tipo or "").lower()
    bairro = (bairro or "").lower()
    tag_q = normalizar_tag(tag or "")
    resultado = list(itens)

    if tipo and tipo != "todos":
        resultado = [
            i
            for i in resultado
            if (t := (i["tipo"] or "").lower()).startswith(tipo[:4])
            or tipo in t
            or (tipo == "apart." and i["tipo"] == "Apartamento")
        ]
    if bairro:
        resultado = [
            i
            for i in resultado
            if bairro
            in f"{i['titulo']} {i['bairro'] or ''} {i['cidade'] or ''} {i['endereco'] or ''}".lower()
        ]
    if tag_q:
        resultado = [
            i
            for i in resultado
            if any(
                (nt := normalizar_tag(t)) == tag_q or nt in tag_q or tag_q in nt
                for t in i["tags"]
            )
        ]
    if preco_max and preco_max > 0:
        resultado = [i for i in resultado if i["preco"] <= preco_max]
    return resultado
