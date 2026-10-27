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
    if (atual === 0) {
        if (!fotoDataUrl) {
            foto?.setCustomValidity('Adicione uma foto de perfil.');
            foto?.reportValidity();
            return false;
        }
        foto?.setCustomValidity('');
        parSenha.atualizar();
    }
    for (const campo of etapas[atual].querySelectorAll('input')) {
        if (campo.id === 'foto') continue;
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

    const genero = form.querySelector('input[name="genero"]:checked')?.value || '';
    const foto_url = fotoDataUrl || '';
    if (!foto_url) {
        foto?.setCustomValidity('Adicione uma foto de perfil.');
        foto?.reportValidity();
        mostrarEtapa(0);
        return;
    }

    const payload = {
        nome,
        email: emailCampo.value.trim(),
        senha: senhaCampo.value,
        papel,
        papel_schema: papel === 'Locador' ? 'locador' : 'locatario',
        telefone: document.getElementById('telefone')?.value.trim() || '',
        genero,
        ocupacao: document.getElementById('ocupacao')?.value || '',
        emprego: document.getElementById('emprego')?.value || '',
        faculdade: document.getElementById('faculdade')?.value || '',
        foto_url,
        tags,
        orcamento_maximo: orcamento,
        limiar_compatibilidade: limiar
    };

    try {
        const dados = await RoomMatchApi.register(payload);
        entrar(dados.access_token, dados.user);
        window.location.href = `conta-criada.html?papel=${papel === 'Locador' ? 'locador' : 'morador'}`;
    } catch (falha) {
        const msg = falha.detail || falha.message || 'Não foi possível criar a conta.';
        if (falha.status === 403) {
            const ir = window.confirm(`${msg}\n\nAbrir a tela de Entrar?`);
            if (ir) window.location.href = 'login.html';
            return;
        }
        window.alert(msg);
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
const parSenha = RoomMatchSenhaUi.ligarParSenha({
    senha,
    confirma: confirmarSenha,
    forcaBox: document.getElementById('senha-forca'),
    forcaTexto: document.getElementById('senha-forca-texto'),
    matchTexto: document.getElementById('senha-match')
});

function atualizarForcaSenha() {
    parSenha.atualizar();
}

function conferirSenhas() {
    parSenha.atualizar();
}

const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const LADO_MINIMO = 200;
const foto = document.getElementById('foto');
const previa = document.getElementById('foto-previa');
const avatar = previa?.closest('.avatar');
const btnFoto = document.querySelector('label.btn-foto[for="foto"]');
let fotoDataUrl = '';

function limparPreviaFoto() {
    fotoDataUrl = '';
    if (previa) {
        previa.removeAttribute('src');
        previa.hidden = true;
    }
    avatar?.classList.remove('com-foto');
    if (btnFoto) btnFoto.textContent = 'Adicionar foto';
}

function mostrarPreviaFoto(dataUrl) {
    fotoDataUrl = dataUrl;
    if (!previa) return;
    previa.src = dataUrl;
    previa.hidden = false;
    avatar?.classList.add('com-foto');
    if (btnFoto) btnFoto.textContent = 'Trocar foto';
}

function lerArquivoComoDataUrl(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result || ''));
        leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
        leitor.readAsDataURL(arquivo);
    });
}

function validarDimensoes(dataUrl) {
    return new Promise((resolve, reject) => {
        const imagem = new Image();
        imagem.onload = () => {
            if (imagem.naturalWidth < LADO_MINIMO || imagem.naturalHeight < LADO_MINIMO) {
                reject(new Error('A foto deve ter no mínimo 200×200 px.'));
                return;
            }
            resolve(dataUrl);
        };
        imagem.onerror = () => reject(new Error('Imagem inválida.'));
        imagem.src = dataUrl;
    });
}

foto?.addEventListener('change', async () => {
    const arquivo = foto.files?.[0];
    foto.value = '';
    foto.setCustomValidity('');
    if (!arquivo) {
        limparPreviaFoto();
        return;
    }

    try {
        if (!['image/jpeg', 'image/png'].includes(arquivo.type)) {
            throw new Error('Use uma imagem JPG ou PNG.');
        }
        if (arquivo.size > TAMANHO_MAXIMO) {
            throw new Error('A foto deve ter no máximo 5 MB.');
        }
        const dataUrl = await validarDimensoes(await lerArquivoComoDataUrl(arquivo));
        if (typeof RoomMatchFaceCheck === 'undefined') {
            throw new Error('Verificador de rosto não carregou. Atualize a página e tente de novo.');
        }
        await RoomMatchFaceCheck.exigirRosto(dataUrl);
        mostrarPreviaFoto(dataUrl);
        foto.setCustomValidity('');
    } catch (erro) {
        limparPreviaFoto();
        foto.setCustomValidity(erro.message || 'Não foi possível usar esta foto.');
        foto.reportValidity();
    }
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

if (typeof RoomMatchClassificacoes !== 'undefined') {
    RoomMatchClassificacoes.preencherSelect(document.getElementById('ocupacao'), 'ocupacao', '');
    RoomMatchClassificacoes.preencherSelect(document.getElementById('emprego'), 'emprego', '');
}
if (typeof RoomMatchUniversidadesSp !== 'undefined') {
    RoomMatchUniversidadesSp.preencherSelect(document.getElementById('faculdade'), '');
}
