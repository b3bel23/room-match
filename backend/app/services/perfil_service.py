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
from app.services import email_service
from app.services.destinos_service import (
    gravar_em_prefs,
    gravar_modo_em_prefs,
    gravar_papel_ativo_em_prefs,
    ler_destinos,
    ler_modo_transporte,
    ler_papel_ativo,
)
from app.services.matching_service import tags_do_usuario
from app.services.mural_service import limiar_do_locatario
from app.utils.documento import gravar_foto_perfil, normalizar_cpf_cnpj, so_digitos

MORADOR, LOCADOR = "Morador", "Locador"
MSG_VINCULOS = "A conta tem dados vinculados (anúncios, favoritos ou conversas)."


def iniciais(nome: str) -> str:
    partes = [p for p in (nome or "").split() if p]
    return "".join(p[0] for p in partes[:2]).upper()


def papel_do_usuario(db: Session, usuario: Usuario) -> str:
    """Papel *ativo* da conta.

    Schema intacto: podem existir linhas em `locatarios` e `locadores` ao mesmo
    tempo (sleep). O ativo fica em `preferencias_moradia.papel_ativo` (JSONB).
    Sem flag: se só há locador → Locador; senão → Morador.
    """
    locador = db.get(Locador, usuario.id_usuario)
    locatario = db.get(Locatario, usuario.id_usuario)
    if locador is not None and locatario is not None:
        ativo = ler_papel_ativo(locatario.preferencias_moradia)
        if ativo:
            return ativo
        # Ambos sem flag (legado raro): trata como Locador.
        return LOCADOR
    if locador is not None:
        return LOCADOR
    return MORADOR


def _gravar_papel_ativo(db: Session, locatario: Locatario, papel: str) -> None:
    from sqlalchemy.orm.attributes import flag_modified

    locatario.preferencias_moradia = gravar_papel_ativo_em_prefs(
        locatario.preferencias_moradia, papel
    )
    flag_modified(locatario, "preferencias_moradia")


def _garantir_locatario(
    db: Session, usuario: Usuario, orcamento_maximo: Optional[float] = None
) -> Locatario:
    locatario = db.get(Locatario, usuario.id_usuario)
    if locatario is None:
        db.add(
            Locatario(
                id_locatario=usuario.id_usuario,
                orcamento_maximo=orcamento_maximo or 0,
            )
        )
        db.flush()
        locatario = db.get(Locatario, usuario.id_usuario)
    return locatario  # type: ignore[return-value]


def montar_perfil(db: Session, usuario: Usuario) -> dict:
    locatario = db.get(Locatario, usuario.id_usuario)
    locador = db.get(Locador, usuario.id_usuario)
    papel = papel_do_usuario(db, usuario)
    # Preferências de busca “dormem” no locatário; só expomos com papel Morador ativo.
    orcamento = (
        float(locatario.orcamento_maximo or 0)
        if locatario and papel == MORADOR
        else 0.0
    )
    limiar = (
        (limiar_do_locatario(locatario) or 0.0) if locatario and papel == MORADOR else 0.0
    )
    destinos = (
        ler_destinos(locatario.preferencias_moradia)
        if locatario and papel == MORADOR
        else []
    )
    modo = (
        ler_modo_transporte(locatario.preferencias_moradia)
        if locatario and papel == MORADOR
        else "foot"
    )
    return {
        "id": usuario.id_usuario,
        "email": usuario.email,
        "email_verificado": bool(usuario.status_verificacao),
        "email_envio_disponivel": email_service.envio_ativo(),
        "nome": usuario.nome,
        "papel": papel,
        "papel_schema": "locador" if papel == LOCADOR else "locatario",
        "papeis_disponiveis": {
            "morador": locatario is not None,
            "locador": locador is not None,
        },
        "iniciais": iniciais(usuario.nome),
        "telefone": usuario.telefone or "",
        "genero": usuario.genero or "",
        "ocupacao": usuario.ocupacao or "",
        "emprego": usuario.emprego or "",
        "faculdade": usuario.faculdade or "",
        "foto_url": usuario.foto_perfil or "",
        "bio": usuario.bio or "",
        "cidade_atual": usuario.cidade_atual or "",
        "data_nascimento": usuario.data_nascimento,
        "tags": tags_do_usuario(db, usuario, locatario),
        "destino": destinos[0] if destinos else None,
        "destinos": destinos,
        "modo_transporte": modo,
        "raio_busca_km": (
            float(locatario.raio_busca_km)
            if locatario and papel == MORADOR and locatario.raio_busca_km is not None
            else None
        ),
        "orcamento_maximo": orcamento,
        "limiar_compatibilidade": limiar,
        "orcamento": orcamento,
        "limiar": limiar,
    }


