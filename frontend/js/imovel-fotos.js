/**
 * Fotos dos anúncios (demo). Paths relativos a /pages/*.html.
 * Backend futuro: campo `fotos[]` + `capa` no JSON do imóvel.
 */
(function (global) {
    const BASE = '../assets/imoveis';

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

    function preencherGaleria(imovel, opts = {}) {
        const principal = opts.principal || document.querySelector('.galeria-principal');
        const miniaturas = opts.miniaturas || [...document.querySelectorAll('.miniatura')];
        const fotos = lista(imovel);
        let indiceAtivo = 0;
        if (principal) aplicarFundo(principal, fotos[0]);
        atualizarLegenda(imovel, 0, opts.legendaEl);
        miniaturas.forEach((btn, i) => {
            const url = fotos[i];
            if (!url) {
                btn.hidden = true;
                return;
            }
            btn.hidden = false;
            aplicarFundo(btn, url);
            btn.setAttribute('aria-label', legenda(imovel, i));
            btn.onclick = () => {
                indiceAtivo = i;
                miniaturas.forEach((m) => m.classList.toggle('ativa', m === btn));
                aplicarFundo(principal, url);
                atualizarLegenda(imovel, i, opts.legendaEl);
            };
        });
    }

    global.ImovelFotos = {
        BASE,
        caminhosPadrao,
        lista,
        capa,
        aplicarFundo,
        preencherGaleria
    };
}(window));
