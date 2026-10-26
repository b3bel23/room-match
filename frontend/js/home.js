if (typeof ehLocador === 'function' && ehLocador()) {
    window.location.replace('meus-imoveis.html');
}

const grade = document.querySelector('.properties');
const pills = [...document.querySelectorAll('.filter-bar .pill')];
const inputs = [...document.querySelectorAll('.filter-bar .search-input input')];
const botaoBuscar = document.querySelector('.filter-bar .btn-buscar');

let tipoAtivo = 'Todos';

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
    const card = document.createElement('div');
    card.className = 'card';
    card.addEventListener('click', () => {
        window.location.href = `detalhe.html?id=${encodeURIComponent(imovel.id)}`;
    });

    const match = imovel.match_percent ?? imovel.match;
    const tags = (imovel.tags || []).slice(0, 3)
        .map((t, i) => `<span class="tag${i === 0 ? '' : ''}">${t}</span>`)
        .join('');

    const capaUrl = typeof ImovelFotos !== 'undefined' ? ImovelFotos.capa(imovel) : '';
    card.innerHTML = `
        <div class="card-image"${capaUrl ? ` style="background-image:url('${capaUrl}')"` : ''}>
            <span class="badge">${imovel.badge || imovel.tipo || ''}</span>
            <span class="badge-match">${match}% match</span>
        </div>
        <div class="card-body">
            <div class="card-title">${imovel.titulo}</div>
            <div class="card-location">${pinSvg()} ${imovel.bairro}, ${imovel.cidade || 'Campinas'}</div>
            <div class="card-price">R$ ${formatarPreco(imovel.preco)}<span>/mês total</span></div>
            <div class="amenities">${tags}</div>
            <div class="card-footer">
                <span class="commute">${busSvg()} ${imovel.deslocamento_min || '—'} min · ${imovel.destino || ''}</span>
                <span>${imovel.area_m2 || '—'} m²</span>
            </div>
        </div>
    `;
    return card;
}

function lerFiltros() {
    const precoBruto = (inputs[1]?.value || '').replace(/[^\d]/g, '');
    return {
        tipo: tipoAtivo === 'Todos' ? '' : tipoAtivo.replace(/\.$/, ''),
        bairro: inputs[0]?.value.trim() || '',
        preco_max: precoBruto || '',
        tag: inputs[2]?.value.trim() || ''
    };
}

async function carregar() {
    if (!grade) return;
    grade.innerHTML = '<p class="cta-banner" style="grid-column:1/-1">Carregando imóveis…</p>';
    try {
        const { items } = await RoomMatchApi.listarImoveis(lerFiltros());
        if (!items.length) {
            grade.innerHTML = '<p class="cta-banner" style="grid-column:1/-1">Nenhum imóvel com esses filtros.</p>';
            return;
        }
        grade.replaceChildren(...items.map(montarCard));
    } catch (erro) {
        grade.innerHTML = `<p class="cta-banner" style="grid-column:1/-1">Erro ao carregar: ${erro.message}</p>`;
    }
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

inputs.forEach((input) => {
    input.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            carregar();
        }
    });
});

async function carregarStats() {
    try {
        const s = await RoomMatchApi.stats();
        const nums = document.querySelectorAll('.stats .stat-number');
        if (nums[0]) nums[0].textContent = String(s.imoveis_ativos);
        if (nums[1]) nums[1].textContent = `${s.match_medio}%`;
        if (nums[2]) nums[2].textContent = `${s.deslocamento_medio} min`;
    } catch (erro) {
        /* mantém placeholders */
    }
}

carregar();
carregarStats();
