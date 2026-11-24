"""
Mural de imóveis no formato que o front espera (frontend/js/mock-api.js).

JSON ↔ banco: ver docs/frontend/papeis-e-rotas-api-v1.md. `preco` é o custo total
mensal (aluguel + condomínio + IPTU + contas), igual ao mock.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Mapping, Optional, Sequence

from sqlalchemy.orm import Query, Session, joinedload, selectinload

from app.models.imovel import Imovel
from app.models.integrante_imovel import IntegranteImovel
from app.models.locatario import Locatario
from app.models.post import Post
from app.services.matching_service import (
    avaliar_elegibilidade_chat,
    match_percent,
    normalizar_tag,
    tags_correspondentes,
)


def opcoes_carga_anuncio(*, com_moradores: bool = True):
    """Evita N+1: imóvel, endereço e fotos; moradores só no detalhe (mural não usa)."""
    extras = []
    if com_moradores:
        extras.append(
            selectinload(Imovel.integrantes).selectinload(IntegranteImovel.pessoa)
        )
    return (
        selectinload(Post.imovel).options(
            joinedload(Imovel.endereco),
            selectinload(Imovel.imagens),
            *extras,
        ),
    )


def query_posts(db: Session, *, com_moradores: bool = True) -> Query:
    """Query base de anúncios já com relacionamentos usados em `montar_imovel`."""
    return db.query(Post).options(*opcoes_carga_anuncio(com_moradores=com_moradores))


def recarregar_post(db: Session, post: Post, *, com_moradores: bool = True) -> Post:
    """Rebusca o post com carga eager (após criar/editar/fotos)."""
    return (
        query_posts(db, com_moradores=com_moradores)
        .filter(Post.id_post == post.id_post)
        .one()
    )



def _num(valor: Any) -> float:
    return float(valor) if valor is not None else 0.0


def _num_ou_none(valor: Any) -> Optional[float]:
    return float(valor) if valor is not None else None


def limiar_do_locatario(locatario: Optional[Locatario]) -> Optional[float]:
    limiar = locatario.limiar_compatibilidade if locatario else None
    return float(limiar) if limiar is not None else None


def montar_imovel(
    post: Post,
    tags: Sequence[str],
    user_tags: Sequence[str],
    locatario: Optional[Locatario],
    *,
    incluir_moradores: bool = True,
) -> dict:
    """Serializa um anúncio (post + imóvel + endereço + fotos) com match e elegibilidade."""
    imovel = post.imovel
    endereco = imovel.endereco
    imagens = sorted(imovel.imagens, key=lambda i: i.ordem_exibicao or 0)
    fotos = [i.url_imagem for i in imagens]

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
        "fotos_ids": [i.id_imagem for i in imagens],  # para DELETE /imoveis/{id}/fotos/{id_imagem}
        "rua": getattr(endereco, "rua", None),
        "numero": getattr(endereco, "numero", None),
        "cep": getattr(endereco, "cep", None),
        "estado": getattr(endereco, "estado", None),
        "latitude": _num_ou_none(getattr(endereco, "latitude", None)),
        "longitude": _num_ou_none(getattr(endereco, "longitude", None)),
        "badge": imovel.tipo_imovel,
        "moradores_atuais": moradores_atuais(imovel) if incluir_moradores else [],
        "locador_id": post.id_locador,
        "classificacao": imovel.classificacao or "Mista",
        "status_anuncio": post.status_anuncio,
        "match_percent": match,
        "match": match,
        "tags_correspondentes": tags_correspondentes(user_tags, tags),
        "elegibilidade": elegibilidade,
    }


ESTILOS_FOTO = ("foto-1", "foto-2", "foto-3")


def _idade(nascimento: Optional[date]) -> Optional[int]:
    if nascimento is None:
        return None
    hoje = date.today()
    return hoje.year - nascimento.year - ((hoje.month, hoje.day) < (nascimento.month, nascimento.day))


def moradores_atuais(imovel) -> list[dict]:
    """Resumo de quem já mora no imóvel (RF23), no formato do mock:
    `{ nome, iniciais, linha, estilo, foto_url }`. Só primeiro nome, sem contato."""
    from app.services.perfil_service import iniciais

    ativos = [
        i for i in (getattr(imovel, "integrantes", None) or [])
        if (i.status_moradia or "ativo") == "ativo" and i.data_saida is None
    ]
    resumo = []
    for n, integrante in enumerate(sorted(ativos, key=lambda i: i.id_integrante)):
        pessoa = integrante.pessoa
        nome = (pessoa.nome or "Morador").split()[0] if pessoa else "Morador"
        partes = [
            getattr(pessoa, "ocupacao", None) or getattr(pessoa, "faculdade", None),
            (f"{idade} anos" if (idade := _idade(getattr(pessoa, "data_nascimento", None))) else None),
        ]
        resumo.append(
            {
                "nome": nome,
                "iniciais": iniciais(pessoa.nome if pessoa else nome) or "?",
                "linha": " · ".join(p for p in partes if p) or "Mora no imóvel",
                "estilo": ESTILOS_FOTO[n % len(ESTILOS_FOTO)],
                "foto_url": getattr(pessoa, "foto_perfil", None) or "",
            }
        )
    return resumo


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
