from typing import Optional

from fastapi import HTTPException, status

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.usuario import Usuario
from app.models.locador import Locador
from app.models.locatario import Locatario
from app.schemas.usuario import RegistroIn, UsuarioCreate


def get_usuario_by_email(db: Session, email: str) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.email == email.lower()).first()


def get_usuario_by_id(db: Session, id_usuario: int) -> Optional[Usuario]:
    return db.get(Usuario, id_usuario)


def register_usuario(db: Session, dados: UsuarioCreate) -> Usuario:
    usuario = Usuario(
        **dados.model_dump(exclude={"senha", "email"}),
        email=dados.email.lower(),
        senha_hash=hash_password(dados.senha),
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


def authenticate_usuario(db: Session, email: str, senha: str) -> Optional[Usuario]:
    usuario = get_usuario_by_email(db, email)
    if not usuario or not verify_password(senha, usuario.senha_hash):
        return None
    return usuario


def registrar(db: Session, dados: RegistroIn) -> Usuario:
    """Cadastro completo do front: usuário + perfil (locatário ou locador) + preferências."""
    from app.schemas.perfil import PerfilUpdate
    from app.services import perfil_service

    if dados.papel not in (perfil_service.MORADOR, perfil_service.LOCADOR):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Tipo de perfil inválido. Use Morador ou Locador."
        )
    if get_usuario_by_email(db, dados.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "Este e-mail já está em uso.")

    cpf = (dados.cpf_cnpj or "").strip()
    if dados.papel == perfil_service.LOCADOR:
        if not cpf:
            raise HTTPException(422, "Informe o CPF ou CNPJ para anunciar como Locador.")
        if db.query(Locador).filter(Locador.cpf_cnpj == cpf).first() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "CPF/CNPJ já cadastrado.")

    usuario = Usuario(
        nome=dados.nome.strip(),
        email=dados.email.lower(),
        senha_hash=hash_password(dados.senha),
        telefone=(dados.telefone or "").strip() or None,
    )
    db.add(usuario)
    db.flush()

    orcamento = dados.orcamento_maximo if dados.orcamento_maximo is not None else dados.orcamento
    limiar = (
        dados.limiar_compatibilidade if dados.limiar_compatibilidade is not None else dados.limiar
    )
    if dados.papel == perfil_service.LOCADOR:
        db.add(Locador(id_locador=usuario.id_usuario, cpf_cnpj=cpf))
    else:
        db.add(Locatario(id_locatario=usuario.id_usuario, orcamento_maximo=orcamento or 0))
    db.flush()

    extras = {
        "genero": dados.genero,
        "ocupacao": dados.ocupacao,
        "emprego": dados.emprego,
        "faculdade": dados.faculdade,
        "tags": dados.tags,
    }
    if dados.foto_url:
        extras["foto_url"] = dados.foto_url
    if dados.papel == perfil_service.MORADOR:
        extras["orcamento_maximo"] = orcamento
        extras["limiar_compatibilidade"] = limiar if limiar is not None else 70
    perfil_service.atualizar_perfil(
        db, usuario, PerfilUpdate(**{k: v for k, v in extras.items() if v is not None})
    )
    return usuario
