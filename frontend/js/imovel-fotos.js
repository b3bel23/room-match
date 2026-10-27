/**
 * Fotos dos anúncios. Paths relativos a /pages/*.html.
 * Backend futuro: campo `fotos[]` + `capa` no JSON do imóvel.
 */
(function (global) {
    const BASE = '../assets/imoveis';
    const INTERVALO_MS = 4200;
    const carrosseis = new WeakMap();

    function caminhosPadrao(id) {
        return [1, 2, 3, 4].map((n) => `${BASE}/${id}/${n}.jpg`);
    }

    function lista(imovel) {
        if (!imovel) return [`${BASE}/placeholder/1.jpg`];
        if (Array.isArray(imovel.fotos) && imovel.fotos.length) return imovel.fotos;
        if (imovel.capa) return [imovel.capa];
        if (imovel.id) return caminhosPadrao(imovel.id);
        return [`${BASE}/placeholder/1.jpg`];
    }

    function capa(imovel) {
        return lista(imovel)[0];
    }

    function aplicarFundo(el, url) {
        if (!el || !url) return;
        el.style.backgroundImage = `url("${url}")`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
    }

    function legenda(imovel, indice) {
        const legendas = imovel?.foto_legendas;
        if (Array.isArray(legendas) && legendas[indice]) return legendas[indice];
        return `Foto ${indice + 1}`;
    }

    function atualizarLegenda(imovel, indice, el) {
        const alvo = el || document.getElementById('galeria-legenda');
        if (alvo) alvo.textContent = legenda(imovel, indice);
    }

    function pararCarrossel(el) {
        const estado = carrosseis.get(el);
        if (!estado) return;
        window.clearInterval(estado.timer);
        carrosseis.delete(el);
    }

    /**
     * Crossfade automático em um container (card, header, capa).
     * Cria camadas .foto-slide internas.
     */
    function iniciarCarrossel(el, urls, opts = {}) {
        if (!el) return null;
        const fotos = (urls || []).filter(Boolean);
        pararCarrossel(el);

        if (fotos.length <= 1) {
            el.classList.add('foto-unica');
            aplicarFundo(el, fotos[0] || '');
            return null;
        }

        el.classList.add('foto-carrossel');
        el.classList.remove('foto-unica');
        el.style.backgroundImage = '';

        // Remove só slides antigos — preserva título/hero-inner/badges.
        el.querySelectorAll(':scope > .foto-slide').forEach((s) => s.remove());

        const ancora = el.firstChild;
        fotos.forEach((url, i) => {
            const slide = document.createElement('span');
            slide.className = `foto-slide${i === 0 ? ' ativo' : ''}`;
            slide.style.backgroundImage = `url("${url}")`;
            slide.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
            el.insertBefore(slide, ancora);
        });

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return null;
        }

        let indice = 0;
        const intervalo = opts.intervalo || INTERVALO_MS;
        const timer = window.setInterval(() => {
            const slides = [...el.querySelectorAll('.foto-slide')];
            if (!slides.length) return;
            slides[indice].classList.remove('ativo');
            slides[indice].setAttribute('aria-hidden', 'true');
            indice = (indice + 1) % slides.length;
            slides[indice].classList.add('ativo');
            slides[indice].setAttribute('aria-hidden', 'false');
            if (typeof opts.onChange === 'function') opts.onChange(indice, fotos[indice]);
        }, intervalo);

        const estado = { timer, fotos };
        carrosseis.set(el, estado);
        return estado;
    }

    function preencherGaleria(imovel, opts = {}) {
        const principal = opts.principal || document.querySelector('.galeria-principal');
        const miniaturas = opts.miniaturas || [...document.querySelectorAll('.miniatura')];
        const fotos = lista(imovel);
        let indiceAtivo = 0;

        if (principal) {
            iniciarCarrossel(principal, fotos, {
                onChange: (i) => {
                    indiceAtivo = i;
                    atualizarLegenda(imovel, i, opts.legendaEl);
                    miniaturas.forEach((m, mi) => m.classList.toggle('ativa', mi === i));
                }
            });
        }
        atualizarLegenda(imovel, 0, opts.legendaEl);

        miniaturas.forEach((btn, i) => {
            const url = fotos[i];
            if (!url) {
                btn.hidden = true;
                return;
            }
            btn.hidden = false;
            iniciarCarrossel(btn, [url]);
            btn.setAttribute('aria-label', legenda(imovel, i));
            btn.onclick = () => {
                indiceAtivo = i;
                miniaturas.forEach((m) => m.classList.toggle('ativa', m === btn));
                pararCarrossel(principal);
                aplicarFundo(principal, url);
                principal?.querySelectorAll?.('.foto-slide')?.forEach((s) => s.remove());
                principal?.classList.remove('foto-carrossel');
                atualizarLegenda(imovel, i, opts.legendaEl);
                window.setTimeout(() => {
                    iniciarCarrossel(principal, fotos, {
                        onChange: (idx) => {
                            atualizarLegenda(imovel, idx, opts.legendaEl);
                            miniaturas.forEach((m, mi) => m.classList.toggle('ativa', mi === idx));
                        }
                    });
                    const slides = [...(principal?.querySelectorAll('.foto-slide') || [])];
                    slides.forEach((s, si) => s.classList.toggle('ativo', si === indiceAtivo));
                }, 5000);
            };
        });
    }

    global.ImovelFotos = {
        BASE,
        caminhosPadrao,
        lista,
        capa,
        aplicarFundo,
        iniciarCarrossel,
        pararCarrossel,
        preencherGaleria
    };
}(window));
