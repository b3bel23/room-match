"""
Dados fictícios para desenvolvimento e demonstração (KAN-30).

Espelha o catálogo do front (frontend/js/mock-api.js e tags-catalogo.js): mesmos usuários
de demonstração, os 4 anúncios que têm fotos em frontend/assets/imoveis/ e as 14 tags.

É idempotente: cada registro é buscado pela chave natural (e-mail, nome da tag, título do
anúncio...) e só criado se não existir, então rodar duas vezes não duplica nada.
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.carrossel_imagem import CarrosselImagem
from app.models.endereco_imovel import EnderecoImovel
from app.models.imovel import Imovel
from app.models.imovel_tag import ImovelTag
from app.models.integrante_imovel import IntegranteImovel
from app.models.like import Like
from app.models.locador import Locador
from app.models.locatario import Locatario
from app.models.post import Post
from app.models.tag import Tag
from app.models.usuario import Usuario
from app.models.usuario_tag import UsuarioTag

TAGS = [
    "Pet Friendly", "Home Office", "Aberto a Festas", "Vegetariano", "420 Friendly",
    "LGBTQIA+ Safe", "Limpeza Compartilhada", "Silêncio Noturno", "Sem Festas", "Sem Fumo",
    "Sem Pets", "Visitas Restritas", "Itens Individuais", "Mobiliado",
]

# papel: "locador" | "locatario" | None (só mora num imóvel, sem perfil de busca/anúncio)
USUARIOS = [
    {"email": "locador@demo.com", "nome": "Ana Ribeiro", "papel": "locador", "cpf_cnpj": "111.111.111-11",
     "telefone": "(19) 97777-2002", "tags": ["Pet Friendly", "Sem Festas", "Silêncio Noturno"]},
    {"email": "locador2@demo.com", "nome": "Carlos Mendes", "papel": "locador", "cpf_cnpj": "222.222.222-22",
     "telefone": "(19) 97777-3003", "tags": ["Home Office", "Sem Fumo"]},
    {"email": "morador@demo.com", "nome": "Marina Souza", "papel": "locatario", "orcamento": 1200, "limiar": 70,
     "telefone": "(19) 98888-1001", "tags": ["Pet Friendly", "Silêncio Noturno", "Home Office"]},
    {"email": "morador2@demo.com", "nome": "Rafael Lima", "papel": "locatario", "orcamento": 800, "limiar": 50,
     "telefone": "(19) 98888-1002", "tags": ["Vegetariano", "LGBTQIA+ Safe", "Home Office"]},
    {"email": "morador3@demo.com", "nome": "Beatriz Alves", "papel": "locatario", "orcamento": 1500, "limiar": 40,
     "telefone": "(19) 98888-1003", "tags": ["Pet Friendly", "420 Friendly", "Sem Festas"]},
    {"email": "residente1@demo.com", "nome": "Lucas Prado", "papel": None,
     "tags": ["Pet Friendly", "Home Office"]},
    {"email": "residente2@demo.com", "nome": "Julia Campos", "papel": None,
     "tags": ["Silêncio Noturno", "Pet Friendly"]},
    {"email": "residente3@demo.com", "nome": "Pedro Rocha", "papel": None,
     "tags": ["Sem Festas", "420 Friendly"]},
]

# `slug` é a pasta em frontend/assets/imoveis/ (4 fotos cada); `moradores` são e-mails de USUARIOS.
IMOVEIS = [
    {"slug": "republica-barao", "locador": "locador@demo.com", "titulo": "Quarto em república · Barão Geraldo",
     "tipo": "República", "rua": "R. Benedito Alves Aranha", "numero": "450", "bairro": "Barão Geraldo",
     "aluguel": 600, "condominio": 120, "iptu": 45, "contas": 85, "area_m2": 12,
     "tags": ["Pet Friendly", "Silêncio Noturno", "Home Office"],
     "moradores": ["residente1@demo.com", "residente2@demo.com"],
     "descricao": "Quarto privativo em república de estudantes a 5 min a pé da PUC. Casa ampla, "
                  "convivência organizada com regras de silêncio após 22h. Aceita pet pequeno (gato)."},
    {"slug": "kitnet-cambui", "locador": "locador2@demo.com", "titulo": "Kitnet mobiliada · Cambuí",
     "tipo": "Kitnet", "rua": "R. Coronel Quirino", "numero": "200", "bairro": "Cambuí",
     "aluguel": 980, "condominio": 150, "iptu": 40, "contas": 30, "area_m2": 28,
     "tags": ["LGBTQIA+ Safe", "Vegetariano", "Home Office"], "moradores": [],
     "descricao": "Kitnet mobiliada no Cambuí, ideal para quem estuda na UNICAMP ou trabalha no centro. "
                  "Ambiente silencioso, prédio com portaria e elevador. Uso individual — sem divisão de quarto."},
    {"slug": "casa-sousas", "locador": "locador@demo.com", "titulo": "Quarto casa compartilhada · Sousas",
     "tipo": "Casa", "rua": "Rua das Flores", "numero": "120", "bairro": "Sousas",
     "aluguel": 550, "condominio": 0, "iptu": 80, "contas": 90, "area_m2": 14,
     "tags": ["Pet Friendly", "Sem Festas", "420 Friendly"], "moradores": ["residente3@demo.com"],
     "descricao": "Quarto em casa térrea em Sousas, bairro residencial e arborizado. Quintal compartilhado, "
                  "garagem para 1 carro e ambiente familiar. Sem festas; pet friendly."},
    {"slug": "suite-taquaral", "locador": "locador@demo.com", "titulo": "Quarto suíte · Taquaral",
     "tipo": "Apartamento", "rua": "Av. José Bonifácio", "numero": "890", "bairro": "Taquaral",
     "aluguel": 750, "condominio": 140, "iptu": 50, "contas": 40, "area_m2": 16,
     "tags": ["Silêncio Noturno", "Home Office", "LGBTQIA+ Safe"], "moradores": [],
     "descricao": "Suíte em apartamento no Taquaral, república feminina com foco em estudo e home office. "
                  "Banheiro privativo, closet e varanda. Condomínio com academia e salão de festas (uso moderado)."},
]

# (e-mail do locatário, slug do imóvel)
FAVORITOS = [("morador@demo.com", "kitnet-cambui"), ("morador2@demo.com", "suite-taquaral")]

ENTRADA_PADRAO = date(2025, 8, 1)


def _tag(db: Session, nome: str) -> Tag:
    tag = db.query(Tag).filter(Tag.nome == nome).first()
    if tag is None:
        tag = Tag(nome=nome, categoria="convivencia")
        db.add(tag)
        db.flush()
    return tag


def _usuario(db: Session, dados: dict, senha_hash: str) -> Usuario:
    usuario = db.query(Usuario).filter(Usuario.email == dados["email"]).first()
    if usuario is None:
        usuario = Usuario(
            nome=dados["nome"],
            email=dados["email"],
            senha_hash=senha_hash,
            telefone=dados.get("telefone"),
            cidade_atual="Campinas",
            tags_convivencia=dados["tags"],
            status_verificacao=True,
        )
        db.add(usuario)
        db.flush()
    for nome in dados["tags"]:
        id_tag = _tag(db, nome).id_tag
        if db.get(UsuarioTag, (usuario.id_usuario, id_tag)) is None:
            db.add(UsuarioTag(id_usuario=usuario.id_usuario, id_tag=id_tag))

    if dados["papel"] == "locador" and db.get(Locador, usuario.id_usuario) is None:
        db.add(Locador(id_locador=usuario.id_usuario, cpf_cnpj=dados["cpf_cnpj"]))
    if dados["papel"] == "locatario" and db.get(Locatario, usuario.id_usuario) is None:
        db.add(
            Locatario(
                id_locatario=usuario.id_usuario,
                orcamento_maximo=dados["orcamento"],
                tags_estilo_vida=dados["tags"],
                preferencias_moradia={"limiar_compatibilidade": dados["limiar"]},
            )
        )
    db.flush()
    return usuario


def _imovel(db: Session, dados: dict, usuarios: dict[str, Usuario]) -> Post:
    locador = usuarios[dados["locador"]]
    post = (
        db.query(Post)
        .filter(Post.id_locador == locador.id_usuario, Post.titulo == dados["titulo"])
        .first()
    )
    if post is None:
        imovel = Imovel(
            valor_aluguel=dados["aluguel"],
            valor_condominio=dados["condominio"],
            valor_iptu=dados["iptu"],
            valor_contas_extras=dados["contas"],
            tipo_imovel=dados["tipo"],
            quantidade_quartos=1,
            vagas_disponiveis=1,
            area_m2=dados["area_m2"],
            descricao=dados["descricao"],
        )
        db.add(imovel)
        db.flush()
        db.add(
            EnderecoImovel(
                id_imovel=imovel.id_imovel, rua=dados["rua"], numero=dados["numero"],
                bairro=dados["bairro"], cidade="Campinas", estado="SP",
            )
        )
        post = Post(
            id_imovel=imovel.id_imovel, id_locador=locador.id_usuario,
            titulo=dados["titulo"], descricao=dados["descricao"],
        )
        db.add(post)
        db.flush()
    id_imovel = post.id_imovel

    for nome in dados["tags"]:
        id_tag = _tag(db, nome).id_tag
        if db.get(ImovelTag, (id_imovel, id_tag)) is None:
            db.add(ImovelTag(id_imovel=id_imovel, id_tag=id_tag))

    for ordem in range(1, 5):  # mesmos caminhos que o front usa (relativos a /pages/*.html)
        url = f"../assets/imoveis/{dados['slug']}/{ordem}.jpg"
        existe = (
            db.query(CarrosselImagem)
            .filter(CarrosselImagem.id_imovel == id_imovel, CarrosselImagem.url_imagem == url)
            .first()
        )
        if existe is None:
            db.add(CarrosselImagem(id_imovel=id_imovel, url_imagem=url, ordem_exibicao=ordem))

    for email in dados["moradores"]:
        morador = usuarios[email]
        ja_mora = (
            db.query(IntegranteImovel)
            .filter(IntegranteImovel.id_imovel == id_imovel, IntegranteImovel.id_pessoa == morador.id_usuario)
            .first()
        )
        if ja_mora is None:
            db.add(
                IntegranteImovel(
                    id_pessoa=morador.id_usuario, id_imovel=id_imovel,
                    data_entrada=ENTRADA_PADRAO, status_moradia="ativo",
                )
            )
    db.flush()
    return post


def popular(db: Session, senha: str) -> dict[str, int]:
    """Cria (ou completa) os dados de demonstração e devolve a contagem do que existe."""
    for nome in TAGS:
        _tag(db, nome)

    senha_hash = hash_password(senha)
    usuarios = {d["email"]: _usuario(db, d, senha_hash) for d in USUARIOS}
    posts = {d["slug"]: _imovel(db, d, usuarios) for d in IMOVEIS}

    for email, slug in FAVORITOS:
        id_locatario, id_post = usuarios[email].id_usuario, posts[slug].id_post
        existe = db.query(Like).filter(Like.id_locatario == id_locatario, Like.id_post == id_post).first()
        if existe is None:
            db.add(Like(id_locatario=id_locatario, id_post=id_post))

    for locador in db.query(Locador).filter(Locador.id_locador.in_([u.id_usuario for u in usuarios.values()])):
        locador.quantidade_imoveis_anunciados = (
            db.query(Post)
            .filter(Post.id_locador == locador.id_locador, Post.status_anuncio != "removido")
            .count()
        )
    db.commit()
    return {
        "tags": db.query(Tag).count(),
        "usuarios": db.query(Usuario).count(),
        "locadores": db.query(Locador).count(),
        "locatarios": db.query(Locatario).count(),
        "imoveis": db.query(Imovel).count(),
        "fotos": db.query(CarrosselImagem).count(),
        "moradores_nos_imoveis": db.query(IntegranteImovel).count(),
        "favoritos": db.query(Like).count(),
    }


def banco_e_remoto(host: Optional[str]) -> bool:
    return (host or "").lower() not in ("", "localhost", "127.0.0.1", "::1")
