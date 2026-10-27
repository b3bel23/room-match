"""CRUD de anúncios (imóvel + endereço + post + tags + fotos), no contrato do front."""

from __future__ import annotations

import re
import uuid
from pathlib import Path
from types import SimpleNamespace
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.carrossel_imagem import CarrosselImagem
from app.models.endereco_imovel import EnderecoImovel
from app.models.imovel import Imovel
from app.models.imovel_tag import ImovelTag
from app.models.locador import Locador
from app.models.post import Post
from app.models.tag import Tag
from app.models.usuario import Usuario
from app.schemas.anuncio import AnuncioCreate, AnuncioUpdate

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
URL_UPLOADS = "/uploads"
MAX_FOTOS = 10
MAX_BYTES_FOTO = 5 * 1024 * 1024

CAMPOS_ENDERECO = ("endereco", "rua", "numero", "bairro", "cidade", "estado", "cep", "latitude", "longitude")
CIDADE_PADRAO, ESTADO_PADRAO = "Campinas", "SP"  # o front só atende Campinas por enquanto


def exigir_locador(db: Session, usuario: Usuario) -> Locador:
    locador = db.get(Locador, usuario.id_usuario)
    if locador is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Apenas locadores podem gerenciar anúncios.")
    return locador


def obter_post_do_dono(db: Session, id_imovel: int, usuario: Usuario) -> Post:
    """Anúncio não removido do imóvel; 404 se não existe, 403 se não é do usuário."""
    post = (
        db.query(Post)
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
    return {
        "rua": rua,
        "numero": numero,
        "bairro": bairro,
        "cidade": dados.cidade or CIDADE_PADRAO,
        "estado": (dados.estado or ESTADO_PADRAO).upper(),
        "cep": dados.cep,
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
    }
    return {coluna: campos[campo] for campo, coluna in mapa.items() if campo in campos}


def criar_anuncio(db: Session, locador: Locador, dados: AnuncioCreate) -> Post:
    endereco = resolver_endereco(dados)
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
    sincronizar_tags(db, imovel.id_imovel, dados.tags or [])
    locador.quantidade_imoveis_anunciados = (locador.quantidade_imoveis_anunciados or 0) + 1
    db.commit()
    db.refresh(post)
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

    if campos.get("tags") is not None:
        sincronizar_tags(db, imovel.id_imovel, campos["tags"])

    db.commit()
    db.refresh(post)
    return post


def remover_anuncio(db: Session, post: Post) -> None:
    """Remoção lógica: preserva likes, conversas e visitas que apontam para o anúncio."""
    post.status_anuncio = "removido"
    post.imovel.status_disponibilidade = "indisponivel"
    locador = db.get(Locador, post.id_locador)
    if locador is not None and (locador.quantidade_imoveis_anunciados or 0) > 0:
        locador.quantidade_imoveis_anunciados -= 1
    db.commit()


def anuncios_do_locador(db: Session, usuario: Usuario) -> list[Post]:
    return (
        db.query(Post)
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

    pasta = UPLOAD_DIR / "imoveis" / str(post.id_imovel)
    pasta.mkdir(parents=True, exist_ok=True)
    proxima_ordem = max((i.ordem_exibicao or 0 for i in existentes), default=0) + 1
    gravados: list[Path] = []
    try:
        for ordem, (conteudo, extensao) in enumerate(zip(arquivos, extensoes), start=proxima_ordem):
            caminho = pasta / f"{uuid.uuid4().hex}.{extensao}"
            caminho.write_bytes(conteudo)
            gravados.append(caminho)
            db.add(
                CarrosselImagem(
                    id_imovel=post.id_imovel,
                    url_imagem=f"{URL_UPLOADS}/imoveis/{post.id_imovel}/{caminho.name}",
                    ordem_exibicao=ordem,
                )
            )
        db.commit()
    except Exception:
        db.rollback()
        for caminho in gravados:
            caminho.unlink(missing_ok=True)
        raise
    db.refresh(post)
    return post


def remover_foto(db: Session, post: Post, id_imagem: int) -> Post:
    imagem = db.get(CarrosselImagem, id_imagem)
    if imagem is None or imagem.id_imovel != post.id_imovel:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foto não encontrada.")
    caminho = UPLOAD_DIR / Path(imagem.url_imagem.removeprefix(URL_UPLOADS).lstrip("/"))
    db.delete(imagem)
    db.commit()
    if UPLOAD_DIR in caminho.resolve().parents:  # nunca apaga fora da pasta de uploads
        caminho.unlink(missing_ok=True)
    db.refresh(post)
    return post
