if (!requerAuth()) { /* redirect */ }
montarSidebarConfig('perfil.html');

const form = document.getElementById('perfil-form');
const retorno = document.getElementById('perfil-retorno');
const avatar = document.getElementById('perfil-avatar');
const inputFoto = document.getElementById('perfil-foto');
const btnSalvar = form?.querySelector('button[type="submit"]');

const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const LADO_MINIMO = 400;

let fotoUrlAtual = '';
/** URL já salva no servidor — não reenviar no PATCH se a foto não mudou. */
let fotoUrlSalva = '';

function mostrarRetorno(texto, erro) {
    retorno.textContent = texto;
    retorno.classList.toggle('erro', Boolean(erro));
    retorno.hidden = false;
}

function pintarAvatar(user) {
    fotoUrlAtual = user.foto_url || '';
    fotoUrlSalva = fotoUrlAtual;
    if (fotoUrlAtual) {
        avatar.style.backgroundImage = `url("${fotoUrlAtual}")`;
        avatar.textContent = '';
        avatar.classList.add('com-foto');
    } else {
        avatar.style.backgroundImage = '';
        avatar.textContent = user.iniciais || '?';
        avatar.classList.remove('com-foto');
    }
}

function preencherFormulario(user) {
    document.getElementById('perfil-nome').value = user.nome || '';
    document.getElementById('perfil-telefone').value = user.telefone || '';
    document.getElementById('perfil-genero').value = user.genero || '';
    if (typeof RoomMatchClassificacoes !== 'undefined' && RoomMatchClassificacoes.montarEscolha) {
        RoomMatchClassificacoes.montarEscolha(
            document.getElementById('perfil-ocupacao-escolha'),
            document.getElementById('perfil-ocupacao'),
            'ocupacao',
            user.ocupacao
        );
        RoomMatchClassificacoes.montarEscolha(
            document.getElementById('perfil-emprego-escolha'),
            document.getElementById('perfil-emprego'),
            'emprego',
            user.emprego
        );
    } else {
        document.getElementById('perfil-ocupacao').value = user.ocupacao || '';
        document.getElementById('perfil-emprego').value = user.emprego || '';
    }
    if (typeof RoomMatchUniversidadesSp !== 'undefined' && RoomMatchUniversidadesSp.montarBusca) {
        RoomMatchUniversidadesSp.montarBusca(
            document.getElementById('perfil-faculdade-busca'),
            document.getElementById('perfil-faculdade'),
            user.faculdade
        );
    } else if (typeof RoomMatchUniversidadesSp !== 'undefined') {
        RoomMatchUniversidadesSp.preencherSelect(
            document.getElementById('perfil-faculdade'),
            user.faculdade
        );
    } else {
        document.getElementById('perfil-faculdade').value = user.faculdade || '';
    }
    document.getElementById('perfil-email').value = user.email || '';
    document.getElementById('perfil-papel').value = user.papel || 'Morador';
    pintarAvatar(user);
    sincronizarUiPapel();
}

/** Aplica o perfil salvo na sessão e em toda a UI da página (sem reload). */
function aplicarPerfilNaUi(user) {
    entrar(RoomMatchApi.lerToken(), user);
    atualizarChromeSessao();
    if (typeof montarSidebarConfig === 'function') {
        montarSidebarConfig('perfil.html');
    }
    if (typeof RoomMatchPapelUi !== 'undefined' && typeof RoomMatchPapelUi.aplicar === 'function') {
        RoomMatchPapelUi.aplicar();
    }
    preencherFormulario(user);
    mostrarStatusEmail(user);
}

/* RF02: confirmação só aparece se o servidor tiver SMTP (e-mail chega de verdade). */
function mostrarStatusEmail(user) {
    const caixa = document.getElementById('perfil-email-status');
    const botaoReenviar = document.getElementById('perfil-email-reenviar');
    if (!caixa || user.email_verificado === undefined) return;

    const envioOk = user.email_envio_disponivel === true;
    if (!envioOk) {
        // Sem SMTP: não oferece reenviar / “olhe a caixa de entrada”.
        caixa.hidden = true;
        if (botaoReenviar) botaoReenviar.hidden = true;
        return;
    }

    caixa.hidden = false;
    caixa.classList.toggle('ok', Boolean(user.email_verificado));
    document.getElementById('perfil-email-texto').textContent = user.email_verificado
        ? '✓ E-mail confirmado.'
        : 'E-mail ainda não confirmado. Procure o link na sua caixa de entrada.';
    if (botaoReenviar) botaoReenviar.hidden = Boolean(user.email_verificado);
}

