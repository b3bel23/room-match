/**
 * UI compartilhada de senha: força (fraca/média/forte), olho e confirmação.
 */
(function (global) {
    const ICONE_OLHO = '<svg class="senha-olho-icone" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    const ICONE_OLHO_OFF = '<svg class="senha-olho-icone" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.9 21.9 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';

    function classificarSenha(valor) {
        const s = String(valor || '');
        if (!s) return { nivel: '', rotulo: '' };
        let pontos = 0;
        if (s.length >= 8) pontos += 1;
        if (s.length >= 10) pontos += 1;
        if (/[a-z]/.test(s) && /[A-Z]/.test(s)) pontos += 1;
        if (/\d/.test(s)) pontos += 1;
        if (/[^A-Za-z0-9]/.test(s)) pontos += 1;

        if (s.length < 8 || pontos <= 1) {
            return { nivel: 'fraca', rotulo: 'Senha fraca — use ao menos 8 caracteres.' };
        }
        if (pontos <= 3) {
            return {
                nivel: 'media',
                rotulo: 'Senha média — dá para melhorar com letras, números e símbolos.'
            };
        }
        return { nivel: 'forte', rotulo: 'Senha forte.' };
    }

    function aplicarForca(input, forcaBox, forcaTexto) {
        if (!input || !forcaBox || !forcaTexto) return { nivel: '' };
        const { nivel, rotulo } = classificarSenha(input.value);
        forcaBox.hidden = !input.value;
        forcaBox.classList.remove('fraca', 'media', 'forte');
        if (nivel) forcaBox.classList.add(nivel);
        forcaTexto.textContent = rotulo || 'Força da senha';

        if (input.value && input.value.length < 8) {
            input.setCustomValidity('A senha deve ter ao menos 8 caracteres.');
        } else if (input.value && nivel === 'fraca') {
            input.setCustomValidity(
                'Escolha uma senha um pouco mais forte (mínimo 8 caracteres, com mais variedade).'
            );
        } else {
            input.setCustomValidity('');
        }
        return { nivel };
    }

    function aplicarConfirmacao(senha, confirma, matchTexto) {
        if (!senha || !confirma) return false;
        const iguais = senha.value === confirma.value;
        confirma.setCustomValidity(
            !confirma.value || iguais ? '' : 'As senhas não coincidem.'
        );
        if (matchTexto) {
            if (!confirma.value) {
                matchTexto.hidden = true;
                matchTexto.textContent = '';
                matchTexto.classList.remove('ok', 'erro');
            } else {
                matchTexto.hidden = false;
                matchTexto.textContent = iguais
                    ? 'As senhas coincidem.'
                    : 'As senhas não coincidem.';
                matchTexto.classList.toggle('ok', iguais);
                matchTexto.classList.toggle('erro', !iguais);
            }
        }
        return iguais;
    }

    /** Senha aleatória forte (letras, números e símbolo), dentro do limite do bcrypt (72 bytes). */
    function gerarSenhaAleatoria(tamanho) {
        const n = Math.min(Math.max(Number(tamanho) || 16, 12), 48);
        const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';
        const bytes = new Uint8Array(n);
        (global.crypto || window.crypto).getRandomValues(bytes);
        let out = '';
        for (let i = 0; i < n; i += 1) {
            out += alfabeto[bytes[i] % alfabeto.length];
        }
        // Garante classes mínimas.
        if (!/[A-Z]/.test(out)) out = `A${out.slice(1)}`;
        if (!/[a-z]/.test(out)) out = `${out.slice(0, 1)}b${out.slice(2)}`;
        if (!/\d/.test(out)) out = `${out.slice(0, 2)}3${out.slice(3)}`;
        if (!/[^A-Za-z0-9]/.test(out)) out = `${out.slice(0, 3)}!${out.slice(4)}`;
        return out;
    }

    function ligarOlhos(raiz) {
        const escopo = raiz || document;
        escopo.querySelectorAll('.senha-olho[data-olho-para]').forEach((btn) => {
            if (btn.dataset.rmSenhaBound) return;
            btn.dataset.rmSenhaBound = '1';
            btn.addEventListener('click', () => {
                const alvo = document.getElementById(btn.dataset.olhoPara);
                if (!alvo) return;
                const mostrar = alvo.type === 'password';
                alvo.type = mostrar ? 'text' : 'password';
                btn.setAttribute('aria-pressed', mostrar ? 'true' : 'false');
                btn.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
                btn.innerHTML = mostrar ? ICONE_OLHO_OFF : ICONE_OLHO;
            });
        });
    }

    /**
     * Botões [data-gerar-senha-para="id"] preenchem senha (e confirmação se data-gerar-confirma).
     * @param {ParentNode} [raiz]
     * @param {{ onGerou?: function(): void }} [opts]
     */
    function ligarGerador(raiz, opts) {
        const escopo = raiz || document;
        escopo.querySelectorAll('[data-gerar-senha-para]').forEach((btn) => {
            if (btn.dataset.rmGerarBound) return;
            btn.dataset.rmGerarBound = '1';
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-gerar-senha-para');
                const senha = id ? document.getElementById(id) : null;
                if (!senha) return;
                const gerada = gerarSenhaAleatoria(16);
                senha.type = 'text';
                senha.value = gerada;
                senha.dispatchEvent(new Event('input', { bubbles: true }));
                const idConf = btn.getAttribute('data-gerar-confirma');
                const confirma = idConf ? document.getElementById(idConf) : null;
                if (confirma) {
                    confirma.type = 'text';
                    confirma.value = gerada;
                    confirma.dispatchEvent(new Event('input', { bubbles: true }));
                }
                const olho = escopo.querySelector(`.senha-olho[data-olho-para="${id}"]`);
                if (olho) {
                    olho.setAttribute('aria-pressed', 'true');
                    olho.setAttribute('aria-label', 'Ocultar senha');
                    olho.innerHTML = ICONE_OLHO_OFF;
                }
                if (typeof opts?.onGerou === 'function') opts.onGerou();
                senha.focus();
                try {
                    senha.select();
                } catch (_) {
                    /* ignore */
                }
            });
        });
    }

    /**
     * @param {{ senha: HTMLInputElement, confirma?: HTMLInputElement, forcaBox?: HTMLElement, forcaTexto?: HTMLElement, matchTexto?: HTMLElement }} opts
     */
    function ligarParSenha(opts) {
        const { senha, confirma, forcaBox, forcaTexto, matchTexto } = opts || {};
        if (!senha) return { atualizar() {} };

        function atualizar() {
            aplicarForca(senha, forcaBox, forcaTexto);
            aplicarConfirmacao(senha, confirma, matchTexto);
        }

        senha.addEventListener('input', atualizar);
        confirma?.addEventListener('input', atualizar);
        const raiz = senha.form || document;
        ligarOlhos(raiz);
        ligarGerador(raiz, { onGerou: atualizar });
        atualizar();
        return { atualizar };
    }

    global.RoomMatchSenhaUi = {
        classificarSenha,
        gerarSenhaAleatoria,
        aplicarForca,
        aplicarConfirmacao,
        ligarOlhos,
        ligarGerador,
        ligarParSenha,
        ICONE_OLHO,
        ICONE_OLHO_OFF
    };
}(window));
