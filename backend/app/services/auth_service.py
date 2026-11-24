from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.usuario import Usuario
from app.models.locador import Locador
from app.models.locatario import Locatario
from app.schemas.usuario import RegistroIn, UsuarioCreate
from app.utils.contato import exigir_telefone_br, normalizar_email
from app.utils.documento import gravar_foto_perfil, normalizar_cpf_cnpj, so_digitos

# Mensagens de conflito (cadastro / perfil) — front pode oferecer Contato.
MSG_CONTATO_ERRO = "Se achar que é um erro, contate o suporte pela página Contato."
MSG_EMAIL_DUPLICADO = (
    "Este e-mail já está cadastrado. Não é possível criar outra conta com ele. "
    + MSG_CONTATO_ERRO
)
MSG_CPF_DUPLICADO = (
    "Este CPF/CNPJ já está cadastrado. Não é possível criar outra conta com ele. "
    + MSG_CONTATO_ERRO
)
MSG_EMAIL_EM_USO = "Este e-mail já está em uso. " + MSG_CONTATO_ERRO
MSG_CPF_EM_USO = "CPF/CNPJ já cadastrado. " + MSG_CONTATO_ERRO


def get_usuario_by_email(db: Session, email: str) -> Optional[Usuario]:
    try:
        chave = normalizar_email(email)
    except HTTPException:
        chave = (email or "").strip().lower()
    return db.query(Usuario).filter(Usuario.email == chave).first()


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


def _locador_por_cpf(db: Session, digitos: str) -> Optional[Locador]:
    """Encontra locador pelo CPF/CNPJ só com dígitos (aceita legado mascarado no banco)."""
    if not digitos:
        return None
    direto = db.query(Locador).filter(Locador.cpf_cnpj == digitos).first()
    if direto is not None:
        return direto
    for loc in db.query(Locador).all():
        if so_digitos(loc.cpf_cnpj) == digitos:
            return loc
    return None


def registrar(db: Session, dados: RegistroIn) -> Usuario:
    """Cadastro completo do front: usuário + perfil (locatário ou locador) + preferências."""
    from app.schemas.perfil import PerfilUpdate
    from app.services import perfil_service

    if dados.papel not in (perfil_service.MORADOR, perfil_service.LOCADOR):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Tipo de perfil inválido. Use Morador ou Locador."
        )
    email = normalizar_email(str(dados.email))
    telefone = exigir_telefone_br(dados.telefone, obrigatorio=True)

    if get_usuario_by_email(db, email):
        raise HTTPException(status.HTTP_409_CONFLICT, MSG_EMAIL_DUPLICADO)

    cpf = ""
    if dados.papel == perfil_service.LOCADOR:
        cpf = normalizar_cpf_cnpj(dados.cpf_cnpj)
        if not cpf:
            raise HTTPException(422, "Informe o CPF ou CNPJ para anunciar como Locador.")
        if _locador_por_cpf(db, cpf) is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, MSG_CPF_DUPLICADO)

    try:
        usuario = Usuario(
            nome=dados.nome.strip(),
            email=email,
            senha_hash=hash_password(dados.senha),
            telefone=telefone,
            data_nascimento=dados.data_nascimento,
            bio=(dados.bio or "").strip() or None,
            cidade_atual=(dados.cidade_atual or "").strip() or None,
        )
        db.add(usuario)
        db.flush()

        # Data URL → Storage (URL curta no banco).
        if dados.foto_url:
            usuario.foto_perfil = gravar_foto_perfil(usuario.id_usuario, dados.foto_url)

        orcamento = dados.orcamento_maximo if dados.orcamento_maximo is not None else dados.orcamento
        limiar = (
            dados.limiar_compatibilidade
            if dados.limiar_compatibilidade is not None
            else dados.limiar
        )
        if dados.papel == perfil_service.LOCADOR:
            db.add(Locador(id_locador=usuario.id_usuario, cpf_cnpj=cpf))
        else:
            locatario = Locatario(
                id_locatario=usuario.id_usuario,
                orcamento_maximo=orcamento or 0,
                raio_busca_km=dados.raio_busca_km,
            )
            db.add(locatario)
        db.flush()

        extras = {
            "genero": dados.genero,
            "ocupacao": dados.ocupacao,
            "emprego": dados.emprego,
            "faculdade": dados.faculdade,
            "tags": dados.tags,
        }
        if dados.papel == perfil_service.MORADOR:
            extras["orcamento_maximo"] = orcamento
            extras["limiar_compatibilidade"] = limiar if limiar is not None else 70
            if dados.raio_busca_km is not None:
                extras["raio_busca_km"] = dados.raio_busca_km
        perfil_service.atualizar_perfil(
            db, usuario, PerfilUpdate(**{k: v for k, v in extras.items() if v is not None})
        )
        return usuario
    except IntegrityError:
        db.rollback()
        if get_usuario_by_email(db, email):
            raise HTTPException(status.HTTP_409_CONFLICT, MSG_EMAIL_DUPLICADO)
        if cpf and _locador_por_cpf(db, cpf) is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, MSG_CPF_DUPLICADO)
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Não foi possível criar a conta (dados já cadastrados). " + MSG_CONTATO_ERRO,
        )
