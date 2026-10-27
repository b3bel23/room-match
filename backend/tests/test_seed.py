"""KAN-30: seed idempotente, e os dados que ele cria funcionando no mural, no login e no perfil."""

from contextlib import contextmanager

import pytest

from app.api.v1 import imoveis as rota
from app.api.v1 import matches, users
from app.core.security import verify_password
from app.models.carrossel_imagem import CarrosselImagem
from app.models.imovel import Imovel
from app.models.imovel_tag import ImovelTag
from app.models.integrante_imovel import IntegranteImovel
from app.models.like import Like
from app.models.locador import Locador
from app.models.post import Post
from app.models.tag import Tag
from app.models.usuario import Usuario
from app.models.usuario_tag import UsuarioTag
from app.services import auth_service, seed_service
from scripts import seed as cli

SENHA = "senha-de-teste-123"


@pytest.fixture()
def populado(db):
    resumo = seed_service.popular(db, SENHA)
    return db, resumo


def por_email(db, email):
    return db.query(Usuario).filter(Usuario.email == email).one()


def mural(db, usuario=None):
    return matches.listar_imoveis(tipo="", bairro="", q="", preco_max=0, tag="", usuario=usuario, db=db)["items"]


def test_popular_cria_o_esperado(populado):
    _, resumo = populado
    assert resumo == {
        "tags": 14, "usuarios": 8, "locadores": 2, "locatarios": 3, "imoveis": 4,
        "fotos": 16, "moradores_nos_imoveis": 3, "favoritos": 2,
    }


def test_popular_duas_vezes_nao_duplica_nada(db):
    primeiro = seed_service.popular(db, SENHA)
    segundo = seed_service.popular(db, SENHA)
    assert primeiro == segundo
    assert db.query(UsuarioTag).count() == sum(len(u["tags"]) for u in seed_service.USUARIOS)
    assert db.query(ImovelTag).count() == sum(len(i["tags"]) for i in seed_service.IMOVEIS)


def test_popular_completa_o_que_faltar_sem_tocar_no_que_existe(db):
    seed_service.popular(db, SENHA)
    marina = por_email(db, "morador@demo.com")
    marina.nome = "Marina Editada"
    db.query(CarrosselImagem).filter(CarrosselImagem.url_imagem.like("%casa-sousas%")).delete(synchronize_session=False)
    db.commit()
    resumo = seed_service.popular(db, SENHA)
    assert resumo["fotos"] == 16  # fotos que faltavam voltaram
    assert por_email(db, "morador@demo.com").nome == "Marina Editada"  # edição do usuário preservada


def test_login_funciona_com_a_senha_informada(populado):
    db, _ = populado
    usuario = auth_service.authenticate_usuario(db, "morador@demo.com", SENHA)
    assert usuario is not None and usuario.nome == "Marina Souza"
    assert auth_service.authenticate_usuario(db, "morador@demo.com", "errada-123") is None
    assert verify_password(SENHA, por_email(db, "locador@demo.com").senha_hash)


def test_papeis_dos_usuarios(populado):
    db, _ = populado
    assert users.meu_perfil(usuario=por_email(db, "locador@demo.com"), db=db)["papel"] == "Locador"
    marina = users.meu_perfil(usuario=por_email(db, "morador@demo.com"), db=db)
    assert marina["papel"] == "Morador" and marina["orcamento_maximo"] == 1200
    assert marina["limiar_compatibilidade"] == 70
    assert sorted(marina["tags"]) == sorted(["Pet Friendly", "Silêncio Noturno", "Home Office"])


def test_mural_do_visitante_lista_os_quatro_anuncios_com_fotos(populado):
    db, _ = populado
    itens = mural(db)
    assert len(itens) == 4
    assert all(len(i["fotos"]) == 4 and i["capa"].endswith("/1.jpg") for i in itens)
    por_titulo = {i["titulo"]: i for i in itens}
    republica = por_titulo["Quarto em república · Barão Geraldo"]
    assert republica["preco"] == 850 and republica["bairro"] == "Barão Geraldo"
    assert republica["endereco"] == "R. Benedito Alves Aranha, 450 · Barão Geraldo"
    assert por_titulo["Kitnet mobiliada · Cambuí"]["preco"] == 1200
    assert por_titulo["Quarto casa compartilhada · Sousas"]["preco"] == 720
    assert por_titulo["Quarto suíte · Taquaral"]["preco"] == 980  # mesmos totais do mock do front


def test_match_da_marina_e_elegibilidade_de_chat(populado):
    db, _ = populado
    itens = {i["titulo"].split(" ·")[0]: i for i in mural(db, por_email(db, "morador@demo.com"))}
    republica = itens["Quarto em república"]
    assert republica["match"] == 100 and republica["elegibilidade"]["chat_liberado"] is True
    assert itens["Quarto suíte"]["match"] == 67 and itens["Quarto suíte"]["elegibilidade"]["limiar_ok"] is False
    kitnet = itens["Kitnet mobiliada"]
    assert kitnet["match"] == 33 and kitnet["elegibilidade"]["orcamento_ok"] is True  # 1200 <= 1200
    assert kitnet["elegibilidade"]["chat_liberado"] is False  # 33 < limiar 70


