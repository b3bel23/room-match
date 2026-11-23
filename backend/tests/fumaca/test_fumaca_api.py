"""Teste de fumaça contra uma API rodando (local ou publicada).

Percorre os fluxos principais pelo HTTP, como o site faz em modo `live`:
cadastro, login, perfil, publicar anúncio com foto, mural com afinidade, detalhe,
favoritar, agendar e confirmar visita, chat nos dois sentidos, pausar e remover.

Só roda com a variável SMOKE_API_URL (ex.: http://127.0.0.1:8000). Cria contas
`fumaca-<timestamp>@example.com` e um anúncio de teste, que é removido no fim.

    SMOKE_API_URL=http://127.0.0.1:8000 python -m pytest tests/fumaca -q
"""

import os
import time

import pytest

BASE = os.environ.get("SMOKE_API_URL", "").rstrip("/")
pytestmark = pytest.mark.skipif(not BASE, reason="defina SMOKE_API_URL para rodar")

PNG_1PX = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
    "1f15c4890000000d49444154789c6360f8cfc0f01f0005000201e2272a5d0000000049454e44ae426082"
)


@pytest.fixture(scope="module")
def http():
    import httpx

    with httpx.Client(base_url=f"{BASE}/api/v1", timeout=30) as cliente:
        yield cliente


def _ok(resposta, esperado=200):
    assert resposta.status_code == esperado, f"{resposta.request.method} {resposta.request.url}: {resposta.status_code} {resposta.text[:300]}"
    return resposta.json() if resposta.content else None


def test_fluxo_completo(http):
    import httpx

    assert httpx.get(f"{BASE}/health", timeout=30).json() == {"status": "ok"}
    marca = int(time.time())
    senha = "fumaca12345"

    # cadastro dos dois papéis (contrato do cadastro.js)
    loc = _ok(http.post("/auth/register", json={
        "nome": "Locadora Fumaça", "email": f"fumaca-loc-{marca}@example.com", "senha": senha,
        "papel": "Locador", "cpf_cnpj": f"fumaca-{marca}", "telefone": "(19) 98888-0000",
    }), 201)
    mor = _ok(http.post("/auth/register", json={
        "nome": "Morador Fumaça", "email": f"fumaca-mor-{marca}@example.com", "senha": senha,
        "papel": "Morador", "telefone": "(19) 98888-0001", "tags": ["Pet Friendly", "Home Office"],
        "orcamento_maximo": 2000, "limiar_compatibilidade": 50, "genero": "Outro/Não informar",
    }), 201)
    assert loc["user"]["papel"] == "Locador" and mor["user"]["papel"] == "Morador"

    # login pelo JSON do front
    sessao = _ok(http.post("/auth/login", json={"email": f"fumaca-mor-{marca}@example.com", "senha": senha}))
    H_MOR = {"Authorization": f"Bearer {sessao['access_token']}"}
    H_LOC = {"Authorization": f"Bearer {loc['access_token']}"}
    assert _ok(http.get("/me", headers=H_MOR))["genero"] == "Outro/Não informar"

    # publicar + foto
    imovel = _ok(http.post("/imoveis", headers=H_LOC, json={
        "titulo": f"Fumaça {marca}", "tipo": "Kitnet", "rua": "Rua Teste", "numero": "1",
        "bairro": "Centro", "aluguel": 800, "contas": 100, "classificacao": "Mista",
        "tags": ["Pet Friendly", "Home Office", "Silêncio Noturno"],
    }), 201)
    iid = imovel["id"]
    try:
        com_foto = _ok(http.post(f"/imoveis/{iid}/fotos", headers=H_LOC,
                                 files=[("fotos", ("a.png", PNG_1PX, "image/png"))]), 201)
        assert len(com_foto["fotos"]) == 1
        foto = com_foto["fotos"][0]
        if foto.startswith("/"):
            foto = BASE + foto
        assert httpx.get(foto, timeout=30).status_code == 200

        # mural e detalhe com afinidade
        mural = _ok(http.get("/imoveis", headers=H_MOR, params={"q": f"Fumaça {marca}"}))["items"]
        assert [i["id"] for i in mural] == [iid] and mural[0]["match"] == 100
        detalhe = _ok(http.get(f"/imoveis/{iid}", headers=H_MOR))
        assert detalhe["elegibilidade"]["chat_liberado"] is True

        # favoritar
        assert _ok(http.post(f"/favoritos/{iid}", headers=H_MOR))["favorito"] is True
        assert iid in _ok(http.get("/favoritos", headers=H_MOR))["ids"]

        # visita: morador pede, locador confirma
        visita = _ok(http.post("/visitas", headers=H_MOR, json={"imovel_id": iid, "horario": "Amanhã, 10h"}), 201)
        assert visita["id"] in [v["id"] for v in _ok(http.get("/visitas", headers=H_LOC))["items"]]
        assert _ok(http.patch(f"/visitas/{visita['id']}", headers=H_LOC, json={"status": "confirmada"}))["status"] == "confirmada"

        # chat nos dois sentidos
        conversa = _ok(http.post("/conversas", headers=H_MOR, json={"imovel_id": iid, "texto": "Oi!"}))
        _ok(http.post(f"/conversas/{conversa['id']}/mensagens", headers=H_LOC, json={"texto": "Olá!"}))
        do_morador = _ok(http.get(f"/conversas/{conversa['id']}", headers=H_MOR))
        assert [m["texto"] for m in do_morador["mensagens"]] == ["Oi!", "Olá!"]

        # pausar tira do mural
        _ok(http.patch(f"/imoveis/{iid}", headers=H_LOC, json={"status_anuncio": "pausado"}))
        assert http.get(f"/imoveis/{iid}").status_code == 404
        _ok(http.patch(f"/imoveis/{iid}", headers=H_LOC, json={"status_anuncio": "ativo"}))
        stats = _ok(http.get("/stats", headers=H_MOR))
        assert stats["favoritos"] >= 1 and stats["conversas"] >= 1
    finally:
        assert http.delete(f"/imoveis/{iid}", headers=H_LOC).status_code == 204
    assert http.get(f"/imoveis/{iid}").status_code == 404
