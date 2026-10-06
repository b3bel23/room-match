// Favoritos é uma área de quem está logado.
if (!estaLogado()) {
    window.location.href = 'login.html';
}

const vistaLista = document.getElementById('vista-lista');
const vistaVazia = document.getElementById('vista-vazia');
const contagem = document.getElementById('favoritos-contagem');
const busca = document.getElementById('favoritos-busca');
const ordem = document.getElementById('favoritos-ordem');
const lista = document.getElementById('favoritos-lista');
const semResultado = document.getElementById('favoritos-sem-resultado');
const modelo = document.getElementById('modelo-favorito');

function formatarPreco(valor) {
    return valor.toLocaleString('pt-BR');
}

function montarCartao(imovel) {
    const cartao = modelo.content.firstElementChild.cloneNode(true);
    cartao.querySelector('.fav-titulo').textContent = imovel.titulo;
    cartao.querySelector('.fav-detalhes').textContent =
        `${imovel.bairro}, Campinas · R$ ${formatarPreco(imovel.preco)}/mês · `;
    cartao.querySelector('.fav-match').textContent = `${imovel.match}% match`;

    imovel.tags.forEach((nome, indice) => {
        const tag = document.createElement('span');
        tag.className = indice === 0 ? 'tag tag-destaque' : 'tag';
        tag.textContent = nome;
        cartao.querySelector('.fav-tags').appendChild(tag);
    });

    cartao.querySelector('.fav-coracao').addEventListener('click', () => {
        alternarFavorito(imovel.id);
        desenhar();
    });
    return cartao;
}

function desenhar() {
    const ids = lerFavoritos();
    vistaLista.hidden = ids.length === 0;
    vistaVazia.hidden = ids.length > 0;
    if (ids.length === 0) {
        lista.replaceChildren();
        return;
    }

    contagem.textContent = `${ids.length} ${ids.length === 1 ? 'imóvel salvo' : 'imóveis salvos'}`;

    const termo = busca.value.trim().toLowerCase();
    // A ordem de ids já é a dos mais recentes primeiro.
    const imoveis = ids
        .map((id) => IMOVEIS.find((imovel) => imovel.id === id))
        .filter((imovel) => imovel && `${imovel.titulo} ${imovel.bairro} ${imovel.tags.join(' ')}`.toLowerCase().includes(termo));

    if (ordem.value === 'match') imoveis.sort((a, b) => b.match - a.match);
    if (ordem.value === 'preco') imoveis.sort((a, b) => a.preco - b.preco);

    lista.replaceChildren(...imoveis.map(montarCartao));
    semResultado.hidden = imoveis.length > 0;
}

busca.addEventListener('input', desenhar);
ordem.addEventListener('change', desenhar);
desenhar();
