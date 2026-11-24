/**
 * Verificador de e-mail (cadastro / perfil / login).
 * Formato rigoroso + feedback visual (status).
 */
(function (global) {
    const EMAIL_RE = /^[a-z0-9](?:[a-z0-9._%+\-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?)+$/i;

    function normalizar(valor) {
        return String(valor || '').trim().toLowerCase();
    }

    /**
     * @returns {{ ok: boolean, mensagem: string, email?: string }}
     */
    function validar(valor) {
        const email = normalizar(valor);
        if (!email) {
            return { ok: false, mensagem: 'Informe o e-mail.' };
        }
        if (email.length > 254) {
            return { ok: false, mensagem: 'E-mail longo demais.' };
        }
        if (email.includes('..') || email.startsWith('.') || email.includes('@.') || email.includes('.@')) {
            return { ok: false, mensagem: 'E-mail inválido.' };
        }
        if (!EMAIL_RE.test(email)) {
            return { ok: false, mensagem: 'E-mail inválido. Use o formato nome@dominio.com.' };
        }
        const dominio = email.split('@')[1] || '';
        const tld = dominio.split('.').pop() || '';
        if (tld.length < 2) {
            return { ok: false, mensagem: 'E-mail inválido (domínio incompleto).' };
        }
        return { ok: true, email, mensagem: 'E-mail com formato válido.' };
    }

    function pintarStatus(statusEl, resultado, vazio) {
        if (!statusEl) return;
        // No perfil o status também serve para “e-mail verificado” — não sobrescreve se marcado.
        if (statusEl.dataset.rmEmailLock === '1') return;
        statusEl.hidden = false;
        statusEl.classList.remove('info', 'ok', 'erro');
        if (vazio) {
            statusEl.classList.add('info');
            statusEl.textContent = 'Use um e-mail real — será seu login.';
            return;
        }
        statusEl.classList.add(resultado.ok ? 'ok' : 'erro');
        statusEl.textContent = resultado.mensagem;
    }

    function aplicarNoInput(input, { statusEl } = {}) {
        if (!input) return { ok: false };
        const bruto = input.value.trim();
        if (!bruto) {
            input.setCustomValidity('Informe o e-mail.');
            pintarStatus(statusEl, { ok: false, mensagem: '' }, true);
            return { ok: false };
        }
        const resultado = validar(bruto);
        if (resultado.ok && resultado.email) {
            input.value = resultado.email;
        }
        input.setCustomValidity(resultado.ok ? '' : resultado.mensagem);
        pintarStatus(statusEl, resultado, false);
        return resultado;
    }

    function ligarEntrada(input, opcoes = {}) {
        if (!input || input.dataset.rmEmailBound) return;
        input.dataset.rmEmailBound = '1';
        input.setAttribute('autocomplete', input.getAttribute('autocomplete') || 'email');
        input.setAttribute('inputmode', 'email');
        if (!input.placeholder) input.placeholder = 'nome@dominio.com';

        let statusEl = opcoes.statusEl || null;
        if (!statusEl && input.id) {
            statusEl = document.getElementById(`${input.id}-status`);
        }
        // Perfil: #perfil-email-status é usado pela verificação SMTP — não criar conflito.
        if (!statusEl && input.id !== 'perfil-email') {
            statusEl = document.createElement('p');
            statusEl.className = 'face-check-status info';
            statusEl.id = input.id ? `${input.id}-status` : '';
            input.insertAdjacentElement('afterend', statusEl);
            pintarStatus(statusEl, { ok: false, mensagem: '' }, true);
        }

        input.addEventListener('blur', () => {
            aplicarNoInput(input, { statusEl });
        });
        input.addEventListener('input', () => {
            if (!input.value.trim()) {
                input.setCustomValidity('Informe o e-mail.');
                pintarStatus(statusEl, { ok: false, mensagem: '' }, true);
                return;
            }
            const resultado = validar(input.value);
            input.setCustomValidity(resultado.ok ? '' : resultado.mensagem);
            if (statusEl && statusEl.dataset.rmEmailLock !== '1') {
                pintarStatus(statusEl, resultado, false);
            }
        });

        if (input.value.trim()) {
            aplicarNoInput(input, { statusEl });
        }
    }

    function ligarPagina(raiz) {
        const escopo = raiz || document;
        escopo
            .querySelectorAll(
                'input[data-email-rm], input#email, input#perfil-email, input[type="email"][name="email"]'
            )
            .forEach((input) => ligarEntrada(input));
    }

    global.RoomMatchEmail = {
        validar,
        normalizar,
        ligarEntrada,
        ligarPagina,
        aplicarNoInput
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ligarPagina());
    } else {
        ligarPagina();
    }
}(typeof window !== 'undefined' ? window : globalThis));
