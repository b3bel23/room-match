"""KAN-33: GET/PATCH/DELETE /me e troca de papel, contra o ORM (SQLite em memória)."""

import pytest
from fastapi import HTTPException

from app.api.v1 import users
from app.models.imovel import Imovel
from app.models.like import Like
from app.models.locador import Locador
from app.models.locatario import Locatario
from app.models.post import Post
from app.models.tag import Tag
from app.models.usuario import Usuario
from app.models.usuario_tag import UsuarioTag
from app.schemas.perfil import PerfilUpdate
from app.services import perfil_service as svc


def novo_usuario(db, email="ana@x.com", nome="Ana Souza"):
    usuario = Usuario(nome=nome, email=email, senha_hash="hash")
    db.add(usuario)
    db.commit()
    return usuario


def patch(db, usuario, **campos):
    return users.atualizar_meu_perfil(PerfilUpdate(**campos), usuario=usuario, db=db)


def codigo_do_erro(chamada):
    with pytest.raises(HTTPException) as erro:
        chamada()
    return erro.value.status_code


def test_perfil_de_usuario_novo_e_morador_zerado(db):
    perfil = users.meu_perfil(usuario=novo_usuario(db), db=db)
    assert perfil["papel"] == "Morador" and perfil["papel_schema"] == "locatario"
    assert perfil["iniciais"] == "AS" and perfil["email"] == "ana@x.com"
    assert perfil["tags"] == [] and perfil["orcamento_maximo"] == 0


def test_patch_campos_simples_e_foto_url(db):
    u = novo_usuario(db)
    perfil = patch(db, u, nome="Ana Maria", telefone="1999", foto_url="a.png", bio="oi")
    assert (perfil["nome"], perfil["telefone"], perfil["foto_url"], perfil["bio"]) == (
        "Ana Maria", "1999", "a.png", "oi",
    )
    assert u.foto_perfil == "a.png"


def test_patch_so_altera_o_que_foi_enviado(db):
    u = novo_usuario(db)
    patch(db, u, telefone="1999")
    perfil = patch(db, u, bio="nova")
    assert perfil["telefone"] == "1999" and perfil["nome"] == "Ana Souza"


def test_patch_ignora_id_e_senha(db):
    u = novo_usuario(db)
    patch(db, u, **{"id": 999, "senha": "novasenha", "nome": "Outra"})
    assert u.id_usuario != 999 and u.senha_hash == "hash"
    assert not hasattr(PerfilUpdate(**{"id": 1}), "id")


def test_patch_aceita_campos_sem_coluna_mas_nao_persiste(db):
    perfil = patch(db, novo_usuario(db), genero="F", faculdade="PUC")
    assert perfil["genero"] == "" and perfil["faculdade"] == ""


def test_email_em_minusculas_e_conflito(db):
    u = novo_usuario(db)
    outro = novo_usuario(db, "bia@x.com", "Bia")
    assert patch(db, u, email="NOVO@X.COM")["email"] == "novo@x.com"
    assert codigo_do_erro(lambda: patch(db, outro, email="novo@x.com")) == 409
    assert patch(db, u, email="novo@x.com")["email"] == "novo@x.com"  # o próprio e-mail não conflita


def test_tags_substitui_deduplica_e_reaproveita_tag(db):
    u = novo_usuario(db)
    perfil = patch(db, u, tags=["Pet Friendly", "Home Office", "Pet Friendly"])
    assert perfil["tags"] == ["Pet Friendly", "Home Office"]
    assert u.tags_convivencia == ["Pet Friendly", "Home Office"]
    perfil = patch(db, u, tags=["Home Office", "Vegetariano"])
    assert sorted(perfil["tags"]) == ["Home Office", "Vegetariano"]
    assert db.query(Tag).filter(Tag.nome == "Home Office").count() == 1
    assert db.query(UsuarioTag).filter(UsuarioTag.id_usuario == u.id_usuario).count() == 2
    assert patch(db, u, tags=[])["tags"] == []


def test_tags_invalidas_sao_rejeitadas_pelo_schema():
    with pytest.raises(ValueError):
        PerfilUpdate(tags=["x" * 51])
    with pytest.raises(ValueError):
        PerfilUpdate(tags=["  "])


def test_limiar_e_orcamento_validados_pelo_schema():
    for invalido in ({"limiar_compatibilidade": 101}, {"orcamento_maximo": -1}):
        with pytest.raises(ValueError):
            PerfilUpdate(**invalido)


def test_virar_morador_cria_locatario_com_preferencias(db):
    u = novo_usuario(db)
    perfil = patch(db, u, papel="Morador", orcamento_maximo=1200, limiar_compatibilidade=70)
    assert perfil["orcamento_maximo"] == 1200 and perfil["limiar_compatibilidade"] == 70
    assert perfil["orcamento"] == 1200 and perfil["limiar"] == 70  # aliases
    assert db.get(Locatario, u.id_usuario) is not None


def test_aliases_legados_orcamento_e_limiar(db):
    u = novo_usuario(db)
    perfil = patch(db, u, papel="Morador", orcamento=900, limiar=50)
    assert perfil["orcamento_maximo"] == 900 and perfil["limiar_compatibilidade"] == 50


def test_preferencias_so_valem_para_morador(db):
    u = novo_usuario(db)
    patch(db, u, orcamento_maximo=500)  # ainda sem perfil de locatário
    assert db.get(Locatario, u.id_usuario) is None
    patch(db, u, papel="Locador", cpf_cnpj="111")
    assert patch(db, u, orcamento_maximo=500)["orcamento_maximo"] == 0


