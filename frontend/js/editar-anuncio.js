// Editar anúncio é uma ação de quem está logado.
if (!estaLogado()) {
    window.location.href = 'login.html';
}

const form = document.getElementById('editar-form');
const total = document.getElementById('editar-total');
const retorno = document.getElementById('editar-retorno');
const valores = ['aluguel', 'condominio', 'iptu', 'contas'].map((id) => document.getElementById(id));

function atualizarTotal() {
    const soma = valores.reduce((acumulado, campo) => acumulado + (Number(campo.value) || 0), 0);
    total.textContent = `R$ ${soma.toLocaleString('pt-BR')}`;
}

valores.forEach((campo) => campo.addEventListener('input', atualizarTotal));

form.addEventListener('submit', (evento) => {
    evento.preventDefault();

    // Sem backend por enquanto: as alterações não são salvas, só confirmadas na tela.
    retorno.textContent = 'Alterações salvas.';
    retorno.hidden = false;
});
