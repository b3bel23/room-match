"""Denúncias usam a tabela `denuncias` (schema intacto) e avisam a equipe por e-mail."""

from app.models.denuncia import Denuncia
from app.services import email_service
from tests.test_fase1 import API, cenario  # noqa: F401  (fixture)


def test_denunciar_usuario_da_conversa(client, cenario, db):
    email_service.ENVIADOS.clear()
    mor, loc, i = cenario["mor"], cenario["loc"], cenario["imovel"]
    conv = client.post(f"{API}/conversas", headers=mor, json={"imovel_id": i, "texto": "Oi"}).json()

    r = client.post(
        f"{API}/denuncias",
        headers=mor,
        json={
            "motivo": "assedio",
            "descricao": "Mensagens ofensivas no chat.",
            "conversa_id": conv["id"],
        },
    )
    assert r.status_code == 201, r.text
    corpo = r.json()
    assert corpo["ok"] is True and corpo["status"] == "pendente"

    row = db.get(Denuncia, corpo["id"])
    assert row is not None
    assert row.motivo == "assedio"
    assert row.id_usuario_denunciado is not None
    assert row.status_denuncia == "pendente"
    assert any("Denúncia" in e["assunto"] for e in email_service.ENVIADOS)


def test_denunciar_anuncio(client, cenario, db):
    email_service.ENVIADOS.clear()
    mor, i = cenario["mor"], cenario["imovel"]
    r = client.post(
        f"{API}/denuncias",
        headers=mor,
        json={"motivo": "anuncio_falso", "imovel_id": i, "descricao": "Fotos de outro lugar."},
    )
    assert r.status_code == 201
    row = db.query(Denuncia).order_by(Denuncia.id_denuncia.desc()).first()
    assert row.id_post_denunciado is not None
    assert row.motivo == "anuncio_falso"


def test_nao_denuncia_a_si_mesmo(client, cenario):
    mor = cenario["mor"]
    me = client.get(f"{API}/me", headers=mor).json()
    r = client.post(
        f"{API}/denuncias",
        headers=mor,
        json={"motivo": "outro", "usuario_id": me["id"]},
    )
    assert r.status_code == 400


def test_motivos_publicos(client):
    r = client.get(f"{API}/denuncias/motivos")
    assert r.status_code == 200
    valores = [i["valor"] for i in r.json()["items"]]
    assert "assedio" in valores and "golpe_fraude" in valores
