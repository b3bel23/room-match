"""Notificações, verificação de e-mail e rota pela API."""

import pytest

from app.services import email_service, mobilidade_service
from tests.conftest import cadastrar
from tests.test_fase1 import API, cenario  # noqa: F401  (fixture)
from tests.test_mobilidade_gtfs import PERTO_A, PERTO_E, rede  # noqa: F401  (fixture)


# --- notificações ------------------------------------------------------------


def _notificacoes(client, h):
    return client.get(f"{API}/notificacoes", headers=h).json()


def test_avisos_de_favorito_e_mensagem(client, cenario):
    mor, loc, i = cenario["mor"], cenario["loc"], cenario["imovel"]
    client.post(f"{API}/favoritos/{i}", headers=mor)
    conv = client.post(f"{API}/conversas", headers=mor, json={"imovel_id": i, "texto": "Oi, tudo bem?"}).json()

    avisos = _notificacoes(client, loc)
    assert avisos["nao_lidas"] == 2
    assert [n["tipo"] for n in avisos["items"]] == ["mensagem", "favorito"]
    assert avisos["items"][0]["link"] == f"mensagens.html?id={conv['id']}"
    assert "Oi, tudo bem?" in avisos["items"][0]["texto"]

    client.post(f"{API}/conversas/{conv['id']}/mensagens", headers=loc, json={"texto": "Tudo!"})
    do_morador = _notificacoes(client, mor)["items"]
    assert [n["tipo"] for n in do_morador] == ["mensagem"] and "Tudo!" in do_morador[0]["texto"]


def test_marcar_lidas(client, cenario):
    mor, loc, i = cenario["mor"], cenario["loc"], cenario["imovel"]
    client.post(f"{API}/favoritos/{i}", headers=mor)
    client.post(f"{API}/conversas", headers=mor, json={"imovel_id": i})
    itens = _notificacoes(client, loc)["items"]
    client.post(f"{API}/notificacoes/lidas", headers=loc, json={"ids": [itens[0]["id"]]})
    assert _notificacoes(client, loc)["nao_lidas"] == 1
    assert client.post(f"{API}/notificacoes/lidas", headers=loc, json={}).json()["marcadas"] == 1
    assert _notificacoes(client, loc)["nao_lidas"] == 0
    # ninguém marca as notificações de outra pessoa
    assert client.post(f"{API}/notificacoes/lidas", headers=mor, json={"ids": [itens[1]["id"]]}).json()["marcadas"] == 0


# --- verificação de e-mail ---------------------------------------------------------


def _token_do_ultimo_email(assunto):
    email = next(e for e in reversed(email_service.ENVIADOS) if assunto in e["assunto"])
    return email["texto"].split("token=")[1].split()[0]


def test_cadastro_envia_link_e_confirma(client):
    email_service.ENVIADOS.clear()
    h = cadastrar(client)
    assert client.get(f"{API}/me", headers=h).json()["email_verificado"] is False
    token = _token_do_ultimo_email("confirme")
    assert client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401
    assert client.post(f"{API}/auth/verificar", json={"token": token}).status_code == 200
    assert client.get(f"{API}/me", headers=h).json()["email_verificado"] is True
    assert "já está confirmado" in client.post(f"{API}/me/verificacao", headers=h).json()["message"]


def test_trocar_email_exige_nova_confirmacao(client):
    h = cadastrar(client)
    token_antigo = _token_do_ultimo_email("confirme")
    client.post(f"{API}/auth/verificar", json={"token": token_antigo})
    me = client.patch(f"{API}/me", headers=h, json={"email": "nova@x.com"}).json()
    assert me["email"] == "nova@x.com" and me["email_verificado"] is False
    # o link do e-mail antigo não confirma o novo
    assert client.post(f"{API}/auth/verificar", json={"token": token_antigo}).status_code == 400
    assert client.post(f"{API}/auth/verificar", json={"token": _token_do_ultimo_email("confirme")}).status_code == 200
    assert client.post(f"{API}/auth/verificar", json={"token": "lixo"}).status_code == 400


# --- rota de ônibus e destino salvo ---------------------------------------------


def test_rota_sem_gtfs_responde_indisponivel(client, cenario):
    mobilidade_service.definir_rede(None)
    r = client.get(f"{API}/mobilidade/rota", headers=cenario["mor"], params={
        "origem_lat": PERTO_A[0], "origem_lng": PERTO_A[1], "destino_lat": PERTO_E[0], "destino_lng": PERTO_E[1]})
    assert r.status_code == 200 and r.json()["disponivel"] is False
    assert client.get(f"{API}/mobilidade/status").json()["carregado"] is False


def test_rota_guarda_cache_e_mural_mostra_tempo(client, cenario, rede):  # noqa: F811
    mobilidade_service.definir_rede(rede)
    try:
        mor, i = cenario["mor"], cenario["imovel"]
        params = {"imovel_id": i, "origem_lat": PERTO_A[0], "origem_lng": PERTO_A[1],
                  "destino_lat": PERTO_E[0], "destino_lng": PERTO_E[1], "destino_nome": "PUC",
                  "hora": "7:30", "dia": "2026-11-23"}
        r = client.get(f"{API}/mobilidade/rota", headers=mor, params=params).json()
        assert r["disponivel"] and r["tempo_min"] == 41 and r["hora"] == "07:30"
        # sem destino salvo, o mural não mostra tempo
        assert client.get(f"{API}/imoveis", headers=mor).json()["items"][0]["deslocamento_min"] is None
        me = client.patch(f"{API}/me", headers=mor, json={"destino": {"nome": "PUC", "lat": PERTO_E[0], "lng": PERTO_E[1]}}).json()
        assert me["destino"]["nome"] == "PUC"
        item = client.get(f"{API}/imoveis", headers=mor).json()["items"][0]
        assert (item["deslocamento_min"], item["destino"]) == (41, "PUC")
        assert client.get(f"{API}/stats", headers=mor).json()["deslocamento_medio"] == 41
        assert client.get(f"{API}/mobilidade/rota", headers=mor, params={**params, "hora": "25:00"}).status_code == 422
    finally:
        mobilidade_service.definir_rede(None)
