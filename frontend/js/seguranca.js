if (!requerAuth()) { /* redirect */ }
montarSidebarConfig('seguranca.html');

const form = document.getElementById('senha-form');
const retorno = document.getElementById('senha-retorno');
const senhaAtual = document.getElementById('senha-atual');
const senhaNova = document.getElementById('senha-nova');
const senhaConfirma = document.getElementById('senha-confirma');

const parSenha = RoomMatchSenhaUi.ligarParSenha({
    senha: senhaNova,
    confirma: senhaConfirma,
    forcaBox: document.getElementById('senha-nova-forca'),
    forcaTexto: document.getElementById('senha-nova-forca-texto'),
    matchTexto: document.getElementById('senha-confirma-match')
});

RoomMatchSenhaUi.ligarOlhos(form);

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    parSenha.atualizar();

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    if (senhaNova.value !== senhaConfirma.value) {
        retorno.textContent = 'A confirmação não confere.';
        retorno.classList.add('erro');
        retorno.hidden = false;
        senhaConfirma.focus();
        return;
    }

    const botao = form.querySelector('button[type="submit"]');
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.botaoEspera(botao, true, 'Salvando…');
        RoomMatchLoading.mostrar('Atualizando senha…');
    }
    try {
        await RoomMatchApi.alterarSenha({
            senha_atual: senhaAtual.value,
            senha_nova: senhaNova.value
        });
        retorno.textContent = 'Senha atualizada. Use a nova senha no próximo login.';
        retorno.classList.remove('erro');
        retorno.hidden = false;
        form.reset();
        parSenha.atualizar();
    } catch (erro) {
        retorno.textContent = erro.detail || erro.message;
        retorno.classList.add('erro');
        retorno.hidden = false;
    } finally {
        if (typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.forcarEsconder();
            RoomMatchLoading.botaoEspera(botao, false);
        }
    }
});
