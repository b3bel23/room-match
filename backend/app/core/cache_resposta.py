"""Cache em memória com TTL para respostas caras (mural/stats no pooler remoto)."""

from __future__ import annotations

import threading
import time
from typing import Any, Optional

_lock = threading.Lock()
_store: dict[str, tuple[float, Any]] = {}


def get(chave: str) -> Optional[Any]:
    agora = time.monotonic()
    with _lock:
        item = _store.get(chave)
        if item is None:
            return None
        expira, valor = item
        if agora >= expira:
            _store.pop(chave, None)
            return None
        return valor


def set(chave: str, valor: Any, ttl_s: float) -> None:
    with _lock:
        _store[chave] = (time.monotonic() + ttl_s, valor)


def invalidate_prefix(prefixo: str) -> None:
    with _lock:
        for chave in [k for k in _store if k.startswith(prefixo)]:
            _store.pop(chave, None)


def clear() -> None:
    with _lock:
        _store.clear()
