// Pontos do anúncio (kitnet do Cambuí) e do destino do usuário.
const ORIGEM = { nome: 'Imóvel', lat: -22.8981, lng: -47.0525 };
const DESTINO = { nome: 'Centro', lat: -22.9055, lng: -47.0610 };

// Servidores OSRM do OpenStreetMap, um por meio de transporte.
const SERVIDORES = {
    foot: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
    bike: 'https://routing.openstreetmap.de/routed-bike/route/v1/bike'
};

const botaoAbrir = document.getElementById('rota-abrir');
const painel = document.getElementById('rota-painel');
const resumo = document.getElementById('rota-resumo');
const modos = [...document.querySelectorAll('.rota-modo:not([disabled])')];

let mapa = null;
let linha = null;
let modoAtual = 'foot';

function criarMapa() {
    mapa = L.map('rota-mapa');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapa);

    [[ORIGEM, '#5ea38f'], [DESTINO, '#f08070']].forEach(([ponto, cor]) => {
        L.circleMarker([ponto.lat, ponto.lng], { radius: 8, color: '#fff', weight: 2, fillColor: cor, fillOpacity: 1 })
            .bindTooltip(ponto.nome, { permanent: true, direction: 'top' })
            .addTo(mapa);
    });
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
