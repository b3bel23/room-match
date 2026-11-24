if (typeof ehLocador === 'function' && ehLocador()) {
    window.location.replace('meus-imoveis.html');
}

const grade = document.querySelector('.properties');
const pills = [...document.querySelectorAll('.filter-bar .pill')];
const inputBairro = document.getElementById('filtro-bairro');
const listaSugestoesBairro = document.getElementById('filtro-bairro-sugestoes');
const inputPreco = document.getElementById('filtro-preco');
const textoPreco = document.getElementById('filtro-valor-texto');
const tagsWrap = document.getElementById('filtro-tags-wrap');
const tagsTrigger = document.getElementById('filtro-tags-trigger');
const tagsPainel = document.getElementById('filtro-tags-painel');
const tagsLista = document.getElementById('filtro-tags-lista');
const tagsLimpar = document.getElementById('filtro-tags-limpar');
const inputTagsBusca = document.getElementById('filtro-tags-busca');
const tagsVazio = document.getElementById('filtro-tags-vazio');
const inputDeslocMax = document.getElementById('filtro-desloc-max');
const textoDesloc = document.getElementById('filtro-desloc-texto');
const selectDeslocModo = document.getElementById('filtro-desloc-modo');

const DESLOC_MIN = 10;
const DESLOC_MAX = 90;
const ROTULO_MODO_FILTRO = {
    foot: 'a pé',
    bike: 'de bicicleta',
    car: 'de carro',
    bus: 'de ônibus',
};
const botaoBuscar = document.querySelector('.filter-bar .btn-buscar');
/** Hábitos marcados no filtro (multi-seleção). */
let tagsSelecionadas = [];
/** Catálogo de locais cadastrados (bairro/cidade) para autocomplete. */
let locaisCadastrados = [];
let indiceSugestaoBairro = -1;
let debounceSugestaoBairro = null;

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

