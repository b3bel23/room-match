if (!requerLocador()) {
    /* redirect */
}

const form = document.getElementById('editar-form');
const total = document.getElementById('editar-total');
const retorno = document.getElementById('editar-retorno');
const valores = ['aluguel', 'condominio', 'iptu', 'contas'].map((id) => document.getElementById(id));
const imovelId = new URLSearchParams(window.location.search).get('id');

const grade = document.getElementById('fotos-grade');
const entradaFotos = document.getElementById('fotos-entrada');
const botaoAdicionar = grade.querySelector('.foto-adicionar');
const { FOTOS_MAX } = RoomMatchFotosUpload;
const FOTOS_MINIMO = 3;
const modoLive = RoomMatchApi.modo() === 'live';

/*
 * Cada foto: { url, id?, arquivo? }.
 * - id: foto já salva no servidor (fotos_ids do imóvel); remover chama DELETE.
 * - arquivo: foto nova, enviada ao salvar (multipart no servidor; data URL no mock).
 */
let fotos = [];
let removidas = [];
let fotosAlteradas = false;

function avisar(texto) {
    retorno.textContent = texto;
    retorno.hidden = false;
}

function desenharFotos() {
    grade.querySelectorAll('.foto-slot:not(.foto-adicionar)').forEach((slot) => slot.remove());
    fotos.forEach((foto, indice) => {
        const slot = document.createElement('div');
        slot.className = 'foto-slot';
        const imagem = document.createElement('img');
        imagem.src = foto.url;
        imagem.alt = indice === 0 ? 'Foto de capa do imóvel' : `Foto ${indice + 1} do imóvel`;
        const remover = document.createElement('button');
        remover.type = 'button';
        remover.className = 'foto-remover';
        remover.textContent = '×';
        remover.setAttribute('aria-label', `Remover foto ${indice + 1}`);
        remover.addEventListener('click', () => {
            if (fotos.length <= FOTOS_MINIMO) {
                avisar(`O anúncio precisa de no mínimo ${FOTOS_MINIMO} fotos.`);
                return;
            }
            const [tirada] = fotos.splice(indice, 1);
            if (tirada.id) removidas.push(tirada.id);
            fotosAlteradas = true;
            desenharFotos();
        });
        slot.append(imagem, remover);
        grade.insertBefore(slot, botaoAdicionar);
    });
    botaoAdicionar.hidden = fotos.length >= FOTOS_MAX;
    entradaFotos.setCustomValidity(
        fotos.length < FOTOS_MINIMO
            ? `O anúncio precisa de no mínimo ${FOTOS_MINIMO} fotos.`
            : ''
    );
}

entradaFotos.addEventListener('change', async () => {
    const problemas = [];
    for (const arquivo of entradaFotos.files) {
        if (fotos.length >= FOTOS_MAX) {
            problemas.push(`Máximo de ${FOTOS_MAX} fotos por anúncio.`);
            break;
        }
        const invalido = RoomMatchFotosUpload.validar(arquivo);
        if (invalido) {
            problemas.push(invalido);
            continue;
        }
        try {
            fotos.push(await RoomMatchFotosUpload.reduzir(arquivo));
            fotosAlteradas = true;
        } catch (erro) {
            problemas.push(erro.message);
        }
    }
    entradaFotos.value = '';
    desenharFotos();
    if (problemas.length) avisar(problemas.join(' '));
});

async function salvarFotosNoServidor() {
    for (const idImagem of removidas) {
        await RoomMatchApi.removerFoto(imovelId, idImagem);
    }
    removidas = [];
    const novas = fotos.filter((f) => f.arquivo).map((f) => f.arquivo);
    if (novas.length) {
        const atualizado = await RoomMatchApi.enviarFotos(imovelId, novas);
        aplicarFotosDoImovel(atualizado);
    }
}

function aplicarFotosDoImovel(imovel) {
    const urls = ImovelFotos.lista(imovel);
    const ids = imovel.fotos_ids || [];
    fotos = urls.map((url, i) => ({ url, id: ids[i] }));
    desenharFotos();
}

function atualizarTotal() {
    const soma = valores.reduce((acumulado, campo) => acumulado + (Number(campo.value) || 0), 0);
    total.textContent = `R$ ${soma.toLocaleString('pt-BR')}`;
}

valores.forEach((campo) => campo.addEventListener('input', atualizarTotal));

function montarPilulas(container, nomes, name) {
    if (!container) return;
    container.replaceChildren();
    (nomes || []).forEach((nome) => {
        if (typeof RoomMatchTags !== 'undefined' && RoomMatchTags.criarPilula) {
            container.append(RoomMatchTags.criarPilula(nome, { name }));
            return;
        }
        const label = document.createElement('label');
        label.className = 'pilula';
        label.innerHTML =
            `<input class="visually-hidden" type="checkbox" name="${name}" value="${nome}">` +
            `<span>${nome}</span>`;
        container.append(label);
    });
}

