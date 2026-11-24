const form = document.getElementById('cadastro-form');
const etapas = [...form.querySelectorAll('.etapa')];
const passos = [...form.querySelectorAll('.step')];
const rotulo = document.getElementById('etapa-rotulo');
let atual = 0;

const papel = new URLSearchParams(window.location.search).get('papel') === 'locador' ? 'Locador' : 'Morador';
document.querySelectorAll('[data-papel]').forEach((trecho) => { trecho.textContent = papel; });

/** Máscara de CPF (11) ou CNPJ (14), só dígitos no value formatado. */
function formatarCpfCnpj(valor) {
    const digitos = String(valor || '').replace(/\D/g, '').slice(0, 14);
    if (digitos.length <= 11) {
        return digitos
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return digitos
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

function cpfCnpjValido(valor) {
    const digitos = String(valor || '').replace(/\D/g, '');
    return digitos.length === 11 || digitos.length === 14;
}

// CPF obrigatório no cadastro de Locador (API e mock exigem cpf_cnpj).
const campoCpf = document.getElementById('campo-cpf');
const inputCpf = document.getElementById('cpf-cnpj');
if (campoCpf && inputCpf) {
    const locador = papel === 'Locador';
    campoCpf.hidden = !locador;
    inputCpf.required = locador;
    if (locador) {
        inputCpf.addEventListener('input', () => {
            const cursor = inputCpf.selectionStart;
            const antes = inputCpf.value.length;
            inputCpf.value = formatarCpfCnpj(inputCpf.value);
            const depois = inputCpf.value.length;
            const novo = Math.max(0, (cursor || 0) + (depois - antes));
            try {
                inputCpf.setSelectionRange(novo, novo);
            } catch (erro) {
                /* input type text ok; ignore se o browser negar */
            }
            inputCpf.setCustomValidity(
                cpfCnpjValido(inputCpf.value) ? '' : 'Informe um CPF (11 dígitos) ou CNPJ (14).'
            );
        });
    }
}

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
    const orcamentoLido = lerOrcamentoReais();
    const orcamento = Number.isFinite(orcamentoLido) ? orcamentoLido : 1000;
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
        limiar_compatibilidade: limiar,
        cpf_cnpj: papel === 'Locador' ? (inputCpf?.value || '').trim() : undefined
    };

    if (papel === 'Locador' && !cpfCnpjValido(payload.cpf_cnpj)) {
        mostrarEtapa(0);
        if (inputCpf) {
            inputCpf.setCustomValidity('Informe um CPF (11 dígitos) ou CNPJ (14).');
            inputCpf.reportValidity();
        }
        return;
    }

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

if (typeof RoomMatchFaceCheck !== 'undefined' && foto) {
    RoomMatchFaceCheck.ligarEntrada(foto, {
        statusEl: document.getElementById('foto-face-status'),
        onAceita(dataUrl) {
            mostrarPreviaFoto(dataUrl);
        },
        onRecusa() {
            limparPreviaFoto();
        }
    });
    RoomMatchFaceCheck.aquecer();
} else {
    foto?.addEventListener('change', () => {
        limparPreviaFoto();
        foto.setCustomValidity('Verificador de rosto não carregou. Atualize a página.');
        foto.reportValidity();
    });
}

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

/** pt-BR: 1.200,00 = mil e duzentos; 10.000,00 = dez mil. */
function formatarReais(valor) {
    const n = Number(valor);
    if (!Number.isFinite(n)) return '0,00';
    return n.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function parseReais(texto) {
    const bruto = String(texto || '').trim();
    if (!bruto) return NaN;
    const limpo = bruto.replace(/[^\d.,-]/g, '');
    if (limpo.includes(',')) {
        return Number(limpo.replace(/\./g, '').replace(',', '.'));
    }
    // Só ponto: trata como milhar BR se houver 3 dígitos após o último ponto
    // (ex.: 10.000 → 10000); senão, decimal EN (ex.: 1200.5).
    const partes = limpo.split('.');
    if (partes.length > 1 && partes[partes.length - 1].length === 3) {
        return Number(limpo.replace(/\./g, ''));
    }
    return Number(limpo);
}

const orcamento = document.getElementById('orcamento');
const orcamentoValor = document.getElementById('orcamento-valor');
const ORCAMENTO_MIN = Number(orcamento?.min) || 0;
const ORCAMENTO_MAX = Number(orcamento?.max) || 100000;

function limitarOrcamento(n) {
    if (!Number.isFinite(n)) return ORCAMENTO_MIN;
    return Math.min(ORCAMENTO_MAX, Math.max(ORCAMENTO_MIN, n));
}

function sincronizarOrcamentoDoSlider() {
    orcamentoValor.value = formatarReais(orcamento.value);
    preencherBarra(orcamento);
}

function sincronizarOrcamentoDoTexto({ formatar = false } = {}) {
    const lido = parseReais(orcamentoValor.value);
    if (!Number.isFinite(lido)) {
        if (formatar) orcamentoValor.value = formatarReais(orcamento.value);
        return;
    }
    const limitado = limitarOrcamento(lido);
    const noSlider = Math.round(limitado / 100) * 100;
    orcamento.value = String(noSlider);
    if (formatar) orcamentoValor.value = formatarReais(noSlider);
    preencherBarra(orcamento);
}

function lerOrcamentoReais() {
    const doTexto = parseReais(orcamentoValor?.value);
    if (Number.isFinite(doTexto)) return limitarOrcamento(doTexto);
    const doSlider = Number(orcamento?.value);
    return Number.isFinite(doSlider) ? limitarOrcamento(doSlider) : NaN;
}

orcamento.addEventListener('input', sincronizarOrcamentoDoSlider);
orcamentoValor.addEventListener('input', () => sincronizarOrcamentoDoTexto());
orcamentoValor.addEventListener('change', () => sincronizarOrcamentoDoTexto({ formatar: true }));
orcamentoValor.addEventListener('blur', () => sincronizarOrcamentoDoTexto({ formatar: true }));
sincronizarOrcamentoDoSlider();

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
