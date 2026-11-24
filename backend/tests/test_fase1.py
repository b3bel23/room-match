"""Favoritos, chat e senha, pela API (contrato de frontend/js/mock-api.js)."""

from datetime import date, timedelta

import pytest

from app.services import email_service
from tests.conftest import cadastrar, entrar

API = "/api/v1"


@pytest.fixture()
def cenario(client):
    """Locador com um anúncio de R$ 1000 com tags Aceita Animais e Silêncio Noturno,
    e uma moradora com as mesmas tags, orçamento 1500 e limiar 50."""
    loc = cadastrar(client, "loc@x.com", papel="Locador")
    r = client.post(
        f"{API}/imoveis",
        headers=loc,
        json={
            "titulo": "Quarto Cambuí",
            "tipo": "Kitnet",
            "rua": "Rua A",
            "numero": "10",
            "bairro": "Cambuí",
            "aluguel": 900,
            "contas": 100,
            "tags": ["Aceita Animais", "Silêncio Noturno"],
        },
    )
    assert r.status_code == 201, r.text
    mor = cadastrar(client, "mor@x.com")
    return {"loc": loc, "mor": mor, "imovel": r.json()["id"]}


# --- favoritos ---------------------------------------------------------------


def test_favoritar_alterna_e_lista(client, cenario):
    mor, i = cenario["mor"], cenario["imovel"]
    assert client.get(f"{API}/favoritos", headers=mor).json() == {"items": [], "ids": []}
    r = client.post(f"{API}/favoritos/{i}", headers=mor).json()
    assert r == {"favorito": True, "ids": [i]}
    lista = client.get(f"{API}/favoritos", headers=mor).json()
    assert lista["ids"] == [i] and lista["items"][0]["match"] == 100
    assert client.post(f"{API}/favoritos/{i}", headers=mor).json()["favorito"] is False
    client.post(f"{API}/favoritos/{i}", headers=mor)
    assert client.delete(f"{API}/favoritos/{i}", headers=mor).json()["ids"] == []


def test_favoritos_so_morador_e_imovel_existente(client, cenario):
    assert client.get(f"{API}/favoritos", headers=cenario["loc"]).status_code == 403
    assert client.post(f"{API}/favoritos/999", headers=cenario["mor"]).status_code == 404
    assert client.get(f"{API}/favoritos").status_code == 401


def test_favorito_some_quando_anuncio_e_removido(client, cenario):
    mor, i = cenario["mor"], cenario["imovel"]
    client.post(f"{API}/favoritos/{i}", headers=mor)
    assert client.delete(f"{API}/imoveis/{i}", headers=cenario["loc"]).status_code == 204
    assert client.get(f"{API}/favoritos", headers=mor).json()["ids"] == []


# --- chat --------------------------------------------------------------------


def test_chat_abre_conversa_e_troca_mensagens(client, cenario):
    mor, loc, i = cenario["mor"], cenario["loc"], cenario["imovel"]
    r = client.post(f"{API}/conversas", headers=mor, json={"imovel_id": i})
    assert r.status_code == 200, r.text
    conv = r.json()
    assert conv["imovel_id"] == i and conv["outro"]["papel"] == "Locador"
    assert "email" not in conv["outro"] and "telefone" not in conv["outro"]
    assert conv["mensagens"][0]["minha"] is True
    # abrir de novo reaproveita a conversa
    assert client.post(f"{API}/conversas", headers=mor, json={"imovel_id": i}).json()["id"] == conv["id"]

    lista_loc = client.get(f"{API}/conversas", headers=loc).json()["items"]
    assert [c["id"] for c in lista_loc] == [conv["id"]] and lista_loc[0]["nao_lidas"] == 1
    resp = client.post(f"{API}/conversas/{conv['id']}/mensagens", headers=loc, json={"texto": "Oi!"}).json()
    assert resp["mensagens"][-1] == {**resp["mensagens"][-1], "texto": "Oi!", "minha": True}
    assert client.get(f"{API}/conversas/{conv['id']}", headers=loc).json()["nao_lidas"] == 0
    do_morador = client.get(f"{API}/conversas/{conv['id']}", headers=mor).json()
    assert do_morador["mensagens"][-1]["minha"] is False and do_morador["ultima_mensagem"] == "Oi!"


