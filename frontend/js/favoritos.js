if (!requerMorador()) {
    /* redirect */
}

const vistaLista = document.getElementById('vista-lista');
const vistaVazia = document.getElementById('vista-vazia');
const contagem = document.getElementById('favoritos-contagem');
const busca = document.getElementById('favoritos-busca');
const ordem = document.getElementById('favoritos-ordem');
const lista = document.getElementById('favoritos-lista');
const semResultado = document.getElementById('favoritos-sem-resultado');
const modelo = document.getElementById('modelo-favorito');

let cache = [];

function formatarPreco(valor) {
    return valor.toLocaleString('pt-BR');
}

function montarCartao(imovel) {
    const cartao = modelo.content.firstElementChild.cloneNode(true);
    const img = cartao.querySelector('.fav-img');
    if (img && typeof ImovelFotos !== 'undefined') {
        ImovelFotos.iniciarCarrossel(img, ImovelFotos.lista(imovel), { intervalo: 3800 });
    }
    cartao.querySelector('.fav-titulo').textContent = imovel.titulo;
    cartao.querySelector('.fav-detalhes').textContent =
        `${imovel.bairro}, Campinas · R$ ${formatarPreco(imovel.preco)}/mês · `;
    const favMatch = cartao.querySelector('.fav-match');
    if (favMatch) {
        favMatch.textContent = `${imovel.match}%`;
        favMatch.title = `${imovel.match}% de afinidade`;
    }
    cartao.style.cursor = 'pointer';
    cartao.addEventListener('click', (evento) => {
        if (evento.target.closest('.fav-coracao')) return;
        window.location.href = `detalhe.html?id=${encodeURIComponent(imovel.id)}`;
    });

    imovel.tags.forEach((nome, indice) => {
        const tag = document.createElement('span');
        tag.className = indice === 0 ? 'tag tag-destaque' : 'tag';
        tag.textContent = nome;
        cartao.querySelector('.fav-tags').appendChild(tag);
    });

    cartao.querySelector('.fav-coracao').addEventListener('click', async (evento) => {
        evento.stopPropagation();
        await alternarFavorito(imovel.id);
        await carregar();
    });
    return cartao;
}

function desenhar() {
    vistaLista.hidden = cache.length === 0;
    vistaVazia.hidden = cache.length > 0;
    if (cache.length === 0) {
        lista.replaceChildren();
        return;
    }

    contagem.textContent = `${cache.length} ${cache.length === 1 ? 'imóvel salvo' : 'imóveis salvos'}`;

    const termo = busca.value.trim().toLowerCase();
    let imoveis = cache.filter((imovel) =>
        `${imovel.titulo} ${imovel.bairro} ${imovel.tags.join(' ')}`.toLowerCase().includes(termo));

    if (ordem.value === 'match') imoveis = [...imoveis].sort((a, b) => b.match - a.match);
    if (ordem.value === 'preco') imoveis = [...imoveis].sort((a, b) => a.preco - b.preco);

    lista.replaceChildren(...imoveis.map(montarCartao));
    semResultado.hidden = imoveis.length > 0;
}

async function carregar() {
    try {
        cache = await listarFavoritosDetalhados();
        desenhar();
    } catch (erro) {
        contagem.textContent = erro.message;
    }
}

busca.addEventListener('input', desenhar);
ordem.addEventListener('change', desenhar);
carregar();