function commuteSvg(modo) {
    const m = String(modo || 'foot').toLowerCase();
    if (m === 'bus') {
        return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="6" width="18" height="10" rx="2"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/></svg>';
    }
    if (m === 'bike') {
        return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M12 6h3l2 5H9l3-5zm-1.5 5 3.5 6.5M14.5 11l-2 6.5"/></svg>';
    }
    if (m === 'car') {
        return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-6z"/><circle cx="7.5" cy="14.5" r="1.2"/><circle cx="16.5" cy="14.5" r="1.2"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM10 8.5h4l.5 7H15l1 5h-1.6l-.9-4.5H11.5L10.6 20.5H9l1-5h.5L10 8.5z"/></svg>';
}

/** Ícone discreto por tipo de destino (mural). */
function destinoSvg(d) {
    const tipo = String(d?.tipo || '').toLowerCase();
    if (tipo === 'trabalho') {
        return '<svg class="commute-destino-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/></svg>';
    }
    if (tipo === 'faculdade') {
        return '<svg class="commute-destino-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 10 12 4l9 6-9 6-9-6z"/><path d="M7 12v5c0 1 2.5 3 5 3s5-2 5-3v-5"/></svg>';
    }
    return '<svg class="commute-destino-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
}

/** Nome curto no mural: Trabalho / Faculdade / título (sem endereço). */
function rotuloCurtoDestino(d) {
    const tipo = String(d?.tipo || '').toLowerCase();
    if (tipo === 'trabalho') return 'Trabalho';
    if (tipo === 'faculdade') return 'Faculdade';
    const bruto = String(d?.nome || '').trim();
    const curto = bruto.includes(' — ') ? bruto.split(' — ')[0].trim() : bruto;
    // CEP sozinho não ajuda — encurta nomes longos.
    if (/^\d{5}-?\d{0,3}$/.test(curto)) return 'Destino';
    return curto.slice(0, 22) || 'Destino';
}

const ROTULO_MODO_FRASE = {
    foot: (n) => `${n} min andando`,
    bike: (n) => `${n} min de bicicleta`,
    car: (n) => `${n} min de carro`,
    bus: (n) => `${n} min de ônibus`,
};

/** Só o meio padrão das preferências — ex. "62 min de carro". */
function fraseTemposModos(d, modoPreferido) {
    const m = String(
        d?.modo_transporte || modoPreferido || 'foot'
    ).toLowerCase();
    const fmt = ROTULO_MODO_FRASE[m] || ROTULO_MODO_FRASE.foot;
    const tempos = d?.tempos_modos && typeof d.tempos_modos === 'object'
        ? d.tempos_modos
        : null;
    if (tempos && tempos[m] != null && Number.isFinite(Number(tempos[m]))) {
        return fmt(Number(tempos[m]));
    }
    if (d?.deslocamento_min != null) {
        return fmt(Number(d.deslocamento_min));
    }
    return '';
}

function montarListaCommute(lista, modo) {
    const itens = lista.map((d) => {
        const nome = rotuloCurtoDestino(d);
        const tempos = fraseTemposModos(d, modo);
        const titulo = tempos ? `${nome}: ${tempos}` : nome;
        const linhaTempos = tempos
            ? `<span class="commute-item-tempos">${escHtml(tempos)}</span>`
            : '<span class="commute-item-tempos">Sem tempo ainda</span>';
        return `<span class="commute-item" title="${escHtml(titulo)}">${destinoSvg(d)}`
            + `<span class="commute-item-corpo">`
            + `<span class="commute-item-nome">${escHtml(nome)}</span>`
            + linhaTempos
            + `</span></span>`;
    }).join('');
    return `<span class="commute" title="Tempo no meio de transporte padrão das preferências">${itens}</span>`;
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
    card.addEventListener('click', (evento) => {
        if (evento.target.closest('a')) return;
        irDetalhe();
    });
    card.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
            if (evento.target.closest('a')) return;
            evento.preventDefault();
            irDetalhe();
        }
    });

    const logado = typeof estaLogado === 'function' && estaLogado();
    const match = imovel.match_percent ?? imovel.match;
    const tags = (imovel.tags || []).slice(0, 3)
        .map((t) => `<span class="tag">${escHtml(t)}</span>`)
        .join('');

    const badgeMatch = logado
        ? `<span class="badge-match" title="${match}% das suas tags marcadas também estão no anúncio (não marcadas = neutras; tags a mais no anúncio não baixam o %)">${match}%</span>`
        : '';
    // Tempos até preferencias_moradia.destinos (até 3). Sem destino, convite.
    const user = typeof usuarioAtual === 'function' ? usuarioAtual() : null;
    const destinosUser = (user?.destinos?.length
        ? user.destinos
        : (user?.destino ? [user.destino] : []));
    const temDestinoSalvo = destinosUser.length > 0;
    const modoCommute = imovel.modo_transporte
        || user?.modo_transporte
        || 'foot';
    let rodapeExtra = '';
    if (logado) {
        let lista = (imovel.deslocamentos && imovel.deslocamentos.length)
            ? imovel.deslocamentos
            : (imovel.deslocamento_min != null || imovel.destino
                ? [{
                    nome: imovel.destino,
                    tipo: destinosUser[0]?.tipo,
                    deslocamento_min: imovel.deslocamento_min,
                }]
                : []);
        // Completa tipo/nome a partir das preferências (API às vezes só manda tempo).
        lista = lista.map((d, i) => {
            const pref = destinosUser[i] || {};
            return {
                ...d,
                tipo: d.tipo || pref.tipo,
                nome: d.nome || pref.nome,
            };
        });
        if (lista.length) {
            rodapeExtra = montarListaCommute(lista, modoCommute);
        } else if (temDestinoSalvo) {
            rodapeExtra = montarListaCommute([destinosUser[0] || {}], modoCommute);
        } else {
            rodapeExtra = `<a class="commute commute-cta" href="preferencias.html">${commuteSvg(modoCommute)} Definir trabalho / faculdade</a>`;
        }
    }

    const fotos = typeof ImovelFotos !== 'undefined' ? ImovelFotos.lista(imovel) : [];
    card.innerHTML = `
        <div class="card-image" aria-hidden="true">
            <span class="badge">${escHtml(imovel.badge || imovel.tipo || '')}</span>
            ${badgeMatch}
        </div>
        <div class="card-body">
            <div class="card-title">${escHtml(imovel.titulo)}</div>
            <div class="card-location">${pinSvg()} ${escHtml(imovel.bairro)}, ${escHtml(imovel.cidade || 'Campinas')}</div>
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

function catalogoHabitos() {
    if (typeof RoomMatchTags !== 'undefined' && RoomMatchTags.CONVIVENCIA) {
        return RoomMatchTags.CONVIVENCIA;
    }
    return [
        'Aceita Animais', 'Trabalho em Casa', 'Silêncio Noturno', 'Sem Festas',
        'Sem Fumo', 'LGBTQIA+ Acolhedor', 'Vegetariano', 'Sem Animais'
    ];
}

function atualizarRotuloTags() {
    if (!tagsTrigger) return;
    const n = tagsSelecionadas.length;
    if (!n) {
        tagsTrigger.textContent = 'Todos os hábitos';
    } else if (n === 1) {
        tagsTrigger.textContent = tagsSelecionadas[0];
    } else if (n <= 2) {
        tagsTrigger.textContent = tagsSelecionadas.join(' · ');
    } else {
        tagsTrigger.textContent = `${n} hábitos`;
    }
    if (tagsLimpar) tagsLimpar.hidden = n === 0;
}

function fecharPainelTags() {
    if (!tagsPainel || !tagsTrigger) return;
    tagsPainel.hidden = true;
    tagsTrigger.setAttribute('aria-expanded', 'false');
}

function abrirPainelTags() {
    if (!tagsPainel || !tagsTrigger) return;
    tagsPainel.hidden = false;
    tagsTrigger.setAttribute('aria-expanded', 'true');
    window.setTimeout(() => inputTagsBusca?.focus(), 0);
}

function sincronizarTagsSelecionadasDosInputs() {
    if (!tagsLista) return;
    tagsSelecionadas = [...tagsLista.querySelectorAll('input[type="checkbox"]:checked')]
        .map((el) => el.value);
}

function filtrarListaTagsPorTexto() {
    if (!tagsLista) return;
    const q = String(inputTagsBusca?.value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    let visiveis = 0;
    tagsLista.querySelectorAll('.filtro-tag-opcao').forEach((label) => {
        const bruto = label.dataset.busca || label.textContent || '';
        const ok = !q || bruto.includes(q);
        label.hidden = !ok;
        if (ok) visiveis += 1;
    });
    if (tagsVazio) tagsVazio.hidden = visiveis > 0;
}

function preencherSelectTags() {
    if (!tagsLista) return;
    const opcoes = catalogoHabitos();
    const marcadas = new Set(tagsSelecionadas);
    tagsLista.replaceChildren();
    const inputs = [];
    opcoes.forEach((tag) => {
        const id = `filtro-tag-${tag.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`;
        const label = document.createElement('label');
        label.className = 'filtro-tag-opcao';
        label.htmlFor = id;
        label.dataset.busca = String(tag)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = id;
        input.name = 'filtro-tag';
        input.value = tag;
        input.checked = marcadas.has(tag);
        inputs.push(input);
        if (typeof RoomMatchTags !== 'undefined' && RoomMatchTags.criarIcone) {
            label.append(input, RoomMatchTags.criarIcone(tag));
        } else {
            label.append(input);
        }
        const texto = document.createElement('span');
        texto.className = 'filtro-tag-texto';
        texto.textContent = tag;
        label.append(texto);
        tagsLista.append(label);
    });

    const aoMudarTags = () => {
        sincronizarTagsSelecionadasDosInputs();
        atualizarRotuloTags();
        carregar();
    };

    if (typeof RoomMatchTags !== 'undefined' && RoomMatchTags.ligarConflitos) {
        // Desmarca opostos (ex.: Aceita Animais × Sem Animais) e depois sincroniza.
        RoomMatchTags.ligarConflitos(inputs, { onChange: aoMudarTags });
    } else {
        inputs.forEach((input) => input.addEventListener('change', aoMudarTags));
    }

    if (typeof RoomMatchTags !== 'undefined' && RoomMatchTags.limparConflitosMarcados) {
        RoomMatchTags.limparConflitosMarcados(inputs);
        sincronizarTagsSelecionadasDosInputs();
    }

    filtrarListaTagsPorTexto();
    atualizarRotuloTags();
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
        // No teto do slider = esse valor ou mais (não filtra anúncios mais caros).
        textoPreco.textContent = `R$ ${formatarPreco(max)} ou mais`;
        inputPreco.setAttribute(
            'aria-valuetext',
            `R$ ${formatarPreco(max)} ou mais — sem teto de preço`
        );
    } else {
        textoPreco.textContent = `Até R$ ${formatarPreco(valor)}`;
        inputPreco.setAttribute('aria-valuetext', `Até R$ ${formatarPreco(valor)}`);
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
        // Várias tags: vírgula (API e mock fazem AND).
        tag: tagsSelecionadas.length ? tagsSelecionadas.join(',') : ''
    };
}

function lerFiltroDeslocamento() {
    const modo = String(selectDeslocModo?.value || 'foot').toLowerCase();
    const max = Number(inputDeslocMax?.value);
    const ativo = Number.isFinite(max) && max < DESLOC_MAX;
    return { modo, max: ativo ? max : null };
}

/** Tempo (min) do 1º destino no meio pedido — null se ainda não houver estimativa. */
function tempoImovelNoModo(imovel, modo) {
    const m = String(modo || 'foot').toLowerCase();
    const lista = Array.isArray(imovel?.deslocamentos) ? imovel.deslocamentos : [];
    const prim = lista[0];
    if (prim?.tempos_modos && prim.tempos_modos[m] != null) {
        return Number(prim.tempos_modos[m]);
    }
    const modoPrim = String(prim?.modo_transporte || imovel?.modo_transporte || '').toLowerCase();
    if (prim?.deslocamento_min != null && (!modoPrim || modoPrim === m)) {
        return Number(prim.deslocamento_min);
    }
    if (imovel?.deslocamento_min != null) {
        const modoItem = String(imovel.modo_transporte || '').toLowerCase();
        if (!modoItem || modoItem === m) return Number(imovel.deslocamento_min);
    }
    return null;
}

function filtrarPorDeslocamento(items) {
    const { modo, max } = lerFiltroDeslocamento();
    if (max == null) return items;
    return items.filter((imovel) => {
        const t = tempoImovelNoModo(imovel, modo);
        return t != null && Number.isFinite(t) && t <= max;
    });
}

function atualizarSliderDesloc() {
    if (!inputDeslocMax || !textoDesloc) return;
    const valor = Number(inputDeslocMax.value);
    const min = Number(inputDeslocMax.min) || DESLOC_MIN;
    const max = Number(inputDeslocMax.max) || DESLOC_MAX;
    const pct = max === min ? 100 : ((valor - min) / (max - min)) * 100;
    inputDeslocMax.style.setProperty('--preenchimento', `${pct}%`);
    inputDeslocMax.setAttribute('aria-valuenow', String(valor));
    const modo = String(selectDeslocModo?.value || 'foot').toLowerCase();
    const como = ROTULO_MODO_FILTRO[modo] || ROTULO_MODO_FILTRO.foot;
    if (valor >= max) {
        textoDesloc.textContent = 'Qualquer tempo';
        inputDeslocMax.setAttribute('aria-valuetext', `Qualquer tempo ${como}`);
    } else {
        textoDesloc.textContent = `Até ${valor} min ${como}`;
        inputDeslocMax.setAttribute('aria-valuetext', `Até ${valor} minutos ${como}`);
    }
}

function sincronizarModoFiltroComPerfil() {
    if (!selectDeslocModo) return;
    const user = typeof usuarioAtual === 'function' ? usuarioAtual() : null;
    const modo = String(user?.modo_transporte || '').toLowerCase();
    if (modo && ROTULO_MODO_FILTRO[modo]) {
        selectDeslocModo.value = modo;
    }
}

async function carregar() {
    if (!grade) return;
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.preencherSkeleton(grade, 6);
    } else {
        grade.innerHTML = '<p class="cta-banner filtro-status" style="grid-column:1/-1">Carregando imóveis…</p>';
    }
    try {
        const filtros = lerFiltros();
        const { items } = await RoomMatchApi.listarImoveis(filtros);
        const filtrados = filtrarPorDeslocamento(items);
        if (!filtrados.length) {
            const { max } = lerFiltroDeslocamento();
            const dica = max != null
                ? 'Nenhum imóvel nesse tempo. Aumente o limite, troque o meio ou defina destinos em Preferências.'
                : 'Nenhum imóvel com esses filtros. Ajuste valor, hábitos ou tipo.';
            grade.innerHTML = `<p class="cta-banner filtro-status" style="grid-column:1/-1">${dica}</p>`;
            return;
        }
        grade.replaceChildren(...filtrados.map(montarCard));
    } catch (erro) {
        grade.innerHTML = `<p class="cta-banner filtro-status" style="grid-column:1/-1">Erro ao carregar: ${escHtml(erro.message)}</p>`;
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

function fecharSugestoesBairro() {
    if (!listaSugestoesBairro || !inputBairro) return;
    listaSugestoesBairro.hidden = true;
    listaSugestoesBairro.replaceChildren();
    inputBairro.setAttribute('aria-expanded', 'false');
    indiceSugestaoBairro = -1;
}

function filtrarLocais(termo) {
    const q = String(termo || '').trim().toLowerCase();
    if (!q) return locaisCadastrados.slice(0, 12);
    return locaisCadastrados
        .filter((item) => {
            const label = String(item.label || '').toLowerCase();
            const cidade = String(item.cidade || '').toLowerCase();
            return label.includes(q) || cidade.includes(q);
        })
        .slice(0, 12);
}

function aplicarSugestaoBairro(item) {
    if (!inputBairro || !item) return;
    inputBairro.value = item.label;
    fecharSugestoesBairro();
    carregar();
}

function pintarSugestoesBairro(itens) {
    if (!listaSugestoesBairro || !inputBairro) return;
    if (!itens.length) {
        fecharSugestoesBairro();
        return;
    }
    listaSugestoesBairro.replaceChildren();
    itens.forEach((item, i) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.id = `filtro-bairro-opt-${i}`;
        li.dataset.indice = String(i);
        const titulo = document.createElement('strong');
        titulo.textContent = item.label;
        li.append(titulo);
        const meta = document.createElement('span');
        meta.className = 'sugestao-meta';
        if (item.tipo === 'bairro' && item.cidade) {
            meta.textContent = `Bairro · ${item.cidade}`;
        } else if (item.tipo === 'cidade') {
            meta.textContent = 'Cidade';
        } else {
            meta.textContent = item.tipo === 'bairro' ? 'Bairro' : 'Local';
        }
        li.append(meta);
        li.addEventListener('mousedown', (evento) => {
            evento.preventDefault();
            aplicarSugestaoBairro(item);
        });
        listaSugestoesBairro.append(li);
    });
    listaSugestoesBairro.hidden = false;
    inputBairro.setAttribute('aria-expanded', 'true');
    indiceSugestaoBairro = -1;
}

function destacarSugestaoBairro(itens) {
    const opcoes = [...(listaSugestoesBairro?.children || [])];
    opcoes.forEach((li, i) => {
        li.setAttribute('aria-selected', i === indiceSugestaoBairro ? 'true' : 'false');
    });
    if (indiceSugestaoBairro >= 0 && opcoes[indiceSugestaoBairro]) {
        opcoes[indiceSugestaoBairro].scrollIntoView({ block: 'nearest' });
        inputBairro?.setAttribute('aria-activedescendant', opcoes[indiceSugestaoBairro].id);
    } else {
        inputBairro?.removeAttribute('aria-activedescendant');
    }
    void itens;
}

async function carregarLocaisCadastrados() {
    try {
        if (typeof RoomMatchApi === 'undefined' || !RoomMatchApi.listarLocais) return;
        const dados = await RoomMatchApi.listarLocais('');
        locaisCadastrados = Array.isArray(dados?.items) ? dados.items : [];
    } catch (erro) {
        locaisCadastrados = [];
    }
}

function agendarSugestoesBairro() {
    window.clearTimeout(debounceSugestaoBairro);
    debounceSugestaoBairro = window.setTimeout(() => {
        const termo = inputBairro?.value || '';
        if (!termo.trim()) {
            fecharSugestoesBairro();
            return;
        }
        pintarSugestoesBairro(filtrarLocais(termo));
    }, 80);
}

inputBairro?.addEventListener('input', () => {
    agendarSugestoesBairro();
    agendarCarregar();
});
inputBairro?.addEventListener('focus', () => {
    if ((inputBairro.value || '').trim()) {
        pintarSugestoesBairro(filtrarLocais(inputBairro.value));
    }
});
inputBairro?.addEventListener('blur', () => {
    window.setTimeout(fecharSugestoesBairro, 120);
});
inputBairro?.addEventListener('keydown', (evento) => {
    const abertas = listaSugestoesBairro && !listaSugestoesBairro.hidden;
    const itens = filtrarLocais(inputBairro.value);
    if (evento.key === 'ArrowDown' && abertas && itens.length) {
        evento.preventDefault();
        indiceSugestaoBairro = Math.min(itens.length - 1, indiceSugestaoBairro + 1);
        destacarSugestaoBairro(itens);
        return;
    }
    if (evento.key === 'ArrowUp' && abertas && itens.length) {
        evento.preventDefault();
        indiceSugestaoBairro = Math.max(0, indiceSugestaoBairro - 1);
        destacarSugestaoBairro(itens);
        return;
    }
    if (evento.key === 'Escape') {
        fecharSugestoesBairro();
        return;
    }
    if (evento.key === 'Enter') {
        evento.preventDefault();
        if (abertas && indiceSugestaoBairro >= 0 && itens[indiceSugestaoBairro]) {
            aplicarSugestaoBairro(itens[indiceSugestaoBairro]);
            return;
        }
        fecharSugestoesBairro();
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

tagsTrigger?.addEventListener('click', (evento) => {
    evento.preventDefault();
    if (tagsPainel?.hidden) abrirPainelTags();
    else fecharPainelTags();
});

inputTagsBusca?.addEventListener('input', filtrarListaTagsPorTexto);
inputTagsBusca?.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
        if (inputTagsBusca.value) {
            evento.stopPropagation();
            inputTagsBusca.value = '';
            filtrarListaTagsPorTexto();
            return;
        }
        fecharPainelTags();
    }
});

tagsLimpar?.addEventListener('click', (evento) => {
    evento.preventDefault();
    tagsSelecionadas = [];
    tagsLista?.querySelectorAll('input[type="checkbox"]').forEach((el) => {
        el.checked = false;
    });
    atualizarRotuloTags();
    carregar();
});

document.addEventListener('click', (evento) => {
    if (!tagsWrap || tagsPainel?.hidden) return;
    if (tagsWrap.contains(evento.target)) return;
    fecharPainelTags();
});

document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') fecharPainelTags();
});

function mostrarStatsLogado() {
    const logado = typeof estaLogado === 'function' && estaLogado();
    document.querySelectorAll('.stat-logado').forEach((el) => {
        el.hidden = !logado;
    });
}

function aplicarStats(s) {
    const set = (chave, conteudo, { html = false } = {}) => {
        const el = document.querySelector(`[data-stat="${chave}"] .stat-number`);
        if (!el) return;
        el.classList.remove('is-loading');
        el.removeAttribute('aria-busy');
        if (html) el.innerHTML = conteudo;
        else el.textContent = conteudo;
        el.classList.remove('is-ready');
        void el.offsetWidth;
        el.classList.add('is-ready');
        delete el.dataset.rmPrev;
    };

    set('imoveis', String(s.imoveis_ativos));

    if (typeof estaLogado === 'function' && estaLogado()) {
        set('match', `${s.match_medio}%`);
        const dest = typeof usuarioAtual === 'function' ? usuarioAtual()?.destino : null;
        const labelDesloc = document.querySelector('[data-stat="deslocamento"] .stat-label');
        if (s.deslocamento_medio > 0) {
            set('deslocamento', `${s.deslocamento_medio} min`);
            if (labelDesloc) labelDesloc.textContent = 'deslocamento médio';
        } else if (dest?.nome) {
            set('deslocamento', '—');
            if (labelDesloc) labelDesloc.textContent = `até ${dest.nome}`;
        } else {
            set(
                'deslocamento',
                '<a class="stat-cta" href="preferencias.html">Definir →</a>',
                { html: true }
            );
            if (labelDesloc) labelDesloc.textContent = 'faculdade ou trabalho';
        }
    }
}

async function carregarStats() {
    // Visitante: só "imóveis ativos". Match e deslocamento só logado.
    mostrarStatsLogado();
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.pulsarStats(document.querySelector('.stats'));
    }
    try {
        aplicarStats(await RoomMatchApi.stats());
    } catch (erro) {
        if (typeof RoomMatchLoading !== 'undefined') {
            document.querySelectorAll('.stat-number.is-loading').forEach((el) => {
                el.classList.remove('is-loading');
                el.removeAttribute('aria-busy');
                el.textContent = el.dataset.rmPrev || '—';
            });
        }
    }
}

inputDeslocMax?.addEventListener('input', () => {
    atualizarSliderDesloc();
    agendarCarregar();
});
selectDeslocModo?.addEventListener('change', () => {
    atualizarSliderDesloc();
    carregar();
});

async function iniciarHome() {
    preencherSelectTags();
    sincronizarModoFiltroComPerfil();
    atualizarSliderValor();
    atualizarSliderDesloc();
    mostrarStatsLogado();
    const logado = typeof estaLogado === 'function' && estaLogado();
    if (logado && typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.mostrar('Carregando afinidade e mural…');
    }
    try {
        // Locais (autocomplete) + mural + stats em paralelo.
        await Promise.all([carregarLocaisCadastrados(), carregar(), carregarStats()]);
    } finally {
        if (logado && typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.esconder();
        }
    }
}

iniciarHome();

const hero = document.querySelector('.hero');
if (hero && typeof ImovelFotos !== 'undefined') {
    if (ImovelFotos.iniciarHeroCampinas) ImovelFotos.iniciarHeroCampinas(hero);
    else {
        ImovelFotos.iniciarCarrossel(hero, ImovelFotos.FOTOS_CAMPINAS || [
            '../assets/campinas/hero.jpg',
            '../assets/campinas/taquaral.jpg',
            '../assets/campinas/rua.jpg',
        ], { intervalo: 6500 });
    }
}
