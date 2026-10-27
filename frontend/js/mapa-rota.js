// Pontos do anúncio (kitnet do Cambuí) e do destino do usuário.
const ORIGEM = { nome: 'Imóvel', lat: -22.8981, lng: -47.0525 };
let DESTINO = { nome: 'Centro', lat: -22.9055, lng: -47.0610 };

// Busca de lugares do OpenStreetMap, com preferência por Campinas e região.
const BUSCA = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&viewbox=-47.4,-22.6,-46.7,-23.2';

// Servidores OSRM do OpenStreetMap, um por meio de transporte.
const SERVIDORES = {
    foot: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
    bike: 'https://routing.openstreetmap.de/routed-bike/route/v1/bike'
};

const botaoAbrir = document.getElementById('rota-abrir');
const painel = document.getElementById('rota-painel');
const resumo = document.getElementById('rota-resumo');
const formBusca = document.getElementById('rota-busca');
const campoBusca = document.getElementById('rota-busca-campo');
const modos = [...document.querySelectorAll('.rota-modo:not([disabled])')];

let mapa = null;
let linha = null;
let marcadorDestino = null;
let modoAtual = 'foot';

function criarMarcador(ponto, cor) {
    return L.circleMarker([ponto.lat, ponto.lng], { radius: 8, color: '#fff', weight: 2, fillColor: cor, fillOpacity: 1 })
        .bindTooltip(ponto.nome, { permanent: true, direction: 'top' })
        .addTo(mapa);
}

function criarMapa() {
    mapa = L.map('rota-mapa');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapa);

    criarMarcador(ORIGEM, '#5ea38f');
    marcadorDestino = criarMarcador(DESTINO, '#f08070');
    mapa.fitBounds([[ORIGEM.lat, ORIGEM.lng], [DESTINO.lat, DESTINO.lng]], { padding: [40, 40] });
}

async function desenharRota() {
    resumo.textContent = 'Calculando rota…';
    if (linha) {
        linha.remove();
        linha = null;
    }

    const coordenadas = `${ORIGEM.lng},${ORIGEM.lat};${DESTINO.lng},${DESTINO.lat}`;
    try {
        const resposta = await fetch(`${SERVIDORES[modoAtual]}/${coordenadas}?overview=full&geometries=geojson`);
        const rota = (await resposta.json()).routes[0];
        linha = L.geoJSON(rota.geometry, { style: { color: '#5ea38f', weight: 5 } }).addTo(mapa);
        mapa.fitBounds(linha.getBounds(), { padding: [40, 40] });

        const minutos = Math.max(1, Math.round(rota.duration / 60));
        const km = (rota.distance / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
        resumo.textContent = `${minutos} min · ${km} km até o ${DESTINO.nome}`;
    } catch (erro) {
        resumo.textContent = 'Não foi possível calcular a rota agora.';
    }
}

async function buscarDestino(evento) {
    evento.preventDefault();
    const texto = campoBusca.value.trim();
    if (!texto) return;

    resumo.textContent = 'Buscando lugar…';
    try {
        const resposta = await fetch(`${BUSCA}&q=${encodeURIComponent(texto)}`);
        const lugar = (await resposta.json())[0];
        if (!lugar) {
            resumo.textContent = 'Lugar não encontrado. Tente incluir o bairro ou a cidade.';
            return;
        }
        DESTINO = { nome: texto, lat: Number(lugar.lat), lng: Number(lugar.lon) };
        marcadorDestino.remove();
        marcadorDestino = criarMarcador(DESTINO, '#f08070');
        desenharRota();
    } catch (erro) {
        resumo.textContent = 'Não foi possível buscar o lugar agora.';
    }
}

formBusca.addEventListener('submit', buscarDestino);

botaoAbrir.addEventListener('click', () => {
    const abrir = painel.hidden;
    painel.hidden = !abrir;
    botaoAbrir.setAttribute('aria-expanded', String(abrir));
    botaoAbrir.textContent = abrir ? 'Ocultar mapa' : 'Ver rota no mapa';

    if (abrir && mapa === null) {
        criarMapa();
        desenharRota();
    }
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
