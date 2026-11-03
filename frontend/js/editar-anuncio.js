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
const FOTO_LADO_MAX = 1200;
let fotos = [];
let fotosAlteradas = false;

function mostrarFoto(url) {
    const slot = document.createElement('div');
    slot.className = 'foto-slot';
    const imagem = document.createElement('img');
    imagem.src = url;
    imagem.alt = 'Foto do imóvel';
    slot.append(imagem);
    grade.insertBefore(slot, botaoAdicionar);
}

/* Reduz a foto antes de guardar, para caber no armazenamento do navegador. */
function lerFoto(arquivo) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(arquivo);
        const imagem = new Image();
        imagem.onload = () => {
            const escala = Math.min(1, FOTO_LADO_MAX / Math.max(imagem.width, imagem.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(imagem.width * escala);
            canvas.height = Math.round(imagem.height * escala);
            canvas.getContext('2d').drawImage(imagem, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        imagem.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
        imagem.src = url;
    });
}

entradaFotos.addEventListener('change', async () => {
    for (const arquivo of entradaFotos.files) {
        try {
            const url = await lerFoto(arquivo);
            fotos.push(url);
            mostrarFoto(url);
            fotosAlteradas = true;
        } catch (erro) {
            retorno.textContent = erro.message;
            retorno.hidden = false;
        }
    }
    entradaFotos.value = '';
});

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
        fotos = [...ImovelFotos.lista(imovel)];
        fotos.forEach(mostrarFoto);
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
        if (fotosAlteradas) {
            dados.fotos = fotos;
            dados.capa = fotos[0];
        }
        await RoomMatchApi.atualizarImovel(imovelId, dados);
        fotosAlteradas = false;
        retorno.textContent = 'Alterações salvas.';
        retorno.hidden = false;
    } catch (erro) {
        retorno.textContent = erro.detail || erro.message;
        retorno.hidden = false;
    }
});

carregar();
