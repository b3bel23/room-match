"""Perfil do usuário logado (GET/PATCH/DELETE /me) e troca de papel Morador ↔ Locador."""

from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.locador import Locador
from app.models.locatario import Locatario
from app.models.tag import Tag
from app.models.usuario import Usuario
from app.models.usuario_tag import UsuarioTag
from app.schemas.perfil import PerfilUpdate
from app.services.matching_service import tags_do_usuario
from app.services.mural_service import CHAVE_LIMIAR, limiar_do_locatario

MORADOR, LOCADOR = "Morador", "Locador"
MSG_VINCULOS = "A conta tem dados vinculados (anúncios, favoritos ou conversas)."


def iniciais(nome: str) -> str:
    partes = [p for p in (nome or "").split() if p]
    return "".join(p[0] for p in partes[:2]).upper()


def papel_do_usuario(db: Session, usuario: Usuario) -> str:
    """Locador se existir registro em `locadores`; caso contrário, Morador."""
    return LOCADOR if db.get(Locador, usuario.id_usuario) is not None else MORADOR


def montar_perfil(db: Session, usuario: Usuario) -> dict:
    locatario = db.get(Locatario, usuario.id_usuario)
    papel = papel_do_usuario(db, usuario)
    orcamento = float(locatario.orcamento_maximo or 0) if locatario else 0.0
    limiar = limiar_do_locatario(locatario) or 0.0
    return {
        "id": usuario.id_usuario,
        "email": usuario.email,
        "nome": usuario.nome,
        "papel": papel,
        "papel_schema": "locador" if papel == LOCADOR else "locatario",
        "iniciais": iniciais(usuario.nome),
        "telefone": usuario.telefone or "",
        # sem colunas no banco ainda: sempre vazios
        "genero": "",
        "ocupacao": "",
        "emprego": "",
        "faculdade": "",
        "foto_url": usuario.foto_perfil or "",
        "bio": usuario.bio or "",
        "cidade_atual": usuario.cidade_atual or "",
        "data_nascimento": usuario.data_nascimento,
        "tags": tags_do_usuario(db, usuario, locatario),
        "orcamento_maximo": orcamento,
        "limiar_compatibilidade": limiar,
        "orcamento": orcamento,
        "limiar": limiar,
    }


def sincronizar_tags(db: Session, usuario: Usuario, nomes: list[str]) -> None:
    """Substitui as tags do usuário (usuario_tags) e mantém a coluna legada em sincronia."""
    unicos = list(dict.fromkeys(n.strip() for n in nomes if n.strip()))
    db.query(UsuarioTag).filter(UsuarioTag.id_usuario == usuario.id_usuario).delete()
    for nome in unicos:
        tag = db.query(Tag).filter(Tag.nome == nome).first()
        if tag is None:
            tag = Tag(nome=nome)
            db.add(tag)
            db.flush()
        db.add(UsuarioTag(id_usuario=usuario.id_usuario, id_tag=tag.id_tag))
    usuario.tags_convivencia = unicos


def _remover(db: Session, objeto, mensagem: str) -> None:
    """Apaga um registro; se outras tabelas ainda o referenciam, responde 409."""
    try:
        with db.begin_nested():
            db.delete(objeto)
            db.flush()
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, mensagem)


def trocar_papel(
    db: Session,
    usuario: Usuario,
    novo: str,
    cpf_cnpj: Optional[str] = None,
    orcamento_maximo: Optional[float] = None,
) -> None:
    if novo not in (MORADOR, LOCADOR):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Tipo de perfil inválido. Use Morador ou Locador."
        )
    locador = db.get(Locador, usuario.id_usuario)
    locatario = db.get(Locatario, usuario.id_usuario)

    if novo == MORADOR:
        if locador is not None:
            _remover(db, locador, "Remova seus anúncios antes de virar Morador.")
        if locatario is None:
            db.add(Locatario(id_locatario=usuario.id_usuario, orcamento_maximo=orcamento_maximo or 0))
            db.flush()  # sem autoflush: db.get() só enxerga o registro depois do flush
        return

    # novo == LOCADOR: valida tudo antes de apagar o perfil de locatário
    if locador is None:
        if not cpf_cnpj:
            raise HTTPException(
                422, "Informe cpf_cnpj para virar Locador."
            )
        if db.query(Locador).filter(Locador.cpf_cnpj == cpf_cnpj).first() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "CPF/CNPJ já cadastrado.")
    if locatario is not None:
        _remover(db, locatario, "Cancele favoritos e conversas antes de virar Locador.")
    if locador is None:
        db.add(Locador(id_locador=usuario.id_usuario, cpf_cnpj=cpf_cnpj))
        db.flush()


def atualizar_perfil(db: Session, usuario: Usuario, dados: PerfilUpdate) -> dict:
    campos = dados.model_dump(exclude_unset=True)

    if campos.get("email") is not None:
        email = campos["email"].lower()
        existente = db.query(Usuario).filter(Usuario.email == email).first()
        if existente is not None and existente.id_usuario != usuario.id_usuario:
            raise HTTPException(status.HTTP_409_CONFLICT, "Este e-mail já está em uso.")
        usuario.email = email

    if campos.get("nome") is not None:
        usuario.nome = campos["nome"]
    for campo in ("telefone", "bio", "cidade_atual", "data_nascimento"):
        if campo in campos:
            setattr(usuario, campo, campos[campo])
    if "foto_url" in campos:
        usuario.foto_perfil = campos["foto_url"]

    orcamento = campos.get("orcamento_maximo", campos.get("orcamento"))
    limiar = campos.get("limiar_compatibilidade", campos.get("limiar"))

    if campos.get("papel") is not None:
        trocar_papel(db, usuario, campos["papel"], campos.get("cpf_cnpj"), orcamento)

    if campos.get("tags") is not None:
        sincronizar_tags(db, usuario, campos["tags"])

    locatario = db.get(Locatario, usuario.id_usuario)
    if locatario is not None:  # preferências de busca só existem para o Morador
        if orcamento is not None:
            locatario.orcamento_maximo = orcamento
        if limiar is not None:
            locatario.preferencias_moradia = {
                **(locatario.preferencias_moradia or {}),
                CHAVE_LIMIAR: limiar,
            }

    db.commit()
    db.refresh(usuario)
    return montar_perfil(db, usuario)


def excluir_conta(db: Session, usuario: Usuario) -> None:
    db.query(UsuarioTag).filter(UsuarioTag.id_usuario == usuario.id_usuario).delete()
    for perfil in (db.get(Locatario, usuario.id_usuario), db.get(Locador, usuario.id_usuario)):
        if perfil is not None:
            _remover(db, perfil, MSG_VINCULOS)
    _remover(db, usuario, MSG_VINCULOS)
    db.commit()
