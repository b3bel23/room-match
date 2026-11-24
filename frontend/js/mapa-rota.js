// Mapa de rota do detalhe do imóvel (OpenStreetMap).
// Origem: o imóvel (coordenadas do anúncio ou endereço geocodificado).
// Destino: Centro de Campinas por padrão; o usuário troca pela busca, clicando no mapa
// ou arrastando o marcador.

const CAMPINAS = { lat: -22.9056, lng: -47.0608 };
let ORIGEM = null;
let DESTINO = { nome: 'Centro de Campinas', ...CAMPINAS };

/**
 * Geocoders (Photon/Nominatim) às vezes devolvem campus/coordenadas fora da rede
 * GTFS do produto. Preferimos estes pontos alinhados ao feed RMC.
 * Ordem: regras mais específicas primeiro.
 */
const DESTINOS_CONHECIDOS = [
    {
        // Campus II ≠ Campus I: geocoder devolve Av. John Boyd Dunlop (sudoeste).
        re: /puc.*campus\s*ii|campus\s*ii.*puc|john\s*boyd\s*dunlop|ipaussurama/i,
        titulo: 'PUC Campinas · Campus II (John Boyd Dunlop)',
        lat: -22.9199,
        lng: -47.1208,
    },
    {
        re: /puc.*(?:campus\s*i\b|bar[aã]o)|bar[aã]o.*puc/i,
        titulo: 'PUC Campinas · Campus I (Barão)',
        lat: -22.8345,
        lng: -47.0525,
    },
    {
        re: /puc|pontif[ií]cia\s+universidade\s+cat[oó]lica\s+de\s+campinas/i,
        titulo: 'PUC Campinas · Campus Central',
        lat: -22.9095,
        lng: -47.0668,
    },
    {
        re: /unicamp|zeferino\s+vaz|cidade\s+universit[aá]ria/i,
        titulo: 'UNICAMP · Portão 1',
        lat: -22.8184,
        lng: -47.0647,
    },
    {
        re: /iguatemi/i,
        titulo: 'Shopping Iguatemi Campinas',
        lat: -22.8915,
        lng: -47.0275,
    },
    {
        re: /terminal\s+central|largo\s+do\s+ros[aá]rio|centro\s+de\s+campinas/i,
        titulo: 'Centro de Campinas',
        lat: -22.9056,
        lng: -47.0608,
    },
];

function ajustarDestinoConhecido(lugar) {
    if (!lugar) return lugar;
    const texto = `${lugar.titulo || ''} ${lugar.detalhe || ''} ${lugar.nome || ''}`;
    for (const d of DESTINOS_CONHECIDOS) {
        if (d.re.test(texto)) {
            return {
                ...lugar,
                titulo: d.titulo,
                lat: d.lat,
                lng: d.lng,
                conhecido: true,
            };
        }
    }
    return lugar;
}

// Busca: Photon (feita para sugestões enquanto digita) com Nominatim como reserva.
const PHOTON = 'https://photon.komoot.io/api/';
const NOMINATIM = 'https://nominatim.openstreetmap.org';

// Rotas: servidores OSRM do OpenStreetMap (FOSSGIS), um por meio de transporte.
const SERVIDORES = {
    foot: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
    bike: 'https://routing.openstreetmap.de/routed-bike/route/v1/bike',
    car: 'https://routing.openstreetmap.de/routed-car/route/v1/driving'
};
const NOME_MODO = { foot: 'a pé', bike: 'de bicicleta', car: 'de carro', bus: 'de ônibus' };
/** Cores distintas por linha de ônibus (mapa + badges + legenda). */
const CORES_LINHA = [
    '#0d9488', '#2563eb', '#c2410c', '#7c3aed', '#be123c', '#047857', '#a16207', '#0369a1',
];
const COR_A_PE = '#64748b';

const botaoAbrir = document.getElementById('rota-abrir');
const painel = document.getElementById('rota-painel');
const resumo = document.getElementById('rota-resumo');
const legendaEl = document.getElementById('rota-legenda');
const formBusca = document.getElementById('rota-busca');
const campoBusca = document.getElementById('rota-busca-campo');
const listaSugestoes = document.getElementById('rota-sugestoes');
const passos = document.getElementById('rota-passos');
const listaPassos = document.getElementById('rota-passos-lista');
const linkOsm = document.getElementById('rota-osm');
const modos = [...document.querySelectorAll('.rota-modo:not([disabled])')];
const botaoSalvarDestino = document.getElementById('rota-salvar-destino');
const opcoesOnibus = document.getElementById('rota-onibus-opcoes');
const campoHora = document.getElementById('rota-hora');
const rotaDias = document.getElementById('rota-dias');
const rotaDiaData = document.getElementById('rota-dia-data');
const rotaAncora = document.getElementById('rota-ancora');
const rotaPresets = document.getElementById('rota-presets');
const rotaHoraRotulo = document.getElementById('rota-hora-rotulo');
const rotaAncoraDica = document.getElementById('rota-ancora-dica');
const botaoCalcular = document.getElementById('rota-calcular');

const DIAS_NOME = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** ISO weekday 0=Seg … 6=Dom — próximo (ou hoje) com esse dia. */
function dataParaDow(isoDow) {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    const hojeIso = (hoje.getDay() + 6) % 7;
    let delta = Number(isoDow) - hojeIso;
    if (delta < 0) delta += 7;
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + delta);
    return d;
}

function isoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function rotuloData(d) {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    const alvo = new Date(d);
    alvo.setHours(12, 0, 0, 0);
    const diff = Math.round((alvo - hoje) / 86400000);
    const quando = diff === 0 ? 'hoje' : (diff === 1 ? 'amanhã' : '');
    const base = `${DIAS_NOME[(alvo.getDay() + 6) % 7]}, ${alvo.getDate()} ${MESES_CURTO[alvo.getMonth()]}`;
    return quando ? `${base} · ${quando}` : base;
}

let ancoraHorario = 'partida'; // partida | chegada
let diaEscolhido = dataParaDow((new Date().getDay() + 6) % 7);

function sincronizarPresets() {
    const valor = campoHora?.value || '07:30';
    rotaPresets?.querySelectorAll('[data-hora]').forEach((btn) => {
        btn.classList.toggle('ativo', btn.dataset.hora === valor);
    });
}

function sincronizarAncoraUi() {
    rotaAncora?.querySelectorAll('[data-ancora]').forEach((btn) => {
        const ativo = btn.dataset.ancora === ancoraHorario;
        btn.classList.toggle('ativo', ativo);
        btn.setAttribute('aria-selected', String(ativo));
    });
    if (rotaHoraRotulo) {
        rotaHoraRotulo.textContent = ancoraHorario === 'chegada'
            ? 'Horário de chegada'
            : 'Horário de saída';
    }
    if (rotaAncoraDica) {
        rotaAncoraDica.textContent = ancoraHorario === 'chegada'
            ? 'Informe a chegada para ver a que horas sair, as linhas e o trajeto.'
            : 'Informe a saída para ver chegada, linhas e o trajeto no mapa.';
    }
}

function sincronizarDiasUi() {
    const isoDow = (diaEscolhido.getDay() + 6) % 7;
    rotaDias?.querySelectorAll('[data-dow]').forEach((btn) => {
        const ativo = Number(btn.dataset.dow) === isoDow;
        btn.classList.toggle('ativo', ativo);
        btn.setAttribute('aria-pressed', String(ativo));
    });
    if (rotaDiaData) rotaDiaData.textContent = rotuloData(diaEscolhido);
}

function textoPendenteOnibus() {
    const hora = campoHora?.value || '07:30';
    if (ancoraHorario === 'chegada') {
        return `Chegada às ${hora} selecionada. Clique em Calcular rota para ver a saída, as linhas e o trajeto.`;
    }
    return `Saída às ${hora} selecionada. Clique em Calcular rota para ver a chegada, as linhas e o trajeto.`;
}

function marcarOnibusPendente() {
    if (modoAtual !== 'bus') return;
    if (opcoesOnibus) opcoesOnibus.hidden = false;
    setResumoTexto(textoPendenteOnibus());
}

rotaDias?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-dow]');
    if (!btn) return;
    diaEscolhido = dataParaDow(btn.dataset.dow);
    sincronizarDiasUi();
    marcarOnibusPendente();
});

rotaAncora?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-ancora]');
    if (!btn) return;
    ancoraHorario = btn.dataset.ancora === 'chegada' ? 'chegada' : 'partida';
    sincronizarAncoraUi();
    marcarOnibusPendente();
});

rotaPresets?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-hora]');
    if (!btn || !campoHora) return;
    campoHora.value = btn.dataset.hora;
    sincronizarPresets();
    marcarOnibusPendente();
});

campoHora?.addEventListener('change', () => {
    sincronizarPresets();
    marcarOnibusPendente();
});

campoHora?.addEventListener('input', () => {
    sincronizarPresets();
});

botaoCalcular?.addEventListener('click', () => {
    if (modoAtual !== 'bus' || !ORIGEM) return;
    desenharRota({ forcarOnibus: true });
});

sincronizarDiasUi();
sincronizarAncoraUi();
sincronizarPresets();

function corLinha(linha) {
    const s = String(linha ?? '');
    let h = 0;
    for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return CORES_LINHA[h % CORES_LINHA.length];
}

function nomeCurtoLugar(nome) {
    const s = String(nome || '').trim();
    if (!s) return 'destino';
    return (s.includes(' — ') ? s.split(' — ')[0] : s).slice(0, 48);
}

function setResumoTexto(texto) {
    if (!resumo) return;
    resumo.replaceChildren();
    resumo.classList.remove('rota-resumo--card');
    resumo.textContent = texto;
    if (legendaEl) {
        legendaEl.hidden = true;
        legendaEl.replaceChildren();
    }
}

function chip(texto, extraClass) {
    const span = document.createElement('span');
    span.className = `rota-chip${extraClass ? ` ${extraClass}` : ''}`;
    span.textContent = texto;
    return span;
}

function badgeLinha(linha, cor) {
    const span = document.createElement('span');
    span.className = 'rota-linha-badge';
    span.style.setProperty('--linha-cor', cor || corLinha(linha));
    span.textContent = String(linha);
    span.title = `Linha ${linha}`;
    return span;
}

function montarLegenda(linhasUsadas) {
    if (!legendaEl) return;
    legendaEl.replaceChildren();
    const vistos = new Set();
    (linhasUsadas || []).forEach((linha) => {
        const key = String(linha);
        if (!key || vistos.has(key)) return;
        vistos.add(key);
        const item = document.createElement('span');
        item.className = 'rota-legenda-item';
        const swatch = document.createElement('i');
        swatch.style.background = corLinha(linha);
        item.append(swatch, document.createTextNode(` Linha ${linha}`));
        legendaEl.append(item);
    });
    const pe = document.createElement('span');
    pe.className = 'rota-legenda-item rota-legenda-pe';
    const sw = document.createElement('i');
    pe.append(sw, document.createTextNode(' A pé'));
    legendaEl.append(pe);
    legendaEl.hidden = !vistos.size;
}

