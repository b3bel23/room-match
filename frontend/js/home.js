if (typeof ehLocador === 'function' && ehLocador()) {
    window.location.replace('meus-imoveis.html');
}

const grade = document.querySelector('.properties');
const pills = [...document.querySelectorAll('.filter-bar .pill')];
const inputBairro = document.getElementById('filtro-bairro');
const inputPreco = document.getElementById('filtro-preco');
const textoPreco = document.getElementById('filtro-valor-texto');
const selectTag = document.getElementById('filtro-tag');
const botaoBuscar = document.querySelector('.filter-bar .btn-buscar');

const PRECO_MIN = Number(inputPreco?.min) || 500;
const PRECO_MAX = Number(inputPreco?.max) || 2500;
let tipoAtivo = 'Todos';
let debouncePreco = null;

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR');
}

function pinSvg() {
    return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';
}

function busSvg() {
    return '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="6" width="18" height="10" rx="2"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/></svg>';
}

function montarCard(imovel) {
    const card = document.createElement('article');
    card.className = 'card';
    card.tabIndex = 0;
    card.setAttribute('role', 'link');
    card.setAttribute('aria-label', imovel.titulo || 'Ver anúncio');

    const irDetalhe = () => {
        window.location.href = `detalhe.html?id=${encodeURIComponent(imovel.id)}`;
    };
    card.addEventListener('click', irDetalhe);
    card.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            irDetalhe();
        }
    });

    const logado = typeof estaLogado === 'function' && estaLogado();
    const match = imovel.match_percent ?? imovel.match;
    const tags = (imovel.tags || []).slice(0, 3)
        .map((t) => `<span class="tag">${t}</span>`)
        .join('');

    const badgeMatch = logado
        ? `<span class="badge-match" title="${match}% de afinidade">${match}%</span>`
        : '';
    const rodapeExtra = logado
        ? `<span class="commute">${busSvg()} ${imovel.deslocamento_min || '—'} min · ${imovel.destino || ''}</span>`
        : '';

    const fotos = typeof ImovelFotos !== 'undefined' ? ImovelFotos.lista(imovel) : [];
    card.innerHTML = `
        <div class="card-image" aria-hidden="true">
            <span class="badge">${imovel.badge || imovel.tipo || ''}</span>
            ${badgeMatch}
        </div>
        <div class="card-body">
            <div class="card-title">${imovel.titulo}</div>
            <div class="card-location">${pinSvg()} ${imovel.bairro}, ${imovel.cidade || 'Campinas'}</div>
            <div class="card-price">R$ ${formatarPreco(imovel.preco)}<span>/mês total</span></div>
            <div class="amenities">${tags}</div>
            <div class="card-footer">
                ${rodapeExtra}
                <span>${imovel.area_m2 || '—'} m²</span>
            </div>
        </div>
    `;

    const imagem = card.querySelector('.card-image');
    if (imagem && typeof ImovelFotos !== 'undefined') {
        ImovelFotos.iniciarCarrossel(imagem, fotos);
    }

    return card;
}

function preencherSelectTags() {
    if (!selectTag) return;
    const atual = selectTag.value;
    const opcoes = (typeof RoomMatchTags !== 'undefined' && RoomMatchTags.CONVIVENCIA)
        ? RoomMatchTags.CONVIVENCIA
        : [
            'Pet Friendly', 'Home Office', 'Silêncio Noturno', 'Sem Festas',
            'Sem Fumo', 'LGBTQIA+ Safe', 'Vegetariano', '420 Friendly', 'Sem Pets', 'Mobiliado'
        ];
    selectTag.replaceChildren(new Option('Todos os hábitos', ''));
    opcoes.forEach((tag) => selectTag.append(new Option(tag, tag)));
    if ([...selectTag.options].some((o) => o.value === atual)) {
        selectTag.value = atual;
    }
}

