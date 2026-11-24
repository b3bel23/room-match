"""Chat interno (RF27/RF34), no formato do mock (frontend/js/mock-api.js):

  GET    /conversas                    conversas do usuário (Morador ou Locador)
  GET    /conversas/{id}               uma conversa; marca como lidas as mensagens recebidas
  POST   /conversas                    Morador abre conversa com o locador de um imóvel
  POST   /conversas/{id}/mensagens     envia mensagem
  POST   /conversas/{id}/lidas         marca mensagens recebidas como lidas (+ notifs do thread)
  PATCH  /conversas/{id}               status_conversa: ativa | arquivada (coluna já no schema)

Abrir conversa só se match >= limiar E preço <= orçamento (mesma regra do mural).
Só os participantes (o locatário e o locador do anúncio) leem e escrevem.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.conversa import Conversa
from app.models.mensagem import Mensagem
from app.models.notificacao import Notificacao
from app.models.post import Post
from app.models.usuario import Usuario
from app.services import bloqueio_service, contexto, matching_service, notificacao_service

MSG_CONTATO_BLOQUEADO = (
    "Conversa indisponível: há um bloqueio de contato entre vocês."
)

router = APIRouter(tags=["chat"])

STATUS_CONVERSA = ("ativa", "arquivada")


class ConversaIn(BaseModel):
    imovel_id: int
    texto: Optional[str] = Field(None, max_length=2000)


class MensagemIn(BaseModel):
    texto: str = Field(..., max_length=2000)


class ConversaPatch(BaseModel):
    status_conversa: str


def _participa(conversa: Conversa, usuario: Usuario) -> bool:
    return usuario.id_usuario in (conversa.id_locatario, conversa.post.id_locador)


def _obter(db: Session, id_conversa: int, usuario: Usuario) -> Conversa:
    conversa = db.get(Conversa, id_conversa)
    if conversa is None or not _participa(conversa, usuario):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversa não encontrada.")
    return conversa


def _iso(valor) -> Optional[str]:
    return valor.isoformat() if valor is not None else None


def _marcar_msgs_lidas(db: Session, conversa: Conversa, usuario: Usuario) -> int:
    n = 0
    for m in conversa.mensagens:
        if m.id_remetente != usuario.id_usuario and not m.status_leitura:
            m.status_leitura = True
            n += 1
    link = f"mensagens.html?id={conversa.id_conversa}"
    db.query(Notificacao).filter(
        Notificacao.id_usuario == usuario.id_usuario,
        Notificacao.link == link,
        Notificacao.lida.is_(False),
    ).update({Notificacao.lida: True}, synchronize_session=False)
    return n


def _id_outro(conversa: Conversa, usuario: Usuario) -> int:
    post = conversa.post
    if usuario.id_usuario == conversa.id_locatario:
        return post.id_locador
    return conversa.id_locatario


def montar_conversa(db: Session, conversa: Conversa, usuario: Usuario, com_mensagens=True) -> dict:
    post: Post = conversa.post
    imovel = contexto.montar_imoveis(db, [post], None)[0]
    sou_locatario = usuario.id_usuario == conversa.id_locatario
    outro = (
        contexto.perfil_publico(post.locador.usuario, "Locador")
        if sou_locatario
        else contexto.perfil_publico(conversa.locatario.usuario, "Morador")
    )
    id_outro = _id_outro(conversa, usuario)
    bloqueio = bloqueio_service.estado(db, usuario.id_usuario, id_outro)
    # Quem foi bloqueado vê o outro como indisponível (não “você foi bloqueado”).
    if bloqueio["me_bloquearam"] and not bloqueio["eu_bloqueei"]:
        outro = {
            **outro,
            "nome": "Indisponível",
            "iniciais": "—",
            "foto_url": "",
            "indisponivel": True,
        }
    # Afinidade = tags do morador (locatário) ∩ tags do imóvel — mesma regra do mural.
    tags_morador = matching_service.tags_do_usuario(db, conversa.locatario.usuario, conversa.locatario)
    tags_imovel = matching_service.tags_do_imovel(db, post.id_imovel)
    match = matching_service.match_percent(tags_morador, tags_imovel)
    mensagens = sorted(
        conversa.mensagens, key=lambda m: (m.data_envio is None, m.data_envio, m.id_mensagem)
    )
    nomes = {
        conversa.id_locatario: conversa.locatario.usuario.nome,
        post.id_locador: post.locador.usuario.nome,
    }
    if bloqueio["me_bloquearam"] and not bloqueio["eu_bloqueei"]:
        nomes[id_outro] = "Indisponível"
    ultima = mensagens[-1] if mensagens else None
    dados = {
        "id": conversa.id_conversa,
        "imovel_id": post.id_imovel,
        "imovel_titulo": post.titulo,
        "imovel_preco": imovel["preco"],
        "imovel_bairro": imovel["bairro"],
        "imovel_capa": imovel["capa"],
        "imovel_ativo": post.status_anuncio == "ativo",
        "status_conversa": conversa.status_conversa or "ativa",
        "outro": outro,
        "eu_bloqueei": bloqueio["eu_bloqueei"],
        "me_bloquearam": bloqueio["me_bloquearam"],
        "contato_bloqueado": bloqueio["contato_bloqueado"],
        "match_percent": match,
        "ultima_mensagem": (
            "Conversa indisponível"
            if bloqueio["contato_bloqueado"] and not ultima
            else (ultima.conteudo if ultima else "")
        ),
        "atualizado_em": _iso(ultima.data_envio if ultima else conversa.data_criacao),
        "nao_lidas": sum(
            1 for m in mensagens if m.id_remetente != usuario.id_usuario and not m.status_leitura
        ),
    }
    if com_mensagens:
        dados["mensagens"] = [
            {
                "id": m.id_mensagem,
                "autor_id": m.id_remetente,
                "autor_nome": nomes.get(m.id_remetente, "Usuário"),
                "texto": m.conteudo,
                "em": _iso(m.data_envio),
                "minha": m.id_remetente == usuario.id_usuario,
                "lida": bool(m.status_leitura),
            }
            for m in mensagens
        ]
    return dados


@router.get("/conversas")
def listar_conversas(
    incluir_arquivadas: bool = Query(False),
    arquivadas_apenas: bool = Query(False),
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    consulta = db.query(Conversa).join(Post, Post.id_post == Conversa.id_post)
    if contexto.eh_locador(db, usuario):
        consulta = consulta.filter(Post.id_locador == usuario.id_usuario)
    else:
        consulta = consulta.filter(Conversa.id_locatario == usuario.id_usuario)
    if arquivadas_apenas:
        consulta = consulta.filter(Conversa.status_conversa == "arquivada")
    elif not incluir_arquivadas:
        consulta = consulta.filter(
            (Conversa.status_conversa.is_(None)) | (Conversa.status_conversa != "arquivada")
        )
    itens = [montar_conversa(db, c, usuario, com_mensagens=False) for c in consulta.all()]
    itens.sort(key=lambda c: c["atualizado_em"] or "", reverse=True)
    return {"items": itens}


@router.get("/conversas/{id_conversa}")
def obter_conversa(
    id_conversa: int, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
):
    conversa = _obter(db, id_conversa, usuario)
    _marcar_msgs_lidas(db, conversa, usuario)
    db.commit()
    return montar_conversa(db, conversa, usuario)


@router.post("/conversas/{id_conversa}/lidas")
def marcar_conversa_lida(
    id_conversa: int, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Marca mensagens recebidas (e notifs do thread) como lidas — sem abrir o thread de novo."""
    conversa = _obter(db, id_conversa, usuario)
    marcadas = _marcar_msgs_lidas(db, conversa, usuario)
    db.commit()
    return {"ok": True, "marcadas": marcadas, **montar_conversa(db, conversa, usuario, com_mensagens=False)}


