const form = document.getElementById('login-form');
const email = document.getElementById('login-email');
const senha = document.getElementById('login-senha');
const erro = document.getElementById('login-erro');
const olho = document.getElementById('login-senha-olho');

const ICONE_OLHO = '<svg class="senha-olho-icone" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICONE_OLHO_OFF = '<svg class="senha-olho-icone" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.9 21.9 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';

olho?.addEventListener('click', () => {
    if (!senha) return;
    const mostrar = senha.type === 'password';
    senha.type = mostrar ? 'text' : 'password';
    olho.setAttribute('aria-pressed', mostrar ? 'true' : 'false');
    olho.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    olho.innerHTML = mostrar ? ICONE_OLHO_OFF : ICONE_OLHO;
});

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