let mapa = null;
let marcadorOrigem = null;
let marcadorDestino = null;
let camadasRota = [];
let rotas = [];
function modoPadraoDoUsuario() {
    const user = typeof usuarioAtual === 'function' ? usuarioAtual() : null;
    const m = String(user?.modo_transporte || '').toLowerCase();
    return ['foot', 'bike', 'car', 'bus'].includes(m) ? m : 'foot';
}

let modoAtual = modoPadraoDoUsuario();
let origemPronta = null;

function aplicarModoNosBotoes() {
    modos.forEach((item) => {
        const ativo = item.dataset.modo === modoAtual;
        item.classList.toggle('ativo', ativo);
        item.setAttribute('aria-selected', String(ativo));
    });
}
aplicarModoNosBotoes();
let sugestoes = [];
let sugestaoAtiva = -1;
let buscaControle = null;
let buscaTimer = null;

function pegarJson(url, opcoes) {
    return fetch(url, opcoes).then((resposta) => {
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        return resposta.json();
    });
}

/* ---------- Lugares ---------- */

function nomePhoton(p) {
    const rua = [p.street, p.housenumber].filter(Boolean).join(', ');
    const titulo = p.name || rua || p.city || 'Lugar';
    const detalhe = [p.name ? rua : '', p.district, p.city, p.state].filter(Boolean)
        .filter((parte, i, todas) => parte !== titulo && todas.indexOf(parte) === i).join(', ');
    return { titulo, detalhe };
}

async function buscarPhoton(texto, signal) {
    const perto = ORIGEM || CAMPINAS;
    const url = `${PHOTON}?q=${encodeURIComponent(texto)}&limit=8&lat=${perto.lat}&lon=${perto.lng}`;
    const dados = await pegarJson(url, { signal });
    return dados.features
        .filter((f) => f.properties.countrycode === 'BR')
        .slice(0, 5)
        .map((f) => ({ ...nomePhoton(f.properties), lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }));
}

async function buscarNominatim(texto, signal) {
    const url = `${NOMINATIM}/search?format=json&limit=5&countrycodes=br&accept-language=pt-BR`
        + `&viewbox=-47.4,-22.6,-46.7,-23.2&q=${encodeURIComponent(texto)}`;
    const dados = await pegarJson(url, { signal });
    return dados.map((l) => {
        const [titulo, ...resto] = l.display_name.split(', ');
        return { titulo, detalhe: resto.slice(0, 3).join(', '), lat: Number(l.lat), lng: Number(l.lon) };
    });
}

async function buscarLugares(texto, signal) {
    const q = String(texto || '').trim();
    const conhecidos = DESTINOS_CONHECIDOS
        .filter((d) => d.re.test(q))
        .slice(0, 3)
        .map((d) => ({
            titulo: d.titulo,
            detalhe: 'destino da rede RoomMatch',
            lat: d.lat,
            lng: d.lng,
            conhecido: true,
        }));

    let remotos = [];
    try {
        remotos = await buscarPhoton(texto, signal);
    } catch (erro) {
        if (erro.name === 'AbortError') throw erro;
    }
    if (!remotos.length) {
        try {
            remotos = await buscarNominatim(texto, signal);
        } catch (erro) {
            if (erro.name === 'AbortError') throw erro;
            remotos = [];
        }
    }
    const ajustados = remotos.map(ajustarDestinoConhecido);
    // Conhecidos primeiro; evita duplicar o mesmo título.
    const vistos = new Set(conhecidos.map((c) => c.titulo.toLowerCase()));
    const extras = ajustados.filter((a) => !vistos.has(String(a.titulo || '').toLowerCase()));
    return [...conhecidos, ...extras].slice(0, 6);
}

async function nomeDoPonto(lat, lng) {
    try {
        const l = await pegarJson(`${NOMINATIM}/reverse?format=json&zoom=18&accept-language=pt-BR&lat=${lat}&lon=${lng}`);
        const a = l.address || {};
        return l.name || [a.road, a.house_number].filter(Boolean).join(', ') || a.suburb || 'Ponto no mapa';
    } catch (erro) {
        return 'Ponto no mapa';
    }
}

/* ---------- Origem (o imóvel) ---------- */

async function localizarImovel() {
    // `imovelAtual` é preenchido por detalhe.js ao carregar o anúncio.
    const imovel = typeof imovelAtual !== 'undefined' ? imovelAtual : null;
    const lat = Number(imovel?.latitude);
    const lng = Number(imovel?.longitude);
    if (lat && lng) return { nome: 'Imóvel', lat, lng };

    const cidade = imovel?.cidade || 'Campinas';
    const rua = imovel?.rua
        ? [imovel.rua, imovel.numero].filter(Boolean).join(', ')
        : String(imovel?.endereco || '').split('·')[0].trim();
    const tentativas = [
        [rua, imovel?.bairro, cidade, 'SP'],
        [imovel?.bairro, cidade, 'SP']
    ].map((partes) => partes.filter(Boolean).join(', '));

    for (const texto of tentativas) {
        try {
            const [achado] = await buscarNominatim(texto);
            if (achado) return { nome: 'Imóvel', lat: achado.lat, lng: achado.lng };
        } catch (erro) {
            /* tenta a próxima */
        }
    }
    return { nome: 'Imóvel', ...CAMPINAS };
}