@router.patch("/conversas/{id_conversa}")
def atualizar_conversa(
    id_conversa: int,
    dados: ConversaPatch,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Usa `conversas.status_conversa` (ativa | arquivada)."""
    status_novo = (dados.status_conversa or "").strip().lower()
    if status_novo not in STATUS_CONVERSA:
        raise HTTPException(422, "Use status_conversa: ativa ou arquivada.")
    conversa = _obter(db, id_conversa, usuario)
    conversa.status_conversa = status_novo
    db.commit()
    db.refresh(conversa)
    return montar_conversa(db, conversa, usuario, com_mensagens=False)


def _motivo_bloqueio(eleg: dict, preco: float) -> str:
    partes = []
    if not eleg["limiar_ok"]:
        partes.append(f"match {eleg['match']}% abaixo do limiar {eleg['limiar']:g}%")
    if not eleg["orcamento_ok"]:
        partes.append(f"preço R$ {preco:g} acima do orçamento R$ {eleg['orcamento']:g}")
    return (
        f"Chat bloqueado: {'; '.join(partes)}. Ajuste preferências ou escolha outro imóvel."
    )


def _enviar(db: Session, conversa: Conversa, usuario: Usuario, texto: str) -> Mensagem:
    mensagem = Mensagem(
        id_conversa=conversa.id_conversa, id_remetente=usuario.id_usuario, conteudo=texto
    )
    db.add(mensagem)
    destinatario = (
        conversa.post.id_locador
        if usuario.id_usuario == conversa.id_locatario
        else conversa.id_locatario
    )
    # Upsert: 1 notificação não lida por conversa (schema intacto).
    notificacao_service.notificar(
        db,
        destinatario,
        "mensagem",
        f"{usuario.nome.split()[0]}: {notificacao_service.resumo(texto)}",
        f"mensagens.html?id={conversa.id_conversa}",
        upsert=True,
    )
    return mensagem


@router.post("/conversas")
def abrir_conversa(
    dados: ConversaIn, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
):
    post = contexto.post_ativo(db, dados.imovel_id)
    if post.id_locador == usuario.id_usuario:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Locador já é dono do anúncio.")
    locatario = contexto.exigir_locatario(db, usuario)

    if bloqueio_service.existe_entre(db, usuario.id_usuario, post.id_locador):
        raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_CONTATO_BLOQUEADO)

    imovel = contexto.montar_imoveis(db, [post], usuario)[0]
    eleg = imovel["elegibilidade"]
    if not eleg["chat_liberado"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, _motivo_bloqueio(eleg, imovel["preco"]))

    conversa = (
        db.query(Conversa)
        .filter(Conversa.id_locatario == locatario.id_locatario, Conversa.id_post == post.id_post)
        .first()
    )
    if conversa is None:
        conversa = Conversa(
            id_locatario=locatario.id_locatario, id_post=post.id_post, status_conversa="ativa"
        )
        db.add(conversa)
        db.flush()
        texto = (dados.texto or "").strip() or f"Olá! Tenho interesse em “{post.titulo}”."
        _enviar(db, conversa, usuario, texto)
        db.commit()
        db.refresh(conversa)
    elif (conversa.status_conversa or "") == "arquivada":
        conversa.status_conversa = "ativa"
        db.commit()
        db.refresh(conversa)
    return montar_conversa(db, conversa, usuario)


@router.post("/conversas/{id_conversa}/mensagens")
def enviar_mensagem(
    id_conversa: int,
    dados: MensagemIn,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversa = _obter(db, id_conversa, usuario)
    texto = dados.texto.strip()
    if not texto:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Mensagem vazia.")
    if bloqueio_service.existe_entre(db, usuario.id_usuario, _id_outro(conversa, usuario)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, MSG_CONTATO_BLOQUEADO)
    if conversa.post.status_anuncio == "removido":
        raise HTTPException(status.HTTP_409_CONFLICT, "Este anúncio foi removido.")
    if (conversa.status_conversa or "") == "arquivada":
        conversa.status_conversa = "ativa"
    _enviar(db, conversa, usuario, texto)
    db.commit()
    db.refresh(conversa)
    return montar_conversa(db, conversa, usuario)
