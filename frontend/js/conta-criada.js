const papel = new URLSearchParams(window.location.search).get('papel') === 'locador'
    || ehLocador()
    ? 'Locador'
    : 'Morador';

const texto = document.querySelector('.conta-criada-texto');
const nota = document.querySelector('.conta-criada-nota');
const linkMeus = document.querySelector('.btn-conta-contorno');

if (texto) {
    texto.textContent = papel === 'Locador'
        ? 'Sua conta de Locador está pronta. Publique um anúncio ou gerencie seus imóveis.'
        : 'Sua conta de Morador está pronta. Explore o mural e veja seu match.';
}

if (nota) {
    nota.hidden = papel !== 'Locador';
}

if (linkMeus) {
    if (papel === 'Locador') {
        linkMeus.href = 'meus-imoveis.html';
        linkMeus.textContent = 'Ir para meus anúncios';
    } else {
        linkMeus.href = 'home.html';
        linkMeus.textContent = 'Ir para o mural';
    }
}
