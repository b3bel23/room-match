const form = document.getElementById('cadastro-form');
const etapas = [...form.querySelectorAll('.etapa')];
const passos = [...form.querySelectorAll('.step')];
const rotulo = document.getElementById('etapa-rotulo');
let atual = 0;

const papel = new URLSearchParams(window.location.search).get('papel') === 'locador' ? 'Locador' : 'Morador';
const ehCadastroLocador = papel === 'Locador';
document.querySelectorAll('[data-papel]').forEach((trecho) => { trecho.textContent = papel; });

document.querySelectorAll('[data-somente-morador]').forEach((el) => {
    el.hidden = ehCadastroLocador;
});
document.querySelectorAll('[data-somente-locador]').forEach((el) => {
    el.hidden = !ehCadastroLocador;
});

(function personalizarPorPapel() {
    const tipCadastro = document.querySelector('.etapa[data-etapa="1"] .tip-panel');
    if (tipCadastro) {
        tipCadastro.textContent = ehCadastroLocador
            ? 'Crie a conta de Locador para anunciar na região metropolitana de Campinas; o anúncio em si vem depois.'
            : 'Crie a conta de Morador para buscar moradia compatível na região metropolitana de Campinas.';
    }

    const titulo2 = document.getElementById('etapa2-titulo');
    const tip2 = document.getElementById('etapa2-tip');
    const sub2 = document.getElementById('etapa2-subtitulo');
    const adesaoTitulo = document.getElementById('tags-adesao-titulo');
    const adesaoTip = document.getElementById('tags-adesao-tip');
    const restricaoTitulo = document.getElementById('tags-restricao-titulo');
    const restricaoTip = document.getElementById('tags-restricao-tip');

    if (ehCadastroLocador) {
        if (titulo2) titulo2.textContent = 'Estilo da casa';
        if (tip2) {
            tip2.textContent = 'Hábitos e regras que descrevem o imóvel anunciado. Orçamento e limiar de afinidade são só do Morador.';
        }
        if (sub2) {
            sub2.textContent = 'Sem orçamento nesta etapa: o valor do aluguel entra quando você publicar o anúncio.';
        }
        if (adesaoTitulo) adesaoTitulo.textContent = 'O que a casa oferece';
        if (adesaoTip) {
            adesaoTip.textContent = 'Características positivas do imóvel ou da república (ex.: aceita animais, trabalho em casa).';
        }
        if (restricaoTitulo) restricaoTitulo.textContent = 'Regras da casa';
        if (restricaoTip) {
            restricaoTip.textContent = 'Limites do imóvel (ex.: silêncio noturno, sem festas). Opcional, mas melhora a afinidade.';
        }
    } else if (sub2) {
        sub2.textContent = 'Defina orçamento, afinidade mínima e hábitos para encontrar anúncios compatíveis.';
    }
}());

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
    const telefoneCampo = document.getElementById('telefone');
    const senhaCampo = document.getElementById('senha');
    const tags = [...form.querySelectorAll('input[name="tag"]:checked')].map((t) => t.value || t.nextElementSibling?.textContent?.trim()).filter(Boolean);

    if (typeof RoomMatchEmail !== 'undefined' && emailCampo) {
        const emailOk = RoomMatchEmail.aplicarNoInput(emailCampo);
        if (!emailOk.ok) {
            mostrarEtapa(0);
            emailCampo.reportValidity();
            return;
        }
    }
    if (typeof RoomMatchTelefone !== 'undefined' && telefoneCampo) {
        const telOk = RoomMatchTelefone.aplicarNoInput(telefoneCampo);
        if (!telOk.ok) {
            mostrarEtapa(0);
            telefoneCampo.reportValidity();
            return;
        }
    }

    const genero = form.querySelector('input[name="genero"]:checked')?.value || '';
    const foto_url = fotoDataUrl || '';
    if (!foto_url) {
        foto?.setCustomValidity('Adicione uma foto de perfil.');
        foto?.reportValidity();
        mostrarEtapa(0);
        return;
    }

    const nascimento = document.getElementById('data-nascimento')?.value || '';
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
        bio: document.getElementById('bio')?.value?.trim() || '',
        cidade_atual: document.getElementById('cidade-atual')?.value?.trim() || '',
        data_nascimento: nascimento || undefined,
        tags,
        // API grava só dígitos; máscara fica só na tela.
        cpf_cnpj: papel === 'Locador' ? (inputCpf?.value || '').replace(/\D/g, '') : undefined
    };

    // Orçamento, limiar e raio são só do Morador (locatário). Locador informa preço no anúncio.
    if (!ehCadastroLocador) {
        const orcamentoLido = lerOrcamentoReais();
        payload.orcamento_maximo = Number.isFinite(orcamentoLido) ? orcamentoLido : 1000;
        payload.limiar_compatibilidade = Number(document.getElementById('limiar-valor')?.value
            || document.getElementById('limiar')?.value) || 70;
        const raio = Number(document.getElementById('raio-busca')?.value);
        if (Number.isFinite(raio) && raio >= 0) payload.raio_busca_km = raio;
    }

    if (papel === 'Locador' && !cpfCnpjValido(payload.cpf_cnpj)) {
        mostrarEtapa(0);
        if (inputCpf) {
            inputCpf.setCustomValidity('Informe um CPF (11 dígitos) ou CNPJ (14).');
            inputCpf.reportValidity();
        }
        return;
    }

    const botao = form.querySelector('[data-acao="finalizar"]');
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.botaoEspera(botao, true, 'Criando conta…');
        RoomMatchLoading.mostrar('Criando sua conta…');
    }
    try {
        const dados = await RoomMatchApi.register(payload);
        entrar(dados.access_token, dados.user);
        if (typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.mostrar('Quase lá…');
        }
        window.location.href = `conta-criada.html?papel=${papel === 'Locador' ? 'locador' : 'morador'}`;
    } catch (falha) {
        if (typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.forcarEsconder();
            RoomMatchLoading.botaoEspera(botao, false);
        }
        const msg = falha.detail || falha.message || 'Não foi possível criar a conta.';
        if (falha.status === 403) {
            const ir = window.confirm(`${msg}\n\nAbrir a tela de Entrar?`);
            if (ir) window.location.href = 'login.html';
            return;
        }
        // E-mail ou CPF/CNPJ já cadastrado: impede criação e oferece Contato.
        if (falha.status === 409) {
            const ir = window.confirm(`${msg}\n\nAbrir a página de Contato?`);
            if (ir) window.location.href = 'contato.html';
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
const LADO_MINIMO = 400;
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
                reject(new Error('A foto deve ter no mínimo 400×400 px.'));
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

// Tags do catálogo (schema: opcionais). Conflitos se auto-desmarcam.
function montarPilulasCadastro(container, nomes) {
    if (!container) return;
    container.replaceChildren();
    (nomes || []).forEach((nome) => {
        if (typeof RoomMatchTags !== 'undefined' && RoomMatchTags.criarPilula) {
            container.append(RoomMatchTags.criarPilula(nome, { name: 'tag' }));
            return;
        }
        const label = document.createElement('label');
        label.className = 'pilula';
        label.innerHTML =
            `<input class="visually-hidden" type="checkbox" name="tag" value="${nome}">` +
            `<span>${nome}</span>`;
        container.append(label);
    });
}
const catTags = typeof RoomMatchTags !== 'undefined' ? RoomMatchTags : null;
montarPilulasCadastro(document.getElementById('tags-adesao'), catTags?.ADESAO || []);
montarPilulasCadastro(document.getElementById('tags-restricao'), catTags?.RESTRICAO || []);

const tags = [...form.querySelectorAll('input[name="tag"]')];
const contador = document.getElementById('tags-contador');

const dicaMinimo = document.getElementById('tags-dica-minimo');

function atualizarTags() {
    const marcadas = tags.filter((tag) => tag.checked).length;
    if (contador) {
        contador.textContent = `${marcadas} ${marcadas === 1 ? 'selecionada' : 'selecionadas'}`;
    }
    if (dicaMinimo) {
        if (ehCadastroLocador) {
            dicaMinimo.innerHTML = marcadas >= 3
                ? 'Bom perfil: hábitos da casa e regras claros para a afinidade.'
                : 'Marque o que a casa oferece e as regras que valem — <strong>3 ou mais</strong> deixam o perfil mais justo.';
        } else {
            dicaMinimo.innerHTML = marcadas >= 3
                ? 'Hábitos em <strong>O que combina</strong> sobem o % quando o anúncio também os tem; <strong>Meus limites</strong> só caem com conflito. Tags extras no anúncio não baixam; conflito duro limita a 35%.'
                : 'Só o marcado entra na conta (desmarcado é neutro). Limites: silêncio no anúncio é ok; conflito limita a 35%. Um perfil com <strong>3 ou mais</strong> hábitos fica mais justo.';
        }
    }
    tags.forEach((tag) => {
        tag.disabled = false;
        tag.setCustomValidity('');
    });
}
if (catTags?.ligarConflitos) {
    catTags.ligarConflitos(tags, { onChange: atualizarTags });
} else {
    tags.forEach((tag) => tag.addEventListener('change', atualizarTags));
}
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
    RoomMatchClassificacoes.montarEscolha(
        document.getElementById('ocupacao-escolha'),
        document.getElementById('ocupacao'),
        'ocupacao',
        ''
    );
    RoomMatchClassificacoes.montarEscolha(
        document.getElementById('emprego-escolha'),
        document.getElementById('emprego'),
        'emprego',
        ''
    );
}
if (typeof RoomMatchUniversidadesSp !== 'undefined') {
    if (RoomMatchUniversidadesSp.montarBusca) {
        RoomMatchUniversidadesSp.montarBusca(
            document.getElementById('faculdade-busca'),
            document.getElementById('faculdade'),
            ''
        );
    } else {
        RoomMatchUniversidadesSp.preencherSelect(document.getElementById('faculdade'), '');
    }
}

if (typeof RoomMatchCidadesRmc !== 'undefined' && RoomMatchCidadesRmc.montarBusca) {
    RoomMatchCidadesRmc.montarBusca(
        document.getElementById('cidade-atual-busca'),
        document.getElementById('cidade-atual')
    );
}

(function contadorBio() {
    const bio = document.getElementById('bio');
    const n = document.getElementById('bio-contador-n');
    if (!bio || !n) return;
    const atualizar = () => {
        n.textContent = String(Math.min(bio.value.length, 500));
    };
    bio.addEventListener('input', atualizar);
    atualizar();
}());
