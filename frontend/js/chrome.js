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

        document.querySelectorAll('.nav-visitante, .nav-logado').forEach((nav) => {
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
        script.src = `${raizJs}face-check.js`;
        script.dataset.rmFaceCheck = '1';
        script.onload = () => {
            if (typeof RoomMatchFaceCheck !== 'undefined') {
                RoomMatchFaceCheck.aquecer();
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
                window.alert(conversar.title || 'Chat bloqueado: ajuste limiar/orçamento nas preferências.');
                return;
            }
            const id = new URLSearchParams(window.location.search).get('id') || 'kitnet-cambui';
            try {
                const conv = await RoomMatchApi.abrirConversa({ imovel_id: id });
                window.location.href = `mensagens.html?id=${encodeURIComponent(conv.id)}`;
            } catch (erro) {
                window.alert(erro.detail || erro.message);
            }
        });
    }

    function boot() {
        aplicar();
        garantirLinksAjudaNosMenus();
        garantirCookieConsent();
        garantirFaceCheck();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}());
