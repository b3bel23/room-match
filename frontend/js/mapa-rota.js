// Ponto do anúncio (kitnet do Cambuí) e destino padrão.
const ORIGEM = { lat: -22.8981, lng: -47.0525 };
const CENTRO = { nome: 'Centro', lat: -22.9055, lng: -47.0610 };

// Servidores OSRM do OpenStreetMap, um por meio de transporte.
const SERVIDORES = {
    foot: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
    bike: 'https://routing.openstreetmap.de/routed-bike/route/v1/bike',
    car: 'https://routing.openstreetmap.de/routed-car/route/v1/driving'
};

// Ônibus não tem rota calculada: estimativa a partir da distância de carro.
const VELOCIDADE_ONIBUS_KMH = 18;
const ESPERA_ONIBUS_MIN = 10;

const botaoAbrir = document.getElementById('rota-abrir');
const painel = document.getElementById('rota-painel');
const botaoCheia = document.getElementById('rota-cheia');
const botaoCentro = document.getElementById('rota-centro');
const textoDestino = document.getElementById('rota-destino');
const textoCarro = document.getElementById('trajeto-carro');
const formBusca = document.getElementById('rota-busca');
const campoBusca = document.getElementById('rota-busca-campo');
const erroBusca = document.getElementById('rota-busca-erro');
const modos = [...document.querySelectorAll('.rota-modo')];

let mapa = null;
let linha = null;
let marcadorDestino = null;
let destino = CENTRO;
let modoAtual = 'foot';
let rotas = {};

function formatarTempo(segundos) {
    const minutos = Math.max(1, Math.round(segundos / 60));
    if (minutos < 60) return `${minutos} min`;
    return `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, '0')} min`;
}

function formatarKm(metros) {
    return `${(metros / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
}

async function buscarRota(modo, ponto) {
    const coordenadas = `${ORIGEM.lng},${ORIGEM.lat};${ponto.lng},${ponto.lat}`;
    const resposta = await fetch(`${SERVIDORES[modo]}/${coordenadas}?overview=full&geometries=geojson`);
    return (await resposta.json()).routes[0];
}

// Busca no OpenStreetMap (Nominatim), dando preferência à região de Campinas.
async function buscarLugar(texto) {
    const parametros = new URLSearchParams({ format: 'json', limit: '1', countrycodes: 'br', viewbox: '-47.35,-22.6,-46.7,-23.15', q: texto });
    const resposta = await fetch(`https://nominatim.openstreetmap.org/search?${parametros}`);
    return (await resposta.json())[0];
}

function preencher(modo, rota) {
    const campo = document.querySelector(`[data-tempo="${modo}"]`);
    campo.textContent = rota ? `${formatarTempo(rota.duration)} · ${formatarKm(rota.distance)}` : 'indisponível';
}

function desenharLinha() {
    if (linha) {
        linha.remove();
        linha = null;
    }
    const rota = rotas[modoAtual];
    if (!rota) return;
    linha = L.geoJSON(rota.geometry, { style: { color: '#5ea38f', weight: 5 } }).addTo(mapa);
    mapa.fitBounds(linha.getBounds(), { padding: [40, 40] });
}

async function calcularEstimativas() {
    Object.keys(SERVIDORES).forEach((modo) => {
        document.querySelector(`[data-tempo="${modo}"]`).textContent = '…';
    });
    document.querySelector('[data-tempo="bus"]').textContent = '…';

    const ponto = destino;
    const resultados = await Promise.all(Object.keys(SERVIDORES).map(async (modo) => {
        try {
            return [modo, await buscarRota(modo, ponto)];
        } catch (erro) {
            return [modo, null];
        }
    }));
    if (ponto !== destino) return;

    rotas = Object.fromEntries(resultados);
    Object.keys(SERVIDORES).forEach((modo) => preencher(modo, rotas[modo]));

    const carro = rotas.car;
    const onibus = document.querySelector('[data-tempo="bus"]');
    if (carro) {
        const minutos = Math.round((carro.distance / 1000 / VELOCIDADE_ONIBUS_KMH) * 60 + ESPERA_ONIBUS_MIN);
        onibus.textContent = `~${formatarTempo(minutos * 60)} · ${formatarKm(carro.distance)}`;
    } else {
        onibus.textContent = 'indisponível';
    }
    desenharLinha();
}

