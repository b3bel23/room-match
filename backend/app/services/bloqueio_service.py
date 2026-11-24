"""Bloqueio de contato reusando a tabela `denuncias` (sem coluna/tabela nova).

Contrato (schema intacto):
  motivo = "bloqueio_contato"
  status_denuncia = "ativo" | "revogado"
  id_denunciante = quem bloqueia (pessoa/usuário)
  id_usuario_denunciado = quem foi bloqueado

Desfazer = `status_denuncia = revogado` (editável; pode bloquear de novo depois).
Não mistura com denúncias de moderação (`pendente`) nem dispara e-mail de equipe.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.models.denuncia import Denuncia

MOTIVO_BLOQUEIO = "bloqueio_contato"
STATUS_ATIVO = "ativo"
STATUS_REVOGADO = "revogado"


def _query_ativo(db: Session, id_bloqueador: int, id_bloqueado: int):
    return (
        db.query(Denuncia)
        .filter(
            Denuncia.id_denunciante == id_bloqueador,
            Denuncia.id_usuario_denunciado == id_bloqueado,
            Denuncia.motivo == MOTIVO_BLOQUEIO,
            Denuncia.status_denuncia == STATUS_ATIVO,
        )
    )


def eu_bloqueei(db: Session, eu: int, outro: int) -> bool:
    if eu == outro:
        return False
    return _query_ativo(db, eu, outro).first() is not None


def existe_entre(db: Session, a: int, b: int) -> bool:
    """Bloqueio em qualquer direção (corta o contato dos dois lados)."""
    return eu_bloqueei(db, a, b) or eu_bloqueei(db, b, a)


def estado(db: Session, eu: int, outro: int) -> dict:
    return {
        "eu_bloqueei": eu_bloqueei(db, eu, outro),
        "me_bloquearam": eu_bloqueei(db, outro, eu),
        "contato_bloqueado": existe_entre(db, eu, outro),
    }


def bloquear(
    db: Session,
    id_bloqueador: int,
    id_bloqueado: int,
    *,
    descricao: Optional[str] = None,
) -> Denuncia:
    if id_bloqueador == id_bloqueado:
        raise ValueError("Você não pode bloquear a si mesmo.")
    ativo = _query_ativo(db, id_bloqueador, id_bloqueado).first()
    if ativo is not None:
        return ativo

    # Reativa linha revogada (editável / fácil de desfazer e refazer).
    antiga = (
        db.query(Denuncia)
        .filter(
            Denuncia.id_denunciante == id_bloqueador,
            Denuncia.id_usuario_denunciado == id_bloqueado,
            Denuncia.motivo == MOTIVO_BLOQUEIO,
        )
        .order_by(Denuncia.id_denuncia.desc())
        .first()
    )
    if antiga is not None:
        antiga.status_denuncia = STATUS_ATIVO
        if descricao is not None:
            antiga.descricao = (descricao or "").strip() or antiga.descricao
        db.flush()
        return antiga

    row = Denuncia(
        id_denunciante=id_bloqueador,
        id_usuario_denunciado=id_bloqueado,
        id_post_denunciado=None,
        motivo=MOTIVO_BLOQUEIO,
        descricao=(descricao or "").strip() or None,
        status_denuncia=STATUS_ATIVO,
    )
    db.add(row)
    db.flush()
    return row


def desbloquear(db: Session, id_bloqueador: int, id_bloqueado: int) -> bool:
    """Revoga o bloqueio ativo. Retorna True se havia algo para desfazer."""
    ativos = _query_ativo(db, id_bloqueador, id_bloqueado).all()
    if not ativos:
        return False
    for row in ativos:
        row.status_denuncia = STATUS_REVOGADO
    db.flush()
    return True


def listar_bloqueados(db: Session, id_bloqueador: int) -> list[int]:
    rows = (
        db.query(Denuncia.id_usuario_denunciado)
        .filter(
            Denuncia.id_denunciante == id_bloqueador,
            Denuncia.motivo == MOTIVO_BLOQUEIO,
            Denuncia.status_denuncia == STATUS_ATIVO,
            Denuncia.id_usuario_denunciado.isnot(None),
        )
        .all()
    )
    return [r[0] for r in rows if r[0] is not None]
