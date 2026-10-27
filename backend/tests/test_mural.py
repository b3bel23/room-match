"""Mural de imóveis: formato do JSON e filtros espelham frontend/js/mock-api.js."""

from decimal import Decimal
from types import SimpleNamespace as NS

from app.services.mural_service import filtrar_imoveis, limiar_do_locatario, montar_imovel

TAGS_USER = ["Pet Friendly", "Silêncio Noturno", "Home Office"]


def _post(**over):
    imovel = NS(
        id_imovel=1,
        tipo_imovel="República",
        valor_aluguel=Decimal("600"),
        valor_condominio=Decimal("120"),
        valor_iptu=Decimal("45"),
        valor_contas_extras=Decimal("85"),
        area_m2=Decimal("12.5"),
        descricao="desc do imóvel",
        vagas_disponiveis=1,
        quantidade_quartos=1,
        endereco=NS(rua="R. Benedito", numero="450", bairro="Barão Geraldo", cidade="Campinas"),
        imagens=[NS(url_imagem="2.jpg", ordem_exibicao=2), NS(url_imagem="1.jpg", ordem_exibicao=1)],
    )
    base = dict(id_post=10, id_locador=5, titulo="Quarto em república", descricao=None, imovel=imovel)
    base.update(over)
    return NS(**base)


def test_preco_e_soma_de_aluguel_condominio_iptu_e_contas():
    item = montar_imovel(_post(), [], [], None)
    assert item["preco"] == 850
    assert (item["aluguel"], item["condominio"], item["iptu"], item["contas"]) == (600, 120, 45, 85)


def test_fotos_ordenadas_e_capa():
    item = montar_imovel(_post(), [], [], None)
    assert item["fotos"] == ["1.jpg", "2.jpg"]
    assert item["capa"] == "1.jpg"


def test_campos_basicos_e_endereco():
    item = montar_imovel(_post(), ["Pet Friendly"], [], None)
    assert item["id"] == 1 and item["id_post"] == 10 and item["locador_id"] == 5
    assert item["bairro"] == "Barão Geraldo" and item["cidade"] == "Campinas"
    assert item["endereco"] == "R. Benedito, 450 · Barão Geraldo"
    assert item["descricao"] == "desc do imóvel"  # post sem descrição cai na do imóvel
    assert item["tags"] == ["Pet Friendly"]


def test_sem_endereco_nem_fotos():
    post = _post()
    post.imovel.endereco = None
    post.imovel.imagens = []
    item = montar_imovel(post, [], [], None)
    assert item["bairro"] is None and item["endereco"] is None
    assert item["capa"] is None and item["fotos"] == []


def test_visitante_tem_match_zero_e_sem_elegibilidade():
    item = montar_imovel(_post(), ["Pet Friendly"], [], None)
    assert item["match"] == item["match_percent"] == 0
    assert item["elegibilidade"] is None


def test_locatario_recebe_match_tags_e_elegibilidade():
    locatario = NS(orcamento_maximo=Decimal("1200"), preferencias_moradia={"limiar_compatibilidade": 70})
    item = montar_imovel(
        _post(), ["Pet Friendly", "Silêncio Noturno", "Home Office"], TAGS_USER, locatario
    )
    assert item["match_percent"] == 100
    assert item["tags_correspondentes"] == ["Pet Friendly", "Silêncio Noturno", "Home Office"]
    eleg = item["elegibilidade"]
    assert eleg["chat_liberado"] is True
    assert eleg["limiar_compatibilidade"] == eleg["limiar"] == 70
    assert eleg["orcamento_maximo"] == eleg["orcamento"] == 1200


def test_chat_bloqueado_por_orcamento_ou_limiar():
    caro = NS(orcamento_maximo=Decimal("800"), preferencias_moradia=None)
    assert montar_imovel(_post(), ["Pet Friendly"], ["Pet Friendly"], caro)["elegibilidade"][
        "chat_liberado"
    ] is False
    exigente = NS(orcamento_maximo=Decimal("0"), preferencias_moradia={"limiar_compatibilidade": 90})
    eleg = montar_imovel(_post(), ["Home Office"], TAGS_USER, exigente)["elegibilidade"]
    assert eleg["match"] == 33 and eleg["limiar_ok"] is False and eleg["chat_liberado"] is False


def test_limiar_do_locatario():
    assert limiar_do_locatario(None) is None
    assert limiar_do_locatario(NS(preferencias_moradia=None)) is None
    assert limiar_do_locatario(NS(preferencias_moradia={"limiar": 55})) == 55.0


# --- filtros (mesma semântica de filtrarImoveis no mock) ---

CATALOGO = [
    {"titulo": "Quarto em república · Barão Geraldo", "tipo": "República", "bairro": "Barão Geraldo",
     "cidade": "Campinas", "endereco": "R. Benedito · Barão Geraldo", "preco": 850,
     "tags": ["Pet Friendly", "Silêncio Noturno"]},
    {"titulo": "Kitnet mobiliada · Cambuí", "tipo": "Kitnet", "bairro": "Cambuí",
     "cidade": "Campinas", "endereco": None, "preco": 1200, "tags": ["Home Office"]},
    {"titulo": "Suíte · Taquaral", "tipo": "Apartamento", "bairro": "Taquaral",
     "cidade": "Campinas", "endereco": None, "preco": 1500, "tags": ["Vegetariano"]},
]


def _titulos(itens):
    return [i["titulo"].split(" ·")[0] for i in itens]


def test_sem_filtros_devolve_tudo():
    assert len(filtrar_imoveis(CATALOGO)) == 3


def test_filtro_tipo_e_todos():
    assert _titulos(filtrar_imoveis(CATALOGO, tipo="Kitnet")) == ["Kitnet mobiliada"]
    assert _titulos(filtrar_imoveis(CATALOGO, tipo="todos")) == _titulos(CATALOGO)
    assert _titulos(filtrar_imoveis(CATALOGO, tipo="Apart.")) == ["Suíte"]


def test_filtro_bairro_busca_em_titulo_bairro_e_endereco():
    assert len(filtrar_imoveis(CATALOGO, bairro="cambuí")) == 1
    assert len(filtrar_imoveis(CATALOGO, bairro="benedito")) == 1
    assert len(filtrar_imoveis(CATALOGO, bairro="campinas")) == 3


def test_filtro_tag_ignora_caixa_e_aceita_parte():
    assert len(filtrar_imoveis(CATALOGO, tag="pet friendly")) == 1
    assert len(filtrar_imoveis(CATALOGO, tag="Silêncio")) == 1  # alias -> "silêncio noturno"
    assert filtrar_imoveis(CATALOGO, tag="420 Friendly") == []


def test_filtro_preco_max_inclui_o_limite():
    assert len(filtrar_imoveis(CATALOGO, preco_max=1200)) == 2
    assert len(filtrar_imoveis(CATALOGO, preco_max=0)) == 3  # 0 = sem limite


def test_filtros_combinados():
    assert _titulos(filtrar_imoveis(CATALOGO, bairro="campinas", preco_max=1200, tag="home")) == [
        "Kitnet mobiliada"
    ]
