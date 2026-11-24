"""Validadores de telefone, e-mail e CEP."""

import pytest
from fastapi import HTTPException

from app.utils.contato import (
    exigir_telefone_br,
    formatar_cep,
    normalizar_email,
    validar_cep,
    validar_telefone_br,
)


def test_telefone_celular_ok():
    assert validar_telefone_br("(19) 98888-1001") == "(19) 98888-1001"
    assert validar_telefone_br("19994712830") == "(19) 99471-2830"


def test_telefone_rejeita_ficticio_e_ddd_invalido():
    with pytest.raises(HTTPException) as e:
        validar_telefone_br("(19) 99999-9999")
    assert e.value.status_code == 422
    with pytest.raises(HTTPException) as e2:
        validar_telefone_br("(20) 98888-1001")
    assert e2.value.status_code == 422


def test_telefone_obrigatorio():
    with pytest.raises(HTTPException):
        exigir_telefone_br("", obrigatorio=True)
    assert exigir_telefone_br("", obrigatorio=False) is None


def test_email_ok_e_normaliza():
    assert normalizar_email(" Ana.Souza+x@Exemplo.COM ") == "ana.souza+x@exemplo.com"


def test_email_rejeita_invalido():
    for ruim in ("a@b", "semarroba", "a@b..com", ".a@b.com", "a@.com"):
        with pytest.raises(HTTPException) as e:
            normalizar_email(ruim)
        assert e.value.status_code == 422


def test_cep_ok_e_formatado():
    assert validar_cep("13085000") == "13085-000"
    assert formatar_cep("13085-000") == "13085-000"


def test_cep_rejeita_repetido_e_incompleto():
    with pytest.raises(HTTPException):
        validar_cep("00000000")
    with pytest.raises(HTTPException):
        validar_cep("13085")
    assert validar_cep("", obrigatorio=False) is None
