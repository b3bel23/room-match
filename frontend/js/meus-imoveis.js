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

function fecharMenus() {
    document.querySelectorAll('.meu-menu-lista').forEach((menu) => {
        menu.hidden = true;
        menu.previousElementSibling.setAttribute('aria-expanded', 'false');
    });
}

document.addEventListener('click', fecharMenus);
document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') fecharMenus();
});

function montarCard(imovel) {
    const article = document.createElement('article');
    article.className = 'meu-card';
    const capaUrl = typeof ImovelFotos !== 'undefined' ? ImovelFotos.capa(imovel) : '';
    article.innerHTML = `
        <div class="meu-thumb" role="img" aria-label="Foto do anúncio"></div>
        <div>
            <h3><a class="meu-titulo" href="detalhe.html?id=${encodeURIComponent(imovel.id)}">${imovel.titulo}</a></h3>
            <p>${imovel.bairro}, Campinas · R$ ${formatarPreco(imovel.preco)}/mês · Ativo</p>
            <p class="meu-tags">${(imovel.tags || []).slice(0, 4).join(' · ')}</p>
        </div>
        <div class="meu-acoes">
            <a class="btn btn-secondary" href="calendario-visitas.html">Visitas</a>
            <a class="btn btn-editar" href="editar-anuncio.html?id=${encodeURIComponent(imovel.id)}">Editar</a>
            <div class="meu-menu">
                <button class="btn btn-secondary btn-mais" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Mais ações">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
                </button>
                <div class="meu-menu-lista" role="menu" hidden>
                    <a role="menuitem" href="detalhe.html?id=${encodeURIComponent(imovel.id)}">Ver como locador</a>
                    <button role="menuitem" class="btn-excluir" type="button">Excluir anúncio</button>
                </div>
            </div>
        </div>
    `;
    const botaoMais = article.querySelector('.btn-mais');
    const menuLista = article.querySelector('.meu-menu-lista');
    botaoMais.addEventListener('click', (evento) => {
        evento.stopPropagation();
        const abrir = menuLista.hidden;
        fecharMenus();
        menuLista.hidden = !abrir;
        botaoMais.setAttribute('aria-expanded', String(abrir));
    });
    article.querySelector('.btn-excluir').addEventListener('click', () => {
        fecharMenus();
        pedirExclusao(imovel);
    });
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
