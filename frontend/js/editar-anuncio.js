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
            const [tirada] = fotos.splice(indice, 1);
            if (tirada.id) removidas.push(tirada.id);
            fotosAlteradas = true;
            desenharFotos();
        });
        slot.append(imagem, remover);
        grade.insertBefore(slot, botaoAdicionar);
    });
    botaoAdicionar.hidden = fotos.length >= FOTOS_MAX;
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

async function carregar() {
    if (!imovelId) {
        retorno.textContent = 'Informe ?id= do anúncio.';
        retorno.hidden = false;
        return;
    }
    try {
        const imovel = await RoomMatchApi.obterImovel(imovelId);
        document.getElementById('aluguel').value = imovel.aluguel;
        document.getElementById('condominio').value = imovel.condominio;
        document.getElementById('iptu').value = imovel.iptu;
        document.getElementById('contas').value = imovel.contas;
        aplicarFotosDoImovel(imovel);
        atualizarTotal();
    } catch (erro) {
        retorno.textContent = erro.message;
        retorno.hidden = false;
    }
}

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!imovelId) return;

    try {
        const dados = {
            aluguel: document.getElementById('aluguel').value,
            condominio: document.getElementById('condominio').value,
            iptu: document.getElementById('iptu').value,
            contas: document.getElementById('contas').value
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
    }
});

carregar();
