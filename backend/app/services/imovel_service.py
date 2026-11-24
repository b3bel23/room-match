"""CRUD de anúncios (imóvel + endereço + post + tags + fotos), no contrato do front."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.carrossel_imagem import CarrosselImagem
from app.models.endereco_imovel import EnderecoImovel
from app.models.imovel import Imovel
from app.models.imovel_tag import ImovelTag
from app.models.locador import Locador
from app.models.post import Post
from app.models.tag import Tag
from app.models.usuario import Usuario
from app.schemas.anuncio import AnuncioCreate, AnuncioUpdate

from app.core import cache_resposta
from app.services import storage_service
from app.services.storage_service import UPLOAD_DIR, URL_UPLOADS  # noqa: F401  (usados por main.py e testes)


def _invalidar_caches_mural() -> None:
    cache_resposta.invalidate_prefix("mural:")
    cache_resposta.invalidate_prefix("stats:")
    cache_resposta.invalidate_prefix("locais:")

MAX_FOTOS = 10
MAX_BYTES_FOTO = 5 * 1024 * 1024
# Clique duplo / retry após timeout: mesmo anúncio em poucos segundos não cria cópia.
JANELA_ANTI_DUPLICATA_SEG = 120

CAMPOS_ENDERECO = ("endereco", "rua", "numero", "bairro", "cidade", "estado", "cep", "latitude", "longitude")
CIDADE_PADRAO, ESTADO_PADRAO = "Campinas", "SP"  # o front só atende Campinas por enquanto


def exigir_locador(db: Session, usuario: Usuario) -> Locador:
    from app.services.perfil_service import LOCADOR, papel_do_usuario

    if papel_do_usuario(db, usuario) != LOCADOR:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Apenas locadores podem gerenciar anúncios.")
    locador = db.get(Locador, usuario.id_usuario)
    if locador is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Apenas locadores podem gerenciar anúncios.")
    return locador


def obter_post_do_dono(db: Session, id_imovel: int, usuario: Usuario) -> Post:
    """Anúncio não removido do imóvel; 404 se não existe, 403 se não é do usuário."""
    from app.services import mural_service

    post = (
        mural_service.query_posts(db)
        .filter(Post.id_imovel == id_imovel, Post.status_anuncio != "removido")
        .first()
    )
    if post is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imóvel não encontrado.")
    if post.id_locador != usuario.id_usuario:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Sem permissão.")
    return post


# --- endereço ---------------------------------------------------------------


def resolver_endereco(dados) -> dict:
    """Monta as colunas de `enderecos_imovel` a partir dos campos estruturados e/ou do
    texto livre "Rua X, 450 · Bairro" que o formulário envia."""
    rua, numero, bairro = dados.rua, dados.numero, dados.bairro
    if dados.endereco:
        esquerda, _, direita = dados.endereco.partition("·")
        if not bairro and direita.strip():
            bairro = direita.strip()
        if not rua and esquerda.strip():
            achado = re.match(r"^(.*?),\s*(\d[\w\-/]*)$", esquerda.strip())
            if achado:
                rua, numero = achado.group(1).strip(), numero or achado.group(2)
            else:
                rua = esquerda.strip()
    if not rua or not bairro:
        raise HTTPException(422, "Informe rua e bairro do imóvel.")
    from app.utils.contato import validar_cep

    return {
        "rua": rua,
        "numero": numero,
        "bairro": bairro,
        "cidade": dados.cidade or CIDADE_PADRAO,
        "estado": (dados.estado or ESTADO_PADRAO).upper(),
        "cep": validar_cep(getattr(dados, "cep", None), obrigatorio=False),
        "latitude": dados.latitude,
        "longitude": dados.longitude,
    }


# --- tags -------------------------------------------------------------------


def obter_ou_criar_tag(db: Session, nome: str) -> Tag:
    tag = db.query(Tag).filter(Tag.nome == nome).first()
    if tag is None:
        tag = Tag(nome=nome)
        db.add(tag)
        db.flush()
    return tag


def sincronizar_tags(db: Session, id_imovel: int, nomes: list[str]) -> None:
    unicos = list(dict.fromkeys(n.strip() for n in nomes if n.strip()))
    db.query(ImovelTag).filter(ImovelTag.id_imovel == id_imovel).delete()
    for nome in unicos:
        db.add(ImovelTag(id_imovel=id_imovel, id_tag=obter_ou_criar_tag(db, nome).id_tag))


# --- criar / editar / remover -----------------------------------------------


def _valores_do_imovel(campos: dict) -> dict:
    mapa = {
        "tipo": "tipo_imovel",
        "aluguel": "valor_aluguel",
        "condominio": "valor_condominio",
        "iptu": "valor_iptu",
        "contas": "valor_contas_extras",
        "quartos": "quantidade_quartos",
        "vagas": "vagas_disponiveis",
        "area_m2": "area_m2",
        "descricao": "descricao",
        "classificacao": "classificacao",
    }
    return {coluna: campos[campo] for campo, coluna in mapa.items() if campo in campos}


def _norm(valor: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (valor or "").strip().lower())


def _mesmo_endereco(atual: EnderecoImovel, novo: dict) -> bool:
    return (
        _norm(atual.rua) == _norm(novo.get("rua"))
        and _norm(str(atual.numero or "")) == _norm(str(novo.get("numero") or ""))
        and re.sub(r"\D", "", str(atual.cep or "")) == re.sub(r"\D", "", str(novo.get("cep") or ""))
        and _norm(atual.bairro) == _norm(novo.get("bairro"))
    )


def buscar_duplicata_recente(
    db: Session,
    id_locador: int,
    titulo: str,
    endereco: dict,
    janela_seg: int = JANELA_ANTI_DUPLICATA_SEG,
) -> Optional[Post]:
    """Devolve o post ativo mais recente do mesmo locador/título/endereço na janela."""
    limite = datetime.now(timezone.utc) - timedelta(seconds=janela_seg)
    candidatos = (
        db.query(Post)
        .options(joinedload(Post.imovel).joinedload(Imovel.endereco))
        .filter(
            Post.id_locador == id_locador,
            Post.titulo == titulo,
            Post.status_anuncio == "ativo",
            Post.data_publicacao >= limite,
        )
        .order_by(Post.data_publicacao.desc(), Post.id_post.desc())
        .all()
    )
    for post in candidatos:
        atual = post.imovel.endereco if post.imovel is not None else None
        if atual is not None and _mesmo_endereco(atual, endereco):
            return post
    return None


def criar_anuncio(db: Session, locador: Locador, dados: AnuncioCreate) -> Post:
    # Serializa publicações do mesmo locador (evita 2 POSTs paralelos criarem cópias).
    locador = (
        db.query(Locador)
        .filter(Locador.id_locador == locador.id_locador)
        .with_for_update()
        .one()
    )
    endereco = resolver_endereco(dados)
    existente = buscar_duplicata_recente(db, locador.id_locador, dados.titulo, endereco)
    if existente is not None:
        return existente

    campos = dados.model_dump(exclude_unset=True)
    # null explícito no JSON conta como ausente (tipo_imovel, quartos e vagas são NOT NULL)
    valores = {c: v for c, v in _valores_do_imovel(campos).items() if v is not None}
    valores.setdefault("tipo_imovel", "República")
    valores.setdefault("quantidade_quartos", 1)
    valores.setdefault("vagas_disponiveis", 1)
    imovel = Imovel(**valores)
    db.add(imovel)
    db.flush()  # gera id_imovel
    db.add(EnderecoImovel(id_imovel=imovel.id_imovel, **endereco))
    post = Post(
        id_imovel=imovel.id_imovel,
        id_locador=locador.id_locador,
        titulo=dados.titulo,
        descricao=dados.descricao,
    )
    db.add(post)
    from app.services.tags_catalogo import mesclar_tags, sem_conflitos

    sincronizar_tags(
        db,
        imovel.id_imovel,
        mesclar_tags(
            sem_conflitos(dados.tags),
            getattr(dados, "comodidades", None),
        ),
    )
    locador.quantidade_imoveis_anunciados = (locador.quantidade_imoveis_anunciados or 0) + 1
    db.commit()
    db.refresh(post)
    _invalidar_caches_mural()
    return post


def atualizar_anuncio(db: Session, post: Post, dados: AnuncioUpdate) -> Post:
    campos = dados.model_dump(exclude_unset=True)
    imovel = post.imovel

    for coluna, valor in _valores_do_imovel(campos).items():
        if valor is not None or coluna == "descricao":
            setattr(imovel, coluna, valor)
    if campos.get("titulo") is not None:
        post.titulo = campos["titulo"]
    if "descricao" in campos:
        post.descricao = campos["descricao"]
    if campos.get("status_anuncio") is not None:
        post.status_anuncio = campos["status_anuncio"]

    if any(c in campos for c in CAMPOS_ENDERECO):
        atual = imovel.endereco
        base = {c: getattr(atual, c, None) for c in CAMPOS_ENDERECO if c != "endereco"}
        base["endereco"] = None
        if "endereco" in campos:  # texto livre novo substitui rua/número/bairro antigos
            for c in ("rua", "numero", "bairro"):
                base[c] = None
        base.update({c: campos[c] for c in CAMPOS_ENDERECO if c in campos})
        novo = resolver_endereco(SimpleNamespace(**base))
        if atual is None:
            db.add(EnderecoImovel(id_imovel=imovel.id_imovel, **novo))
        else:
            for coluna, valor in novo.items():
                setattr(atual, coluna, valor)

    if campos.get("tags") is not None or campos.get("comodidades") is not None:
        from app.services.matching_service import tags_do_imovel
        from app.services.tags_catalogo import (
            filtrar_comodidades,
            filtrar_convivencia,
            mesclar_tags,
            sem_conflitos,
        )

        atuais = tags_do_imovel(db, imovel.id_imovel)
        # Se só um dos lados veio no PATCH, preserva o outro já gravado.
        conv = (
            campos["tags"]
            if campos.get("tags") is not None
            else filtrar_convivencia(atuais)
        )
        comod = (
            campos["comodidades"]
            if campos.get("comodidades") is not None
            else filtrar_comodidades(atuais)
        )
        sincronizar_tags(db, imovel.id_imovel, mesclar_tags(sem_conflitos(conv), comod))

    db.commit()
    db.refresh(post)
    _invalidar_caches_mural()
    return post


def remover_anuncio(db: Session, post: Post) -> None:
    """Remoção lógica: preserva likes e conversas (somem das listas porque o anúncio não
    está mais ativo)."""
    post.status_anuncio = "removido"
    post.imovel.status_disponibilidade = "indisponivel"
    locador = db.get(Locador, post.id_locador)
    if locador is not None and (locador.quantidade_imoveis_anunciados or 0) > 0:
        locador.quantidade_imoveis_anunciados -= 1
    db.commit()
    _invalidar_caches_mural()


def anuncios_do_locador(db: Session, usuario: Usuario) -> list[Post]:
    from app.services import mural_service

    return (
        mural_service.query_posts(db)
        .filter(Post.id_locador == usuario.id_usuario, Post.status_anuncio != "removido")
        .order_by(Post.data_publicacao.desc(), Post.id_post.desc())
        .all()
    )


# --- fotos ------------------------------------------------------------------


def detectar_extensao(conteudo: bytes) -> Optional[str]:
    """Identifica a imagem pelos primeiros bytes (o Content-Type enviado não é confiável)."""
    if conteudo.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if conteudo.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if conteudo[:4] == b"RIFF" and conteudo[8:12] == b"WEBP":
        return "webp"
    return None


def adicionar_fotos(db: Session, post: Post, arquivos: list[bytes]) -> Post:
    if not arquivos:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Envie ao menos uma foto.")
    existentes = db.query(CarrosselImagem).filter(CarrosselImagem.id_imovel == post.id_imovel).all()
    if len(existentes) + len(arquivos) > MAX_FOTOS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"Cada imóvel aceita no máximo {MAX_FOTOS} fotos."
        )
    extensoes = []
    for conteudo in arquivos:
        if len(conteudo) > MAX_BYTES_FOTO:
            raise HTTPException(
                413, f"Cada foto deve ter no máximo {MAX_BYTES_FOTO // (1024 * 1024)} MB."
            )
        extensao = detectar_extensao(conteudo)
        if extensao is None:
            raise HTTPException(
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Envie imagens JPEG, PNG ou WebP."
            )
        extensoes.append(extensao)

    proxima_ordem = max((i.ordem_exibicao or 0 for i in existentes), default=0) + 1
    gravados: list[str] = []
    try:
        for ordem, (conteudo, extensao) in enumerate(zip(arquivos, extensoes), start=proxima_ordem):
            url = storage_service.salvar(f"imoveis/{post.id_imovel}/{uuid.uuid4().hex}.{extensao}", conteudo)
            gravados.append(url)
            db.add(CarrosselImagem(id_imovel=post.id_imovel, url_imagem=url, ordem_exibicao=ordem))
        db.commit()
    except storage_service.ErroStorage as erro:
        db.rollback()
        for url in gravados:
            storage_service.apagar(url)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Não foi possível guardar as fotos agora.") from erro
    except Exception:
        db.rollback()
        for url in gravados:
            storage_service.apagar(url)
        raise
    db.refresh(post)
    _invalidar_caches_mural()
    return post


def remover_foto(db: Session, post: Post, id_imagem: int) -> Post:
    imagem = db.get(CarrosselImagem, id_imagem)
    if imagem is None or imagem.id_imovel != post.id_imovel:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foto não encontrada.")
    url = imagem.url_imagem
    db.delete(imagem)
    db.commit()
    storage_service.apagar(url)
    db.refresh(post)
    _invalidar_caches_mural()
    return post
