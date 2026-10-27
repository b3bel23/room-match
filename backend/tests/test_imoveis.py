"""KAN-34: CRUD de anúncios e upload de fotos, contra o ORM (SQLite em memória)."""

import io
from types import SimpleNamespace as NS

import pytest
from fastapi import HTTPException
from starlette.datastructures import UploadFile

from app.api.v1 import imoveis as rota
from app.api.v1 import matches
from app.models.carrossel_imagem import CarrosselImagem
from app.models.endereco_imovel import EnderecoImovel
from app.models.imovel import Imovel
from app.models.imovel_tag import ImovelTag
from app.models.locador import Locador
from app.models.locatario import Locatario
from app.models.post import Post
from app.models.usuario import Usuario
from app.schemas.anuncio import AnuncioCreate, AnuncioUpdate
from app.services import imovel_service as svc

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32
JPG = b"\xff\xd8\xff\xe0" + b"0" * 32
WEBP = b"RIFF\x00\x00\x00\x00WEBP" + b"0" * 32


def novo_usuario(db, email, nome="Pessoa"):
    usuario = Usuario(nome=nome, email=email, senha_hash="h")
    db.add(usuario)
    db.commit()
    return usuario


def novo_locador(db, email="loc@x.com", cpf="111"):
    usuario = novo_usuario(db, email, "Locador")
    db.add(Locador(id_locador=usuario.id_usuario, cpf_cnpj=cpf))
    db.commit()
    return usuario


def novo_morador(db, email="mor@x.com", tags=None):
    usuario = novo_usuario(db, email, "Morador")
    usuario.tags_convivencia = tags
    db.add(Locatario(id_locatario=usuario.id_usuario, orcamento_maximo=0))
    db.commit()
    return usuario


DADOS = dict(
    titulo="Quarto em república",
    tipo="República",
    endereco="R. Benedito Alves Aranha, 450 · Barão Geraldo",
    bairro="Barão Geraldo",
    aluguel="600",
    condominio="120",
    iptu="45",
    contas="85",
    tags=["Pet Friendly", "Home Office"],
    classificacao="Mista",
)


def publicar(db, usuario, **sobrescrever):
    return rota.publicar_imovel(AnuncioCreate(**{**DADOS, **sobrescrever}), usuario=usuario, db=db)


def erro(chamada):
    with pytest.raises(HTTPException) as e:
        chamada()
    return e.value.status_code


# --- endereço ---------------------------------------------------------------


def test_endereco_texto_livre_com_numero_e_bairro():
    r = svc.resolver_endereco(AnuncioCreate(titulo="t", aluguel=1, endereco="R. Benedito, 450 · Barão Geraldo"))
    assert (r["rua"], r["numero"], r["bairro"]) == ("R. Benedito", "450", "Barão Geraldo")
    assert (r["cidade"], r["estado"]) == ("Campinas", "SP")


def test_endereco_texto_sem_numero_e_sem_separador():
    r = svc.resolver_endereco(AnuncioCreate(titulo="t", aluguel=1, endereco="Rua das Flores", bairro="Cambuí"))
    assert (r["rua"], r["numero"], r["bairro"]) == ("Rua das Flores", None, "Cambuí")


def test_endereco_estruturado_tem_prioridade_e_estado_em_maiusculas():
    dados = AnuncioCreate(
        titulo="t", aluguel=1, rua="Av. Brasil", numero="10", bairro="Centro",
        cidade="Valinhos", estado="sp", cep="13270-000", latitude=-22.9, longitude=-47.0,
        endereco="Outra Rua, 1 · Outro Bairro",
    )
    r = svc.resolver_endereco(dados)
    assert (r["rua"], r["numero"], r["bairro"], r["cidade"], r["estado"]) == (
        "Av. Brasil", "10", "Centro", "Valinhos", "SP",
    )
    assert r["latitude"] == -22.9


