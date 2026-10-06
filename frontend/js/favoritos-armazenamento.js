// Sem backend por enquanto: os favoritos ficam guardados só neste navegador.
const CHAVE_FAVORITOS = 'roommatch-favoritos';

const IMOVEIS = [
    { id: 'republica-barao', titulo: 'Quarto em república · Barão Geraldo', bairro: 'Barão Geraldo', preco: 850, match: 92, tags: ['Pet Friendly', 'Silêncio Noturno'] },
    { id: 'kitnet-cambui', titulo: 'Kitnet mobiliada · Cambuí', bairro: 'Cambuí', preco: 1200, match: 78, tags: ['LGBTQIA+ Safe', 'Vegetariano'] },
    { id: 'casa-sousas', titulo: 'Quarto em casa · Sousas', bairro: 'Sousas', preco: 720, match: 88, tags: ['Pet Friendly', 'Sem Festas'] },
    { id: 'suite-taquaral', titulo: 'Quarto suíte · Taquaral', bairro: 'Taquaral', preco: 980, match: 81, tags: ['Silêncio Noturno', 'Home Office'] }
];

// Na primeira visita, os quatro imóveis do protótipo já vêm favoritados.
function lerFavoritos() {
    try {
        const salvos = localStorage.getItem(CHAVE_FAVORITOS);
        return salvos === null ? IMOVEIS.map((imovel) => imovel.id) : JSON.parse(salvos);
    } catch (erro) {
        return [];
    }
}

function salvarFavoritos(ids) {
    try {
        localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(ids));
    } catch (erro) {
        // sem armazenamento disponível: a alteração vale só até recarregar a página
    }
}

function ehFavorito(id) {
    return lerFavoritos().includes(id);
}

// O favorito mais recente fica no início da lista.
function alternarFavorito(id) {
    const ids = lerFavoritos();
    const novos = ids.includes(id) ? ids.filter((item) => item !== id) : [id, ...ids];
    salvarFavoritos(novos);
    return novos.includes(id);
}
