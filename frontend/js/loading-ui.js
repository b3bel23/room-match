/**
 * Feedback de espera fluido: overlay com % + barra leve.
 * Uso: RoomMatchLoading.durante(promessa, 'Carregando…')
 *
 * A % é estimativa (API sem Content-Length): sobe rápido no início e
 * desacelera perto de ~90%; ao terminar vai a 100% e some.
 */
(function (global) {
    const REDUZIDO = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let camada = null;
    let contagem = 0;
    let progresso = 0;
    let ultimoPctVisivel = -1;
    let tickId = null;
    let hideTimer = null;
    let inicioTick = 0;

    const LOGO_SRC = '../assets/logo-animado.svg?v=20261124af';

    function htmlLogo(tamanho) {
        // object/img com SMIL: anima mesmo quando CSS interno de SVG-em-<img> falha.
        const w = tamanho === 'inline' ? 112 : 156;
        const h = tamanho === 'inline' ? 63 : 87;
        return (
            '<div class="rm-loading-logo-wrap' + (tamanho === 'inline' ? ' rm-loading-logo-wrap--inline' : '') + '" aria-hidden="true">' +
            '<object class="rm-loading-logo" type="image/svg+xml" data="' + LOGO_SRC +
            '" width="' + w + '" height="' + h + '" tabindex="-1">' +
            '<img class="rm-loading-logo" src="' + LOGO_SRC + '" width="' + w + '" height="' + h + '" alt="">' +
            '</object>' +
            '</div>'
        );
    }

    function garantir() {
        if (camada) return camada;
        camada = document.createElement('div');
        camada.id = 'rm-loading';
        camada.className = 'rm-loading';
        camada.hidden = true;
        camada.setAttribute('role', 'progressbar');
        camada.setAttribute('aria-live', 'polite');
        camada.setAttribute('aria-busy', 'true');
        camada.setAttribute('aria-valuemin', '0');
        camada.setAttribute('aria-valuemax', '100');
        camada.setAttribute('aria-valuenow', '0');
        camada.innerHTML =
            '<div class="rm-loading-card">' +
            htmlLogo('card') +
            '<p class="rm-loading-texto">Carregando…</p>' +
            '<div class="rm-loading-barra" aria-hidden="true">' +
            '<div class="rm-loading-barra-fill"></div>' +
            '</div>' +
            '<span class="rm-loading-pct">0%</span>' +
            '</div>';
        // Fora do body: o fade de página (opacity no body) não some com o overlay.
        document.documentElement.append(camada);
        return camada;
    }

    function definirTexto(texto) {
        const el = garantir();
        const p = el.querySelector('.rm-loading-texto');
        if (p) p.textContent = texto || 'Carregando…';
    }

    /** Garante 1 frame pintado com o overlay visível antes de seguir (API rápida). */
    function aguardarPaint() {
        return new Promise((resolve) => {
            global.requestAnimationFrame(() => {
                global.requestAnimationFrame(resolve);
            });
        });
    }

    function pararTick() {
        if (tickId != null) {
            global.cancelAnimationFrame(tickId);
            tickId = null;
        }
    }

    function pintarProgresso(valor, { forcar = false } = {}) {
        progresso = Math.max(0, Math.min(100, valor));
        const arred = Math.round(progresso);
        // Evita spam de textContent a cada frame (só muda o rótulo quando a % muda).
        if (!forcar && arred === ultimoPctVisivel) {
            const fill = camada && camada.querySelector('.rm-loading-barra-fill');
            if (fill) fill.style.transform = `scaleX(${progresso / 100})`;
            return;
        }
        ultimoPctVisivel = arred;
        const el = garantir();
        const pct = el.querySelector('.rm-loading-pct');
        const fill = el.querySelector('.rm-loading-barra-fill');
        if (pct) pct.textContent = `${arred}%`;
        if (fill) fill.style.transform = `scaleX(${progresso / 100})`;
        el.setAttribute('aria-valuenow', String(arred));
        el.setAttribute('aria-valuetext', `${arred} por cento`);
    }

    function tickProgresso(agora) {
        if (contagem <= 0) return;
        // Curva suave: sobe rápido → asymptote ~92% (não “trava” em 99% eternamente).
        const t = Math.max(0, (agora - inicioTick) / 1000);
        const alvo = 92 * (1 - Math.exp(-t / 1.15));
        if (alvo > progresso) pintarProgresso(alvo);
        tickId = global.requestAnimationFrame(tickProgresso);
    }

    function iniciarProgresso({ reiniciar = true } = {}) {
        pararTick();
        if (hideTimer) {
            global.clearTimeout(hideTimer);
            hideTimer = null;
        }
        if (reiniciar) {
            progresso = 0;
            ultimoPctVisivel = -1;
            pintarProgresso(0, { forcar: true });
            inicioTick = performance.now();
        }
        if (REDUZIDO) {
            // Sem animação contínua: mostra 30% estático até concluir.
            pintarProgresso(Math.max(progresso, 30), { forcar: true });
            return;
        }
        tickId = global.requestAnimationFrame(tickProgresso);
    }

    function completarESumir(aoSumir) {
        pararTick();
        pintarProgresso(100, { forcar: true });
        const espera = REDUZIDO ? 0 : 220;
        if (hideTimer) global.clearTimeout(hideTimer);
        hideTimer = global.setTimeout(() => {
            hideTimer = null;
            aoSumir();
            progresso = 0;
            ultimoPctVisivel = -1;
        }, espera);
    }

    function mostrar(texto) {
        const el = garantir();
        definirTexto(texto);
        const jaVisivel = contagem > 0 && !el.hidden;
        contagem += 1;
        el.hidden = false;
        // Força reflow para o browser pintar antes de um await curto.
        void el.offsetWidth;
        document.documentElement.classList.add('rm-loading-ativa');
        document.body.classList.add('rm-loading-ativa');
        iniciarProgresso({ reiniciar: !jaVisivel });
    }

    function esconder() {
        contagem = Math.max(0, contagem - 1);
        if (contagem > 0 || !camada) return;
        completarESumir(() => {
            if (contagem > 0) return; // outro mostrar() entrou no meio
            camada.hidden = true;
            document.documentElement.classList.remove('rm-loading-ativa');
            document.body.classList.remove('rm-loading-ativa');
        });
    }

    function forcarEsconder() {
        contagem = 0;
        if (!camada) return;
        completarESumir(() => {
            if (contagem > 0) return;
            camada.hidden = true;
            document.documentElement.classList.remove('rm-loading-ativa');
            document.body.classList.remove('rm-loading-ativa');
        });
    }

    async function durante(promessaOuFn, texto) {
        mostrar(texto);
        try {
            const valor = typeof promessaOuFn === 'function' ? promessaOuFn() : promessaOuFn;
            return await valor;
        } finally {
            esconder();
        }
    }

    function htmlInline(texto) {
        return (
            '<div class="rm-loading-inline" role="status" aria-live="polite">' +
            htmlLogo('inline') +
            '<p>' + (texto || 'Carregando…') + '</p>' +
            '</div>'
        );
    }

    function htmlSkeleton(qtd) {
        const n = Math.max(1, Number(qtd) || 3);
        let cards = '';
        for (let i = 0; i < n; i += 1) {
            cards += '<div class="rm-skeleton-card" aria-hidden="true"></div>';
        }
        return (
            '<div class="rm-skeleton-grid" role="status" aria-live="polite" aria-label="Carregando">' +
            cards +
            '</div>'
        );
    }

    function preencherInline(container, texto) {
        if (!container) return;
        container.innerHTML = htmlInline(texto);
    }

    function preencherSkeleton(container, qtd) {
        if (!container) return;
        container.innerHTML = htmlSkeleton(qtd);
    }

    function botaoEspera(botao, ocupado, rotuloOcupado) {
        if (!botao) return;
        if (ocupado) {
            if (!botao.dataset.rmLabel) botao.dataset.rmLabel = botao.textContent;
            botao.disabled = true;
            botao.setAttribute('aria-busy', 'true');
            if (rotuloOcupado) botao.textContent = rotuloOcupado;
            return;
        }
        botao.disabled = false;
        botao.removeAttribute('aria-busy');
        if (botao.dataset.rmLabel) {
            botao.textContent = botao.dataset.rmLabel;
            delete botao.dataset.rmLabel;
        }
    }

    /** Shimmer nos números do hero (afinidade, deslocamento, imóveis…). */
    function pulsarStats(raiz) {
        const escopo = raiz || document;
        escopo.querySelectorAll('[data-stat] .stat-number').forEach((el) => {
            el.classList.remove('is-ready');
            el.classList.add('is-loading');
            el.setAttribute('aria-busy', 'true');
            if (!el.dataset.rmPrev) el.dataset.rmPrev = el.textContent;
            el.textContent = '\u00a0';
        });
    }

    function definirStat(chave, texto) {
        const el = document.querySelector(`[data-stat="${chave}"] .stat-number`);
        if (!el) return;
        el.classList.remove('is-loading');
        el.removeAttribute('aria-busy');
        el.textContent = texto;
        el.classList.remove('is-ready');
        void el.offsetWidth;
        el.classList.add('is-ready');
        delete el.dataset.rmPrev;
    }

    global.RoomMatchLoading = {
        mostrar,
        esconder,
        forcarEsconder,
        definirTexto,
        aguardarPaint,
        durante,
        htmlInline,
        htmlSkeleton,
        preencherInline,
        preencherSkeleton,
        botaoEspera,
        pulsarStats,
        definirStat,
        reduzido: REDUZIDO
    };
}(window));
