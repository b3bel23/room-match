if (!requerAuth()) { /* redirect */ }
montarSidebarConfig('seguranca.html');

const retorno = document.getElementById('senha-retorno');

document.getElementById('senha-form').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const nova = document.getElementById('senha-nova').value;
    const confirma = document.getElementById('senha-confirma').value;
    if (nova !== confirma) {
        retorno.textContent = 'A confirmação não confere.';
        retorno.classList.add('erro');
        retorno.hidden = false;
        return;
    }
    try {
        await RoomMatchApi.alterarSenha({
            senha_atual: document.getElementById('senha-atual').value,
            senha_nova: nova
        });
        retorno.textContent = 'Senha atualizada. Use a nova senha no próximo login.';
        retorno.classList.remove('erro');
        retorno.hidden = false;
        evento.target.reset();
    } catch (erro) {
        retorno.textContent = erro.detail || erro.message;
        retorno.classList.add('erro');
        retorno.hidden = false;
    }
});