def test_endereco_sem_rua_ou_sem_bairro_da_422():
    assert erro(lambda: svc.resolver_endereco(AnuncioCreate(titulo="t", aluguel=1, bairro="Centro"))) == 422
    assert erro(lambda: svc.resolver_endereco(AnuncioCreate(titulo="t", aluguel=1, rua="Rua X"))) == 422


# --- validação do corpo -----------------------------------------------------


def test_valores_em_branco_viram_zero_e_numeros_em_texto_sao_aceitos():
    d = AnuncioCreate(titulo="t", aluguel="850", condominio="", iptu=None, contas="  ")
    assert (d.aluguel, d.condominio, d.iptu, d.contas) == (850, 0, 0, 0)


@pytest.mark.parametrize("invalido", [{"aluguel": 0}, {"aluguel": -5}, {"titulo": ""}, {"estado": "SPP"},
                                      {"quartos": 0}, {"latitude": 100}, {"tags": ["x" * 51]}])
def test_corpo_invalido_e_rejeitado(invalido):
    base = {"titulo": "t", "aluguel": 100}
    with pytest.raises(ValueError):
        AnuncioCreate(**{**base, **invalido})


def test_status_anuncio_so_aceita_ativo_ou_pausado():
    assert AnuncioUpdate(status_anuncio="pausado").status_anuncio == "pausado"
    with pytest.raises(ValueError):
        AnuncioUpdate(status_anuncio="removido")


# --- publicar ---------------------------------------------------------------


def test_publicar_cria_imovel_endereco_post_tags_e_contador(db):
    dono = novo_locador(db)
    item = publicar(db, dono)
    assert item["preco"] == 850 and item["aluguel"] == 600
    assert item["tipo"] == "República" and item["titulo"] == "Quarto em república"
    assert item["bairro"] == "Barão Geraldo" and item["cidade"] == "Campinas"
    assert item["endereco"] == "R. Benedito Alves Aranha, 450 · Barão Geraldo"
    assert sorted(item["tags"]) == ["Home Office", "Pet Friendly"]
    assert item["locador_id"] == dono.id_usuario and item["fotos"] == []
    assert db.query(Imovel).count() == db.query(EnderecoImovel).count() == db.query(Post).count() == 1
    assert db.query(ImovelTag).count() == 2
    assert db.get(Locador, dono.id_usuario).quantidade_imoveis_anunciados == 1


def test_publicar_usa_padroes_quando_faltam_campos_opcionais(db):
    item = publicar(db, novo_locador(db), tags=None, condominio=None, tipo=None)
    imovel = db.query(Imovel).one()
    assert (imovel.quantidade_quartos, imovel.vagas_disponiveis, imovel.tipo_imovel) == (1, 1, "República")
    assert item["tags"] == [] and item["condominio"] == 0


def test_publicar_exige_locador(db):
    assert erro(lambda: publicar(db, novo_morador(db))) == 403
    assert erro(lambda: publicar(db, novo_usuario(db, "sem@x.com"))) == 403
    assert db.query(Imovel).count() == 0


def test_publicar_com_endereco_invalido_nao_deixa_lixo_no_banco(db):
    dono = novo_locador(db)
    with pytest.raises(HTTPException):
        rota.publicar_imovel(AnuncioCreate(titulo="t", aluguel=100), usuario=dono, db=db)
    assert db.query(Imovel).count() == db.query(Post).count() == 0


# --- listar / meus ----------------------------------------------------------


def test_meus_imoveis_so_do_dono_e_sem_removidos(db):
    a, b = novo_locador(db, "a@x.com", "1"), novo_locador(db, "b@x.com", "2")
    publicar(db, a, titulo="A1")
    removido = publicar(db, a, titulo="A2")
    publicar(db, b, titulo="B1")
    rota.remover_imovel(removido["id"], usuario=a, db=db)
    assert [i["titulo"] for i in rota.meus_imoveis(usuario=a, db=db)["items"]] == ["A1"]
    assert [i["titulo"] for i in rota.meus_imoveis(usuario=b, db=db)["items"]] == ["B1"]
    assert erro(lambda: rota.meus_imoveis(usuario=novo_morador(db), db=db)) == 403


