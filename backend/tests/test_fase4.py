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
    assert avisos["nao_lidas"] >= 2
    tipos = [n["tipo"] for n in avisos["items"]]
    assert "mensagem" in tipos and "favorito" in tipos
    msg = next(n for n in avisos["items"] if n["tipo"] == "mensagem")
    assert msg["link"] == f"mensagens.html?id={conv['id']}"
    assert "Oi, tudo bem?" in msg["texto"]
    assert msg.get("nao_lidas", 0) >= 1
    assert "foto_url" in msg and "iniciais" in msg

    # Segunda msg do mesmo thread atualiza a mesma notificação (upsert), não cria outra.
    client.post(f"{API}/conversas/{conv['id']}/mensagens", headers=mor, json={"texto": "Ainda interessado"})
    avisos2 = _notificacoes(client, loc)
    msgs = [n for n in avisos2["items"] if n["tipo"] == "mensagem" and n["link"] == msg["link"]]
    assert len(msgs) == 1 and "Ainda interessado" in msgs[0]["texto"]
    assert msgs[0]["nao_lidas"] >= 2

    client.post(f"{API}/conversas/{conv['id']}/mensagens", headers=loc, json={"texto": "Tudo!"})
    do_morador = _notificacoes(client, mor)["items"]
    assert any(n["tipo"] == "mensagem" and "Tudo!" in n["texto"] for n in do_morador)


def test_marcar_lidas(client, cenario):
    mor, loc, i = cenario["mor"], cenario["loc"], cenario["imovel"]
    client.post(f"{API}/favoritos/{i}", headers=mor)
    conv = client.post(f"{API}/conversas", headers=mor, json={"imovel_id": i}).json()
    itens = _notificacoes(client, loc)["items"]
    primeiro = itens[0]
    ids = primeiro.get("ids") or [primeiro["id"]]
    client.post(f"{API}/notificacoes/lidas", headers=loc, json={"ids": ids})
    assert _notificacoes(client, loc)["nao_lidas"] >= 1
    assert client.post(f"{API}/notificacoes/lidas", headers=loc, json={}).json()["marcadas"] >= 1
    assert _notificacoes(client, loc)["nao_lidas"] == 0
    # Marcar conversa como lida zera msgs + notifs do thread
    client.post(f"{API}/conversas/{conv['id']}/mensagens", headers=mor, json={"texto": "Ping"})
    assert client.post(f"{API}/conversas/{conv['id']}/lidas", headers=loc).json()["ok"] is True
    assert client.get(f"{API}/conversas/{conv['id']}", headers=loc).json()["nao_lidas"] == 0


def test_arquivar_conversa(client, cenario):
    mor, loc, i = cenario["mor"], cenario["loc"], cenario["imovel"]
    conv = client.post(f"{API}/conversas", headers=mor, json={"imovel_id": i}).json()
    r = client.patch(f"{API}/conversas/{conv['id']}", headers=mor, json={"status_conversa": "arquivada"})
    assert r.status_code == 200 and r.json()["status_conversa"] == "arquivada"
    ids = [c["id"] for c in client.get(f"{API}/conversas", headers=mor).json()["items"]]
    assert conv["id"] not in ids
    ids_all = [
        c["id"]
        for c in client.get(f"{API}/conversas?incluir_arquivadas=true", headers=mor).json()["items"]
    ]
    assert conv["id"] in ids_all


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


def test_salvar_destino_aquece_estimativa_sem_gtfs(client, cenario, db):
    """Sem GTFS: PATCH destino ainda grava rotas_mobilidade (estimativa) se houver coords."""
    from app.models.endereco_imovel import EnderecoImovel

    mobilidade_service.definir_rede(None)
    mor, i = cenario["mor"], cenario["imovel"]
    end = db.query(EnderecoImovel).filter(EnderecoImovel.id_imovel == i).first()
    assert end is not None
    end.latitude, end.longitude = PERTO_A[0], PERTO_A[1]
    db.commit()

    me = client.patch(
        f"{API}/me",
        headers=mor,
        json={"destino": {"nome": "PUC", "lat": PERTO_E[0], "lng": PERTO_E[1]}},
    ).json()
    assert me["destino"]["nome"] == "PUC"
    item = client.get(f"{API}/imoveis", headers=mor).json()["items"][0]
    assert item["destino"] == "PUC"
    assert item["deslocamento_min"] is not None and item["deslocamento_min"] >= 5
    tempos = (item.get("deslocamentos") or [{}])[0].get("tempos_modos") or {}
    assert tempos.get("foot") == item["deslocamento_min"]
    # stats = média do mural (vários imóveis aquecidos); só exige valor positivo coerente
    assert client.get(f"{API}/stats", headers=mor).json()["deslocamento_medio"] >= 5
