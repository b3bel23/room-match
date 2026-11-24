"""Login e cadastro no contrato do front (frontend/js/api.js e cadastro.js)."""

from tests.conftest import cadastrar


def test_cadastro_morador_devolve_sessao_e_grava_preferencias(client):
    r = client.post(
        "/api/v1/auth/register",
        json={
            "nome": "Ana Souza",
            "email": "Ana@X.com",
            "senha": "senha12345",
            "papel": "Morador",
            "papel_schema": "locatario",
            "telefone": "(19) 98888-1001",
            "genero": "Outro/Não informar",
            "foto_url": "data:image/jpeg;base64," + "A" * 5000,
            "tags": ["Pet Friendly"],
            "orcamento_maximo": 1200,
            "limiar_compatibilidade": 60,
        },
    )
    assert r.status_code == 201, r.text
    dados = r.json()
    assert dados["access_token"]
    user = dados["user"]
    assert user["papel"] == "Morador" and user["email"] == "ana@x.com"
    assert user["tags"] == ["Pet Friendly"]
    assert user["orcamento_maximo"] == 1200 and user["limiar_compatibilidade"] == 60
    assert user["foto_url"].startswith("data:image/jpeg")


def test_cadastro_locador_exige_cpf(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"nome": "Lu", "email": "lu@x.com", "senha": "senha12345", "papel": "Locador"},
    )
    assert r.status_code == 422
    cadastrar(client, "lu@x.com", papel="Locador")
    me = client.get("/api/v1/me", headers=cadastrar(client, "lu2@x.com", papel="Locador"))
    assert me.json()["papel"] == "Locador"


def test_cadastro_email_repetido_409(client):
    cadastrar(client)
    r = client.post(
        "/api/v1/auth/register",
        json={"nome": "B", "email": "ana@x.com", "senha": "senha12345", "papel": "Morador"},
    )
    assert r.status_code == 409


def test_cadastro_senha_curta_422(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"nome": "B", "email": "b@x.com", "senha": "123", "papel": "Morador"},
    )
    assert r.status_code == 422


def test_login_json_do_front_devolve_user(client):
    cadastrar(client)
    r = client.post("/api/v1/auth/login", json={"email": "ANA@x.com", "senha": "senha12345"})
    assert r.status_code == 200
    assert r.json()["user"]["papel"] == "Morador"
    token = r.json()["access_token"]
    me = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json()["email"] == "ana@x.com"


def test_login_formulario_swagger_continua_funcionando(client):
    cadastrar(client)
    r = client.post(
        "/api/v1/auth/login", data={"username": "ana@x.com", "password": "senha12345"}
    )
    assert r.status_code == 200 and r.json()["access_token"]


def test_login_senha_errada_401(client):
    cadastrar(client)
    r = client.post("/api/v1/auth/login", json={"email": "ana@x.com", "senha": "errada123"})
    assert r.status_code == 401
    assert client.post("/api/v1/auth/login", json={}).status_code == 401