/* ---------- Mapa ---------- */

function pino(classe, letra, nome) {
    const rotulo = String(nome || '').replace(/</g, '&lt;');
    return L.divIcon({
        className: `rota-pino ${classe}`,
        html: `<span class="rota-pino-bola" aria-hidden="true">${letra}</span>`
            + `<em class="rota-pino-nome">${rotulo}</em>`,
        iconSize: [72, 44],
        iconAnchor: [15, 15]
    });
}

function criarMapa() {
    mapa = L.map('rota-mapa', { zoomControl: true }).setView([CAMPINAS.lat, CAMPINAS.lng], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapa);
    L.control.scale({ imperial: false }).addTo(mapa);

    marcadorDestino = L.marker([DESTINO.lat, DESTINO.lng], {
        icon: pino('rota-pino-destino', 'B', 'Destino'),
        draggable: true,
        title: 'B — Destino (arraste para mudar)',
        alt: 'Marcador B: destino',
    })
        .bindTooltip(DESTINO.nome, { direction: 'top', offset: [0, -18] })
        .addTo(mapa);

    marcadorDestino.on('dragend', () => {
        const { lat, lng } = marcadorDestino.getLatLng();
        definirDestino({ titulo: 'Ponto no mapa', lat, lng }, true);
    });
    mapa.on('click', (evento) => {
        definirDestino({ titulo: 'Ponto no mapa', lat: evento.latlng.lat, lng: evento.latlng.lng }, true);
    });
}

function mostrarOrigem() {
    marcadorOrigem = L.marker([ORIGEM.lat, ORIGEM.lng], {
        icon: pino('rota-pino-origem', 'A', 'Imóvel'),
        keyboard: false,
        title: 'A — Imóvel deste anúncio',
        alt: 'Marcador A: imóvel',
    })
        .bindTooltip(imovelAtual?.titulo || 'Imóvel', { direction: 'top', offset: [0, -18] })
        .addTo(mapa);
}

async function definirDestino(lugar, buscarNome) {
    const ajustado = lugar.titulo === 'Ponto no mapa' ? lugar : ajustarDestinoConhecido(lugar);
    DESTINO = { nome: ajustado.titulo, lat: ajustado.lat, lng: ajustado.lng };
    marcadorDestino.setLatLng([DESTINO.lat, DESTINO.lng]).setTooltipContent(DESTINO.nome);
    campoBusca.value = ajustado.titulo === 'Ponto no mapa' ? '' : ajustado.titulo;
    fecharSugestoes();
    const rotaPronta = desenharRota();

    if (buscarNome && !ajustado.conhecido) {
        const nome = await nomeDoPonto(DESTINO.lat, DESTINO.lng);
        if (DESTINO.lat !== ajustado.lat || DESTINO.lng !== ajustado.lng) return;
        const deNome = ajustarDestinoConhecido({ titulo: nome, lat: DESTINO.lat, lng: DESTINO.lng });
        DESTINO = { nome: deNome.titulo, lat: deNome.lat, lng: deNome.lng };
        campoBusca.value = DESTINO.nome;
        marcadorDestino.setLatLng([DESTINO.lat, DESTINO.lng]).setTooltipContent(DESTINO.nome);
        await rotaPronta;
        if (modoAtual === 'bus') await desenharRota({ forcarOnibus: true });
        else mostrarResumo();
        return;
    }
    await rotaPronta;
}

/* ---------- Rota ---------- */