def test_perfis_diferentes_veem_matches_diferentes(populado):
    db, _ = populado
    rafael = {i["titulo"].split(" ·")[0]: i["match"] for i in mural(db, por_email(db, "morador2@demo.com"))}
    assert rafael["Kitnet mobiliada"] == 100  # LGBTQIA+ Safe, Vegetariano, Home Office
    assert rafael["Quarto em república"] == 33


def test_meus_imoveis_de_cada_locador(populado):
    db, _ = populado
    ana = rota.meus_imoveis(usuario=por_email(db, "locador@demo.com"), db=db)["items"]
    carlos = rota.meus_imoveis(usuario=por_email(db, "locador2@demo.com"), db=db)["items"]
    assert len(ana) == 3 and len(carlos) == 1
    assert db.get(Locador, por_email(db, "locador@demo.com").id_usuario).quantidade_imoveis_anunciados == 3


def test_stats_de_locatario_e_locador(populado):
    db, _ = populado
    marina = matches.stats(usuario=por_email(db, "morador@demo.com"), db=db)
    assert marina.imoveis_ativos == 4 and marina.favoritos == 1 and marina.match_medio == round((100 + 33 + 33 + 67) / 4)
    assert matches.stats(usuario=por_email(db, "locador@demo.com"), db=db).meus_anuncios == 3


def test_moradores_atuais_e_favoritos(populado):
    db, _ = populado
    assert db.query(IntegranteImovel).filter(IntegranteImovel.status_moradia == "ativo").count() == 3
    assert db.query(Like).count() == 2


def test_todos_os_imoveis_tem_endereco_tags_e_post_ativo(populado):
    db, _ = populado
    assert db.query(Post).filter(Post.status_anuncio == "ativo").count() == db.query(Imovel).count() == 4
    assert all(len(i["tags"]) == 3 for i in mural(db))


def test_catalogo_de_tags_bate_com_o_do_front():
    import re
    from pathlib import Path

    js = (Path(__file__).resolve().parents[2] / "frontend" / "js" / "tags-catalogo.js").read_text(encoding="utf-8")
    do_front = re.findall(r"^\s*'([^']+)',?\s*$", js, flags=re.M)
    assert seed_service.TAGS == do_front


def test_tags_dos_dados_existem_no_catalogo():
    usadas = {t for u in seed_service.USUARIOS for t in u["tags"]} | {t for i in seed_service.IMOVEIS for t in i["tags"]}
    assert usadas <= set(seed_service.TAGS)


def test_banco_e_remoto():
    assert seed_service.banco_e_remoto("localhost") is False
    assert seed_service.banco_e_remoto("127.0.0.1") is False
    assert seed_service.banco_e_remoto("") is False
    assert seed_service.banco_e_remoto("db.abcd.supabase.co") is True


# --- CLI --------------------------------------------------------------------


@pytest.fixture()
def cli_com_banco(db, monkeypatch):
    @contextmanager
    def sessao():
        yield db

    monkeypatch.setattr(cli, "SessionLocal", sessao)
    return db


def test_cli_roda_e_popula(cli_com_banco, monkeypatch, capsys):
    monkeypatch.setattr(cli.settings, "db_host", "localhost")
    assert cli.main(["--senha", SENHA]) == 0
    assert "imoveis: 4" in capsys.readouterr().out
    assert cli_com_banco.query(Usuario).count() == 8


def test_cli_recusa_banco_remoto_sem_confirmacao(cli_com_banco, monkeypatch, capsys):
    monkeypatch.setattr(cli.settings, "db_host", "db.abcd.supabase.co")
    assert cli.main(["--senha", SENHA]) == 1
    assert "--confirmar-banco-remoto" in capsys.readouterr().err
    assert cli_com_banco.query(Usuario).count() == 0  # nada foi inserido
    assert cli.main(["--senha", SENHA, "--confirmar-banco-remoto"]) == 0
    assert cli_com_banco.query(Usuario).count() == 8


@pytest.mark.parametrize("senha", ["curta", "x" * 73])
def test_cli_rejeita_senha_fora_do_limite(cli_com_banco, senha, capsys):
    assert cli.main(["--senha", senha]) == 2
    assert cli_com_banco.query(Usuario).count() == 0


def test_cli_usa_variavel_de_ambiente(cli_com_banco, monkeypatch):
    monkeypatch.setattr(cli.settings, "db_host", "localhost")
    monkeypatch.setenv("SEED_PASSWORD", "da-variavel-123")
    # o default de --senha é lido na criação do parser, a cada chamada de main()
    assert cli.main([]) == 0
    assert auth_service.authenticate_usuario(cli_com_banco, "morador@demo.com", "da-variavel-123") is not None
