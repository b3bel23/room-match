/**
 * Transições leves entre páginas e feedback de clique.
 */
(function () {
    const REDUZIDO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.documentElement.classList.add('js-motion');

    function entrar() {
        document.body.classList.add('pagina-pronta');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.requestAnimationFrame(entrar);
        });
    } else {
        window.requestAnimationFrame(entrar);
    }

    if (REDUZIDO) return;

    document.addEventListener('click', (evento) => {
        const link = evento.target.closest('a[href]');
        if (!link) return;
        if (evento.defaultPrevented || evento.button !== 0) return;
        if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;

        const href = link.getAttribute('href') || '';
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        if (link.target === '_blank' || link.hasAttribute('download')) return;
        if (link.getAttribute('aria-disabled') === 'true') return;

        let url;
        try {
            url = new URL(href, window.location.href);
        } catch (erro) {
            return;
        }
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) {
            return;
        }

        evento.preventDefault();
        document.body.classList.add('pagina-saindo');
        window.setTimeout(() => {
            window.location.href = url.href;
        }, 160);
    });
}());
