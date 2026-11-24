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
    endereco_exato: bool = False,
) -> dict:
    """Serializa um anúncio (post + imóvel + endereço + fotos) com match e elegibilidade.

    Por padrão o endereço é aproximado (estilo Airbnb): rua + bairro, sem número/CEP.
    `endereco_exato=True` só para o dono (Meus anúncios / editar).
    """
    imovel = post.imovel
    endereco = imovel.endereco
    imagens = sorted(imovel.imagens, key=lambda i: i.ordem_exibicao or 0)
    fotos = [i.url_imagem for i in imagens]

    aluguel = _num(imovel.valor_aluguel)
    condominio = _num(imovel.valor_condominio)
    iptu = _num(imovel.valor_iptu)
    contas = _num(imovel.valor_contas_extras)
    preco = aluguel + condominio + iptu + contas

    from app.services.tags_catalogo import separar as separar_tags

    tags_convivencia, comodidades = separar_tags(tags)

    match = match_percent(user_tags, tags_convivencia)
    elegibilidade = None
    if locatario is not None:
        bruta = avaliar_elegibilidade_chat(
            user_tags=user_tags,
            imovel_tags=tags_convivencia,
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

    lat = _num_ou_none(getattr(endereco, "latitude", None))
    lng = _num_ou_none(getattr(endereco, "longitude", None))
    # Público: arredonda ~100 m para não pinchar a porta no mapa.
    if not endereco_exato:
        if lat is not None:
            lat = round(lat, 3)
        if lng is not None:
            lng = round(lng, 3)

    return {
        "id": imovel.id_imovel,
        "id_post": post.id_post,
        "titulo": post.titulo,
        "tipo": imovel.tipo_imovel,
        "bairro": endereco.bairro if endereco else None,
        "cidade": endereco.cidade if endereco else None,
        "endereco": _endereco_texto(endereco, exato=endereco_exato),
        "endereco_exato": endereco_exato,
        "preco": preco,
        "aluguel": aluguel,
        "condominio": condominio,
        "iptu": iptu,
        "contas": contas,
        "area_m2": _num(imovel.area_m2) if imovel.area_m2 is not None else None,
        "descricao": post.descricao or imovel.descricao,
        "vagas": imovel.vagas_disponiveis,
        "quartos": imovel.quantidade_quartos,
        "tags": tags_convivencia,
        "comodidades": comodidades,
        "capa": fotos[0] if fotos else None,
        "fotos": fotos,
        "fotos_ids": [i.id_imagem for i in imagens],  # para DELETE /imoveis/{id}/fotos/{id_imagem}
        "rua": getattr(endereco, "rua", None),
        "numero": getattr(endereco, "numero", None) if endereco_exato else None,
        "cep": getattr(endereco, "cep", None) if endereco_exato else None,
        "estado": getattr(endereco, "estado", None),
        "latitude": lat,
        "longitude": lng,
        "badge": imovel.tipo_imovel,
        "moradores_atuais": moradores_atuais(imovel) if incluir_moradores else [],
        "locador_id": post.id_locador,
        "classificacao": imovel.classificacao or "Mista",
        "status_anuncio": post.status_anuncio,
        "match_percent": match,
        "match": match,
        "tags_correspondentes": tags_correspondentes(user_tags, tags_convivencia),
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


def _endereco_texto(endereco, *, exato: bool = False) -> Optional[str]:
    """Texto de localização. Público: rua · bairro (sem número). Dono: rua, nº · bairro."""
    if endereco is None:
        return None
    if exato and endereco.numero:
        rua = f"{endereco.rua}, {endereco.numero}"
    else:
        rua = endereco.rua
    if rua and endereco.bairro:
        return f"{rua} · {endereco.bairro}"
    return rua or endereco.bairro


def locais_cadastrados(db: Session) -> list[dict]:
    """Bairros e cidades distintos dos anúncios ativos (para autocomplete do Explorar)."""
    from app.models.endereco_imovel import EnderecoImovel

    rows = (
        db.query(EnderecoImovel.bairro, EnderecoImovel.cidade)
        .join(Imovel, Imovel.id_imovel == EnderecoImovel.id_imovel)
        .join(Post, Post.id_imovel == Imovel.id_imovel)
        .filter(Post.status_anuncio == "ativo")
        .all()
    )
    vistos: set[str] = set()
    itens: list[dict] = []

    def _add(label: str, tipo: str, bairro: Optional[str], cidade: Optional[str]) -> None:
        texto = (label or "").strip()
        if not texto:
            return
        chave = f"{tipo}:{texto.casefold()}"
        if chave in vistos:
            return
        vistos.add(chave)
        itens.append(
            {
                "label": texto,
                "tipo": tipo,
                "bairro": (bairro or "").strip() or None,
                "cidade": (cidade or "").strip() or None,
            }
        )

    for bairro, cidade in rows:
        b = (bairro or "").strip()
        c = (cidade or "").strip()
        if b:
            _add(b, "bairro", b, c or None)
        if c:
            _add(c, "cidade", None, c)

    itens.sort(key=lambda i: (0 if i["tipo"] == "bairro" else 1, i["label"].casefold()))
    return itens


def _tags_filtro(tag: str = "", tags: Sequence[str] | None = None) -> list[str]:
    """Aceita `tag` única, várias separadas por vírgula, ou lista `tags`."""
    pedidos: list[str] = []
    if tags:
        pedidos.extend(str(t) for t in tags if t)
    if tag:
        pedidos.extend(parte.strip() for parte in str(tag).split(",") if parte.strip())
    vistos: set[str] = set()
    saida: list[str] = []
    for bruto in pedidos:
        n = normalizar_tag(bruto)
        if n and n not in vistos:
            vistos.add(n)
            saida.append(n)
    return saida


def _imovel_tem_tag(imovel_tags: Sequence[str], tag_q: str) -> bool:
    return any(
        (nt := normalizar_tag(t)) == tag_q or nt in tag_q or tag_q in nt
        for t in imovel_tags
    )


def filtrar_imoveis(
    itens: Sequence[Mapping],
    *,
    tipo: str = "",
    bairro: str = "",
    tag: str = "",
    tags: Sequence[str] | None = None,
    preco_max: float = 0,
) -> list[Mapping]:
    """Mesmos filtros do mural no mock: tipo, bairro (também busca em título/cidade/
    endereço), tag(s) (AND: o imóvel precisa ter todas) e preco_max."""
    tipo = (tipo or "").lower()
    bairro = (bairro or "").lower()
    tags_q = _tags_filtro(tag, tags)
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
    if tags_q:
        resultado = [
            i
            for i in resultado
            if all(_imovel_tem_tag(i.get("tags") or [], tq) for tq in tags_q)
        ]
    if preco_max and preco_max > 0:
        resultado = [i for i in resultado if i["preco"] <= preco_max]
    return resultado
