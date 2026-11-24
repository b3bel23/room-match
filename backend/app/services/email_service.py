"""Envio de e-mail plugável.

Com SMTP_HOST configurado, envia por SMTP (STARTTLS). Sem ele, só registra no log, para
desenvolvimento e testes. `ENVIADOS` guarda as últimas mensagens para os testes.
"""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

log = logging.getLogger("roommatch.email")
ENVIADOS: list[dict] = []


def enviar(para: str, assunto: str, texto: str) -> None:
    ENVIADOS.append({"para": para, "assunto": assunto, "texto": texto})
    del ENVIADOS[:-50]
    if not settings.smtp_host:
        log.warning("E-mail (sem SMTP configurado) para %s: %s\n%s", para, assunto, texto)
        return
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = para
    msg["Subject"] = assunto
    msg.set_content(texto)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
    except (OSError, smtplib.SMTPException):
        # Falha de e-mail não pode derrubar a requisição (nem revelar se a conta existe).
        log.exception("Falha ao enviar e-mail para %s", para)
