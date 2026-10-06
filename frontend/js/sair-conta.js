// Pede confirmação antes de sair da conta.
const linkSair = document.querySelector('a.sair');

const confirmacao = document.createElement('dialog');
confirmacao.className = 'confirmacao';
confirmacao.setAttribute('aria-labelledby', 'sair-titulo');
confirmacao.innerHTML = `
    <form method="dialog">
        <h2 id="sair-titulo">Você tem certeza que quer sair?</h2>
        <div class="confirmacao-botoes">
            <button class="btn btn-secondary" value="cancelar">Cancelar</button>
            <button class="btn btn-primary btn-sair" value="sair">Sair</button>
        </div>
    </form>`;
document.body.append(confirmacao);

linkSair.addEventListener('click', (evento) => {
    evento.preventDefault();
    confirmacao.showModal();
});

confirmacao.addEventListener('close', () => {
    if (confirmacao.returnValue === 'sair') {
        sair();
        window.location.href = 'login.html';
    }
});