document.getElementById('perfil-email-reenviar')?.addEventListener('click', async (evento) => {
    const botao = evento.currentTarget;
    botao.disabled = true;
    try {
        const dados = await RoomMatchApi.reenviarVerificacao();
        document.getElementById('perfil-email-texto').textContent = dados.message;
    } catch (erro) {
        document.getElementById('perfil-email-texto').textContent = erro.detail || erro.message;
        botao.disabled = false;
    }
});

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

async function carregar() {
    const run = () => RoomMatchApi.meuPerfil().then(aplicarPerfilNaUi);
    if (typeof RoomMatchLoading !== 'undefined') {
        await RoomMatchLoading.durante(run(), 'Carregando perfil…');
        return;
    }
    await run();
}

if (typeof RoomMatchFaceCheck !== 'undefined' && inputFoto) {
    RoomMatchFaceCheck.ligarEntrada(inputFoto, {
        statusEl: document.getElementById('perfil-foto-face-status'),
        onAceita(dataUrl) {
            fotoUrlAtual = dataUrl;
            avatar.style.backgroundImage = `url("${dataUrl}")`;
            avatar.textContent = '';
            avatar.classList.add('com-foto');
            mostrarRetorno('Rosto detectado. Clique em Salvar perfil para aplicar.', false);
        },
        onRecusa(erro) {
            mostrarRetorno(erro.message || 'Não foi possível usar esta foto.', true);
        }
    });
    RoomMatchFaceCheck.aquecer();
} else if (inputFoto) {
    inputFoto.addEventListener('change', () => {
        mostrarRetorno('Verificador de rosto não carregou. Atualize a página.', true);
    });
}

// CPF/CNPJ só é pedido quando um Morador escolhe virar Locador (exigência do servidor).
const selectPapel = document.getElementById('perfil-papel');
const campoCpf = document.getElementById('perfil-cpf-campo');
const inputCpf = document.getElementById('perfil-cpf');
const explicaPapel = document.getElementById('perfil-papel-explica');
const cardsPapel = [...document.querySelectorAll('.perfil-papel-card')];

function papelSalvoNaConta() {
    return (typeof usuarioAtual === 'function' ? usuarioAtual() : null)?.papel || '';
}

function atualizarCampoCpf() {
    if (!selectPapel || !campoCpf || !inputCpf) return;
    const pedir = selectPapel.value === 'Locador' && papelSalvoNaConta() !== 'Locador';
    campoCpf.hidden = !pedir;
    inputCpf.required = pedir;
}

function atualizarCardsPapel() {
    const escolhido = selectPapel?.value || 'Morador';
    cardsPapel.forEach((card) => {
        const on = card.dataset.papel === escolhido;
        card.setAttribute('aria-pressed', on ? 'true' : 'false');
        card.classList.toggle('ativo', on);
    });
}

/** Texto vivo: o que é cada papel + o que muda ao trocar (anúncios, favoritos, etc.). */
function atualizarExplicacaoPapel() {
    if (!explicaPapel || !selectPapel) return;
    const atual = papelSalvoNaConta() || 'Morador';
    const escolhido = selectPapel.value;
    const trocando = atual && escolhido && atual !== escolhido;

    const blocos = [];
    if (escolhido === 'Morador') {
        blocos.push(
            '<p><strong>Morador</strong> explora o mural, define orçamento e hábitos, '
            + 'favorita anúncios e conversa com locadores quando a afinidade e o preço permitem.</p>'
        );
    } else {
        blocos.push(
            '<p><strong>Locador</strong> publica e edita anúncios em Meus anúncios, acompanha interessados '
            + 'em Mensagens e descreve as regras da casa nas Preferências.</p>'
        );
    }

    if (!trocando) {
        blocos.push(
            '<p>O menu e as telas seguem o perfil ativo; você pode trocar depois, com as regras abaixo.</p>'
        );
    } else if (atual === 'Locador' && escolhido === 'Morador') {
        blocos.push(
            '<p class="perfil-papel-aviso"><strong>Ao virar Morador:</strong> remova ou exclua '
            + '<strong>todos os anúncios ativos</strong> antes. O perfil de Locador e o CPF '
            + 'ficam guardados e, sem anúncio, a troca só reativa o modo busca.</p>'
            + '<p>Favoritos, conversas, orçamento e hábitos de Morador voltam como estavam.</p>'
        );
    } else if (atual === 'Morador' && escolhido === 'Locador') {
        blocos.push(
            '<p class="perfil-papel-aviso"><strong>Ao virar Locador:</strong> informe '
            + '<strong>CPF ou CNPJ</strong> na primeira vez. Favoritos e conversas de Morador '
            + '<strong>não são apagados</strong>: ficam guardados e voltam se você for Morador de novo.</p>'
            + '<p>Orçamento e limiar saem do menu de Locador (os valores permanecem salvos). '
            + 'Anúncios só existem depois que você publicar.</p>'
        );
    }

    explicaPapel.innerHTML = blocos.join('');
}

