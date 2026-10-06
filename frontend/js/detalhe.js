const miniaturas = [...document.querySelectorAll('.miniatura')];

miniaturas.forEach((miniatura) => {
    miniatura.addEventListener('click', () => {
        miniaturas.forEach((item) => item.classList.toggle('ativa', item === miniatura));
    });
});