def test_chat_bloqueado_por_limiar_e_orcamento(client, cenario):
    i = cenario["imovel"]
    caro = cadastrar(client, "pobre@x.com", orcamento_maximo=500, tags=["Festas"], limiar_compatibilidade=70)
    r = client.post(f"{API}/conversas", headers=caro, json={"imovel_id": i})
    assert r.status_code == 403
    assert "abaixo do limiar 70%" in r.json()["detail"] and "acima do orçamento" in r.json()["detail"]


def test_chat_so_participantes(client, cenario):
    conv = client.post(f"{API}/conversas", headers=cenario["mor"], json={"imovel_id": cenario["imovel"]}).json()
    intruso = cadastrar(client, "intruso@x.com")
    assert client.get(f"{API}/conversas/{conv['id']}", headers=intruso).status_code == 404
    assert client.post(f"{API}/conversas/{conv['id']}/mensagens", headers=intruso, json={"texto": "x"}).status_code == 404
    assert client.post(f"{API}/conversas/{conv['id']}/mensagens", headers=cenario["mor"], json={"texto": "  "}).status_code == 400
    assert client.post(f"{API}/conversas", headers=cenario["loc"], json={"imovel_id": cenario["imovel"]}).status_code == 400


# --- senha -------------------------------------------------------------------


def test_trocar_senha(client):
    h = cadastrar(client)
    assert client.post(f"{API}/me/senha", headers=h, json={"senha_atual": "errada123", "senha_nova": "nova12345"}).status_code == 400
    assert client.post(f"{API}/me/senha", headers=h, json={"senha_atual": "senha12345", "senha_nova": "nova12345"}).json() == {"ok": True}
    entrar(client, "ana@x.com", "nova12345")


def test_recuperar_e_redefinir_senha(client):
    cadastrar(client)
    email_service.ENVIADOS.clear()
    r1 = client.post(f"{API}/auth/recuperar", json={"email": "ana@x.com"}).json()
    r2 = client.post(f"{API}/auth/recuperar", json={"email": "ninguem@x.com"}).json()
    assert r1 == r2  # não revela se a conta existe
    assert len(email_service.ENVIADOS) == 1
    token = email_service.ENVIADOS[0]["texto"].split("token=")[1].split()[0]
    # token de redefinição não serve como login
    assert client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401
    assert client.post(f"{API}/auth/redefinir", json={"token": token, "senha_nova": "outra12345"}).status_code == 200
    entrar(client, "ana@x.com", "outra12345")
    # o mesmo link não funciona duas vezes
    assert client.post(f"{API}/auth/redefinir", json={"token": token, "senha_nova": "mais12345"}).status_code == 400


def test_anuncio_pausado_so_o_dono_ve_o_detalhe(client, cenario):
    i, loc = cenario["imovel"], cenario["loc"]
    assert client.patch(f"{API}/imoveis/{i}", headers=loc, json={"status_anuncio": "pausado"}).status_code == 200
    assert client.get(f"{API}/imoveis/{i}").status_code == 404
    assert client.get(f"{API}/imoveis/{i}", headers=cenario["mor"]).status_code == 404
    assert client.get(f"{API}/imoveis/{i}", headers=loc).json()["status_anuncio"] == "pausado"


def test_cadastro_grava_dados_de_perfil(client):
    h = cadastrar(client, genero="Não-binário", ocupacao="Estudante", emprego="Estágio", faculdade="PUC-Campinas")
    me = client.get(f"{API}/me", headers=h).json()
    assert (me["genero"], me["ocupacao"], me["emprego"], me["faculdade"]) == (
        "Não-binário", "Estudante", "Estágio", "PUC-Campinas",
    )
    assert me["limiar_compatibilidade"] == 50


def test_morador_vira_locador_pelo_patch_com_cpf(client):
    h = cadastrar(client)
    assert client.patch(f"{API}/me", headers=h, json={"papel": "Locador"}).status_code == 422
    r = client.patch(f"{API}/me", headers=h, json={"papel": "Locador", "cpf_cnpj": "123.456.789-00"})
    assert r.status_code == 200 and r.json()["papel"] == "Locador"
