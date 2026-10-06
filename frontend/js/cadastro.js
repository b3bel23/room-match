const form = document.getElementById('cadastro-form');
const etapas = [...form.querySelectorAll('.etapa')];
const passos = [...form.querySelectorAll('.step')];
const rotulo = document.getElementById('etapa-rotulo');
let atual = 0;

function mostrarEtapa(indice) {
    atual = indice;
    etapas.forEach((etapa, i) => { etapa.hidden = i !== indice; });
    passos.forEach((passo, i) => passo.classList.toggle('ativo', i <= indice));
    rotulo.textContent = `Etapa ${indice + 1} de ${passos.length}`;
    window.scrollTo(0, 0);
}

function validarEtapa() {
    for (const campo of etapas[atual].querySelectorAll('input')) {
        if (!campo.checkValidity()) {
            campo.reportValidity();
            return false;
        }
    }
    return true;
}

form.addEventListener('click', (evento) => {
    const acao = evento.target.dataset.acao;
    if (acao === 'voltar') {
        mostrarEtapa(atual - 1);
    }
    if (acao === 'continuar' && validarEtapa()) {
        mostrarEtapa(atual + 1);
    }
    if (acao === 'finalizar') {
        // Sem backend por enquanto: o cadastro finalizado leva à tela de conta criada.
        window.location.href = 'conta-criada.html';
    }
});

form.addEventListener('submit', (evento) => evento.preventDefault());

/* Etapa 1 — senhas */
const senha = document.getElementById('senha');
const confirmarSenha = document.getElementById('confirmar-senha');

function conferirSenhas() {
    confirmarSenha.setCustomValidity(
        senha.value === confirmarSenha.value ? '' : 'As senhas não coincidem.'
    );
}
senha.addEventListener('input', conferirSenhas);
confirmarSenha.addEventListener('input', conferirSenhas);

/* Etapa 1 — foto de perfil */
const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const LADO_MINIMO = 200;
const foto = document.getElementById('foto');
const previa = document.getElementById('foto-previa');

foto.addEventListener('change', () => {
    const arquivo = foto.files[0];
    foto.setCustomValidity('');
    previa.hidden = true;
    if (!arquivo) return;

    if (!['image/jpeg', 'image/png'].includes(arquivo.type)) {
        foto.setCustomValidity('Use uma imagem JPG ou PNG.');
        return;
    }
    if (arquivo.size > TAMANHO_MAXIMO) {
        foto.setCustomValidity('A foto deve ter no máximo 5 MB.');
        return;
    }

    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => {
        if (imagem.naturalWidth < LADO_MINIMO || imagem.naturalHeight < LADO_MINIMO) {
            foto.setCustomValidity('A foto deve ter no mínimo 200×200 px.');
            URL.revokeObjectURL(url);
            return;
        }
        previa.src = url;
        previa.hidden = false;
    };
    imagem.src = url;
});

/* Etapa 2 — tags */
const TAGS_MINIMO = 3;
const TAGS_MAXIMO = 8;
const tags = [...form.querySelectorAll('input[name="tag"]')];
const contador = document.getElementById('tags-contador');

function atualizarTags() {
    const marcadas = tags.filter((tag) => tag.checked).length;
    contador.textContent = `${marcadas} ${marcadas === 1 ? 'selecionada' : 'selecionadas'}`;
    tags.forEach((tag) => { tag.disabled = !tag.checked && marcadas >= TAGS_MAXIMO; });
    tags[0].setCustomValidity(
        marcadas < TAGS_MINIMO ? `Selecione no mínimo ${TAGS_MINIMO} tags.` : ''
    );
}
tags.forEach((tag) => tag.addEventListener('change', atualizarTags));
atualizarTags();

/* Etapa 2 — sliders */
function preencherBarra(campo) {
    const porcentagem = ((campo.value - campo.min) / (campo.max - campo.min)) * 100;
    campo.style.setProperty('--preenchimento', `${porcentagem}%`);
}

/* Orçamento: o valor pode ser arrastado na barra ou digitado no campo */
const orcamento = document.getElementById('orcamento');
const orcamentoValor = document.getElementById('orcamento-valor');

orcamento.addEventListener('input', () => {
    orcamentoValor.value = Number(orcamento.value).toFixed(2);
    preencherBarra(orcamento);
});
orcamentoValor.addEventListener('input', () => {
    orcamento.value = orcamentoValor.value;
    preencherBarra(orcamento);
});
orcamentoValor.addEventListener('change', () => {
    if (orcamentoValor.value !== '') {
        orcamentoValor.value = Number(orcamentoValor.value).toFixed(2);
    }
});
orcamentoValor.value = Number(orcamento.value).toFixed(2);
preencherBarra(orcamento);

/* Limiar de compatibilidade */
const limiar = document.getElementById('limiar');
const limiarValor = document.getElementById('limiar-valor');

limiar.addEventListener('input', () => {
    limiarValor.textContent = `${limiar.value}%`;
    preencherBarra(limiar);
});
limiarValor.textContent = `${limiar.value}%`;
preencherBarra(limiar);

/* Etapa 3 — aceite dos termos */
const aceite = document.getElementById('aceite');
const finalizar = document.getElementById('finalizar');
aceite.addEventListener('change', () => { finalizar.disabled = !aceite.checked; });
