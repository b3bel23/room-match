if (!requerAuth()) { /* redirect */ }
montarSidebarConfig('perfil.html');

const form = document.getElementById('perfil-form');
const retorno = document.getElementById('perfil-retorno');

async function carregar() {
    const user = await RoomMatchApi.meuPerfil();
    document.getElementById('perfil-nome').value = user.nome;
    document.getElementById('perfil-email').value = user.email;
    document.getElementById('perfil-papel').value = user.papel;
    entrar(RoomMatchApi.lerToken(), user);
    atualizarChromeSessao();
}

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    try {
        const user = await RoomMatchApi.atualizarPerfil({
            nome: document.getElementById('perfil-nome').value.trim()
        });
        entrar(RoomMatchApi.lerToken(), user);
        atualizarChromeSessao();
        retorno.textContent = 'Perfil atualizado.';
        retorno.classList.remove('erro');
        retorno.hidden = false;
    } catch (erro) {
        retorno.textContent = erro.detail || erro.message;
        retorno.classList.add('erro');
        retorno.hidden = false;
    }
});

carregar().catch((erro) => {
    retorno.textContent = erro.message;
    retorno.classList.add('erro');
    retorno.hidden = false;
});
