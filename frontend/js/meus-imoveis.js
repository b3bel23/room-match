if (!requerLocador()) {
    /* redirect */
}

const lista = document.getElementById('meus-lista');
const vazia = document.getElementById('meus-vazia');
const contagem = document.getElementById('meus-contagem');

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR');
}

function montarCard(imovel) {
    const article = document.createElement('article');
    article.className = 'meu-card';
    const capaUrl = typeof ImovelFotos !== 'undefined' ? ImovelFotos.capa(imovel) : '';
    article.innerHTML = `
        <div class="meu-thumb"${capaUrl ? ` style="background-image:url('${capaUrl}')"` : ''} role="img" aria-label="Foto do anúncio"></div>
        <div>
            <h3>${imovel.titulo}</h3>
            <p>${imovel.bairro}, Campinas · R$ ${formatarPreco(imovel.preco)}/mês · Ativo</p>
            <p class="meu-tags">${(imovel.tags || []).slice(0, 4).join(' · ')}</p>
        </div>
        <div class="meu-acoes">
            <a class="btn btn-secondary" href="detalhe.html?id=${encodeURIComponent(imovel.id)}">Ver como locador</a>
            <a class="btn btn-secondary" href="calendario-visitas.html">Visitas</a>
            <a class="btn btn-primary" href="editar-anuncio.html?id=${encodeURIComponent(imovel.id)}">Editar</a>
        </div>
    `;
    return article;
}

async function carregar() {
    try {
        const { items } = await RoomMatchApi.meusImoveis();
        contagem.textContent = `${items.length} ${items.length === 1 ? 'anúncio ativo' : 'anúncios ativos'} · painel do Locador Demo`;
        vazia.hidden = items.length > 0;
        lista.hidden = items.length === 0;
        lista.replaceChildren(...items.map(montarCard));
    } catch (erro) {
        contagem.textContent = erro.message;
    }
}

carregar();
