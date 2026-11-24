/**
 * Liga navegação global: Mensagens, config, Como funciona, Termos, Sair.
 * Também carrega o banner de cookies (LGPD) em todas as páginas.
 */
(function () {
    const MAPA = [
        ['a[href="#"]:not(.sair)', null],
    ];

    function garantirLinkAjuda(nav, { href, label, antesDe }, aposSeletorTexto) {
        const jaTem = [...nav.querySelectorAll('a')].some((a) => {
            const h = (a.getAttribute('href') || '').toLowerCase();
            const t = (a.textContent || '').trim().toLowerCase();
            return h.includes(href) || t === label.toLowerCase();
        });
        if (jaTem) return;

        const link = document.createElement('a');
        link.href = href;
        link.textContent = label;

        if (antesDe) {
            const alvo = [...nav.querySelectorAll('a')].find((a) =>
                antesDe.test(a.textContent || '')
            );
            if (alvo) {
                nav.insertBefore(link, alvo);
                return;
            }
        }

        if (aposSeletorTexto) {
            const ancora = [...nav.querySelectorAll('a')].find((a) =>
                aposSeletorTexto.test(a.textContent || '')
            );
            if (ancora) {
                ancora.after(link);
                return;
            }
        }

        const btn = nav.querySelector('.btn');
        if (btn) nav.insertBefore(link, btn);
        else nav.appendChild(link);
    }

    function garantirLinksAjudaNosMenus() {
        document.querySelectorAll('.site-footer nav').forEach((nav) => {
            garantirLinkAjuda(nav, { href: 'sobre.html', label: 'Sobre nós', antesDe: /faq|contato|termos/i });
            garantirLinkAjuda(nav, { href: 'faq.html', label: 'FAQ', antesDe: /termos/i });
            garantirLinkAjuda(nav, { href: 'contato.html', label: 'Contato', antesDe: /termos/i });
        });

        document.querySelectorAll('.nav-visitante').forEach((nav) => {
            garantirLinkAjuda(nav, {
                href: 'sobre.html',
                label: 'Sobre nós',
                antesDe: null
            }, /como funciona/i);
            garantirLinkAjuda(nav, {
                href: 'faq.html',
                label: 'FAQ',
                antesDe: null
            }, /sobre nós/i);
            garantirLinkAjuda(nav, {
                href: 'contato.html',
                label: 'Contato',
                antesDe: null
            }, /^faq$/i);
        });
    }

    // Botão "Voltar": vai para a tela anterior do usuário; se ele abriu a página
    // direto (sem tela anterior no site), segue o link como alternativa.
    function ligarBotoesVoltar() {
        document.addEventListener('click', (evento) => {
            const link = evento.target.closest('a[data-voltar]');
            if (!link) return;
            const veioDoSite = document.referrer.startsWith(window.location.origin);
            if (veioDoSite && window.history.length > 1) {
                evento.preventDefault();
                window.history.back();
            }
        });
    }

    function raizScripts() {
        const base = document.querySelector('script[src*="chrome.js"]')?.getAttribute('src') || '../js/chrome.js';
        const raizJs = base.replace(/chrome\.js(\?.*)?$/, '');
        const raizCss = raizJs.replace(/\/js\/?$/, '/css/');
        return { raizJs, raizCss };
    }

    function garantirCookieConsent() {
        if (document.querySelector('script[data-rm-cookies]')) return;
        const { raizJs, raizCss } = raizScripts();

        if (!document.querySelector('link[data-rm-cookies]')) {
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = `${raizCss}cookie-consent.css`;
            css.dataset.rmCookies = '1';
            document.head.appendChild(css);
        }

        const script = document.createElement('script');
        script.src = `${raizJs}cookie-consent.js`;
        script.dataset.rmCookies = '1';
        document.body.appendChild(script);
    }

    /** Garante face-check em qualquer página com input de foto de perfil. */
    function garantirFaceCheck() {
        const precisa = document.querySelector('input[data-face-perfil], input#foto, input#perfil-foto');
        if (!precisa) return;
        if (document.querySelector('script[src*="face-check.js"]')) {
            if (typeof RoomMatchFaceCheck !== 'undefined') RoomMatchFaceCheck.aquecer();
            return;
        }
        const { raizJs } = raizScripts();
        const script = document.createElement('script');
        script.src = `${raizJs}face-check.js?v=20261124`;
        script.dataset.rmFaceCheck = '1';
        script.onload = () => {
            if (typeof RoomMatchFaceCheck !== 'undefined') {
                RoomMatchFaceCheck.aquecer();
            }
        };
        document.body.appendChild(script);
    }

    /** Garante verificador de telefone BR em cadastro/perfil. */
    function garantirTelefoneUi() {
        const precisa = document.querySelector(
            'input[data-tel-br], input#telefone, input#perfil-telefone, input[name="telefone"][type="tel"]'
        );
        if (!precisa) return;
        if (document.querySelector('script[src*="telefone-ui.js"]')) {
            if (typeof RoomMatchTelefone !== 'undefined') RoomMatchTelefone.ligarPagina();
            return;
        }
        const { raizJs } = raizScripts();
        const script = document.createElement('script');
        script.src = `${raizJs}telefone-ui.js?v=20261124`;
        script.dataset.rmTelUi = '1';
        script.onload = () => {
            if (typeof RoomMatchTelefone !== 'undefined') {
                RoomMatchTelefone.ligarPagina();
            }
        };
        document.body.appendChild(script);
    }

    /** Garante verificador de e-mail em cadastro/perfil. */
    function garantirEmailUi() {
        const precisa = document.querySelector(
            'input[data-email-rm], input#email, input#perfil-email, input[type="email"][name="email"]'
        );
        if (!precisa) return;
        if (document.querySelector('script[src*="email-ui.js"]')) {
            if (typeof RoomMatchEmail !== 'undefined') RoomMatchEmail.ligarPagina();
            return;
        }
        const { raizJs } = raizScripts();
        const script = document.createElement('script');
        script.src = `${raizJs}email-ui.js?v=20261124`;
        script.dataset.rmEmailUi = '1';
        script.onload = () => {
            if (typeof RoomMatchEmail !== 'undefined') {
                RoomMatchEmail.ligarPagina();
            }
        };
        document.body.appendChild(script);
    }

    function trocar(seletorTexto, href) {
        document.querySelectorAll('a').forEach((a) => {
            const t = (a.textContent || '').trim().toLowerCase();
            if (t === seletorTexto.toLowerCase() && (a.getAttribute('href') === '#' || !a.getAttribute('href'))) {
                a.setAttribute('href', href);
            }
        });
    }

    function aplicar() {
        trocar('mensagens', 'mensagens.html');
        trocar('perfil', 'perfil.html');
        trocar('preferências', 'preferencias.html');
        trocar('preferencias', 'preferencias.html');
        trocar('segurança', 'seguranca.html');
        trocar('seguranca', 'seguranca.html');
        trocar('termos', 'termos.html');
        trocar('termos e privacidade', 'termos.html');
        trocar('como funciona', 'como-funciona.html');
        trocar('conversar com locador', '#conversar');
        trocar('esqueci minha senha', 'recuperar-senha.html');
        trocar('meus anúncios', 'meus-imoveis.html');
        trocar('ir para meus anúncios', 'meus-imoveis.html');

        document.querySelectorAll('a.usuario, a.nav-usuario, .usuario, .nav-usuario').forEach((el) => {
            if (el.tagName === 'A') {
                el.setAttribute('href', 'perfil.html');
                return;
            }
            if (typeof estaLogado === 'function' && estaLogado()) {
                el.style.cursor = 'pointer';
                el.title = 'Abrir perfil';
                el.addEventListener('click', () => { window.location.href = 'perfil.html'; });
            }
        });

        document.addEventListener('click', async (evento) => {
            const conversar = evento.target.closest('a[href="#conversar"], a.btn-conversar');
            if (!conversar) return;
            if (conversar.getAttribute('href') !== '#conversar' && !conversar.classList.contains('btn-conversar')) {
                return;
            }
            evento.preventDefault();
            if (!estaLogado()) {
                window.location.href = 'login.html';
                return;
            }
            if (typeof ehLocador === 'function' && ehLocador()) {
                window.location.href = 'mensagens.html';
                return;
            }
            if (conversar.getAttribute('aria-disabled') === 'true') {
                const msg = conversar.dataset.bloqueioMsg
                    || conversar.title
                    || 'A conversa ainda não está liberada. Veja o aviso abaixo do botão ou ajuste suas Preferências.';
                window.alert(msg);
                const aviso = document.getElementById('chat-bloqueio');
                if (aviso && !aviso.hidden) {
                    aviso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                return;
            }
            const id = (new URLSearchParams(window.location.search).get('id') || '').trim();
            if (!id) {
                window.alert('Abra um anúncio pelo mural antes de conversar.');
                return;
            }
            if (typeof RoomMatchLoading !== 'undefined') {
                RoomMatchLoading.mostrar('Abrindo conversa…');
            }
            try {
                const conv = await RoomMatchApi.abrirConversa({ imovel_id: id });
                window.location.href = `mensagens.html?id=${encodeURIComponent(conv.id)}`;
            } catch (erro) {
                if (typeof RoomMatchLoading !== 'undefined') {
                    RoomMatchLoading.forcarEsconder();
                }
                window.alert(erro.detail || erro.message);
            }
        });
    }

    function boot() {
        aplicar();
        garantirLinksAjudaNosMenus();
        ligarBotoesVoltar();
        garantirCookieConsent();
        garantirFaceCheck();
        garantirTelefoneUi();
        garantirEmailUi();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}());