function formatarTempo(segundos) {
    const minutos = Math.max(1, Math.round(segundos / 60));
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

function formatarDistancia(metros) {
    if (!Number.isFinite(metros) || metros <= 0) return 'no ponto';
    if (metros < 1000) return `${Math.round(metros)} m`;
    return `${(metros / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
}

const DIRECAO = {
    left: 'à esquerda',
    right: 'à direita',
    'slight left': 'levemente à esquerda',
    'slight right': 'levemente à direita',
    'sharp left': 'acentuadamente à esquerda',
    'sharp right': 'acentuadamente à direita',
    straight: 'em frente',
    uturn: 'no retorno'
};

function textoPasso(passo) {
    const { type, modifier, exit } = passo.maneuver;
    const via = passo.name ? ` na ${passo.name}` : '';
    if (type === 'depart') return `Siga${via}`;
    if (type === 'arrive') return 'Chegue ao destino';
    if (type === 'roundabout' || type === 'rotary') return `Na rotatória, pegue a ${exit || 1}ª saída${via}`;
    if (modifier === 'uturn') return `Faça o retorno${via}`;
    if (modifier === 'straight' || !modifier) return `Continue em frente${via}`;
    return `Vire ${DIRECAO[modifier] || ''}${via}`;
}

function mostrarPassos(rota) {
    listaPassos.replaceChildren(...rota.legs.flatMap((perna) => perna.steps).map((passo) => {
        const item = document.createElement('li');
        item.className = 'passo-pe';
        const distancia = passo.distance ? ` · ${formatarDistancia(passo.distance)}` : '';
        item.textContent = `${textoPasso(passo)}${distancia}`;
        return item;
    }));
    passos.hidden = false;
}

function mostrarResumo() {
    if (modoAtual === 'bus') {
        desenharRota(); // refaz com o nome do lugar (o servidor guarda em cache)
        return;
    }
    const rota = rotas[0];
    if (!rota || rota.onibus) return;
    const tempo = formatarTempo(rota.duration);
    const distancia = formatarDistancia(rota.distance);
    const destinoCurto = nomeCurtoLugar(DESTINO.nome);

    resumo.replaceChildren();
    resumo.classList.add('rota-resumo--card');
    const topo = document.createElement('div');
    topo.className = 'rota-meta-topo';
    const tempoEl = document.createElement('span');
    tempoEl.className = 'rota-meta-tempo';
    tempoEl.textContent = tempo;
    const ateEl = document.createElement('span');
    ateEl.className = 'rota-meta-ate';
    ateEl.textContent = `${NOME_MODO[modoAtual]} até ${destinoCurto}`;
    topo.append(tempoEl, ateEl);

    const chips = document.createElement('div');
    chips.className = 'rota-meta-chips';
    chips.append(
        chip(distancia, 'rota-chip--dist'),
        chip(NOME_MODO[modoAtual], 'rota-chip--modo'),
    );
    resumo.append(topo, chips);
    if (legendaEl) {
        legendaEl.hidden = true;
        legendaEl.replaceChildren();
    }

    // Atualiza o cartão de deslocamento acima do mapa.
    const forte = document.querySelector('.trajeto strong');
    const detalhe = document.querySelector('.trajeto span');
    if (forte) forte.textContent = `${tempo} · ${destinoCurto}`;
    if (detalhe) detalhe.textContent = `${distancia} ${NOME_MODO[modoAtual]} · OpenStreetMap`;

    const motor = { foot: 'fossgis_osrm_foot', bike: 'fossgis_osrm_bike', car: 'fossgis_osrm_car' }[modoAtual];
    linkOsm.href = `https://www.openstreetmap.org/directions?engine=${motor}`
        + `&route=${ORIGEM.lat},${ORIGEM.lng};${DESTINO.lat},${DESTINO.lng}`;
    linkOsm.hidden = false;
}

function pintarRotas() {
    limparCamadas();
    // Alternativas em cinza por baixo; a escolhida por cima, na cor do RoomMatch.
    camadasRota = rotas.map((rota, i) => L.geoJSON(rota.geometry, {
        style: i === 0
            ? { color: '#3f8f7a', weight: 6, opacity: 0.95 }
            : { color: '#8a979f', weight: 5, opacity: 0.7 }
    }).bindTooltip(`${formatarTempo(rota.duration)} · ${formatarDistancia(rota.distance)}`, { sticky: true }));

    camadasRota.slice(1).forEach((camada, i) => {
        camada.on('click', (evento) => {
            L.DomEvent.stopPropagation(evento);
            rotas.unshift(rotas.splice(i + 1, 1)[0]);
            pintarRotas();
            mostrarResumo();
            mostrarPassos(rotas[0]);
        });
    });
    [...camadasRota].reverse().forEach((camada) => camada.addTo(mapa));
}

let pedidoRota = 0;

async function desenharRota({ forcarOnibus = false } = {}) {
    if (!ORIGEM) return;
    const pedido = ++pedidoRota;
    opcoesOnibus.hidden = modoAtual !== 'bus';
    if (modoAtual === 'bus') {
        // Horário/dia só disparam o GTFS ao clicar em Calcular.
        if (!forcarOnibus) {
            marcarOnibusPendente();
            return;
        }
        setResumoTexto('Calculando rota de ônibus…');
        await desenharOnibus(pedido);
        return;
    }
    setResumoTexto('Calculando rota…');

    const coordenadas = `${ORIGEM.lng},${ORIGEM.lat};${DESTINO.lng},${DESTINO.lat}`;
    try {
        const dados = await pegarJson(`${SERVIDORES[modoAtual]}/${coordenadas}`
            + '?overview=full&geometries=geojson&alternatives=true&steps=true');
        if (pedido !== pedidoRota) return;
        if (dados.code !== 'Ok' || !dados.routes?.length) {
            setResumoTexto('Não há rota entre esses pontos para este meio de transporte.');
            return;
        }
        rotas = dados.routes;
        pintarRotas();
        mapa.fitBounds(camadasRota[0].getBounds(), { padding: [40, 40] });
        mostrarResumo();
        mostrarPassos(rotas[0]);
        mostrarBotaoSalvar();
    } catch (erro) {
        if (pedido === pedidoRota) {
            setResumoTexto('Não foi possível calcular a rota agora. Tente de novo.');
        }
    }
}

/* ---------- Ônibus (GTFS EMDEC/EMTU, calculado no servidor) ---------- */

function limparCamadas() {
    camadasRota.forEach((camada) => camada.remove());
    camadasRota = [];
}

function tituloTrechoPe(t) {
    if (t.papel === 'ate_ponto') {
        return t.distancia_m ? 'Até o ponto de embarque' : 'Embarque no ponto';
    }
    if (t.papel === 'baldeacao') return 'Baldeação a pé';
    if (t.papel === 'ate_destino') {
        return t.distancia_m ? 'Do ponto ao destino' : 'Chegada';
    }
    return 'Caminhada';
}

function montarPassoOnibus(t) {
    const item = document.createElement('li');
    const ehOnibus = t.tipo === 'onibus';
    item.className = ehOnibus ? 'passo-onibus' : 'passo-pe';

    if (ehOnibus) {
        const cor = corLinha(t.linha);
        item.style.setProperty('--linha-cor', cor);
        const badge = badgeLinha(t.linha, cor);
        const corpo = document.createElement('div');
        corpo.className = 'passo-corpo';
        const titulo = document.createElement('strong');
        const nomeLinha = t.nome_linha ? ` · ${t.nome_linha}` : '';
        titulo.textContent = `Linha ${t.linha}${nomeLinha}`;
        const horarios = document.createElement('span');
        horarios.className = 'passo-horarios';
        horarios.textContent = `Sai ${t.partida} · ${t.de?.nome || 'embarque'}  →  Desce ${t.chegada} · ${t.para?.nome || 'parada'}`;
        const meta = document.createElement('span');
        meta.className = 'passo-meta';
        const partes = [
            t.paradas != null ? `${t.paradas} parada${t.paradas === 1 ? '' : 's'}` : null,
            formatarDistancia(t.distancia_m),
            t.sentido ? `sentido ${t.sentido}` : null,
            t.espera_min > 0 ? `espera ${t.espera_min} min` : null,
        ].filter(Boolean);
        meta.textContent = partes.join(' · ');
        corpo.append(titulo, horarios);
        if (partes.length) corpo.append(meta);
        item.append(badge, corpo);
        return item;
    }

    const badge = document.createElement('span');
    badge.className = 'rota-linha-badge rota-linha-badge--pe';
    badge.textContent = 'a pé';
    const corpo = document.createElement('div');
    corpo.className = 'passo-corpo';
    const titulo = document.createElement('strong');
    titulo.textContent = tituloTrechoPe(t);
    const meta = document.createElement('span');
    meta.className = 'passo-meta';
    const dist = formatarDistancia(t.distancia_m);
    meta.textContent = [
        t.minutos != null ? `${t.minutos} min` : null,
        dist !== 'no ponto' ? dist : null,
        t.para?.nome ? `→ ${t.para.nome}` : null,
    ].filter(Boolean).join(' · ');
    corpo.append(titulo, meta);
    item.append(badge, corpo);
    return item;
}

function mostrarResumoOnibus(dados) {
    const destinoCurto = nomeCurtoLugar(DESTINO.nome || dados.destino_nome);
    const porChegada = dados.ancora === 'chegada'
        || (dados.ancora == null && ancoraHorario === 'chegada');
    const horaAlvo = campoHora?.value || dados.hora_alvo || '07:30';
    resumo.replaceChildren();
    resumo.classList.add('rota-resumo--card');

    if (dados.somente_caminhada) {
        const topo = document.createElement('div');
        topo.className = 'rota-meta-topo';
        const tempoEl = document.createElement('span');
        tempoEl.className = 'rota-meta-tempo';
        tempoEl.textContent = `${dados.tempo_min} min`;
        const ateEl = document.createElement('span');
        ateEl.className = 'rota-meta-ate';
        // Só afirmamos "mais perto a pé" em trajetos curtos; o backend já evita
        // devolver caminhada longa fingindo ser melhor que ônibus.
        ateEl.textContent = Number(dados.tempo_min) <= 25
            ? `a pé até ${destinoCurto} (mais perto que de ônibus neste horário)`
            : `sem ônibus nesta faixa · caminhada ~${dados.tempo_min} min até ${destinoCurto}`;
        topo.append(tempoEl, ateEl);
        resumo.append(topo);
        if (legendaEl) {
            legendaEl.hidden = true;
            legendaEl.replaceChildren();
        }
        return;
    }

    const destaque = document.createElement('p');
    destaque.className = 'rota-meta-destaque';
    const forte = (texto) => {
        const s = document.createElement('strong');
        s.textContent = texto;
        return s;
    };
    if (porChegada) {
        destaque.append('Para ', forte(`chegar às ${dados.chegada || horaAlvo}`), ', ');
        if (dados.partida) {
            destaque.append(forte(`saia às ${dados.partida}`));
        } else {
            destaque.append('veja a saída abaixo');
        }
        destaque.append(` · ${destinoCurto}`);
    } else {
        destaque.append('Saindo às ', forte(String(dados.partida || horaAlvo)));
        if (dados.chegada) {
            destaque.append(', ', forte(`chega às ${dados.chegada}`));
        }
        destaque.append(` · ${destinoCurto}`);
    }

    const topo = document.createElement('div');
    topo.className = 'rota-meta-topo';
    const tempoEl = document.createElement('span');
    tempoEl.className = 'rota-meta-tempo';
    tempoEl.textContent = `${dados.tempo_min} min`;
    const ateEl = document.createElement('span');
    ateEl.className = 'rota-meta-ate';
    ateEl.textContent = porChegada
        ? 'trajeto de ônibus até o destino'
        : 'trajeto de ônibus a partir da saída';
    topo.append(tempoEl, ateEl);

    const chips = document.createElement('div');
    chips.className = 'rota-meta-chips';
    const diaTxt = dados.dia
        ? rotuloData(new Date(`${dados.dia}T12:00:00`))
        : rotuloData(diaEscolhido);
    chips.append(chip(diaTxt.split(' · ')[0], 'rota-chip--dia'));
    chips.append(chip(porChegada ? 'Planejado por chegada' : 'Planejado por saída', 'rota-chip--ancora'));
    if (porChegada) {
        if (dados.partida) chips.append(chip(`Saída ${dados.partida}`, 'rota-chip--sai'));
        if (dados.chegada || horaAlvo) {
            chips.append(chip(`Chegada ${dados.chegada || horaAlvo}`, 'rota-chip--chega'));
        }
    } else {
        if (dados.partida || horaAlvo) {
            chips.append(chip(`Saída ${dados.partida || horaAlvo}`, 'rota-chip--sai'));
        }
        if (dados.chegada) chips.append(chip(`Chegada ${dados.chegada}`, 'rota-chip--chega'));
    }
    if (dados.baldeacoes > 0) {
        chips.append(chip(
            `${dados.baldeacoes} baldeação${dados.baldeacoes > 1 ? 'ões' : ''}`,
            'rota-chip--baldeacao',
        ));
    } else {
        chips.append(chip('Sem baldeação', 'rota-chip--direto'));
    }
    if (dados.caminhada_min != null) {
        chips.append(chip(`${dados.caminhada_min} min a pé`, 'rota-chip--pe'));
    }

    const linhasBox = document.createElement('div');
    linhasBox.className = 'rota-meta-linhas';
    const label = document.createElement('span');
    label.className = 'rota-meta-linhas-label';
    label.textContent = (dados.linhas || []).length > 1 ? 'Linhas usadas' : 'Linha usada';
    linhasBox.append(label);
    (dados.linhas || []).forEach((linha) => linhasBox.append(badgeLinha(linha)));

    resumo.append(destaque, topo, chips);
    if ((dados.linhas || []).length) resumo.append(linhasBox);
    if (dados.aviso) {
        const aviso = document.createElement('p');
        aviso.className = 'rota-meta-ponto';
        aviso.textContent = dados.aviso;
        resumo.append(aviso);
    }

    if (dados.ponto_embarque?.nome) {
        const ponto = document.createElement('p');
        ponto.className = 'rota-meta-ponto';
        const distPonto = formatarDistancia(dados.distancia_ponto_m);
        ponto.textContent = distPonto === 'no ponto'
            ? `Embarque: ${dados.ponto_embarque.nome}`
            : `Embarque a ${distPonto}: ${dados.ponto_embarque.nome}`;
        resumo.append(ponto);
    }

    const rotaHint = document.createElement('p');
    rotaHint.className = 'rota-meta-ponto';
    rotaHint.textContent = 'Rota desenhada no mapa · passo a passo abaixo.';
    resumo.append(rotaHint);

    montarLegenda(dados.linhas || []);
}

async function desenharOnibus(pedido) {
    const imovel = typeof imovelAtual !== 'undefined' ? imovelAtual : null;
    const params = {
        destino_lat: DESTINO.lat,
        destino_lng: DESTINO.lng,
        destino_nome: DESTINO.nome,
        origem_lat: ORIGEM.lat,
        origem_lng: ORIGEM.lng,
        hora: campoHora?.value || '07:30',
        dia: isoDate(diaEscolhido),
        ancora: ancoraHorario,
    };
    if (imovel && /^\d+$/.test(String(imovel.id))) params.imovel_id = imovel.id;
    let dados;
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.mostrar('Calculando ônibus…');
    }
    try {
        dados = await RoomMatchApi.rotaOnibus(params);
    } catch (erro) {
        if (typeof RoomMatchLoading !== 'undefined') RoomMatchLoading.esconder();
        if (pedido === pedidoRota) {
            setResumoTexto(erro.detail || 'Não foi possível calcular a rota de ônibus agora.');
        }
        return;
    }
    if (typeof RoomMatchLoading !== 'undefined') RoomMatchLoading.esconder();
    if (pedido !== pedidoRota) return;
    limparCamadas();
    linkOsm.hidden = true;
    if (!dados.disponivel) {
        rotas = [];
        passos.hidden = true;
        setResumoTexto(dados.motivo);
        return;
    }

    rotas = [{ onibus: true }];
    dados.trechos.forEach((t) => {
        if (t.tipo === 'a_pe') {
            camadasRota.push(L.polyline([[t.de.lat, t.de.lng], [t.para.lat, t.para.lng]], {
                color: COR_A_PE, weight: 4, dashArray: '6 8', opacity: 0.9,
            }).bindTooltip(tituloTrechoPe(t), { sticky: true }));
        } else {
            const cor = corLinha(t.linha);
            const caminho = Array.isArray(t.caminho) && t.caminho.length
                ? t.caminho
                : [[t.de.lat, t.de.lng], [t.para.lat, t.para.lng]];
            camadasRota.push(L.polyline(caminho, {
                color: cor, weight: 6, opacity: 0.95,
            }).bindTooltip(`Linha ${t.linha}${t.nome_linha ? ` · ${t.nome_linha}` : ''}`, { sticky: true }));
            [t.de, t.para].forEach((ponto) => camadasRota.push(
                L.circleMarker([ponto.lat, ponto.lng], {
                    radius: 7, color: cor, fillColor: '#fff', fillOpacity: 1, weight: 3,
                }).bindTooltip(ponto.nome, { direction: 'top' }),
            ));
        }
    });
    camadasRota.forEach((camada) => camada.addTo(mapa));
    if (camadasRota.length) {
        mapa.fitBounds(L.featureGroup(camadasRota).getBounds(), { padding: [40, 40] });
    }

    mostrarResumoOnibus(dados);
    listaPassos.replaceChildren(...dados.trechos.map(montarPassoOnibus));
    passos.hidden = false;
    if (!passos.open) passos.open = true;

    const destinoCurto = nomeCurtoLugar(DESTINO.nome);
    const forte = document.querySelector('.trajeto strong');
    const detalhe = document.querySelector('.trajeto span');
    if (forte) forte.textContent = `${dados.tempo_min} min · ${destinoCurto}`;
    if (detalhe) {
        const linhasCard = (dados.linhas || []).length
            ? ` · linha${dados.linhas.length > 1 ? 's' : ''} ${(dados.linhas || []).join(' + ')}`
            : '';
        detalhe.textContent = `${Number(dados.distancia_km).toLocaleString('pt-BR')} km · GTFS${linhasCard}`;
    }
    mostrarBotaoSalvar();
}

