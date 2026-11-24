"""Bloqueio via tabela denuncias (motivo bloqueio_contato) — sem migração."""

from tests.conftest import cadastrar
from tests.test_fase1 import API, cenario  # noqa: F401


def test_bloquear_desbloquear_e_corta_mensagem(client, cenario):
    mor = cenario["mor"]
    loc = cenario["loc"]
    id_loc = client.get(f"{API}/me", headers=loc).json()["id"]

    imoveis = client.get(f"{API}/imoveis", headers=mor).json()["items"]
    assert imoveis
    conv = client.post(
        f"{API}/conversas",
        headers=mor,
        json={"imovel_id": imoveis[0]["id"], "texto": "Oi"},
    ).json()
    cid = conv["id"]

    r = client.post(f"{API}/bloqueios", headers=mor, json={"usuario_id": id_loc})
    assert r.status_code == 201
    assert r.json()["status"] == "ativo"

    thread = client.get(f"{API}/conversas/{cid}", headers=mor).json()
    assert thread["eu_bloqueei"] is True
    assert thread["contato_bloqueado"] is True

    thread_loc = client.get(f"{API}/conversas/{cid}", headers=loc).json()
    assert thread_loc["me_bloquearam"] is True
    assert thread_loc["outro"]["nome"] == "Indisponível"

    assert client.post(
        f"{API}/conversas/{cid}/mensagens",
        headers=mor,
        json={"texto": "ainda assim"},
    ).status_code == 403
    assert client.post(
        f"{API}/conversas/{cid}/mensagens",
        headers=loc,
        json={"texto": "oi de volta"},
    ).status_code == 403

    assert client.delete(f"{API}/bloqueios/{id_loc}", headers=mor).status_code == 200
    livre = client.get(f"{API}/conversas/{cid}", headers=mor).json()
    assert livre["contato_bloqueado"] is False
    assert client.post(
        f"{API}/conversas/{cid}/mensagens",
        headers=mor,
        json={"texto": "voltou"},
    ).status_code == 200

    # Rebloquear (editável / fácil de refazer).
    assert client.post(
        f"{API}/bloqueios", headers=mor, json={"usuario_id": id_loc}
    ).status_code == 201
    assert client.get(f"{API}/conversas/{cid}", headers=mor).json()["eu_bloqueei"] is True


def test_nao_bloqueia_a_si(client):
    h = cadastrar(client)
    me = client.get(f"{API}/me", headers=h).json()
    r = client.post(f"{API}/bloqueios", headers=h, json={"usuario_id": me["id"]})
    assert r.status_code == 400
