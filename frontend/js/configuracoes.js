// As configurações são uma área de quem está logado.
if (!estaLogado()) {
    window.location.href = 'login.html';
}

function mostrarRetorno(form, texto) {
    const retorno = form.querySelector('.config-retorno');
    retorno.textContent = texto;
    retorno.hidden = false;
}

/* Perfil — sem backend, a alteração só é confirmada na tela */
const perfilForm = document.getElementById('perfil-form');
if (perfilForm) {
    perfilForm.addEventListener('submit', (evento) => {
        evento.preventDefault();
        mostrarRetorno(perfilForm, 'Alterações salvas.');
    });
    perfilForm.addEventListener('reset', () => {
        perfilForm.querySelector('.config-retorno').hidden = true;
    });
}

/* Preferências — tags (mín. 3, máx. 8) e limiar de compatibilidade */
const preferenciasForm = document.getElementById('preferencias-form');
if (preferenciasForm) {
    const TAGS_MINIMO = 3;
    const TAGS_MAXIMO = 8;
    const tags = [...preferenciasForm.querySelectorAll('input[name="tag"]')];
    const sugestoes = [...preferenciasForm.querySelectorAll('.sugestao')];

    function atualizarTags() {
        const marcadas = tags.filter((tag) => tag.checked).length;
        const resumo = `${marcadas}/${tags.length}`;
        document.getElementById('pref-sub').textContent = `Suas tags de convivência · ${resumo}`;
        document.getElementById('tags-titulo').textContent = `Suas tags (${resumo} selecionadas)`;
        tags.forEach((tag) => { tag.disabled = !tag.checked && marcadas >= TAGS_MAXIMO; });
        tags[0].setCustomValidity(
            marcadas < TAGS_MINIMO ? `Selecione no mínimo ${TAGS_MINIMO} tags.` : ''
        );
        sugestoes.forEach((sugestao) => {
            const tag = tags.find((item) => item.value === sugestao.dataset.tag);
            sugestao.disabled = tag.checked || tag.disabled;
        });
    }

    tags.forEach((tag) => tag.addEventListener('change', atualizarTags));
    sugestoes.forEach((sugestao) => {
        sugestao.addEventListener('click', () => {
            tags.find((tag) => tag.value === sugestao.dataset.tag).checked = true;
            atualizarTags();
        });
    });
    atualizarTags();

    const limiar = document.getElementById('limiar');
    const limiarValor = document.getElementById('limiar-valor');

    function preencherBarra() {
        const porcentagem = ((limiar.value - limiar.min) / (limiar.max - limiar.min)) * 100;
        limiar.style.setProperty('--preenchimento', `${porcentagem}%`);
    }

    limiar.addEventListener('input', () => {
        limiarValor.value = limiar.value;
        preencherBarra();
    });
    limiarValor.addEventListener('input', () => {
        limiar.value = limiarValor.value;
        preencherBarra();
    });
    limiarValor.value = limiar.value;
    preencherBarra();

    preferenciasForm.addEventListener('submit', (evento) => {
        evento.preventDefault();
        mostrarRetorno(preferenciasForm, 'Preferências salvas.');
    });
}

/* Segurança — alterar senha e excluir conta */
const senhaForm = document.getElementById('senha-form');
if (senhaForm) {
    const nova = document.getElementById('senha-nova');
    const confirmar = document.getElementById('senha-confirmar');

    function conferirSenhas() {
        confirmar.setCustomValidity(confirmar.value === nova.value ? '' : 'As senhas não conferem.');
    }

    nova.addEventListener('input', conferirSenhas);
    confirmar.addEventListener('input', conferirSenhas);
    senhaForm.addEventListener('submit', (evento) => {
        evento.preventDefault();
        mostrarRetorno(senhaForm, 'Senha alterada.');
        senhaForm.reset();
    });

    const abrir = document.getElementById('excluir-abrir');
    const confirmacao = document.getElementById('excluir-confirmar');

    abrir.addEventListener('click', () => {
        abrir.hidden = true;
        confirmacao.hidden = false;
    });
    document.getElementById('excluir-cancelar').addEventListener('click', () => {
        confirmacao.hidden = true;
        abrir.hidden = false;
    });
    document.getElementById('excluir-confirmado').addEventListener('click', () => {
        // Sem backend: a "exclusão" só encerra a sessão deste navegador.
        try {
            localStorage.removeItem(CHAVE_LOGADO);
        } catch (erro) {
            // sem armazenamento disponível: segue para a tela inicial
        }
        window.location.href = 'home.html';
    });
}

/* Papel em uso: nome nos textos do perfil */
const NOMES = { locatario: 'Locatário', locador: 'Locador' };
const outroPapel = papelAtual() === 'locador' ? 'locatario' : 'locador';
document.querySelectorAll('[data-papel-atual]').forEach((trecho) => { trecho.textContent = NOMES[papelAtual()]; });
document.querySelectorAll('[data-papel-outro]').forEach((trecho) => { trecho.textContent = NOMES[outroPapel]; });

/* Trocar conta — com confirmação; sem cadastro no outro papel, leva ao cadastro */
const botaoTrocar = document.getElementById('conta-trocar');
if (botaoTrocar) {
    const opcoes = [...document.querySelectorAll('input[name="conta"]')];
    const confirmacao = document.getElementById('conta-confirmacao');
    const textoConfirmacao = document.getElementById('conta-confirmacao-texto');
    const aviso = document.getElementById('conta-aviso');
    const cadastradas = contasCadastradas();

    document.getElementById('conta-atual').textContent = NOMES[papelAtual()];
    opcoes.forEach((opcao) => {
        opcao.checked = opcao.value === papelAtual();
        opcao.closest('.papel').querySelector('.papel-status').textContent =
            opcao.value === papelAtual() ? 'Ativo' : cadastradas.includes(opcao.value) ? 'Cadastrado' : 'Sem cadastro';
    });

    function escolhido() {
        return opcoes.find((opcao) => opcao.checked).value;
    }

    function atualizar() {
        const destino = escolhido();
        botaoTrocar.disabled = destino === papelAtual();
        aviso.textContent = cadastradas.includes(destino)
            ? 'Ao trocar, a interface muda para a conta de ' + NOMES[destino] + '.'
            : 'Você ainda não tem cadastro como ' + NOMES[destino] + '. Para trocar, é preciso fazer esse cadastro primeiro.';
    }
    opcoes.forEach((opcao) => opcao.addEventListener('change', atualizar));
    atualizar();

    botaoTrocar.addEventListener('click', () => {
        const destino = escolhido();
        textoConfirmacao.textContent = cadastradas.includes(destino)
            ? 'Você vai passar a usar o RoomMatch como ' + NOMES[destino] + '.'
            : 'Você ainda não tem cadastro como ' + NOMES[destino] + '. Vamos levar você ao cadastro.';
        confirmacao.showModal();
    });

    confirmacao.addEventListener('close', () => {
        if (confirmacao.returnValue !== 'trocar') return;
        const destino = escolhido();
        if (cadastradas.includes(destino)) {
            trocarPapel(destino);
            window.location.href = 'perfil.html';
        } else {
            window.location.href = 'cadastro.html?papel=' + destino;
        }
    });
}
