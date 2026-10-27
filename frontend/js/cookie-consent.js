/**
 * Banner LGPD / cookies — primeira visita no site estático RoomMatch.
 * Persistência: localStorage `roommatch-cookie-consent`.
 */
(function (global) {
    const CHAVE = 'roommatch-cookie-consent';
    const VERSAO = 1;

    function ler() {
        try {
            const raw = localStorage.getItem(CHAVE);
            if (!raw) return null;
            const dados = JSON.parse(raw);
            if (!dados || dados.v !== VERSAO) return null;
            return dados;
        } catch (erro) {
            return null;
        }
    }

    function salvar(escolha) {
        const dados = {
            v: VERSAO,
            em: new Date().toISOString(),
            essenciais: true,
            preferencias: Boolean(escolha.preferencias),
            analiticos: Boolean(escolha.analiticos)
        };
        try {
            localStorage.setItem(CHAVE, JSON.stringify(dados));
        } catch (erro) {
            /* ignore quota */
        }
        return dados;
    }

    function jaRespondeu() {
        return Boolean(ler());
    }

    function fechar(overlay) {
        overlay?.remove();
        document.documentElement.classList.remove('rm-cookie-aberto');
    }

    function montar() {
        if (jaRespondeu() || document.getElementById('rm-cookie-overlay')) return;

        document.documentElement.classList.add('rm-cookie-aberto');

        const overlay = document.createElement('div');
        overlay.id = 'rm-cookie-overlay';
        overlay.className = 'rm-cookie-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'rm-cookie-titulo');

        overlay.innerHTML = `
            <div class="rm-cookie-dialog">
                <h2 id="rm-cookie-titulo">Usamos cookies e tecnologias semelhantes</h2>
                <p>
                    O RoomMatch usa cookies e armazenamento local para manter sua sessão,
                    lembrar preferências, medir uso da demo e melhorar a busca por moradia
                    compatível. Parte do processamento pode envolver serviços de terceiros.
                    Você escolhe o que autorizar — o essencial para o site funcionar permanece ativo.
                </p>
                <div class="rm-cookie-config" id="rm-cookie-config" hidden>
                    <label>
                        <input type="checkbox" checked disabled>
                        <span><strong>Essenciais</strong>Sessão, segurança e funcionamento do site (obrigatório).</span>
                    </label>
                    <label>
                        <input type="checkbox" id="rm-cookie-pref" checked>
                        <span><strong>Preferências</strong>Lembrar filtros, papel e ajustes da interface.</span>
                    </label>
                    <label>
                        <input type="checkbox" id="rm-cookie-ana" checked>
                        <span><strong>Analíticos</strong>Entender como a demo é usada (agregado, sem vender dados).</span>
                    </label>
                </div>
                <div class="rm-cookie-acoes">
                    <button type="button" class="rm-cookie-btn-sec" data-acao="recusar">Recusar</button>
                    <button type="button" class="rm-cookie-btn-sec" data-acao="config">Configurações</button>
                    <button type="button" class="rm-cookie-btn-pri" data-acao="aceitar">Aceitar tudo</button>
                </div>
                <div class="rm-cookie-links">
                    <a href="faq.html">FAQ</a>
                    <a href="termos.html">Termos de uso</a>
                    <a href="termos.html#privacidade">Aviso de privacidade</a>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const config = overlay.querySelector('#rm-cookie-config');
        const btnConfig = overlay.querySelector('[data-acao="config"]');
        const btnAceitar = overlay.querySelector('[data-acao="aceitar"]');

        overlay.addEventListener('click', (evento) => {
            const acao = evento.target.closest('[data-acao]')?.dataset?.acao;
            if (!acao) return;

            if (acao === 'config') {
                const aberto = config.classList.toggle('aberto');
                config.hidden = !aberto;
                btnConfig.textContent = aberto ? 'Ocultar' : 'Configurações';
                btnAceitar.textContent = aberto ? 'Salvar escolhas' : 'Aceitar tudo';
                return;
            }

            if (acao === 'recusar') {
                salvar({ preferencias: false, analiticos: false });
                fechar(overlay);
                return;
            }

            if (acao === 'aceitar') {
                if (config.classList.contains('aberto')) {
                    salvar({
                        preferencias: overlay.querySelector('#rm-cookie-pref').checked,
                        analiticos: overlay.querySelector('#rm-cookie-ana').checked
                    });
                } else {
                    salvar({ preferencias: true, analiticos: true });
                }
                fechar(overlay);
            }
        });

        overlay.querySelector('[data-acao="aceitar"]')?.focus();
    }

    function iniciar() {
        if (jaRespondeu()) return;
        montar();
    }

    global.RoomMatchCookies = {
        ler,
        reset() {
            try {
                localStorage.removeItem(CHAVE);
            } catch (erro) {
                /* ignore */
            }
            montar();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
}(window));