def sincronizar_tags(db: Session, usuario: Usuario, nomes: list[str]) -> None:
    """Substitui as tags do usuário (usuario_tags) e mantém colunas legadas em sincronia.

    Comodidades de anúncio (Wi-Fi etc.) são ignoradas — não fazem parte do perfil.
    """
    from app.services.tags_catalogo import filtrar_convivencia, sem_conflitos

    unicos = sem_conflitos(
        list(dict.fromkeys(filtrar_convivencia([n.strip() for n in nomes if n and n.strip()])))
    )
    db.query(UsuarioTag).filter(UsuarioTag.id_usuario == usuario.id_usuario).delete()
    for nome in unicos:
        tag = db.query(Tag).filter(Tag.nome == nome).first()
        if tag is None:
            tag = Tag(nome=nome)
            db.add(tag)
            db.flush()
        db.add(UsuarioTag(id_usuario=usuario.id_usuario, id_tag=tag.id_tag))
    usuario.tags_convivencia = unicos
    locatario = db.get(Locatario, usuario.id_usuario)
    if locatario is not None:
        locatario.tags_estilo_vida = unicos


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
    """Troca o papel *ativo* sem apagar o outro perfil (sleep).

    - Morador → Locador: cria `locadores` se preciso; **mantém** `locatarios`
      (favoritos/conversas dormem). Grava `papel_ativo=Locador` no JSONB.
    - Locador → Morador: se ainda há anúncios, 409. Senão mantém `locadores`
      e reativa o locatário com `papel_ativo=Morador`.
    Sem coluna nova — só `preferencias_moradia.papel_ativo`.
    """
    if novo not in (MORADOR, LOCADOR):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Tipo de perfil inválido. Use Morador ou Locador."
        )
    locador = db.get(Locador, usuario.id_usuario)
    locatario = db.get(Locatario, usuario.id_usuario)

    if novo == MORADOR:
        if locador is not None:
            from app.models.post import Post

            tem_anuncio = (
                db.query(Post.id_post)
                .filter(
                    Post.id_locador == usuario.id_usuario,
                    Post.status_anuncio != "removido",
                )
                .first()
                is not None
            )
            if tem_anuncio:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    "Remova seus anúncios antes de virar Morador.",
                )
            # Sem anúncio: locador “dorme” (linha permanece para voltar sem reenviar CPF).
        locatario = _garantir_locatario(db, usuario, orcamento_maximo)
        _gravar_papel_ativo(db, locatario, MORADOR)
        return

    # novo == LOCADOR — não apaga locatário (favoritos/conversas dormem).
    cpf = normalizar_cpf_cnpj(cpf_cnpj) if cpf_cnpj else ""
    if locador is None:
        if not cpf:
            raise HTTPException(422, "Informe cpf_cnpj para virar Locador.")
        for outro in db.query(Locador).all():
            if so_digitos(outro.cpf_cnpj) == cpf:
                from app.services.auth_service import MSG_CPF_EM_USO

                raise HTTPException(status.HTTP_409_CONFLICT, MSG_CPF_EM_USO)
        db.add(Locador(id_locador=usuario.id_usuario, cpf_cnpj=cpf))
        db.flush()
    # Locatário pode não existir (cadastro direto como Locador); cria vazio só
    # para guardar papel_ativo / preferências futuras.
    locatario = _garantir_locatario(db, usuario, orcamento_maximo)
    _gravar_papel_ativo(db, locatario, LOCADOR)


