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

/* Trocar conta — o tipo escolhido aparece como conta atual */
const contaAtual = document.getElementById('conta-atual');
if (contaAtual) {
    document.querySelectorAll('input[name="conta"]').forEach((opcao) => {
        opcao.addEventListener('change', () => { contaAtual.textContent = opcao.value; });
    });
}
