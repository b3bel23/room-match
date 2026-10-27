/**
 * Verificador de telefone brasileiro (cadastro / perfil).
 * Máscara, DDD real, celular/fixo e rejeição de números fictícios.
 */
(function (global) {
    /** DDDs oficiais ANATEL (Brasil). */
    const DDDS = new Set([
        11, 12, 13, 14, 15, 16, 17, 18, 19,
        21, 22, 24, 27, 28,
        31, 32, 33, 34, 35, 37, 38,
        41, 42, 43, 44, 45, 46, 47, 48, 49,
        51, 53, 54, 55,
        61, 62, 63, 64, 65, 66, 67, 68, 69,
        71, 73, 74, 75, 77, 79,
        81, 82, 83, 84, 85, 86, 87, 88, 89,
        91, 92, 93, 94, 95, 96, 97, 98, 99
    ]);

    function soDigitos(valor) {
        return String(valor || '').replace(/\D/g, '');
    }

    function normalizarNacional(digitos) {
        let n = soDigitos(digitos);
        if ((n.length === 12 || n.length === 13) && n.startsWith('55')) {
            n = n.slice(2);
        }
        return n.slice(0, 11);
    }

    function formatar(valor) {
        const d = normalizarNacional(valor);
        if (!d) return '';
        if (d.length <= 2) return `(${d}`;
        if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
        if (d.length <= 10) {
            return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
        }
        return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    }

    function pareceFicticio(nacional) {
        const local = nacional.slice(2);
        if (/^(\d)\1+$/.test(nacional) || /^(\d)\1+$/.test(local)) return true;
        const placeholders = new Set([
            '999999999', '99999999', '888888888', '88888888',
            '123456789', '12345678', '987654321', '98765432',
            '000000000', '00000000', '111111111', '11111111'
        ]);
        if (placeholders.has(local)) return true;
        if (/^9?0{8,9}$/.test(local)) return true;
        // Sequências óbvias (ex.: 912345678 / 987654321)
        if (/^9?12345678$/.test(local) || /^9?98765432$/.test(local)) return true;
        return false;
    }

    /**
     * @returns {{ ok: boolean, mensagem: string, formatado?: string, digitos?: string }}
     */
    function validar(valor) {
        const n = normalizarNacional(valor);
        if (!n) {
            return { ok: false, mensagem: 'Informe o telefone com DDD.' };
        }
        if (n.length < 10) {
            return {
                ok: false,
                mensagem: 'Telefone incompleto. Use DDD + número (10 ou 11 dígitos).'
            };
        }
        if (n.length > 11) {
            return { ok: false, mensagem: 'Telefone com dígitos a mais.' };
        }

        const ddd = Number(n.slice(0, 2));
        if (!DDDS.has(ddd)) {
            return { ok: false, mensagem: 'DDD inválido. Use um DDD brasileiro real.' };
        }

        const local = n.slice(2);
        if (n.length === 11) {
            if (local[0] !== '9') {
                return {
                    ok: false,
                    mensagem: 'Celular com 11 dígitos deve começar com 9 após o DDD.'
                };
            }
        } else if (!/^[2-5]/.test(local)) {
            return {
                ok: false,
                mensagem: 'Fixo inválido. Prefira celular (XX) 9XXXX-XXXX.'
            };
        }

        if (pareceFicticio(n)) {
            return {
                ok: false,
                mensagem: 'Esse número parece fictício (ex.: 99999-9999). Use um telefone real.'
            };
        }

        return {
            ok: true,
            formatado: formatar(n),
            digitos: n,
            mensagem: 'Telefone com formato brasileiro válido.'
        };
    }

    function pintarStatus(statusEl, resultado, vazio) {
        if (!statusEl) return;
        statusEl.hidden = false;
        statusEl.classList.remove('info', 'ok', 'erro');
        if (vazio) {
            statusEl.classList.add('info');
            statusEl.textContent = 'Use DDD brasileiro + número real (celular preferencial).';
            return;
        }
        statusEl.classList.add(resultado.ok ? 'ok' : 'erro');
        statusEl.textContent = resultado.mensagem;
    }

    function aplicarNoInput(input, { statusEl } = {}) {
        if (!input) return { ok: false };
        const bruto = input.value.trim();
        if (!bruto) {
            input.setCustomValidity('Informe o telefone com DDD.');
            pintarStatus(statusEl, { ok: false, mensagem: '' }, true);
            return { ok: false };
        }
        const resultado = validar(bruto);
        if (resultado.ok && resultado.formatado) {
            input.value = resultado.formatado;
        }
        input.setCustomValidity(resultado.ok ? '' : resultado.mensagem);
        pintarStatus(statusEl, resultado, false);
        return resultado;
    }

    function ligarEntrada(input, opcoes = {}) {
        if (!input || input.dataset.rmTelBound) return;
        input.dataset.rmTelBound = '1';
        input.setAttribute('inputmode', 'tel');
        input.setAttribute('maxlength', '15');
        if (!input.placeholder) input.placeholder = '(19) 9XXXX-XXXX';

        let statusEl = opcoes.statusEl || null;
        if (!statusEl && input.id) {
            statusEl = document.getElementById(`${input.id}-status`);
        }
        if (!statusEl) {
            statusEl = document.createElement('p');
            statusEl.className = 'face-check-status info';
            statusEl.id = input.id ? `${input.id}-status` : '';
            input.insertAdjacentElement('afterend', statusEl);
        }
        pintarStatus(statusEl, { ok: false, mensagem: '' }, true);

        input.addEventListener('input', () => {
            const pos = input.selectionStart;
            const antes = input.value;
            const formatado = formatar(antes);
            if (formatado !== antes) {
                input.value = formatado;
                // Mantém cursor no fim em digitação típica
                try {
                    const novo = formatado.length;
                    input.setSelectionRange(novo, novo);
                } catch (erro) {
                    /* ignore */
                }
            }
            void pos;
            aplicarNoInput(input, { statusEl });
        });

        input.addEventListener('blur', () => {
            aplicarNoInput(input, { statusEl });
        });

        if (input.value.trim()) {
            aplicarNoInput(input, { statusEl });
        }
    }

    /** Liga todos os campos de telefone de perfil/cadastro na página. */
    function ligarPagina(raiz) {
        const escopo = raiz || document;
        escopo
            .querySelectorAll(
                'input[data-tel-br], input#telefone, input#perfil-telefone, input[name="telefone"][type="tel"]'
            )
            .forEach((input) => ligarEntrada(input));
    }

    const api = {
        validar,
        formatar,
        soDigitos: normalizarNacional,
        ligarEntrada,
        ligarPagina,
        aplicarNoInput
    };

    global.RoomMatchTelefone = api;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ligarPagina());
    } else {
        ligarPagina();
    }
}(typeof window !== 'undefined' ? window : globalThis));
