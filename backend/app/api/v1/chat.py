"""Chat interno (RF27/RF34), no formato do mock (frontend/js/mock-api.js):

  GET  /conversas                    conversas do usuário (Morador ou Locador)
  GET  /conversas/{id}               uma conversa; marca como lidas as mensagens recebidas
  POST /conversas                    Morador abre conversa com o locador de um imóvel
  POST /conversas/{id}/mensagens     envia mensagem

Abrir conversa só se match >= limiar E preço <= orçamento (mesma regra do mural).
Só os participantes (o locatário e o locador do anúncio) leem e escrevem.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.conversa import Conversa
from app.models.mensagem import Mensagem
from app.models.post import Post
from app.models.usuario import Usuario
from app.services import contexto, notificacao_service

router = APIRouter(tags=["chat"])


class ConversaIn(BaseModel):
    imovel_id: int
    texto: Optional[str] = Field(None, max_length=2000)


class MensagemIn(BaseModel):
    texto: str = Field(..., max_length=2000)


def _participa(conversa: Conversa, usuario: Usuario) -> bool:
    return usuario.id_usuario in (conversa.id_locatario, conversa.post.id_locador)


def _obter(db: Session, id_conversa: int, usuario: Usuario) -> Conversa:
    conversa = db.get(Conversa, id_conversa)
    if conversa is None or not _participa(conversa, usuario):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversa não encontrada.")
    return conversa


def _iso(valor) -> Optional[str]:
    return valor.isoformat() if valor is not None else None


def montar_conversa(db: Session, conversa: Conversa, usuario: Usuario, com_mensagens=True) -> dict:
    post: Post = conversa.post
    imovel = contexto.montar_imoveis(db, [post], None)[0]
    sou_locatario = usuario.id_usuario == conversa.id_locatario
    outro = (
        contexto.perfil_publico(post.locador.usuario, "Locador")
        if sou_locatario
        else contexto.perfil_publico(conversa.locatario.usuario, "Morador")
    )
    mensagens = sorted(conversa.mensagens, key=lambda m: (m.data_envio is None, m.data_envio, m.id_mensagem))
    nomes = {conversa.id_locatario: conversa.locatario.usuario.nome, post.id_locador: post.locador.usuario.nome}
    ultima = mensagens[-1] if mensagens else None
    dados = {
        "id": conversa.id_conversa,
        "imovel_id": post.id_imovel,
        "imovel_titulo": post.titulo,
        "imovel_preco": imovel["preco"],
        "imovel_bairro": imovel["bairro"],
        "imovel_capa": imovel["capa"],
        "imovel_ativo": post.status_anuncio == "ativo",
        "outro": outro,
        "ultima_mensagem": ultima.conteudo if ultima else "",
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
def listar_conversas(usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    consulta = db.query(Conversa).join(Post, Post.id_post == Conversa.id_post)
    if contexto.eh_locador(db, usuario):
        consulta = consulta.filter(Post.id_locador == usuario.id_usuario)
    else:
        consulta = consulta.filter(Conversa.id_locatario == usuario.id_usuario)
    itens = [montar_conversa(db, c, usuario) for c in consulta.all()]
    itens.sort(key=lambda c: c["atualizado_em"] or "", reverse=True)
    return {"items": itens}


@router.get("/conversas/{id_conversa}")
def obter_conversa(
    id_conversa: int, usuario: Usuario = Depends(get_current_user), db: Session = Depends(get_db)
):
    conversa = _obter(db, id_conversa, usuario)
    for m in conversa.mensagens:
        if m.id_remetente != usuario.id_usuario and not m.status_leitura:
            m.status_leitura = True
    db.commit()
    return montar_conversa(db, conversa, usuario)


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
    notificacao_service.notificar(
        db, destinatario, "mensagem",
        f"{usuario.nome.split()[0]}: {notificacao_service.resumo(texto)}",
        f"mensagens.html?id={conversa.id_conversa}",
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
        conversa = Conversa(id_locatario=locatario.id_locatario, id_post=post.id_post)
        db.add(conversa)
        db.flush()
        texto = (dados.texto or "").strip() or f"Olá! Tenho interesse em “{post.titulo}”."
        _enviar(db, conversa, usuario, texto)
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
    if conversa.post.status_anuncio == "removido":
        raise HTTPException(status.HTTP_409_CONFLICT, "Este anúncio foi removido.")
    _enviar(db, conversa, usuario, texto)
    db.commit()
    db.refresh(conversa)
    return montar_conversa(db, conversa, usuario)
