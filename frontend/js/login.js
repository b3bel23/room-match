const form = document.getElementById('login-form');
const email = document.getElementById('login-email');
const senha = document.getElementById('login-senha');
const erro = document.getElementById('login-erro');

form.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const invalido = !email.value.trim() || !senha.value;
    email.classList.toggle('invalido', invalido);
    senha.classList.toggle('invalido', invalido);
    erro.hidden = !invalido;

    if (!invalido) {
        // Sem backend por enquanto: o login válido leva direto à tela inicial.
        window.location.href = '../../index.html';
    }
});
