"""Login e cadastro no contrato do front (frontend/js/api.js e cadastro.js)."""

import base64

from tests.conftest import cadastrar

# JPEG mínimo válido (assinatura) para subir ao Storage local nos testes.
_JPEG = b"\xff\xd8\xff\xe0" + b"0" * 64
_FOTO = "data:image/jpeg;base64," + base64.b64encode(_JPEG).decode()


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
            "foto_url": _FOTO,
            "bio": "Busco quarto perto da PUC",
            "cidade_atual": "Campinas",
            "data_nascimento": "2000-05-10",
            "raio_busca_km": 12,
            "tags": ["Aceita Animais"],
            "orcamento_maximo": 1200,
            "limiar_compatibilidade": 60,
        },
    )
    assert r.status_code == 201, r.text
    dados = r.json()
    assert dados["access_token"]
    user = dados["user"]
    assert user["papel"] == "Morador" and user["email"] == "ana@x.com"
    assert user["tags"] == ["Aceita Animais"]
    assert user["orcamento_maximo"] == 1200 and user["limiar_compatibilidade"] == 60
    assert user["cidade_atual"] == "Campinas"
    assert user["raio_busca_km"] == 12
    # Data URL vira arquivo no Storage (URL curta no banco).
    assert "/uploads/perfis/" in user["foto_url"] or user["foto_url"].startswith("http")


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
        json={
            "nome": "B",
            "email": "ana@x.com",
            "senha": "senha12345",
            "papel": "Morador",
            "telefone": "(19) 98888-1002",
        },
    )
    assert r.status_code == 409
    detalhe = r.json()["detail"]
    assert "e-mail já está cadastrado" in detalhe.lower() or "já está cadastrado" in detalhe.lower()
    assert "contate" in detalhe.lower()


def test_cadastro_cpf_repetido_409(client):
    cadastrar(client, "loc1@x.com", papel="Locador", cpf_cnpj="52998224725")
    r = client.post(
        "/api/v1/auth/register",
        json={
            "nome": "Outro Loc",
            "email": "loc2@x.com",
            "senha": "senha12345",
            "papel": "Locador",
            "cpf_cnpj": "529.982.247-25",
            "telefone": "(19) 98888-1002",
        },
    )
    assert r.status_code == 409
    detalhe = r.json()["detail"]
    assert "cpf" in detalhe.lower()
    assert "contate" in detalhe.lower()


def test_cadastro_senha_curta_422(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"nome": "B", "email": "b@x.com", "senha": "123", "papel": "Morador"},
    )
    assert r.status_code == 422


def test_cadastro_telefone_ficticio_422(client):
    r = client.post(
        "/api/v1/auth/register",
        json={
            "nome": "B",
            "email": "telruim@x.com",
            "senha": "senha12345",
            "papel": "Morador",
            "telefone": "(19) 99999-9999",
        },
    )
    assert r.status_code == 422
    assert "fictício" in r.json()["detail"].lower() or "telefone" in r.json()["detail"].lower()


def test_cadastro_email_invalido_422(client):
    r = client.post(
        "/api/v1/auth/register",
        json={
            "nome": "B",
            "email": "nao-e-email",
            "senha": "senha12345",
            "papel": "Morador",
            "telefone": "(19) 98888-1001",
        },
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
