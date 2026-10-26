const form = document.getElementById('cadastro-form');
const etapas = [...form.querySelectorAll('.etapa')];
const passos = [...form.querySelectorAll('.step')];
const rotulo = document.getElementById('etapa-rotulo');
let atual = 0;

const papel = new URLSearchParams(window.location.search).get('papel') === 'locador' ? 'Locador' : 'Morador';
document.querySelectorAll('[data-papel]').forEach((trecho) => { trecho.textContent = papel; });

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

async function finalizarCadastro() {
    if (!validarEtapa()) return;

    const nome = document.getElementById('nome')?.value?.trim()
        || document.querySelector('input[name="nome"]')?.value?.trim()
        || document.querySelector('#cadastro-form input[type="text"]')?.value?.trim()
        || 'Novo usuário';
    const emailCampo = document.getElementById('email')
        || document.querySelector('input[type="email"]');
    const senhaCampo = document.getElementById('senha');
    const tags = [...form.querySelectorAll('input[name="tag"]:checked')].map((t) => t.value || t.nextElementSibling?.textContent?.trim()).filter(Boolean);
    const orcamento = Number(document.getElementById('orcamento-valor')?.value
        || document.getElementById('orcamento')?.value) || 1000;
    const limiar = Number(document.getElementById('limiar-valor')?.value
        || document.getElementById('limiar')?.value) || 70;

    try {
        const dados = await RoomMatchApi.register({
            nome,
            email: emailCampo.value.trim(),
            senha: senhaCampo.value,
            papel,
            tags,
            orcamento,
            limiar
        });
        entrar(dados.access_token, dados.user);
        window.location.href = `conta-criada.html?papel=${papel === 'Locador' ? 'locador' : 'morador'}`;
    } catch (falha) {
        window.alert(falha.detail || falha.message || 'Não foi possível criar a conta.');
    }
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
        finalizarCadastro();
    }
});

form.addEventListener('submit', (evento) => evento.preventDefault());

const senha = document.getElementById('senha');
const confirmarSenha = document.getElementById('confirmar-senha');

function conferirSenhas() {
    confirmarSenha.setCustomValidity(
        senha.value === confirmarSenha.value ? '' : 'As senhas não coincidem.'
    );
}
senha.addEventListener('input', conferirSenhas);
confirmarSenha.addEventListener('input', conferirSenhas);

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

function preencherBarra(campo) {
    const porcentagem = ((campo.value - campo.min) / (campo.max - campo.min)) * 100;
    campo.style.setProperty('--preenchimento', `${porcentagem}%`);
}

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

const limiar = document.getElementById('limiar');
const limiarValor = document.getElementById('limiar-valor');

limiar.addEventListener('input', () => {
    limiarValor.value = limiar.value;
    preencherBarra(limiar);
});
limiarValor.addEventListener('input', () => {
    limiar.value = limiarValor.value;
    preencherBarra(limiar);
});
limiarValor.value = limiar.value;
preencherBarra(limiar);

const aceite = document.getElementById('aceite');
const finalizar = document.getElementById('finalizar');
aceite.addEventListener('change', () => { finalizar.disabled = !aceite.checked; });
