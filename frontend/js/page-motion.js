/**
 * Transições leves entre páginas e feedback de clique.
 * Depende de loading-ui.js quando disponível (overlay de espera).
 */
(function () {
    const REDUZIDO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SAIDA_MS = REDUZIDO ? 0 : 220;

    document.documentElement.classList.add('js-motion');

    // Splash com logo: 1ª visita da aba OU após clique de navegação (“Entrar”, etc.).
    let splashEntrada = false;
    try {
        const aposNav = sessionStorage.getItem('rm-nav-logo') === '1';
        if (aposNav) sessionStorage.removeItem('rm-nav-logo');
        const primeira = !sessionStorage.getItem('rm-splash-visto');
        splashEntrada = !REDUZIDO && !!window.RoomMatchLoading && (primeira || aposNav);
        if (primeira) sessionStorage.setItem('rm-splash-visto', '1');
    } catch (erro) {
        splashEntrada = !REDUZIDO && !!window.RoomMatchLoading;
    }
    if (splashEntrada) {
        window.RoomMatchLoading.mostrar(
            /login\.html/i.test(window.location.pathname) ? 'Entrando…' : 'Abrindo…'
        );
    }

    function entrar() {
        document.body.classList.add('pagina-pronta');
        if (splashEntrada) {
            // Um ciclo do logo (~2.4s) perceptível.
            window.setTimeout(() => {
                if (window.RoomMatchLoading) window.RoomMatchLoading.esconder();
            }, 1800);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.requestAnimationFrame(entrar);
        });
    } else {
        window.requestAnimationFrame(entrar);
    }

    // Ao voltar pelo histórico, o navegador restaura a página como ela estava ao sair
    // (já esmaecida); aqui ela volta a ficar visível.
    window.addEventListener('pageshow', (evento) => {
        if (evento.persisted) {
            document.body.classList.remove('pagina-saindo');
            if (window.RoomMatchLoading) window.RoomMatchLoading.forcarEsconder();
        }
    });

    function selectEstaAberto(select) {
        if (document.activeElement !== select) return false;
        try {
            return select.matches(':open');
        } catch (erro) {
            return true;
        }
    }

    function envolverSelects(raiz) {
        const escopo = raiz && raiz.querySelectorAll ? raiz : document;
        escopo.querySelectorAll('select').forEach((select) => {
            if (select.multiple || select.size > 1) return;
            if (select.closest('.rm-select-wrap')) return;
            if (select.dataset.rmSelectSkip === '1') return;
            // Select escondido que só guarda o valor dos chips/busca: sem seta visível.
            if (select.classList.contains('escolha-select-sync')) return;

            const wrap = document.createElement('span');
            wrap.className = 'rm-select-wrap';
            select.parentNode.insertBefore(wrap, select);
            wrap.appendChild(select);

            const syncAberto = () => {
                wrap.classList.toggle('rm-select-aberto', selectEstaAberto(select));
            };

            select.addEventListener('focus', () => {
                wrap.classList.add('rm-select-aberto');
            });
            select.addEventListener('blur', () => {
                wrap.classList.remove('rm-select-aberto');
            });
            select.addEventListener('mousedown', () => {
                window.requestAnimationFrame(syncAberto);
            });
            select.addEventListener('keydown', (evento) => {
                if (evento.key === 'Enter' || evento.key === ' ' || evento.key === 'ArrowDown') {
                    window.requestAnimationFrame(syncAberto);
                }
            });
            select.addEventListener('change', () => {
                wrap.classList.remove('rm-select-aberto');
                if (REDUZIDO) return;
                select.classList.remove('rm-select-escolhido');
                void select.offsetWidth;
                select.classList.add('rm-select-escolhido');
            });
            select.addEventListener('animationend', (evento) => {
                if (evento.animationName === 'rm-select-escolha') {
                    select.classList.remove('rm-select-escolhido');
                }
            });
        });
    }

    const iniciarSelects = () => envolverSelects(document);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarSelects);
    } else {
        iniciarSelects();
    }
    document.addEventListener('rm:selects-refresh', iniciarSelects);

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
        // Overlay no <html> (não some com o fade do body).
        try { sessionStorage.setItem('rm-nav-logo', '1'); } catch (erro) { /* ignore */ }
        if (window.RoomMatchLoading) {
            const rotulo = /login\.html/i.test(url.pathname) ? 'Entrando…' : 'Abrindo…';
            window.RoomMatchLoading.mostrar(rotulo);
        }
        document.body.classList.add('pagina-saindo');
        // Mantém o logo animado um pouco visível antes de trocar de página.
        const espera = Math.max(SAIDA_MS, 700);
        window.setTimeout(() => {
            window.location.href = url.href;
        }, espera);
    });
}());