def test_novo_anuncio_aparece_no_mural_e_calcula_match(db):
    publicar(db, novo_locador(db))
    visitante = matches.listar_imoveis(tipo="", bairro="", q="", preco_max=0, tag="", usuario=None, db=db)
    assert [i["match"] for i in visitante["items"]] == [0]
    morador = novo_morador(db, tags=["Pet Friendly", "Festas"])
    item = matches.listar_imoveis(tipo="", bairro="", q="", preco_max=0, tag="", usuario=morador, db=db)["items"][0]
    assert item["match"] == 50 and item["tags_correspondentes"] == ["Pet Friendly"]
    assert matches.detalhe_imovel(item["id"], usuario=None, db=db)["titulo"] == "Quarto em república"


# --- editar -----------------------------------------------------------------


def test_editar_valores_recalcula_o_preco(db):
    dono = novo_locador(db)
    id_imovel = publicar(db, dono)["id"]
    item = rota.editar_imovel(
        id_imovel, AnuncioUpdate(aluguel="700", condominio="", contas=100), usuario=dono, db=db
    )
    assert item["aluguel"] == 700 and item["contas"] == 100 and item["iptu"] == 45
    assert item["condominio"] == 0  # "" zera, como no mock
    assert item["preco"] == 700 + 0 + 45 + 100


def test_editar_titulo_tags_e_endereco_preservando_o_resto(db):
    dono = novo_locador(db)
    id_imovel = publicar(db, dono)["id"]
    item = rota.editar_imovel(
        id_imovel, AnuncioUpdate(titulo="Novo", tags=["Vegetariano"], bairro="Cambuí"), usuario=dono, db=db
    )
    assert item["titulo"] == "Novo" and item["tags"] == ["Vegetariano"]
    assert item["bairro"] == "Cambuí" and item["endereco"].startswith("R. Benedito Alves Aranha, 450")
    assert item["aluguel"] == 600  # não enviado: intacto


def test_editar_endereco_em_texto_livre_substitui_rua_e_bairro(db):
    dono = novo_locador(db)
    id_imovel = publicar(db, dono)["id"]
    item = rota.editar_imovel(
        id_imovel, AnuncioUpdate(endereco="Rua Nova, 9 · Taquaral"), usuario=dono, db=db
    )
    assert item["endereco"] == "Rua Nova, 9 · Taquaral" and item["bairro"] == "Taquaral"


def test_editar_so_o_dono_pode(db):
    dono, outro = novo_locador(db, "a@x.com", "1"), novo_locador(db, "b@x.com", "2")
    id_imovel = publicar(db, dono)["id"]
    assert erro(lambda: rota.editar_imovel(id_imovel, AnuncioUpdate(titulo="x"), usuario=outro, db=db)) == 403
    assert erro(lambda: rota.editar_imovel(id_imovel, AnuncioUpdate(titulo="x"), usuario=novo_morador(db), db=db)) == 403
    assert erro(lambda: rota.editar_imovel(999, AnuncioUpdate(titulo="x"), usuario=dono, db=db)) == 404
    assert db.query(Post).one().titulo == "Quarto em república"


def test_pausar_tira_do_mural_mas_continua_em_meus(db):
    dono = novo_locador(db)
    id_imovel = publicar(db, dono)["id"]
    rota.editar_imovel(id_imovel, AnuncioUpdate(status_anuncio="pausado"), usuario=dono, db=db)
    mural = matches.listar_imoveis(tipo="", bairro="", q="", preco_max=0, tag="", usuario=None, db=db)
    assert mural["items"] == []
    assert len(rota.meus_imoveis(usuario=dono, db=db)["items"]) == 1
    rota.editar_imovel(id_imovel, AnuncioUpdate(status_anuncio="ativo"), usuario=dono, db=db)
    assert len(matches.listar_imoveis(tipo="", bairro="", q="", preco_max=0, tag="", usuario=None, db=db)["items"]) == 1


