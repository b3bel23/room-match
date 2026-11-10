// Mapa de rota do detalhe do imóvel (OpenStreetMap).
// Origem: o imóvel (coordenadas do anúncio ou endereço geocodificado).
// Destino: Centro de Campinas por padrão; o usuário troca pela busca, clicando no mapa
// ou arrastando o marcador.

const CAMPINAS = { lat: -22.9056, lng: -47.0608 };
let ORIGEM = null;
let DESTINO = { nome: 'Centro de Campinas', ...CAMPINAS };

// Busca: Photon (feita para sugestões enquanto digita) com Nominatim como reserva.
const PHOTON = 'https://photon.komoot.io/api/';
const NOMINATIM = 'https://nominatim.openstreetmap.org';

// Rotas: servidores OSRM do OpenStreetMap (FOSSGIS), um por meio de transporte.
const SERVIDORES = {
    foot: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
    bike: 'https://routing.openstreetmap.de/routed-bike/route/v1/bike',
    car: 'https://routing.openstreetmap.de/routed-car/route/v1/driving'
};
const NOME_MODO = { foot: 'a pé', bike: 'de bicicleta', car: 'de carro' };

const botaoAbrir = document.getElementById('rota-abrir');
const painel = document.getElementById('rota-painel');
const resumo = document.getElementById('rota-resumo');
const formBusca = document.getElementById('rota-busca');
const campoBusca = document.getElementById('rota-busca-campo');
const listaSugestoes = document.getElementById('rota-sugestoes');
const passos = document.getElementById('rota-passos');
const listaPassos = document.getElementById('rota-passos-lista');
const linkOsm = document.getElementById('rota-osm');
const modos = [...document.querySelectorAll('.rota-modo:not([disabled])')];

let mapa = null;
let marcadorOrigem = null;
let marcadorDestino = null;
let camadasRota = [];
let rotas = [];
let modoAtual = 'foot';
let origemPronta = null;
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
    try {
        const achados = await buscarPhoton(texto, signal);
        if (achados.length) return achados;
    } catch (erro) {
        if (erro.name === 'AbortError') throw erro;
    }
    return buscarNominatim(texto, signal);
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

function pino(classe, rotulo) {
    return L.divIcon({
        className: `rota-pino ${classe}`,
        html: `<span>${rotulo}</span>`,
        iconSize: [30, 30],
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

    marcadorDestino = L.marker([DESTINO.lat, DESTINO.lng], { icon: pino('rota-pino-destino', 'B'), draggable: true })
        .bindTooltip(DESTINO.nome, { direction: 'top', offset: [0, -14] })
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
    marcadorOrigem = L.marker([ORIGEM.lat, ORIGEM.lng], { icon: pino('rota-pino-origem', 'A'), keyboard: false })
        .bindTooltip(imovelAtual?.titulo || 'Imóvel', { direction: 'top', offset: [0, -14] })
        .addTo(mapa);
}

async function definirDestino(lugar, buscarNome) {
    DESTINO = { nome: lugar.titulo, lat: lugar.lat, lng: lugar.lng };
    marcadorDestino.setLatLng([DESTINO.lat, DESTINO.lng]).setTooltipContent(DESTINO.nome);
    campoBusca.value = lugar.titulo === 'Ponto no mapa' ? '' : lugar.titulo;
    fecharSugestoes();
    const rotaPronta = desenharRota();

    if (buscarNome) {
        const nome = await nomeDoPonto(DESTINO.lat, DESTINO.lng);
        if (DESTINO.lat !== lugar.lat || DESTINO.lng !== lugar.lng) return;
        DESTINO.nome = nome;
        campoBusca.value = nome;
        marcadorDestino.setTooltipContent(nome);
        await rotaPronta;
        mostrarResumo();
    }
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
    if (metros < 1000) return `${Math.round(metros / 10) * 10} m`;
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
        const distancia = passo.distance ? ` · ${formatarDistancia(passo.distance)}` : '';
        item.textContent = `${textoPasso(passo)}${distancia}`;
        return item;
    }));
    passos.hidden = false;
}

function mostrarResumo() {
    const rota = rotas[0];
    if (!rota) return;
    const tempo = formatarTempo(rota.duration);
    const distancia = formatarDistancia(rota.distance);
    resumo.textContent = `${tempo} ${NOME_MODO[modoAtual]} · ${distancia} até ${DESTINO.nome}`;

    // Atualiza o cartão de deslocamento acima do mapa.
    const forte = document.querySelector('.trajeto strong');
    const detalhe = document.querySelector('.trajeto span');
    if (forte) forte.textContent = `${tempo} · ${DESTINO.nome}`;
    if (detalhe) detalhe.textContent = `${distancia} ${NOME_MODO[modoAtual]} · OpenStreetMap`;

    const motor = { foot: 'fossgis_osrm_foot', bike: 'fossgis_osrm_bike', car: 'fossgis_osrm_car' }[modoAtual];
    linkOsm.href = `https://www.openstreetmap.org/directions?engine=${motor}`
        + `&route=${ORIGEM.lat},${ORIGEM.lng};${DESTINO.lat},${DESTINO.lng}`;
    linkOsm.hidden = false;
}

function pintarRotas() {
    camadasRota.forEach((camada) => camada.remove());
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

async function desenharRota() {
    if (!ORIGEM) return;
    const pedido = ++pedidoRota;
    resumo.textContent = 'Calculando rota…';

    const coordenadas = `${ORIGEM.lng},${ORIGEM.lat};${DESTINO.lng},${DESTINO.lat}`;
    try {
        const dados = await pegarJson(`${SERVIDORES[modoAtual]}/${coordenadas}`
            + '?overview=full&geometries=geojson&alternatives=true&steps=true');
        if (pedido !== pedidoRota) return;
        if (dados.code !== 'Ok' || !dados.routes?.length) {
            resumo.textContent = 'Não há rota entre esses pontos para este meio de transporte.';
            return;
        }
        rotas = dados.routes;
        pintarRotas();
        mapa.fitBounds(camadasRota[0].getBounds(), { padding: [40, 40] });
        mostrarResumo();
        mostrarPassos(rotas[0]);
    } catch (erro) {
        if (pedido === pedidoRota) resumo.textContent = 'Não foi possível calcular a rota agora. Tente de novo.';
    }
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
    resumo.textContent = 'Buscando lugar…';
    try {
        const [lugar] = await buscarLugares(texto);
        if (!lugar) {
            resumo.textContent = 'Lugar não encontrado. Tente incluir o bairro ou a cidade.';
            return;
        }
        definirDestino(lugar, false);
    } catch (erro) {
        resumo.textContent = 'Não foi possível buscar o lugar agora. Tente de novo.';
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
        criarMapa();
        resumo.textContent = 'Localizando o imóvel…';
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
        modos.forEach((item) => {
            item.classList.toggle('ativo', item === modo);
            item.setAttribute('aria-selected', String(item === modo));
        });
        desenharRota();
    });
});
