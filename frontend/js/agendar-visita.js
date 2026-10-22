// Agendar visita é uma ação de quem está logado.
if (!estaLogado()) {
    window.location.href = 'login.html';
}

const form = document.getElementById('agendar-form');
const confirmar = document.getElementById('agendar-confirmar');
const nota = document.getElementById('agendar-nota');
const retorno = document.getElementById('agendar-retorno');

form.addEventListener('submit', (evento) => {
    evento.preventDefault();

    // Sem backend por enquanto: o pedido não é enviado, só confirmado na tela.
    const horario = form.elements.horario.value;
    retorno.textContent = `Pedido enviado para ${horario}. Aguarde a resposta do locador no chat.`;
    retorno.hidden = false;
    nota.hidden = true;

    confirmar.disabled = true;
    form.querySelectorAll('input[name="horario"]').forEach((opcao) => { opcao.disabled = true; });
});