function definirDestino(ponto) {
    destino = ponto;
    textoDestino.textContent = `Destino: ${ponto.rotulo || ponto.nome}`;
    botaoCentro.hidden = ponto === CENTRO;

    if (marcadorDestino) marcadorDestino.remove();
    marcadorDestino = L.circleMarker([ponto.lat, ponto.lng], { radius: 8, color: '#fff', weight: 2, fillColor: '#f08070', fillOpacity: 1 })
        .bindTooltip(ponto.nome || 'Destino', { permanent: true, direction: 'top' })
        .addTo(mapa);
    calcularEstimativas();
}

function criarMapa() {
    mapa = L.map('rota-mapa');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapa);

    L.circleMarker([ORIGEM.lat, ORIGEM.lng], { radius: 8, color: '#fff', weight: 2, fillColor: '#5ea38f', fillOpacity: 1 })
        .bindTooltip('Imóvel', { permanent: true, direction: 'top' })
        .addTo(mapa);
    mapa.fitBounds([[ORIGEM.lat, ORIGEM.lng], [CENTRO.lat, CENTRO.lng]], { padding: [40, 40] });

    mapa.on('click', (evento) => {
        definirDestino({ nome: 'Destino', rotulo: 'ponto escolhido no mapa', lat: evento.latlng.lat, lng: evento.latlng.lng });
    });
}

function alternarTelaCheia(ativar) {
    painel.classList.toggle('rota-cheia', ativar);
    document.body.style.overflow = ativar ? 'hidden' : '';
    botaoCheia.textContent = ativar ? 'Sair da tela cheia' : 'Tela cheia';
    botaoCheia.setAttribute('aria-pressed', String(ativar));
    mapa.invalidateSize();
    desenharLinha();
}

botaoAbrir.addEventListener('click', () => {
    const abrir = painel.hidden;
    painel.hidden = !abrir;
    botaoAbrir.setAttribute('aria-expanded', String(abrir));
    botaoAbrir.textContent = abrir ? 'Ocultar mapa' : 'Ver rota no mapa';

    if (abrir && mapa === null) {
        criarMapa();
        definirDestino(CENTRO);
    }
    if (!abrir && painel.classList.contains('rota-cheia')) alternarTelaCheia(false);
});

botaoCheia.addEventListener('click', () => alternarTelaCheia(!painel.classList.contains('rota-cheia')));

document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && painel.classList.contains('rota-cheia')) alternarTelaCheia(false);
});

botaoCentro.addEventListener('click', () => definirDestino(CENTRO));

formBusca.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    erroBusca.hidden = true;
    try {
        const lugar = await buscarLugar(campoBusca.value.trim());
        if (!lugar) {
            erroBusca.hidden = false;
            return;
        }
        definirDestino({ nome: lugar.display_name.split(',')[0], lat: Number(lugar.lat), lng: Number(lugar.lon) });
    } catch (erro) {
        erroBusca.hidden = false;
    }
});

modos.forEach((modo) => {
    modo.addEventListener('click', () => {
        modoAtual = modo.dataset.modo;
        modos.forEach((item) => {
            item.classList.toggle('ativo', item === modo);
            item.setAttribute('aria-pressed', String(item === modo));
        });
        desenharLinha();
    });
});

// Estimativa de carro até o Centro, mostrada no card sem precisar abrir o mapa.
buscarRota('car', CENTRO)
    .then((rota) => {
        textoCarro.textContent = `${formatarTempo(rota.duration)} de carro · ${formatarKm(rota.distance)}`;
    })
    .catch(() => {});
