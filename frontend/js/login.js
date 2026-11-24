const form = document.getElementById('login-form');
const email = document.getElementById('login-email');
const senha = document.getElementById('login-senha');
const erro = document.getElementById('login-erro');

RoomMatchSenhaUi.ligarOlhos(form);

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

    const botao = form.querySelector('button[type="submit"]');
    const inicio = performance.now();
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.botaoEspera(botao, true, 'Entrando…');
        RoomMatchLoading.mostrar('Entrando…');
        await RoomMatchLoading.aguardarPaint();
    } else if (botao) {
        botao.disabled = true;
    }
    try {
        const dados = await RoomMatchApi.login(email.value.trim(), senha.value);
        entrar(dados.access_token, dados.user);
        const destino = dados.user?.papel === 'Locador' ? 'meus-imoveis.html' : 'home.html';
        const textoOk = dados.user?.papel === 'Locador'
            ? 'Abrindo seus anúncios…'
            : 'Abrindo seu mural…';
        if (typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.definirTexto(textoOk);
            // Tempo mínimo para o logo animado “tocar” um ciclo (API local é instantânea).
            const falta = Math.max(0, 1800 - (performance.now() - inicio));
            if (falta) await new Promise((r) => window.setTimeout(r, falta));
        }
        document.body.classList.add('pagina-saindo');
        // Mantém o overlay até a próxima página (não esconde no sucesso).
        window.location.href = destino;
    } catch (falha) {
        erro.textContent = falha.detail || falha.message || 'E-mail ou senha inválidos.';
        erro.hidden = false;
        email.classList.add('invalido');
        senha.classList.add('invalido');
        if (typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.forcarEsconder();
            RoomMatchLoading.botaoEspera(botao, false);
        } else if (botao) {
            botao.disabled = false;
        }
    }
});