/* ---------- Destino salvo do morador (faculdade/trabalho) ---------- */

function destinosDoUsuario() {
    const user = typeof usuarioAtual === 'function' ? usuarioAtual() : null;
    if (Array.isArray(user?.destinos) && user.destinos.length) return user.destinos.slice(0, 3);
    if (user?.destino) return [user.destino];
    return [];
}

function mesmoDestino(a, b) {
    return a && b
        && Math.abs(Number(a.lat) - Number(b.lat)) < 1e-4
        && Math.abs(Number(a.lng) - Number(b.lng)) < 1e-4;
}

function mostrarBotaoSalvar() {
    // Destinos (trabalho/faculdade/outro) só em Preferências — não a partir do anúncio.
    if (!botaoSalvarDestino) return;
    botaoSalvarDestino.hidden = true;
}

/* ---------- Sugestões da busca ---------- */

function fecharSugestoes() {
    listaSugestoes.hidden = true;
    listaSugestoes.replaceChildren();
    campoBusca.setAttribute('aria-expanded', 'false');
    sugestoes = [];
    sugestaoAtiva = -1;
}

function marcarSugestao(indice) {
    sugestaoAtiva = indice;
    [...listaSugestoes.children].forEach((item, i) => item.setAttribute('aria-selected', String(i === indice)));
}