def test_limiar_preserva_outras_preferencias(db):
    u = novo_usuario(db)
    patch(db, u, papel="Morador")
    db.get(Locatario, u.id_usuario).preferencias_moradia = {"fumante": False}
    db.commit()
    patch(db, u, limiar_compatibilidade=60)
    assert db.get(Locatario, u.id_usuario).preferencias_moradia == {
        "fumante": False, "limiar_compatibilidade": 60,
    }


def test_morador_vira_locador_troca_o_registro(db):
    u = novo_usuario(db)
    patch(db, u, papel="Morador")
    perfil = patch(db, u, papel="Locador", cpf_cnpj="123.456.789-00")
    assert perfil["papel"] == "Locador" and perfil["papel_schema"] == "locador"
    assert db.get(Locatario, u.id_usuario) is None
    assert db.get(Locador, u.id_usuario).cpf_cnpj == "123.456.789-00"


def test_virar_locador_sem_cpf_da_422_e_nao_apaga_o_locatario(db):
    u = novo_usuario(db)
    patch(db, u, papel="Morador")
    assert codigo_do_erro(lambda: patch(db, u, papel="Locador")) == 422
    assert db.get(Locatario, u.id_usuario) is not None


def test_cpf_duplicado_da_409(db):
    a, b = novo_usuario(db), novo_usuario(db, "b@x.com", "Bia")
    patch(db, a, papel="Locador", cpf_cnpj="111")
    assert codigo_do_erro(lambda: patch(db, b, papel="Locador", cpf_cnpj="111")) == 409


def test_papel_invalido_da_400(db):
    assert codigo_do_erro(lambda: patch(db, novo_usuario(db), papel="Admin")) == 400


def test_locador_com_anuncio_nao_vira_morador(db):
    u = novo_usuario(db)
    patch(db, u, papel="Locador", cpf_cnpj="111")
    imovel = Imovel(valor_aluguel=1, tipo_imovel="Kitnet", quantidade_quartos=1, vagas_disponiveis=1)
    db.add(imovel)
    db.flush()
    db.add(Post(id_imovel=imovel.id_imovel, id_locador=u.id_usuario, titulo="Kit"))
    db.commit()
    assert codigo_do_erro(lambda: patch(db, u, papel="Morador")) == 409
    assert db.get(Locador, u.id_usuario) is not None  # nada foi perdido
    assert patch(db, u)["papel"] == "Locador"  # a sessão continua utilizável


def test_morador_com_favorito_nao_vira_locador(db):
    dono = novo_usuario(db, "dono@x.com", "Dono")
    patch(db, dono, papel="Locador", cpf_cnpj="999")
    imovel = Imovel(valor_aluguel=1, tipo_imovel="Kitnet", quantidade_quartos=1, vagas_disponiveis=1)
    db.add(imovel)
    db.flush()
    post = Post(id_imovel=imovel.id_imovel, id_locador=dono.id_usuario, titulo="Kit")
    db.add(post)
    u = novo_usuario(db)
    patch(db, u, papel="Morador")
    db.flush()
    db.add(Like(id_post=post.id_post, id_locatario=u.id_usuario))
    db.commit()
    assert codigo_do_erro(lambda: patch(db, u, papel="Locador", cpf_cnpj="111")) == 409
    assert db.get(Locatario, u.id_usuario) is not None


def test_excluir_conta_remove_tudo(db):
    u = novo_usuario(db)
    patch(db, u, papel="Morador", tags=["Pet Friendly"])
    id_usuario = u.id_usuario
    users.excluir_minha_conta(usuario=u, db=db)
    assert db.get(Usuario, id_usuario) is None
    assert db.get(Locatario, id_usuario) is None
    assert db.query(UsuarioTag).count() == 0


def test_excluir_conta_com_vinculos_da_409_e_preserva(db):
    u = novo_usuario(db)
    patch(db, u, papel="Locador", cpf_cnpj="111")
    imovel = Imovel(valor_aluguel=1, tipo_imovel="Kitnet", quantidade_quartos=1, vagas_disponiveis=1)
    db.add(imovel)
    db.flush()
    db.add(Post(id_imovel=imovel.id_imovel, id_locador=u.id_usuario, titulo="Kit"))
    db.commit()
    assert codigo_do_erro(lambda: users.excluir_minha_conta(usuario=u, db=db)) == 409
    assert db.get(Usuario, u.id_usuario) is not None


def test_iniciais():
    assert svc.iniciais("Ana Souza Lima") == "AS"
    assert svc.iniciais("ana") == "A"
    assert svc.iniciais("") == ""


def test_fluxo_com_token_jwt_real(db):
    """token -> get_current_user (KAN-32) -> GET/PATCH /me."""
    from app.api.deps import get_current_user
    from app.core.security import create_access_token

    u = novo_usuario(db)
    token = create_access_token(u.id_usuario)
    logado = get_current_user(token=token, db=db)
    assert logado.id_usuario == u.id_usuario
    assert users.meu_perfil(usuario=logado, db=db)["email"] == "ana@x.com"
    assert codigo_do_erro(lambda: get_current_user(token="lixo", db=db)) == 401
    db.delete(u)
    db.commit()
    assert codigo_do_erro(lambda: get_current_user(token=token, db=db)) == 401  # usuário apagado
