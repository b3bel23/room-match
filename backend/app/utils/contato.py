"""Validação rigorosa de telefone BR, e-mail e CEP."""

from __future__ import annotations

import re
from typing import Optional

from fastapi import HTTPException, status

# DDDs oficiais ANATEL.
_DDDS = frozenset(
    {
        11, 12, 13, 14, 15, 16, 17, 18, 19,
        21, 22, 24, 27, 28,
        31, 32, 33, 34, 35, 37, 38,
        41, 42, 43, 44, 45, 46, 47, 48, 49,
        51, 53, 54, 55,
        61, 62, 63, 64, 65, 66, 67, 68, 69,
        71, 73, 74, 75, 77, 79,
        81, 82, 83, 84, 85, 86, 87, 88, 89,
        91, 92, 93, 94, 95, 96, 97, 98, 99,
    }
)

_PLACEHOLDERS_LOCAL = frozenset(
    {
        "999999999",
        "99999999",
        "888888888",
        "88888888",
        "123456789",
        "12345678",
        "987654321",
        "98765432",
        "000000000",
        "00000000",
        "111111111",
        "11111111",
    }
)

# E-mail: local@domínio.tld (mais estrito que só ter @).
_EMAIL_RE = re.compile(
    r"^[a-z0-9](?:[a-z0-9._%+\-]*[a-z0-9])?@"
    r"[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?"
    r"(?:\.[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?)+$",
    re.IGNORECASE,
)


def so_digitos(valor: Optional[str]) -> str:
    return re.sub(r"\D+", "", valor or "")


def _nacional_telefone(valor: Optional[str]) -> str:
    n = so_digitos(valor)
    if len(n) in (12, 13) and n.startswith("55"):
        n = n[2:]
    return n[:11]


def _parece_ficticio(nacional: str) -> bool:
    local = nacional[2:]
    if re.fullmatch(r"(\d)\1+", nacional) or re.fullmatch(r"(\d)\1+", local):
        return True
    if local in _PLACEHOLDERS_LOCAL:
        return True
    if re.fullmatch(r"9?0{8,9}", local):
        return True
    if re.fullmatch(r"9?12345678", local) or re.fullmatch(r"9?98765432", local):
        return True
    return False


def formatar_telefone_br(nacional: str) -> str:
    d = _nacional_telefone(nacional)
    if len(d) == 11:
        return f"({d[:2]}) {d[2:7]}-{d[7:]}"
    if len(d) == 10:
        return f"({d[:2]}) {d[2:6]}-{d[6:]}"
    return d


def validar_telefone_br(valor: Optional[str]) -> str:
    """Devolve telefone formatado `(DD) …` ou levanta 422."""
    n = _nacional_telefone(valor)
    if not n:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Informe o telefone com DDD.")
    if len(n) < 10:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Telefone incompleto. Use DDD + número (10 ou 11 dígitos).",
        )
    if len(n) > 11:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Telefone com dígitos a mais.")

    ddd = int(n[:2])
    if ddd not in _DDDS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "DDD inválido. Use um DDD brasileiro real.",
        )

    local = n[2:]
    if len(n) == 11:
        if local[0] != "9":
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Celular com 11 dígitos deve começar com 9 após o DDD.",
            )
    elif not re.match(r"^[2-5]", local):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Fixo inválido. Prefira celular (XX) 9XXXX-XXXX.",
        )

    if _parece_ficticio(n):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Esse número parece fictício (ex.: 99999-9999). Use um telefone real.",
        )
    return formatar_telefone_br(n)


def exigir_telefone_br(valor: Optional[str], *, obrigatorio: bool = True) -> Optional[str]:
    bruto = (valor or "").strip()
    if not bruto:
        if obrigatorio:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Informe um telefone brasileiro com DDD.",
            )
        return None
    return validar_telefone_br(bruto)


def formatar_cep(valor: Optional[str]) -> str:
    d = so_digitos(valor)[:8]
    if len(d) <= 5:
        return d
    return f"{d[:5]}-{d[5:]}"


def validar_cep(valor: Optional[str], *, obrigatorio: bool = False) -> Optional[str]:
    """CEP com 8 dígitos (formato 00000-000). Vazio só ok se não obrigatório."""
    bruto = (valor or "").strip()
    if not bruto:
        if obrigatorio:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Informe o CEP.")
        return None
    digitos = so_digitos(bruto)
    if len(digitos) != 8:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "CEP inválido. Use 8 dígitos (ex.: 13085-000).",
        )
    if re.fullmatch(r"(\d)\1{7}", digitos):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "CEP inválido (sequência repetida).",
        )
    return formatar_cep(digitos)


def normalizar_email(valor: Optional[str]) -> str:
    """E-mail em minúsculas, formato rigoroso."""
    email = (valor or "").strip().lower()
    if not email:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Informe um e-mail válido.")
    if ".." in email or email.startswith(".") or "@." in email or ".@" in email:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "E-mail inválido.")
    if not _EMAIL_RE.fullmatch(email):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "E-mail inválido. Use o formato nome@dominio.com.",
        )
    local, _, dominio = email.partition("@")
    if len(local) > 64 or len(email) > 254:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "E-mail inválido.")
    tld = dominio.rsplit(".", 1)[-1]
    if len(tld) < 2:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "E-mail inválido.")
    return email