function atualizarSliderValor() {
    if (!inputPreco || !textoPreco) return;
    const valor = Number(inputPreco.value);
    const min = Number(inputPreco.min) || PRECO_MIN;
    const max = Number(inputPreco.max) || PRECO_MAX;
    const pct = max === min ? 100 : ((valor - min) / (max - min)) * 100;
    inputPreco.style.setProperty('--preenchimento', `${pct}%`);
    inputPreco.setAttribute('aria-valuenow', String(valor));

    if (valor >= max) {
        textoPreco.textContent = 'Sem limite';
    } else {
        textoPreco.textContent = `Até R$ ${formatarPreco(valor)}`;
    }
}

function lerFiltros() {
    const valor = Number(inputPreco?.value);
    const noLimite = !Number.isFinite(valor) || valor >= PRECO_MAX;
    const tipo = tipoAtivo === 'Todos' ? '' : tipoAtivo.replace(/\.$/, '');
    return {
        tipo,
        bairro: (inputBairro?.value || '').trim(),
        preco_max: noLimite ? '' : String(valor),
        tag: selectTag?.value || ''
    };
}

async function carregar() {
    if (!grade) return;
    grade.innerHTML = '<p class="cta-banner filtro-status" style="grid-column:1/-1">Carregando imóveis…</p>';
    try {
        const filtros = lerFiltros();
        const { items } = await RoomMatchApi.listarImoveis(filtros);
        if (!items.length) {
            grade.innerHTML = '<p class="cta-banner filtro-status" style="grid-column:1/-1">Nenhum imóvel com esses filtros. Ajuste valor, hábito ou tipo.</p>';
            return;
        }
        grade.replaceChildren(...items.map(montarCard));
    } catch (erro) {
        grade.innerHTML = `<p class="cta-banner filtro-status" style="grid-column:1/-1">Erro ao carregar: ${erro.message}</p>`;
    }
}

function agendarCarregar() {
    window.clearTimeout(debouncePreco);
    debouncePreco = window.setTimeout(carregar, 120);
}

pills.forEach((pill) => {
    pill.addEventListener('click', () => {
        pills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        tipoAtivo = pill.textContent.trim();
        carregar();
    });
});

botaoBuscar?.addEventListener('click', (evento) => {
    evento.preventDefault();
    carregar();
});

inputBairro?.addEventListener('input', agendarCarregar);
inputBairro?.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
        evento.preventDefault();
        carregar();
    }
});

inputPreco?.addEventListener('input', () => {
    atualizarSliderValor();
    agendarCarregar();
});
inputPreco?.addEventListener('change', () => {
    atualizarSliderValor();
    carregar();
});

selectTag?.addEventListener('change', () => {
    carregar();
});
selectTag?.addEventListener('input', () => {
    carregar();
});

preencherSelectTags();
atualizarSliderValor();
carregar();

function mostrarStatsLogado() {
    const logado = typeof estaLogado === 'function' && estaLogado();
    document.querySelectorAll('.stat-logado').forEach((el) => {
        el.hidden = !logado;
    });
}

async function carregarStats() {
    // Visitante: só "imóveis ativos". Match e deslocamento só logado.
    mostrarStatsLogado();
    try {
        const s = await RoomMatchApi.stats();
        const imoveis = document.querySelector('[data-stat="imoveis"] .stat-number');
        if (imoveis) imoveis.textContent = String(s.imoveis_ativos);

        if (typeof estaLogado === 'function' && estaLogado()) {
            const match = document.querySelector('[data-stat="match"] .stat-number');
            const desloc = document.querySelector('[data-stat="deslocamento"] .stat-number');
            if (match) match.textContent = `${s.match_medio}%`;
            if (desloc) desloc.textContent = `${s.deslocamento_medio} min`;
        }
    } catch (erro) {
        /* mantém placeholders */
    }
}

carregarStats();

const hero = document.querySelector('.hero');
if (hero && typeof ImovelFotos !== 'undefined') {
    ImovelFotos.iniciarCarrossel(hero, [
        '../assets/campinas/hero.jpg',
        '../assets/campinas/taquaral.jpg',
        '../assets/campinas/rua.jpg'
    ], { intervalo: 6500 });
}