function sincronizarUiPapel() {
    atualizarCardsPapel();
    atualizarCampoCpf();
    atualizarExplicacaoPapel();
}

cardsPapel.forEach((card) => {
    card.addEventListener('click', () => {
        if (!selectPapel) return;
        selectPapel.value = card.dataset.papel;
        selectPapel.dispatchEvent(new Event('change', { bubbles: true }));
        sincronizarUiPapel();
    });
});
selectPapel?.addEventListener('change', sincronizarUiPapel);

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const telInput = document.getElementById('perfil-telefone');
    const emailInput = document.getElementById('perfil-email');
    if (typeof RoomMatchTelefone !== 'undefined' && telInput) {
        const telOk = RoomMatchTelefone.aplicarNoInput(telInput);
        if (!telOk.ok) {
            telInput.reportValidity();
            return;
        }
    }
    if (typeof RoomMatchEmail !== 'undefined' && emailInput) {
        const emailOk = RoomMatchEmail.aplicarNoInput(emailInput);
        if (!emailOk.ok) {
            emailInput.reportValidity();
            return;
        }
    }
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    if (!fotoUrlAtual) {
        mostrarRetorno('Adicione uma foto de perfil.', true);
        return;
    }

    const papelAnterior = (typeof usuarioAtual === 'function' ? usuarioAtual() : null)?.papel;
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.botaoEspera(btnSalvar, true, 'Salvando…');
        RoomMatchLoading.mostrar('Salvando perfil…');
    } else if (btnSalvar) {
        btnSalvar.disabled = true;
    }

    try {
        const corpo = {
            nome: document.getElementById('perfil-nome').value.trim(),
            telefone: document.getElementById('perfil-telefone').value.trim(),
            genero: document.getElementById('perfil-genero').value,
            ocupacao: document.getElementById('perfil-ocupacao').value,
            emprego: document.getElementById('perfil-emprego').value,
            faculdade: document.getElementById('perfil-faculdade').value,
            email: document.getElementById('perfil-email').value.trim(),
            papel: document.getElementById('perfil-papel').value,
            cpf_cnpj: inputCpf && !campoCpf.hidden ? inputCpf.value.trim() : undefined,
        };
        // Só manda foto se mudou (data URL nova). Reenviar a mesma URL/base64
        // enorme estoura o limite do schema ("at most 3000000 characters").
        if (fotoUrlAtual && fotoUrlAtual !== fotoUrlSalva) {
            if (fotoUrlAtual.startsWith('data:') && fotoUrlAtual.length > 2_950_000) {
                mostrarRetorno(
                    'Foto grande demais para enviar. Escolha de novo — vamos compactar automaticamente.',
                    true
                );
                return;
            }
            corpo.foto_url = fotoUrlAtual;
        }
        const user = await RoomMatchApi.atualizarPerfil(corpo);
        aplicarPerfilNaUi(user);
        sincronizarUiPapel();
        const trocouPapel = papelAnterior && papelAnterior !== user.papel;
        mostrarRetorno(
            trocouPapel
                ? `Alterações aplicadas. Agora você está como ${user.papel}.`
                : 'Alterações aplicadas.',
            false
        );
    } catch (erro) {
        mostrarRetorno(erro.detail || erro.message, true);
    } finally {
        if (typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.forcarEsconder();
            RoomMatchLoading.botaoEspera(btnSalvar, false);
        } else if (btnSalvar) {
            btnSalvar.disabled = false;
        }
    }
});

carregar().catch((erro) => {
    mostrarRetorno(erro.message, true);
});
