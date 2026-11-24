"""
Dados fictícios para desenvolvimento e demonstração (KAN-30).

Espelha o catálogo do front (frontend/js/mock-api.js e tags-catalogo.js): mesmos usuários
de demonstração, os 4 anúncios que têm fotos em frontend/assets/imoveis/, tags de
convivência e comodidades de anúncio (Wi-Fi etc. — fora do match).

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

from app.services.tags_catalogo import COMODIDADES as _COMOD, CONVIVENCIA as _CONV

# Catálogo usado no seed (= front/backend tags_catalogo).
TAGS = list(_CONV) + list(_COMOD)

# papel: "locador" | "locatario" | None (só mora num imóvel, sem perfil de busca/anúncio)
# `foto` = arquivo em frontend/assets/perfis/ (também sobe para Storage no backfill).
USUARIOS = [
    {
        "email": "locador@demo.com", "nome": "Ana Ribeiro", "papel": "locador", "cpf_cnpj": "11111111111",
        "telefone": "(19) 99712-4408", "genero": "Mulher Cisgênero", "ocupacao": "cbo-2",
        "emprego": "autonomo", "faculdade": "puc-campinas-campus1",
        "cidade_atual": "Campinas", "data_nascimento": date(1992, 4, 18),
        "bio": "Arquiteta e locadora na região de Barão Geraldo. Prefiro casas tranquilas e bem cuidadas.",
        "foto": "perfil-ana.jpg",
        "tags": ["Aceita Animais", "Sem Festas", "Silêncio Noturno"],
    },
    {
        "email": "locador2@demo.com", "nome": "Carlos Mendes", "papel": "locador", "cpf_cnpj": "22222222222",
        "telefone": "(19) 98105-6632", "genero": "Homem Cisgênero", "ocupacao": "cbo-1",
        "emprego": "empregador", "faculdade": "",
        "cidade_atual": "Campinas", "data_nascimento": date(1986, 11, 3),
        "bio": "Investidor imobiliário no Cambuí. Anúncios com foco em kitnets e studios para profissionais.",
        "foto": "perfil-carlos.jpg",
        "tags": ["Trabalho em Casa", "Sem Fumo", "Silêncio Noturno"],
    },
    # destino → locatarios.preferencias_moradia.destino (schema JSONB); usado no mural/stats.
    {
        "email": "morador@demo.com", "nome": "Marina Souza", "papel": "locatario", "orcamento": 1200, "limiar": 70,
        "telefone": "(19) 99471-2830", "genero": "Mulher Cisgênero", "ocupacao": "estudante",
        "emprego": "estagio", "faculdade": "puc-campinas-campus1",
        "cidade_atual": "Campinas", "data_nascimento": date(2002, 7, 9),
        "bio": "Estudante de Psicologia na PUC. Busco quarto calmo, pet friendly, perto do campus.",
        "foto": "perfil-marina.jpg",
        "tags": ["Aceita Animais", "Silêncio Noturno", "Trabalho em Casa"],
        "raio_busca_km": 15,
        "destinos": [
            {"nome": "PUC Campinas · Campus I", "lat": -22.8345, "lng": -47.0525, "tipo": "faculdade"},
            {"nome": "Estágio no Centro", "lat": -22.9056, "lng": -47.0608, "tipo": "trabalho"},
        ],
    },
    {
        "email": "morador2@demo.com", "nome": "Rafael Lima", "papel": "locatario", "orcamento": 800, "limiar": 50,
        "telefone": "(19) 98852-7164", "genero": "Homem Cisgênero", "ocupacao": "estudante",
        "emprego": "bolsista", "faculdade": "unicamp-campinas",
        "cidade_atual": "Campinas", "data_nascimento": date(2001, 1, 22),
        "bio": "Mestrando na UNICAMP. Vegetariano, LGBTQIA+ safe e preciso de espaço para estudar em casa.",
        "foto": "perfil-rafael.jpg",
        "tags": ["Vegetariano", "LGBTQIA+ Acolhedor", "Trabalho em Casa"],
        "raio_busca_km": 12,
        "destinos": [
            {"nome": "UNICAMP", "lat": -22.8184, "lng": -47.0647, "tipo": "faculdade"},
            {"nome": "Academia Barão", "lat": -22.8225, "lng": -47.0820, "tipo": "outro"},
        ],
    },
    {
        "email": "morador3@demo.com", "nome": "Beatriz Alves", "papel": "locatario", "orcamento": 1500, "limiar": 40,
        "telefone": "(19) 99630-1187", "genero": "Mulher Cisgênero", "ocupacao": "cbo-3",
        "emprego": "clt", "faculdade": "",
        "cidade_atual": "Campinas", "data_nascimento": date(1998, 9, 14),
        "bio": "Técnica de enfermagem no Centro. Quero casa com gente tranquila e que aceite meu gato.",
        "foto": "perfil-beatriz.jpg",
        "tags": ["Aceita Animais", "Trabalho em Casa", "Sem Festas"],
        "raio_busca_km": 20,
        "destinos": [
            {"nome": "Hospital no Centro", "lat": -22.9056, "lng": -47.0608, "tipo": "trabalho"},
            {"nome": "Cambuí", "lat": -22.8940, "lng": -47.0490, "tipo": "outro"},
            {"nome": "Taquaral", "lat": -22.8720, "lng": -47.0480, "tipo": "outro"},
        ],
    },
    {
        "email": "residente1@demo.com", "nome": "Lucas Prado", "papel": None,
        "telefone": "(19) 98244-5091", "genero": "Homem Cisgênero", "ocupacao": "estudante",
        "emprego": "estudante-sem-vinculo", "faculdade": "puc-campinas-campus1",
        "cidade_atual": "Campinas", "data_nascimento": date(2003, 3, 5),
        "bio": "Moro na república do Barão. Curso Administração na PUC.",
        "foto": "perfil-lucas.jpg",
        "tags": ["Aceita Animais", "Trabalho em Casa"],
    },
    {
        "email": "residente2@demo.com", "nome": "Julia Campos", "papel": None,
        "telefone": "(19) 99118-7742", "genero": "Mulher Cisgênero", "ocupacao": "estudante",
        "emprego": "estagio", "faculdade": "unicamp-campinas",
        "cidade_atual": "Campinas", "data_nascimento": date(2002, 12, 1),
        "bio": "Estágio em design. Gosto de casa organizada e silêncio à noite.",
        "foto": "perfil-julia.jpg",
        "tags": ["Silêncio Noturno", "Aceita Animais"],
    },
    {
        "email": "residente3@demo.com", "nome": "Pedro Rocha", "papel": None,
        "telefone": "(19) 98765-3304", "genero": "Homem Cisgênero", "ocupacao": "cbo-5",
        "emprego": "sem-carteira", "faculdade": "",
        "cidade_atual": "Campinas", "data_nascimento": date(1999, 6, 28),
        "bio": "Trabalho com delivery e divido casa em Sousas. Tranquilo e sem festas.",
        "foto": "perfil-pedro.jpg",
        "tags": ["Sem Festas", "Organizado"],
    },
]

# `slug` é a pasta em frontend/assets/imoveis/ (4 fotos cada); `moradores` são e-mails de USUARIOS.
IMOVEIS = [
    {"slug": "republica-barao", "locador": "locador@demo.com",
     "titulo": "Quarto privativo em república · Barão Geraldo",
     "tipo": "República", "classificacao": "Mista",
     "rua": "Rua Benedito Alves Aranha", "numero": "450", "bairro": "Barão Geraldo",
     "cep": "13083-050", "lat": -22.8190, "lng": -47.0760,
     "aluguel": 650, "condominio": 0, "iptu": 45, "contas": 120, "area_m2": 14,
     "tags": ["Aceita Animais", "Silêncio Noturno", "Trabalho em Casa", "Sem Festas", "Wi-Fi", "Mobiliado"],
     "moradores": ["residente1@demo.com", "residente2@demo.com"],
     "descricao": (
         "Quarto individual mobiliado em república estudantil a ~8 minutos a pé da PUC Campinas (Campus I). "
         "Casa com 4 quartos, sala, cozinha completa e área de serviço. Wi-Fi fibra, limpeza da área comum "
         "1×/semana, silêncio após 22h, pet pequeno ok. Contas no rateio; vaga rotativa na garagem."
     )},
    {"slug": "kitnet-cambui", "locador": "locador2@demo.com",
     "titulo": "Kitnet mobiliada com varanda · Cambuí",
     "tipo": "Kitnet", "classificacao": "Mista",
     "rua": "Rua Coronel Quirino", "numero": "200", "bairro": "Cambuí",
     "cep": "13025-001", "lat": -22.8930, "lng": -47.0480,
     "aluguel": 1100, "condominio": 280, "iptu": 55, "contas": 90, "area_m2": 28,
     "tags": ["Trabalho em Casa", "Mobiliado", "Silêncio Noturno", "LGBTQIA+ Acolhedor", "Ar-condicionado", "Wi-Fi"],
     "moradores": [],
     "descricao": (
         "Kitnet independente de 28 m² no Cambuí, 100% mobiliada com ar-condicionado e varanda. "
         "Prédio com portaria 24h e elevador. Perto do comércio e a ~12 min de ônibus da UNICAMP."
     )},
    {"slug": "casa-sousas", "locador": "locador@demo.com",
     "titulo": "Quarto em casa com quintal · Sousas",
     "tipo": "Casa", "classificacao": "Mista",
     "rua": "Rua das Orquídeas", "numero": "120", "bairro": "Sousas",
     "cep": "13106-000", "lat": -22.8770, "lng": -47.0080,
     "aluguel": 580, "condominio": 0, "iptu": 70, "contas": 110, "area_m2": 16,
     "tags": ["Aceita Animais", "Sem Festas", "Trabalho em Casa", "Wi-Fi", "Mobiliado"],
     "moradores": ["residente3@demo.com"],
     "descricao": (
         "Quarto arejado em casa térrea em Sousas com quintal, churrasqueira e garagem. "
         "Divide com mais 2 pessoas; pet friendly; sem festas. Contas divididas em 3."
     )},
    {"slug": "suite-taquaral", "locador": "locador@demo.com",
     "titulo": "Suíte com banheiro privativo · Taquaral",
     "tipo": "Apartamento", "classificacao": "Feminina",
     "rua": "Avenida José Bonifácio", "numero": "890", "bairro": "Taquaral",
     "cep": "13087-000", "lat": -22.8720, "lng": -47.0485,
     "aluguel": 820, "condominio": 180, "iptu": 60, "contas": 95, "area_m2": 18,
     "tags": ["Silêncio Noturno", "Trabalho em Casa", "LGBTQIA+ Acolhedor", "Ar-condicionado", "Mobiliado", "Wi-Fi"],
     "moradores": [],
     "descricao": (
         "Suíte (quarto + banheiro + closet) em apartamento no Taquaral, república feminina. "
         "Perto do Parque Portugal; condomínio com academia e portaria. Contas já estimadas no rateio."
     )},
]

# (e-mail do locatário, slug do imóvel)
FAVORITOS = [("morador@demo.com", "kitnet-cambui"), ("morador2@demo.com", "suite-taquaral")]

ENTRADA_PADRAO = date(2025, 8, 1)


def _tag(db: Session, nome: str) -> Tag:
    from app.services.tags_catalogo import canonico, eh_comodidade

    canon = canonico(nome) or str(nome or "").strip()
    categoria = "comodidade" if eh_comodidade(canon) else "convivencia"
    tag = db.query(Tag).filter(Tag.nome == canon).first()
    if tag is None:
        tag = Tag(nome=canon, categoria=categoria)
        db.add(tag)
        db.flush()
    elif tag.categoria != categoria:
        tag.categoria = categoria
    return tag


def _canonicalizar_tags_legado(db: Session) -> None:
    """Reaponta imovel_tags/usuario_tags de aliases (Pet Friendly…) para o nome canônico."""
    from app.models.imovel_tag import ImovelTag
    from app.models.usuario_tag import UsuarioTag
    from app.services.tags_catalogo import _ALIASES

    for antigo, novo in _ALIASES.items():
        if not novo or antigo == novo:
            continue
        velha = db.query(Tag).filter(Tag.nome == antigo).first()
        if velha is None:
            continue
        nova = _tag(db, novo)
        if velha.id_tag == nova.id_tag:
            continue
        for liga in (
            db.query(ImovelTag).filter(ImovelTag.id_tag == velha.id_tag).all()
        ):
            existe = (
                db.query(ImovelTag)
                .filter(
                    ImovelTag.id_imovel == liga.id_imovel,
                    ImovelTag.id_tag == nova.id_tag,
                )
                .first()
            )
            db.delete(liga)
            if existe is None:
                db.add(ImovelTag(id_imovel=liga.id_imovel, id_tag=nova.id_tag))
        for liga in (
            db.query(UsuarioTag).filter(UsuarioTag.id_tag == velha.id_tag).all()
        ):
            existe = (
                db.query(UsuarioTag)
                .filter(
                    UsuarioTag.id_usuario == liga.id_usuario,
                    UsuarioTag.id_tag == nova.id_tag,
                )
                .first()
            )
            db.delete(liga)
            if existe is None:
                db.add(UsuarioTag(id_usuario=liga.id_usuario, id_tag=nova.id_tag))
        db.flush()


def _aplicar_perfil(usuario: Usuario, dados: dict) -> None:
    """Completa campos de perfil do seed (idempotente: sempre alinha ao catálogo demo)."""
    usuario.nome = dados["nome"]
    if dados.get("telefone"):
        usuario.telefone = dados["telefone"]
    if dados.get("genero"):
        usuario.genero = dados["genero"]
    if "ocupacao" in dados:
        usuario.ocupacao = dados.get("ocupacao") or None
    if "emprego" in dados:
        usuario.emprego = dados.get("emprego") or None
    if "faculdade" in dados:
        usuario.faculdade = dados.get("faculdade") or None
    if dados.get("cidade_atual"):
        usuario.cidade_atual = dados["cidade_atual"]
    if dados.get("data_nascimento"):
        usuario.data_nascimento = dados["data_nascimento"]
    if dados.get("bio"):
        usuario.bio = dados["bio"]
    if dados.get("foto_url"):
        usuario.foto_perfil = dados["foto_url"]
    usuario.tags_convivencia = dados["tags"]
    usuario.status_verificacao = True


def _usuario(db: Session, dados: dict, senha_hash: str) -> Usuario:
    usuario = db.query(Usuario).filter(Usuario.email == dados["email"]).first()
    if usuario is None:
        usuario = Usuario(
            nome=dados["nome"],
            email=dados["email"],
            senha_hash=senha_hash,
            cidade_atual=dados.get("cidade_atual") or "Campinas",
            tags_convivencia=dados["tags"],
            status_verificacao=True,
        )
        db.add(usuario)
        db.flush()
    _aplicar_perfil(usuario, dados)
    for nome in dados["tags"]:
        id_tag = _tag(db, nome).id_tag
        if db.get(UsuarioTag, (usuario.id_usuario, id_tag)) is None:
            db.add(UsuarioTag(id_usuario=usuario.id_usuario, id_tag=id_tag))

    if dados["papel"] == "locador" and db.get(Locador, usuario.id_usuario) is None:
        db.add(Locador(id_locador=usuario.id_usuario, cpf_cnpj=dados["cpf_cnpj"]))
    if dados["papel"] == "locatario":
        from app.services.destinos_service import gravar_em_prefs

        locatario = db.get(Locatario, usuario.id_usuario)
        lista_dest = dados.get("destinos") or (
            [dados["destino"]] if dados.get("destino") else []
        )
        prefs = gravar_em_prefs({}, lista_dest) if lista_dest else {}
        if locatario is None:
            locatario = Locatario(
                id_locatario=usuario.id_usuario,
                orcamento_maximo=dados["orcamento"],
                tags_estilo_vida=dados["tags"],
                limiar_compatibilidade=dados["limiar"],
                raio_busca_km=dados.get("raio_busca_km"),
                preferencias_moradia=prefs or None,
            )
            db.add(locatario)
        else:
            # Re-seed idempotente: completa destinos/raio alinhados ao schema.
            if lista_dest:
                locatario.preferencias_moradia = gravar_em_prefs(
                    locatario.preferencias_moradia, lista_dest
                )
            if dados.get("raio_busca_km") is not None:
                locatario.raio_busca_km = dados["raio_busca_km"]
            if dados.get("orcamento") is not None:
                locatario.orcamento_maximo = dados["orcamento"]
            if dados.get("limiar") is not None:
                locatario.limiar_compatibilidade = dados["limiar"]
            locatario.tags_estilo_vida = dados["tags"]
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
                cep=dados.get("cep"),
                latitude=dados.get("lat"), longitude=dados.get("lng"),
            )
        )
        if dados.get("classificacao"):
            imovel.classificacao = dados["classificacao"]
        post = Post(
            id_imovel=imovel.id_imovel, id_locador=locador.id_usuario,
            titulo=dados["titulo"], descricao=dados["descricao"],
        )
        db.add(post)
        db.flush()
    else:
        # Re-seed: atualiza texto/valores/coords sem duplicar o anúncio.
        imovel = db.get(Imovel, post.id_imovel)
        if imovel is not None:
            imovel.valor_aluguel = dados["aluguel"]
            imovel.valor_condominio = dados["condominio"]
            imovel.valor_iptu = dados["iptu"]
            imovel.valor_contas_extras = dados["contas"]
            imovel.area_m2 = dados["area_m2"]
            imovel.descricao = dados["descricao"]
            if dados.get("classificacao"):
                imovel.classificacao = dados["classificacao"]
        post.titulo = dados["titulo"]
        post.descricao = dados["descricao"]
        endereco = db.query(EnderecoImovel).filter(EnderecoImovel.id_imovel == post.id_imovel).first()
        if endereco is not None:
            endereco.rua = dados["rua"]
            endereco.numero = dados["numero"]
            endereco.bairro = dados["bairro"]
            if dados.get("cep"):
                endereco.cep = dados["cep"]
            if dados.get("lat") is not None:
                endereco.latitude = dados["lat"]
                endereco.longitude = dados["lng"]
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
    _canonicalizar_tags_legado(db)
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

    # Aquecer rotas_mobilidade a partir dos destinos seed (schema: preferencias_moradia.destino).
    from app.api.v1.mobilidade import aquecer_cache_destino

    rotas = 0
    for dados in USUARIOS:
        if dados.get("papel") != "locatario":
            continue
        lista = dados.get("destinos") or (
            [dados["destino"]] if dados.get("destino") else []
        )
        for dest in lista:
            rotas += aquecer_cache_destino(db, dest)

    return {
        "tags": db.query(Tag).count(),
        "usuarios": db.query(Usuario).count(),
        "locadores": db.query(Locador).count(),
        "locatarios": db.query(Locatario).count(),
        "imoveis": db.query(Imovel).count(),
        "fotos": db.query(CarrosselImagem).count(),
        "moradores_nos_imoveis": db.query(IntegranteImovel).count(),
        "favoritos": db.query(Like).count(),
        "rotas_mobilidade_aquecidas": rotas,
    }


def banco_e_remoto(host: Optional[str]) -> bool:
    return (host or "").lower() not in ("", "localhost", "127.0.0.1", "::1")