# --- remover ----------------------------------------------------------------


def test_remover_e_logico_some_de_todo_lugar_e_ajusta_contador(db):
    dono = novo_locador(db)
    id_imovel = publicar(db, dono)["id"]
    rota.remover_imovel(id_imovel, usuario=dono, db=db)
    assert db.query(Post).one().status_anuncio == "removido"  # a linha continua no banco
    assert db.get(Imovel, id_imovel).status_disponibilidade == "indisponivel"
    assert db.get(Locador, dono.id_usuario).quantidade_imoveis_anunciados == 0
    assert matches.listar_imoveis(tipo="", bairro="", q="", preco_max=0, tag="", usuario=None, db=db)["items"] == []
    assert erro(lambda: matches.detalhe_imovel(id_imovel, usuario=None, db=db)) == 404
    assert erro(lambda: rota.remover_imovel(id_imovel, usuario=dono, db=db)) == 404  # já removido


def test_remover_so_o_dono(db):
    dono, outro = novo_locador(db, "a@x.com", "1"), novo_locador(db, "b@x.com", "2")
    id_imovel = publicar(db, dono)["id"]
    assert erro(lambda: rota.remover_imovel(id_imovel, usuario=outro, db=db)) == 403
    assert db.query(Post).one().status_anuncio == "ativo"


# --- fotos ------------------------------------------------------------------


@pytest.fixture()
def uploads(tmp_path, monkeypatch):
    pasta = tmp_path.resolve()
    monkeypatch.setattr(svc, "UPLOAD_DIR", pasta)
    return pasta


def arquivo(conteudo, nome="foto.jpg"):
    return UploadFile(file=io.BytesIO(conteudo), filename=nome)


def test_detectar_extensao_pelos_bytes():
    assert svc.detectar_extensao(JPG) == "jpg"
    assert svc.detectar_extensao(PNG) == "png"
    assert svc.detectar_extensao(WEBP) == "webp"
    assert svc.detectar_extensao(b"GIF89a....") is None
    assert svc.detectar_extensao(b"<html>") is None
    assert svc.detectar_extensao(b"") is None


def test_enviar_fotos_grava_arquivos_e_devolve_urls_em_ordem(db, uploads):
    dono = novo_locador(db)
    id_imovel = publicar(db, dono)["id"]
    item = rota.enviar_fotos(id_imovel, fotos=[arquivo(JPG), arquivo(PNG, "b.png")], usuario=dono, db=db)
    assert len(item["fotos"]) == 2 and item["capa"] == item["fotos"][0]
    assert item["fotos"][0].startswith(f"/uploads/imoveis/{id_imovel}/") and item["fotos"][0].endswith(".jpg")
    assert item["fotos"][1].endswith(".png")
    assert len(list((uploads / "imoveis" / str(id_imovel)).iterdir())) == 2
    item = rota.enviar_fotos(id_imovel, fotos=[arquivo(WEBP)], usuario=dono, db=db)
    assert len(item["fotos"]) == 3 and item["fotos"][2].endswith(".webp")  # entra no fim


def test_enviar_fotos_rejeita_tipo_invalido_sem_gravar_nada(db, uploads):
    dono = novo_locador(db)
    id_imovel = publicar(db, dono)["id"]
    assert erro(lambda: rota.enviar_fotos(id_imovel, fotos=[arquivo(JPG), arquivo(b"<script>", "x.jpg")], usuario=dono, db=db)) == 415
    assert db.query(CarrosselImagem).count() == 0
    assert not (uploads / "imoveis").exists()  # nem a primeira (válida) foi gravada