function mostrarSugestoes(lista) {
    sugestoes = lista;
    sugestaoAtiva = -1;
    listaSugestoes.replaceChildren(...lista.map((lugar, i) => {
        const item = document.createElement('li');
        item.setAttribute('role', 'option');
        item.id = `rota-sugestao-${i}`;
        item.innerHTML = '<strong></strong><span></span>';
        item.firstChild.textContent = lugar.titulo;
        item.lastChild.textContent = lugar.detalhe;
        item.addEventListener('mousedown', (evento) => {
            evento.preventDefault();
            definirDestino(lugar, false);
        });
        return item;
    }));
    listaSugestoes.hidden = !lista.length;
    campoBusca.setAttribute('aria-expanded', String(Boolean(lista.length)));
}

campoBusca.addEventListener('input', () => {
    window.clearTimeout(buscaTimer);
    buscaControle?.abort();
    const texto = campoBusca.value.trim();
    if (texto.length < 3) {
        fecharSugestoes();
        return;
    }
    buscaTimer = window.setTimeout(async () => {
        buscaControle = new AbortController();
        try {
            mostrarSugestoes(await buscarLugares(texto, buscaControle.signal));
        } catch (erro) {
            if (erro.name !== 'AbortError') fecharSugestoes();
        }
    }, 300);
});

