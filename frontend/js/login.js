const form = document.getElementById('login-form');
const email = document.getElementById('login-email');
const senha = document.getElementById('login-senha');
const erro = document.getElementById('login-erro');

if (typeof estaLogado === 'function' && estaLogado()) {
    window.location.replace(typeof paginaInicial === 'function' ? paginaInicial() : 'home.html');
}

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const invalido = !email.value.trim() || !senha.value;
    email.classList.toggle('invalido', invalido);
    senha.classList.toggle('invalido', invalido);

    if (invalido) {
        erro.textContent = 'E-mail ou senha inválidos.';
        erro.hidden = false;
        return;
    }

    try {
        const dados = await RoomMatchApi.login(email.value.trim(), senha.value);
        entrar(dados.access_token, dados.user);
        const destino = dados.user?.papel === 'Locador' ? 'meus-imoveis.html' : 'home.html';
        window.location.href = destino;
    } catch (falha) {
        erro.textContent = falha.detail || falha.message || 'E-mail ou senha inválidos.';
        erro.hidden = false;
        email.classList.add('invalido');
        senha.classList.add('invalido');
    }
});