def test_enviar_fotos_limites_de_tamanho_quantidade_e_vazio(db, uploads):
    dono = novo_locador(db)
    id_imovel = publicar(db, dono)["id"]
    grande = JPG + b"0" * svc.MAX_BYTES_FOTO
    assert erro(lambda: rota.enviar_fotos(id_imovel, fotos=[arquivo(grande)], usuario=dono, db=db)) == 413
    assert erro(lambda: rota.enviar_fotos(id_imovel, fotos=[], usuario=dono, db=db)) == 400
    rota.enviar_fotos(id_imovel, fotos=[arquivo(JPG) for _ in range(svc.MAX_FOTOS)], usuario=dono, db=db)
    assert erro(lambda: rota.enviar_fotos(id_imovel, fotos=[arquivo(JPG)], usuario=dono, db=db)) == 400
    assert db.query(CarrosselImagem).count() == svc.MAX_FOTOS


def test_enviar_fotos_so_o_dono_locador(db, uploads):
    dono, outro = novo_locador(db, "a@x.com", "1"), novo_locador(db, "b@x.com", "2")
    id_imovel = publicar(db, dono)["id"]
    assert erro(lambda: rota.enviar_fotos(id_imovel, fotos=[arquivo(JPG)], usuario=outro, db=db)) == 403
    assert erro(lambda: rota.enviar_fotos(id_imovel, fotos=[arquivo(JPG)], usuario=novo_morador(db), db=db)) == 403
    assert erro(lambda: rota.enviar_fotos(999, fotos=[arquivo(JPG)], usuario=dono, db=db)) == 404
    assert db.query(CarrosselImagem).count() == 0


def test_remover_foto_apaga_registro_e_arquivo(db, uploads):
    dono = novo_locador(db)
    id_imovel = publicar(db, dono)["id"]
    item = rota.enviar_fotos(id_imovel, fotos=[arquivo(JPG), arquivo(PNG)], usuario=dono, db=db)
    primeira = item["fotos_ids"][0]
    item = rota.remover_foto(id_imovel, primeira, usuario=dono, db=db)
    assert len(item["fotos"]) == 1 and primeira not in item["fotos_ids"]
    assert len(list((uploads / "imoveis" / str(id_imovel)).iterdir())) == 1


def test_remover_foto_de_outro_imovel_ou_inexistente_da_404(db, uploads):
    dono = novo_locador(db)
    a, b = publicar(db, dono, titulo="A")["id"], publicar(db, dono, titulo="B")["id"]
    foto_de_b = rota.enviar_fotos(b, fotos=[arquivo(JPG)], usuario=dono, db=db)["fotos_ids"][0]
    assert erro(lambda: rota.remover_foto(a, foto_de_b, usuario=dono, db=db)) == 404
    assert erro(lambda: rota.remover_foto(a, 9999, usuario=dono, db=db)) == 404
    assert db.query(CarrosselImagem).count() == 1


def test_remover_foto_nunca_apaga_fora_da_pasta_de_uploads(db, uploads, tmp_path):
    dono = novo_locador(db)
    id_imovel = publicar(db, dono)["id"]
    intocavel = tmp_path.parent / "nao_apagar.txt"
    intocavel.write_text("importante")
    db.add(CarrosselImagem(id_imovel=id_imovel, url_imagem="/uploads/../nao_apagar.txt", ordem_exibicao=1))
    db.commit()
    id_imagem = db.query(CarrosselImagem).one().id_imagem
    rota.remover_foto(id_imovel, id_imagem, usuario=dono, db=db)
    assert intocavel.exists()
    intocavel.unlink()


# --- rotas ------------------------------------------------------------------


def test_meus_vem_antes_de_imoveis_id_nas_rotas():
    from app.main import app

    caminhos = list(app.openapi()["paths"])
    assert caminhos.index("/imoveis/meus") < caminhos.index("/imoveis/{id_imovel}")


def test_nao_ha_get_duplicado_em_imoveis():
    from app.main import app

    gets = [r for r in app.openapi()["paths"].get("/imoveis", {}) if r == "get"]
    assert len(gets) == 1
