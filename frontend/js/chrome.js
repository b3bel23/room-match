/**
 * Liga navegação global da demo: Mensagens, config, Como funciona, Termos, Sair.
 * Também carrega o banner de cookies (LGPD) em todas as páginas.
 */
(function () {
    const MAPA = [
        ['a[href="#"]:not(.sair)', null],
    ];

    function garantirFaqNosMenus() {
        const jaTem = (nav) => [...nav.querySelectorAll('a')].some((a) => {
            const href = (a.getAttribute('href') || '').toLowerCase();
            return href.includes('faq.html') || (a.textContent || '').trim().toLowerCase() === 'faq';
        });

        document.querySelectorAll('.site-footer nav').forEach((nav) => {
            if (jaTem(nav)) return;
            const link = document.createElement('a');
            link.href = 'faq.html';
            link.textContent = 'FAQ';
            const termos = [...nav.querySelectorAll('a')].find((a) =>
                /termos/i.test(a.textContent || '')
            );
            if (termos) nav.insertBefore(link, termos);
            else nav.appendChild(link);
        });

        document.querySelectorAll('.nav-visitante, .nav-logado').forEach((nav) => {
            if (jaTem(nav)) return;
            const link = document.createElement('a');
            link.href = 'faq.html';
            link.textContent = 'FAQ';
            const ancora = [...nav.querySelectorAll('a')].find((a) =>
                /como funciona/i.test(a.textContent || '')
            );
            if (ancora && ancora.nextSibling) {
                ancora.parentNode.insertBefore(link, ancora.nextSibling);
            } else if (ancora) {
                ancora.after(link);
            } else {
                const btn = nav.querySelector('.btn');
                if (btn) nav.insertBefore(link, btn);
                else nav.appendChild(link);
            }
        });
    }

    function garantirCookieConsent() {
        if (document.querySelector('script[data-rm-cookies]')) return;
        const base = document.querySelector('script[src*="chrome.js"]')?.getAttribute('src') || '../js/chrome.js';
        const raizJs = base.replace(/chrome\.js(\?.*)?$/, '');
        const raizCss = raizJs.replace(/\/js\/?$/, '/css/');

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
        garantirFaqNosMenus();
        garantirCookieConsent();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}());
