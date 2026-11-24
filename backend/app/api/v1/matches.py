"""
Mural de imóveis com match (KAN-35), no contrato que o front espera:
docs/frontend/papeis-e-rotas-api-v1.md e frontend/js/mock-api.js.

  GET /imoveis        mural; match personalizado se autenticado (filtros: tipo, bairro, preco_max, tag)
  GET /imoveis/locais bairros/cidades dos anúncios ativos (autocomplete do Explorar)
  GET /imoveis/{id}   detalhe, com `elegibilidade` para chat se o usuário for locatário
  GET /stats          totais públicos do mural (match_medio personalizado)
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core import cache_resposta
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.conversa import Conversa
from app.models.like import Like
from app.models.locador import Locador
from app.models.locatario import Locatario
from app.models.post import Post
from app.models.usuario import Usuario
from app.services import matching_service, mural_service
from app.services.auth_service import get_usuario_by_id

router = APIRouter(tags=["mural"])

# Pooler remoto: cache curto evita repetir 5+ queries a cada reload do mural.
_TTL_MURAL_S = 20.0
_TTL_STATS_S = 20.0

# Mural e detalhe são públicos: sem token (ou token inválido) o usuário é visitante.
oauth2_opcional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def usuario_opcional(
    token: Optional[str] = Depends(oauth2_opcional), db: Session = Depends(get_db)
) -> Optional[Usuario]:
    if not token:
        return None
    sub = decode_access_token(token)
    if sub is None or not sub.isdigit():
        return None
    return get_usuario_by_id(db, int(sub))


class Elegibilidade(BaseModel):
    match: int
    limiar_compatibilidade: Optional[float] = None
    orcamento_maximo: Optional[float] = None
    limiar: Optional[float] = None
    orcamento: Optional[float] = None
    limiar_ok: bool
    orcamento_ok: bool
    chat_liberado: bool


class ImovelMural(BaseModel):
    id: int
    id_post: int
    titulo: str
    tipo: str
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    endereco: Optional[str] = None
    endereco_exato: bool = False
    preco: float
    aluguel: float
    condominio: float
    iptu: float
    contas: float
    area_m2: Optional[float] = None
    descricao: Optional[str] = None
    vagas: int
    quartos: int
    tags: List[str]
    comodidades: List[str] = []
    capa: Optional[str] = None
    fotos: List[str]
    fotos_ids: List[int] = []
    rua: Optional[str] = None
    numero: Optional[str] = None
    cep: Optional[str] = None
    estado: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    badge: Optional[str] = None
    moradores_atuais: List[dict] = []
    # Preenchidos quando o usuário tem destino(s) salvo(s) (mobilidade, RF28/29/30).
    deslocamento_min: Optional[int] = None
    distancia_km: Optional[float] = None
    destino: Optional[str] = None
    # Até 3 destinos padrão das preferências, com tempo/distância de cada um.
    deslocamentos: List[dict] = []
    # foot | bike | car | bus — preferencias_moradia.modo_transporte
    modo_transporte: Optional[str] = None
    locador_id: int
    classificacao: str = "Mista"
    status_anuncio: str = "ativo"
    match_percent: int
    match: int
    tags_correspondentes: List[str]
    elegibilidade: Optional[Elegibilidade] = None


class ListaImoveis(BaseModel):
    items: List[ImovelMural]


class Stats(BaseModel):
    imoveis_ativos: int
    match_medio: int
    deslocamento_medio: int
    favoritos: int
    meus_anuncios: int
    conversas: int


def _contexto_usuario(db: Session, usuario: Optional[Usuario]):
    """(locatario, tags do usuário). Visitante: sem perfil e sem tags."""
    if usuario is None:
        return None, []
    locatario = db.get(Locatario, usuario.id_usuario)
    return locatario, matching_service.tags_do_usuario(db, usuario, locatario)


def _anuncios_ativos(db: Session, *, com_moradores: bool = False) -> List[Post]:
    return (
        mural_service.query_posts(db, com_moradores=com_moradores)
        .filter(Post.status_anuncio == "ativo")
        .order_by(Post.data_publicacao.desc())
        .all()
    )


def _montar_todos(
    db: Session,
    posts: List[Post],
    locatario,
    user_tags,
    *,
    incluir_moradores: bool = False,
    usuario: Optional[Usuario] = None,
) -> List[dict]:
    tags = matching_service.tags_por_imovel(db, [p.id_imovel for p in posts])
    itens = [
        mural_service.montar_imovel(
            p,
            tags[p.id_imovel],
            user_tags,
            locatario,
            incluir_moradores=incluir_moradores,
            # Número/CEP só para o dono do anúncio (estilo Airbnb).
            endereco_exato=bool(
                usuario is not None and p.id_locador == usuario.id_usuario
            ),
        )
        for p in posts
    ]
    _com_deslocamento(db, itens, locatario)
    return itens


def _chave_mural(usuario_id: Optional[int], tipo: str, bairro: str, preco_max: float, tag: str) -> str:
    return "mural:{uid}:{tipo}:{bairro}:{preco}:{tag}".format(
        uid=usuario_id or 0,
        tipo=(tipo or "").lower(),
        bairro=(bairro or "").lower(),
        preco=preco_max or 0,
        tag=(tag or "").lower(),
    )


def _destinos_salvos(locatario) -> list:
    from app.services.destinos_service import ler_destinos

    if locatario is None:
        return []
    return ler_destinos(locatario.preferencias_moradia)


def _destino_salvo(locatario) -> Optional[dict]:
    destinos = _destinos_salvos(locatario)
    return destinos[0] if destinos else None


def _estimativa_modo(
    origem: tuple[float, float], destino: tuple[float, float], modo: str
) -> tuple[Optional[int], Optional[float]]:
    """Tempo estimado (min) e distância (km) para foot/bike/car — sem coluna nova."""
    from app.utils.gtfs_loader import distancia_m

    # Velocidades urbanas efetivas (km/h), alinhadas ao uso no mural.
    velocidades = {"foot": 4.8, "bike": 14.0, "car": 22.0}
    speed = velocidades.get(modo) or velocidades["foot"]
    dist_m = distancia_m(origem[0], origem[1], destino[0], destino[1])
    dist_km = round(dist_m / 1000.0, 2)
    # Fator de caminho (~1.3× linha reta) + margem mínima.
    tempo = max(1, int(round((dist_km * 1.3) / speed * 60.0)))
    return tempo, dist_km


def _com_deslocamento(db: Session, itens: List[dict], locatario) -> None:
    """Tempos até os até 3 destinos: a pé / bike / carro (estimativa) + ônibus (cache GTFS).

    `modo_transporte` das preferências só escolhe o valor legado `deslocamento_min`.
    O card do mural usa `tempos_modos` para listar todos os meios.
    """
    from app.api.v1.mobilidade import deslocamentos_salvos
    from app.services.destinos_service import ler_modo_transporte, rotulo_curto

    destinos = _destinos_salvos(locatario)
    modo = (
        ler_modo_transporte(locatario.preferencias_moradia)
        if locatario is not None
        else "foot"
    )
    ids = [i["id"] for i in itens]
    # Sempre tenta ônibus no cache (pode não ter rota aquecida ainda).
    por_destino_bus = [deslocamentos_salvos(db, ids, d) for d in destinos]

    for item in itens:
        lista = []
        o_lat, o_lng = item.get("latitude"), item.get("longitude")
        origem = None
        try:
            if o_lat is not None and o_lng is not None:
                origem = (float(o_lat), float(o_lng))
        except (TypeError, ValueError):
            origem = None

        for idx, d in enumerate(destinos):
            curto = rotulo_curto(d)
            tempos: dict[str, int] = {}
            dist_km = None
            if origem is not None:
                try:
                    dest = (float(d["lat"]), float(d["lng"]))
                    for m in ("foot", "bike", "car"):
                        tempo, dist = _estimativa_modo(origem, dest, m)
                        if tempo is not None:
                            tempos[m] = int(tempo)
                        if dist is not None:
                            dist_km = dist
                except (KeyError, TypeError, ValueError):
                    pass

            info_bus = (por_destino_bus[idx] if idx < len(por_destino_bus) else {}).get(
                item["id"]
            ) or {}
            if info_bus.get("deslocamento_min") is not None:
                tempos["bus"] = int(info_bus["deslocamento_min"])
            if info_bus.get("distancia_km") is not None and dist_km is None:
                dist_km = info_bus.get("distancia_km")

            # Legado: meio das preferências; se faltar (ex.: sem coords), cai no cache ônibus.
            preferido = tempos.get(modo)
            if preferido is None:
                preferido = tempos.get("bus")
            entrada = {
                "nome": curto,
                "nome_completo": d.get("nome"),
                "deslocamento_min": preferido,
                "distancia_km": dist_km,
                "modo_transporte": modo,
                "tempos_modos": tempos,
            }
            if d.get("tipo"):
                entrada["tipo"] = d["tipo"]
            lista.append(entrada)

        item["deslocamentos"] = lista
        item["modo_transporte"] = modo
        # Campos legados = primeiro destino (cards/stats antigos).
        if lista:
            prim = lista[0]
            item["destino"] = prim.get("nome")
            item["deslocamento_min"] = prim.get("deslocamento_min")
            item["distancia_km"] = prim.get("distancia_km")
        else:
            item.setdefault("deslocamentos", [])


@router.get("/imoveis", response_model=ListaImoveis)
def listar_imoveis(
    tipo: str = "",
    bairro: str = "",
    q: str = "",
    preco_max: float = Query(0, ge=0),
    tag: str = "",
    usuario: Optional[Usuario] = Depends(usuario_opcional),
    db: Session = Depends(get_db),
):
    bairro_q = bairro or q
    chave = _chave_mural(
        usuario.id_usuario if usuario else None, tipo, bairro_q, preco_max, tag
    )
    cached = cache_resposta.get(chave)
    if cached is not None:
        return cached

    locatario, user_tags = _contexto_usuario(db, usuario)
    itens = _montar_todos(
        db,
        _anuncios_ativos(db, com_moradores=False),
        locatario,
        user_tags,
        incluir_moradores=False,
        usuario=usuario,
    )
    itens = mural_service.filtrar_imoveis(
        itens, tipo=tipo, bairro=bairro_q, tag=tag, preco_max=preco_max
    )
    corpo = {"items": itens}
    cache_resposta.set(chave, corpo, _TTL_MURAL_S)
    return corpo


class LocalSugestao(BaseModel):
    label: str
    tipo: str  # bairro | cidade
    bairro: Optional[str] = None
    cidade: Optional[str] = None


class LocaisOut(BaseModel):
    items: List[LocalSugestao]


@router.get("/imoveis/locais", response_model=LocaisOut)
def listar_locais(
    q: str = "",
    db: Session = Depends(get_db),
):
    """Sugestões de bairro/cidade a partir do que já está cadastrado no mural."""
    chave = "locais:{q}".format(q=(q or "").strip().lower())
    cached = cache_resposta.get(chave)
    if cached is not None:
        return cached

    itens = mural_service.locais_cadastrados(db)
    termo = (q or "").strip().casefold()
    if termo:
        itens = [
            i
            for i in itens
            if termo in i["label"].casefold()
            or (i.get("cidade") and termo in str(i["cidade"]).casefold())
        ]
    corpo = {"items": itens[:40]}
    cache_resposta.set(chave, corpo, _TTL_MURAL_S)
    return corpo


@router.get("/imoveis/{id_imovel}", response_model=ImovelMural)
def detalhe_imovel(
    id_imovel: int,
    usuario: Optional[Usuario] = Depends(usuario_opcional),
    db: Session = Depends(get_db),
):
    post = (
        mural_service.query_posts(db, com_moradores=True)
        .filter(Post.id_imovel == id_imovel, Post.status_anuncio != "removido")
        .first()
    )
    # Pausado: só o dono vê (para editar e "ver como locador").
    dono = usuario is not None and post is not None and post.id_locador == usuario.id_usuario
    if post is None or (post.status_anuncio != "ativo" and not dono):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado.")
    locatario, user_tags = _contexto_usuario(db, usuario)
    # Sem lista de moradores atuais no detalhe: só classificacao (Feminina/Masculina/Mista).
    return _montar_todos(
        db, [post], locatario, user_tags, incluir_moradores=False, usuario=usuario
    )[0]


@router.get("/stats", response_model=Stats)
def stats(
    usuario: Optional[Usuario] = Depends(usuario_opcional), db: Session = Depends(get_db)
):
    uid = usuario.id_usuario if usuario else 0
    chave = "stats:{uid}".format(uid=uid)
    cached = cache_resposta.get(chave)
    if cached is not None:
        return cached

    locatario, user_tags = _contexto_usuario(db, usuario)
    # Sem eager de fotos/moradores: stats só precisa de ids + tags + counts.
    posts = (
        db.query(Post.id_imovel, Post.id_locador)
        .filter(Post.status_anuncio == "ativo")
        .all()
    )
    ids = [p.id_imovel for p in posts]
    tags = matching_service.tags_por_imovel(db, ids)
    match_medio = matching_service.match_medio(
        user_tags, [{"tags": tags[i]} for i in ids]
    )

    favoritos = conversas = meus_anuncios = 0
    if locatario is not None:
        favoritos = db.query(Like).filter(Like.id_locatario == locatario.id_locatario).count()
        conversas = (
            db.query(Conversa).filter(Conversa.id_locatario == locatario.id_locatario).count()
        )
    elif usuario is not None:
        from app.services.contexto import eh_locador

        if eh_locador(db, usuario):
            meus_anuncios = sum(1 for p in posts if p.id_locador == usuario.id_usuario)

    # Mesma regra do mural: média do 1º destino no meio preferido (fallback ônibus).
    tempos: list[int] = []
    if locatario is not None and ids:
        from app.models.endereco_imovel import EnderecoImovel
        from app.api.v1.mobilidade import deslocamentos_salvos
        from app.services.destinos_service import ler_modo_transporte

        dest = _destino_salvo(locatario)
        modo = ler_modo_transporte(locatario.preferencias_moradia)
        bus_por_id = deslocamentos_salvos(db, ids, dest) if dest else {}
        coords = {
            r.id_imovel: (float(r.latitude), float(r.longitude))
            for r in db.query(EnderecoImovel)
            .filter(
                EnderecoImovel.id_imovel.in_(ids),
                EnderecoImovel.latitude.isnot(None),
                EnderecoImovel.longitude.isnot(None),
            )
            .all()
        }
        dest_pt = None
        if dest:
            try:
                dest_pt = (float(dest["lat"]), float(dest["lng"]))
            except (KeyError, TypeError, ValueError):
                dest_pt = None
        for id_imovel in ids:
            info = bus_por_id.get(id_imovel) or {}
            # `deslocamentos_salvos` preenche placeholder sem tempo — ignora esses.
            if info.get("deslocamento_min") is None:
                continue
            t = None
            if dest_pt is not None and id_imovel in coords and modo in ("foot", "bike", "car"):
                t, _ = _estimativa_modo(coords[id_imovel], dest_pt, modo)
            if t is None:
                t = info.get("deslocamento_min")
            if t is not None:
                tempos.append(int(t))
    corpo = Stats(
        imoveis_ativos=len(posts),
        match_medio=match_medio,
        deslocamento_medio=round(sum(tempos) / len(tempos)) if tempos else 0,
        favoritos=favoritos,
        meus_anuncios=meus_anuncios,
        conversas=conversas,
    )
    cache_resposta.set(chave, corpo, _TTL_STATS_S)
    return corpo