def atualizar_perfil(db: Session, usuario: Usuario, dados: PerfilUpdate) -> dict:
    campos = dados.model_dump(exclude_unset=True)

    if campos.get("email") is not None:
        from app.utils.contato import normalizar_email

        email = normalizar_email(campos["email"])
        existente = db.query(Usuario).filter(Usuario.email == email).first()
        if existente is not None and existente.id_usuario != usuario.id_usuario:
            from app.services.auth_service import MSG_EMAIL_EM_USO

            raise HTTPException(status.HTTP_409_CONFLICT, MSG_EMAIL_EM_USO)
        if email != usuario.email:
            usuario.email = email
            if email_service.envio_ativo():
                usuario.status_verificacao = False
                from app.services import verificacao_service

                verificacao_service.enviar_link(usuario)
            else:
                # Sem SMTP: e-mail novo já vale como confirmado (não há link real).
                usuario.status_verificacao = True

    if campos.get("nome") is not None:
        usuario.nome = campos["nome"]
    if "telefone" in campos:
        from app.utils.contato import exigir_telefone_br

        usuario.telefone = exigir_telefone_br(campos.get("telefone"), obrigatorio=True)
    for campo in (
        "bio", "cidade_atual", "data_nascimento",
        "genero", "ocupacao", "emprego", "faculdade",
    ):
        if campo in campos:
            setattr(usuario, campo, campos[campo])
    if "foto_url" in campos:
        usuario.foto_perfil = gravar_foto_perfil(usuario.id_usuario, campos["foto_url"])

    orcamento = campos.get("orcamento_maximo", campos.get("orcamento"))
    limiar = campos.get("limiar_compatibilidade", campos.get("limiar"))

    if campos.get("papel") is not None:
        trocar_papel(db, usuario, campos["papel"], campos.get("cpf_cnpj"), orcamento)

    if campos.get("tags") is not None:
        sincronizar_tags(db, usuario, campos["tags"])

    locatario = db.get(Locatario, usuario.id_usuario)
    destinos_para_aquecer: list[dict] = []
    # Preferências de busca só mudam com papel Morador ativo (mesmo com locatário em sleep).
    if locatario is not None and papel_do_usuario(db, usuario) == MORADOR:
        if orcamento is not None:
            locatario.orcamento_maximo = orcamento
        if limiar is not None:
            locatario.limiar_compatibilidade = round(limiar)
        if "raio_busca_km" in campos:
            locatario.raio_busca_km = campos["raio_busca_km"]
        prefs_tocadas = False
        if campos.get("destinos") is not None or campos.get("destino") is not None:
            # `destinos` (até 3) é a fonte; `destino` legado vira lista de 1 se destinos não veio.
            if campos.get("destinos") is not None:
                lista = campos["destinos"]
            else:
                lista = [campos["destino"]]
            locatario.preferencias_moradia = gravar_em_prefs(
                locatario.preferencias_moradia, lista
            )
            destinos_para_aquecer = ler_destinos(locatario.preferencias_moradia)
            prefs_tocadas = True
        if "modo_transporte" in campos and campos.get("modo_transporte") is not None:
            # Grava o modo ANTES do aquecimento de rotas — senão um GTFS lento
            # impede o commit e o transporte “não salva”.
            locatario.preferencias_moradia = gravar_modo_em_prefs(
                locatario.preferencias_moradia, campos["modo_transporte"]
            )
            prefs_tocadas = True
        if prefs_tocadas:
            from sqlalchemy.orm.attributes import flag_modified

            flag_modified(locatario, "preferencias_moradia")

    db.commit()
    db.refresh(usuario)

    # Cache de rotas depois do commit: falha/timeout não desfaz preferências.
    if destinos_para_aquecer:
        try:
            from app.api.v1.mobilidade import aquecer_cache_destino

            for d in destinos_para_aquecer:
                aquecer_cache_destino(db, d)
            db.commit()
        except Exception:
            import logging

            logging.getLogger("roommatch.perfil").exception(
                "Falha ao aquecer cache de rotas para destino salvo"
            )
            db.rollback()

    from app.core import cache_resposta

    # Match, destino e orçamento mudam o mural/stats personalizados.
    cache_resposta.invalidate_prefix("mural:")
    cache_resposta.invalidate_prefix("stats:")
    return montar_perfil(db, usuario)


def excluir_conta(db: Session, usuario: Usuario) -> None:
    db.query(UsuarioTag).filter(UsuarioTag.id_usuario == usuario.id_usuario).delete()
    for perfil in (db.get(Locatario, usuario.id_usuario), db.get(Locador, usuario.id_usuario)):
        if perfil is not None:
            _remover(db, perfil, MSG_VINCULOS)
    _remover(db, usuario, MSG_VINCULOS)
    db.commit()