campoBusca.addEventListener('keydown', (evento) => {
    if (!sugestoes.length) return;
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
        evento.preventDefault();
        const passo = evento.key === 'ArrowDown' ? 1 : -1;
        marcarSugestao((sugestaoAtiva + passo + sugestoes.length) % sugestoes.length);
    } else if (evento.key === 'Escape') {
        fecharSugestoes();
    }
});

campoBusca.addEventListener('blur', () => window.setTimeout(fecharSugestoes, 150));

formBusca.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (sugestaoAtiva >= 0) {
        definirDestino(sugestoes[sugestaoAtiva], false);
        return;
    }
    const texto = campoBusca.value.trim();
    if (!texto) return;

    window.clearTimeout(buscaTimer);
    buscaControle?.abort();
    setResumoTexto('Buscando lugar…');
    try {
        // Se o texto completo não achar nada, tenta de novo tirando a última palavra
        // ("puc campinas campus 1" → "puc campinas campus" → "puc campinas").
        let lugar = null;
        const palavras = texto.split(/\s+/);
        for (let total = palavras.length; total >= Math.min(2, palavras.length) && !lugar; total -= 1) {
            [lugar] = await buscarLugares(palavras.slice(0, total).join(' '));
        }
        if (!lugar) {
            setResumoTexto('Lugar não encontrado. Tente incluir o bairro ou a cidade.');
            return;
        }
        definirDestino(lugar, false);
    } catch (erro) {
        setResumoTexto('Não foi possível buscar o lugar agora. Tente de novo.');
    }
});

/* ---------- Abrir o mapa e trocar o meio de transporte ---------- */

botaoAbrir.addEventListener('click', async () => {
    const abrir = painel.hidden;
    painel.hidden = !abrir;
    botaoAbrir.setAttribute('aria-expanded', String(abrir));
    botaoAbrir.textContent = abrir ? 'Ocultar mapa' : 'Ver rota no mapa';
    if (!abrir) return;

    if (mapa === null) {
        const salvo = (typeof usuarioAtual === 'function' ? usuarioAtual() : null)?.destino;
        if (salvo && Number.isFinite(Number(salvo.lat))) {
            DESTINO = { nome: salvo.nome, lat: Number(salvo.lat), lng: Number(salvo.lng) };
        }
        criarMapa();
        setResumoTexto('Localizando o imóvel…');
        origemPronta = localizarImovel().then((origem) => {
            ORIGEM = origem;
            mostrarOrigem();
        });
    }
    mapa.invalidateSize();
    await origemPronta;
    if (!rotas.length) desenharRota();
});

modos.forEach((modo) => {
    modo.addEventListener('click', () => {
        modoAtual = modo.dataset.modo;
        aplicarModoNosBotoes();
        desenharRota();
    });
});