const catalogo = typeof RoomMatchTags !== 'undefined' ? RoomMatchTags : null;
montarPilulas(document.getElementById('tags-adesao'), catalogo?.ADESAO || [], 'tag');
montarPilulas(document.getElementById('tags-restricao'), catalogo?.RESTRICAO || [], 'tag');
montarPilulas(document.getElementById('tags-comodidades'), catalogo?.COMODIDADES || [], 'comodidade');

const inputsTag = () => [...form.querySelectorAll('input[name="tag"]')];
const inputsComod = () => [...form.querySelectorAll('input[name="comodidade"]')];
const contadorTags = document.getElementById('tags-contador');
const contadorComod = document.getElementById('comodidades-contador');

function textoContador(n) {
    return `${n} selecionada${n === 1 ? '' : 's'}`;
}

function atualizarContadores() {
    if (contadorTags) contadorTags.textContent = textoContador(inputsTag().filter((t) => t.checked).length);
    if (contadorComod) contadorComod.textContent = textoContador(inputsComod().filter((t) => t.checked).length);
}

if (catalogo?.ligarConflitos) {
    catalogo.ligarConflitos(inputsTag(), { onChange: atualizarContadores });
}
form.addEventListener('change', (evento) => {
    if (evento.target.matches('input[name="comodidade"]')) atualizarContadores();
    if (!catalogo?.ligarConflitos && evento.target.matches('input[name="tag"]')) {
        atualizarContadores();
    }
});

function marcarLista(inputs, valores) {
    const set = new Set((valores || []).map((v) => String(v)));
    inputs.forEach((input) => {
        input.checked = set.has(input.value);
    });
}

async function carregar() {
    if (!imovelId) {
        retorno.textContent = 'Informe ?id= do anúncio.';
        retorno.hidden = false;
        return;
    }
    const aplicar = async () => {
        const imovel = await RoomMatchApi.obterImovel(imovelId);
        const tituloCampo = document.getElementById('titulo');
        if (tituloCampo && imovel.titulo) tituloCampo.value = imovel.titulo;
        const descCampo = document.getElementById('descricao');
        if (descCampo) descCampo.value = imovel.descricao || '';
        document.getElementById('aluguel').value = imovel.aluguel;
        document.getElementById('condominio').value = imovel.condominio;
        document.getElementById('iptu').value = imovel.iptu;
        document.getElementById('contas').value = imovel.contas;
        const conv = imovel.tags || [];
        const comod = imovel.comodidades || [];
        // Se a API ainda misturar tudo em tags, separa pelo catálogo.
        if (catalogo && !comod.length && conv.some((t) => catalogo.ehComodidade(t))) {
            const sep = catalogo.separar(conv);
            marcarLista(inputsTag(), sep.convivencia);
            marcarLista(inputsComod(), sep.comodidades);
        } else {
            marcarLista(inputsTag(), conv);
            marcarLista(inputsComod(), comod);
        }
        if (catalogo?.limparConflitosMarcados) {
            catalogo.limparConflitosMarcados(inputsTag());
        }
        atualizarContadores();
        aplicarFotosDoImovel(imovel);
        atualizarTotal();
    };
    try {
        if (typeof RoomMatchLoading !== 'undefined') {
            await RoomMatchLoading.durante(aplicar(), 'Carregando anúncio…');
        } else {
            await aplicar();
        }
    } catch (erro) {
        retorno.textContent = erro.message;
        retorno.hidden = false;
    }
}

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!imovelId) return;
    if (fotos.length < FOTOS_MINIMO) {
        entradaFotos.reportValidity();
        avisar(`O anúncio precisa de no mínimo ${FOTOS_MINIMO} fotos.`);
        return;
    }

    const botao = form.querySelector('button[type="submit"]');
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.botaoEspera(botao, true, 'Salvando…');
        RoomMatchLoading.mostrar('Salvando alterações…');
    }
    try {
        const dados = {
            titulo: document.getElementById('titulo')?.value?.trim(),
            descricao: (document.getElementById('descricao')?.value || '').trim(),
            aluguel: document.getElementById('aluguel').value,
            condominio: document.getElementById('condominio').value,
            iptu: document.getElementById('iptu').value,
            contas: document.getElementById('contas').value,
            tags: inputsTag().filter((t) => t.checked).map((t) => t.value),
            comodidades: inputsComod().filter((t) => t.checked).map((t) => t.value),
        };
        if (fotosAlteradas && !modoLive) {
            // Mock: as fotos ficam no próprio anúncio (data URL), a primeira é a capa.
            dados.fotos = fotos.map((f) => f.url);
            dados.capa = dados.fotos[0];
        }
        await RoomMatchApi.atualizarImovel(imovelId, dados);
        if (fotosAlteradas && modoLive) await salvarFotosNoServidor();
        fotosAlteradas = false;
        retorno.textContent = 'Alterações salvas.';
        retorno.hidden = false;
    } catch (erro) {
        retorno.textContent = erro.detail || erro.message;
        retorno.hidden = false;
    } finally {
        if (typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.forcarEsconder();
            RoomMatchLoading.botaoEspera(botao, false);
        }
    }
});

carregar();
