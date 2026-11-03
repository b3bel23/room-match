if (!requerLocador()) {
    /* redirect */
}

const lista = document.getElementById('meus-lista');
const vazia = document.getElementById('meus-vazia');
const contagem = document.getElementById('meus-contagem');

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR');
}

const confirmacao = document.getElementById('excluir-confirmacao');
const confirmacaoNome = document.getElementById('excluir-nome');
const confirmacaoErro = document.getElementById('excluir-erro');
const botaoConfirmar = document.getElementById('excluir-confirmar');
let imovelParaExcluir = null;

function pedirExclusao(imovel) {
    imovelParaExcluir = imovel;
    confirmacaoNome.textContent = imovel.titulo;
    confirmacaoErro.hidden = true;
    confirmacao.showModal();
}

document.getElementById('excluir-cancelar').addEventListener('click', () => confirmacao.close());

botaoConfirmar.addEventListener('click', async () => {
    botaoConfirmar.disabled = true;
    try {
        await RoomMatchApi.excluirImovel(imovelParaExcluir.id);
        confirmacao.close();
        await carregar();
    } catch (erro) {
        confirmacaoErro.textContent = erro.detail || erro.message;
        confirmacaoErro.hidden = false;
    } finally {
        botaoConfirmar.disabled = false;
    }
});

function montarCard(imovel) {
    const article = document.createElement('article');
    article.className = 'meu-card';
    const capaUrl = typeof ImovelFotos !== 'undefined' ? ImovelFotos.capa(imovel) : '';
    article.innerHTML = `
        <div class="meu-thumb" role="img" aria-label="Foto do anúncio"></div>
        <div>
            <h3>${imovel.titulo}</h3>
            <p>${imovel.bairro}, Campinas · R$ ${formatarPreco(imovel.preco)}/mês · Ativo</p>
            <p class="meu-tags">${(imovel.tags || []).slice(0, 4).join(' · ')}</p>
        </div>
        <div class="meu-acoes">
            <a class="btn btn-secondary" href="detalhe.html?id=${encodeURIComponent(imovel.id)}">Ver como locador</a>
            <a class="btn btn-secondary" href="calendario-visitas.html">Visitas</a>
            <a class="btn btn-primary" href="editar-anuncio.html?id=${encodeURIComponent(imovel.id)}">Editar</a>
            <button class="btn btn-excluir" type="button">Excluir</button>
        </div>
    `;
    article.querySelector('.btn-excluir').addEventListener('click', () => pedirExclusao(imovel));
    const thumb = article.querySelector('.meu-thumb');
    if (thumb && typeof ImovelFotos !== 'undefined') {
        ImovelFotos.iniciarCarrossel(thumb, ImovelFotos.lista(imovel), { intervalo: 4000 });
    } else if (thumb && capaUrl) {
        thumb.style.backgroundImage = `url("${capaUrl}")`;
        thumb.style.backgroundSize = 'cover';
        thumb.style.backgroundPosition = 'center';
    }
    return article;
}

async function carregar() {
    try {
        const { items } = await RoomMatchApi.meusImoveis();
        contagem.textContent = `${items.length} ${items.length === 1 ? 'anúncio ativo' : 'anúncios ativos'}`;
        vazia.hidden = items.length > 0;
        lista.hidden = items.length === 0;
        lista.replaceChildren(...items.map(montarCard));
    } catch (erro) {
        contagem.textContent = erro.message;
    }
}

carregar();
