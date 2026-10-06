const miniaturas = [...document.querySelectorAll('.miniatura')];

miniaturas.forEach((miniatura) => {
    miniatura.addEventListener('click', () => {
        miniaturas.forEach((item) => item.classList.toggle('ativa', item === miniatura));
    });
});

/* Favoritar: este anúncio é a kitnet do Cambuí */
const ID_IMOVEL = 'kitnet-cambui';
const botaoFavoritar = document.getElementById('favoritar');

function mostrarFavorito(favorito) {
    botaoFavoritar.textContent = favorito ? '♥ Favoritado' : '♥ Favoritar';
    botaoFavoritar.classList.toggle('favoritado', favorito);
}

botaoFavoritar.addEventListener('click', () => mostrarFavorito(alternarFavorito(ID_IMOVEL)));
mostrarFavorito(ehFavorito(ID_IMOVEL));
