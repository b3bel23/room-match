if (!requerAuth()) { /* redirect */ }
montarSidebarConfig('perfil.html');

const form = document.getElementById('perfil-form');
const retorno = document.getElementById('perfil-retorno');
const avatar = document.getElementById('perfil-avatar');
const inputFoto = document.getElementById('perfil-foto');
const btnRemoverFoto = document.getElementById('perfil-foto-remover');
const btnSalvar = form?.querySelector('button[type="submit"]');

const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const LADO_MINIMO = 200;

let fotoUrlAtual = '';

function mostrarRetorno(texto, erro) {
    retorno.textContent = texto;
    retorno.classList.toggle('erro', Boolean(erro));
    retorno.hidden = false;
}

function pintarAvatar(user) {
    fotoUrlAtual = user.foto_url || '';
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
    if (typeof RoomMatchClassificacoes !== 'undefined') {
        RoomMatchClassificacoes.preencherSelect(
            document.getElementById('perfil-ocupacao'),
            'ocupacao',
            user.ocupacao
        );
        RoomMatchClassificacoes.preencherSelect(
            document.getElementById('perfil-emprego'),
            'emprego',
            user.emprego
        );
    } else {
        document.getElementById('perfil-ocupacao').value = user.ocupacao || '';
        document.getElementById('perfil-emprego').value = user.emprego || '';
    }
    if (typeof RoomMatchUniversidadesSp !== 'undefined') {
        RoomMatchUniversidadesSp.preencherSelect(
            document.getElementById('perfil-faculdade'),
            user.faculdade
        );
    } else {
        document.getElementById('perfil-faculdade').value = user.faculdade || '';
    }
    document.getElementById('perfil-email').value = user.email || '';
    document.getElementById('perfil-papel').value = user.papel || '';
    pintarAvatar(user);
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

async function carregar() {
    const user = await RoomMatchApi.meuPerfil();
    aplicarPerfilNaUi(user);
}

inputFoto?.addEventListener('change', async () => {
    const arquivo = inputFoto.files?.[0];
    inputFoto.value = '';
    if (!arquivo) return;

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
        fotoUrlAtual = dataUrl;
        avatar.style.backgroundImage = `url("${dataUrl}")`;
        avatar.textContent = '';
        avatar.classList.add('com-foto');
        mostrarRetorno('Rosto detectado. Clique em Salvar perfil para aplicar.', false);
    } catch (erro) {
        mostrarRetorno(erro.message || 'Não foi possível usar esta foto.', true);
    }
});

btnRemoverFoto?.addEventListener('click', () => {
    fotoUrlAtual = '';
    const iniciais = document.getElementById('perfil-nome').value
        .split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';
    avatar.style.backgroundImage = '';
    avatar.textContent = iniciais;
    avatar.classList.remove('com-foto');
    mostrarRetorno('Foto removida na prévia. Clique em Salvar perfil para aplicar.', false);
});

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const papelAnterior = (typeof usuarioAtual === 'function' ? usuarioAtual() : null)?.papel;
    if (btnSalvar) btnSalvar.disabled = true;

    try {
        const user = await RoomMatchApi.atualizarPerfil({
            nome: document.getElementById('perfil-nome').value.trim(),
            telefone: document.getElementById('perfil-telefone').value.trim(),
            genero: document.getElementById('perfil-genero').value,
            ocupacao: document.getElementById('perfil-ocupacao').value,
            emprego: document.getElementById('perfil-emprego').value,
            faculdade: document.getElementById('perfil-faculdade').value,
            email: document.getElementById('perfil-email').value.trim(),
            papel: document.getElementById('perfil-papel').value,
            foto_url: fotoUrlAtual
        });
        aplicarPerfilNaUi(user);
        const trocouPapel = papelAnterior && papelAnterior !== user.papel;
        mostrarRetorno(
            trocouPapel
                ? `Alterações aplicadas. Tipo de perfil: ${user.papel}.`
                : 'Alterações aplicadas.',
            false
        );
    } catch (erro) {
        mostrarRetorno(erro.detail || erro.message, true);
    } finally {
        if (btnSalvar) btnSalvar.disabled = false;
    }
});

carregar().catch((erro) => {
    mostrarRetorno(erro.message, true);
});
