/**
 * Descobrir em cards (RF12–14, RF18): curtir (= favoritar), recusar (some do mural),
 * desfazer a última decisão e histórico. Botões, setas do teclado ou arrastar o card.
 */
if (!requerMorador()) {
    /* redirect */
}

const card = document.getElementById('card');
const foto = card.querySelector('.card-foto');
const carimbo = document.getElementById('card-carimbo');
const fim = document.getElementById('fim');
const carregando = document.getElementById('carregando');
const botaoCurtir = document.getElementById('curtir');
const botaoRecusar = document.getElementById('recusar');
const botaoDesfazer = document.getElementById('desfazer');
const retorno = document.getElementById('descobrir-retorno');

let fila = [];
let ultima = null; // { imovel, acao }
let ocupado = false;

function avisar(texto, erro) {
    retorno.textContent = texto;
    retorno.classList.toggle('erro', Boolean(erro));
    retorno.hidden = !texto;
}

function mostrarAtual() {
    const imovel = fila[0];
    carregando.hidden = true;
    card.hidden = !imovel;
    fim.hidden = Boolean(imovel);
    botaoCurtir.disabled = botaoRecusar.disabled = !imovel;
    botaoDesfazer.disabled = !ultima;
    card.style.transform = '';
    card.classList.remove('saindo-direita', 'saindo-esquerda');
    carimbo.textContent = '';
    if (!imovel) return;

    document.getElementById('card-titulo').textContent = imovel.titulo;
    document.getElementById('card-local').textContent = `${imovel.bairro || ''}, ${imovel.cidade || 'Campinas'} · ${imovel.tipo || ''}`;
    document.getElementById('card-preco').textContent = `R$ ${Number(imovel.preco).toLocaleString('pt-BR')}/mês total`;
    const match = imovel.match ?? imovel.match_percent ?? 0;
    const selo = document.getElementById('card-match');
    selo.textContent = `${match}%`;
    selo.title = `${match}% de afinidade com seus hábitos`;
    const desloc = document.getElementById('card-deslocamento');
    desloc.hidden = imovel.deslocamento_min == null;
    if (!desloc.hidden) desloc.textContent = `🚌 ${imovel.deslocamento_min} min até ${imovel.destino || 'seu destino'}`;
    const tags = document.getElementById('card-tags');
    tags.replaceChildren(...(imovel.tags || []).map((t) => {
        const li = document.createElement('li');
        li.textContent = t;
        if ((imovel.tags_correspondentes || []).includes(t)) li.className = 'em-comum';
        return li;
    }));
    document.getElementById('card-detalhe').href = `detalhe.html?id=${encodeURIComponent(imovel.id)}`;
    if (typeof ImovelFotos !== 'undefined') {
        ImovelFotos.iniciarCarrossel(foto, ImovelFotos.lista(imovel), { intervalo: 3500 });
    }
    card.setAttribute('aria-label', `${imovel.titulo}, ${match}% de afinidade`);
}

async function decidir(acao) {
    const imovel = fila[0];
    if (!imovel || ocupado) return;
    ocupado = true;
    card.classList.add(acao === 'curtir' ? 'saindo-direita' : 'saindo-esquerda');
    try {
        if (acao === 'curtir') {
            const r = await RoomMatchApi.alternarFavorito(imovel.id);
            if (!r.favorito) await RoomMatchApi.alternarFavorito(imovel.id); // já era favorito: mantém
        } else {
            await RoomMatchApi.recusarImovel(imovel.id);
        }
        ultima = { imovel, acao };
        fila.shift();
        avisar(acao === 'curtir' ? `“${imovel.titulo}” foi para os favoritos.` : `“${imovel.titulo}” saiu do seu mural.`);
        await new Promise((r) => setTimeout(r, 220));
        mostrarAtual();
        carregarHistorico();
    } catch (erro) {
        card.classList.remove('saindo-direita', 'saindo-esquerda');
        avisar(erro.detail || erro.message, true);
    } finally {
        ocupado = false;
    }
}

async function desfazer() {
    if (!ultima || ocupado) return;
    ocupado = true;
    const { imovel, acao } = ultima;
    try {
        if (acao === 'curtir') await RoomMatchApi.alternarFavorito(imovel.id);
        else await RoomMatchApi.desfazerRecusa(imovel.id);
        fila.unshift(imovel);
        ultima = null;
        avisar('Decisão desfeita.');
        mostrarAtual();
        carregarHistorico();
    } catch (erro) {
        avisar(erro.detail || erro.message, true);
    } finally {
        ocupado = false;
    }
}

/* Arrastar o card (toque ou mouse). */
let inicioX = null;
card.addEventListener('pointerdown', (evento) => {
    if (evento.target.closest('a')) return;
    inicioX = evento.clientX;
    card.setPointerCapture(evento.pointerId);
});
card.addEventListener('pointermove', (evento) => {
    if (inicioX === null) return;
    const dx = evento.clientX - inicioX;
    card.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
    carimbo.textContent = dx > 60 ? 'CURTIR' : dx < -60 ? 'RECUSAR' : '';
    carimbo.className = `card-carimbo ${dx > 0 ? 'curtir' : 'recusar'}`;
});
function soltar(evento) {
    if (inicioX === null) return;
    const dx = evento.clientX - inicioX;
    inicioX = null;
    if (dx > 110) decidir('curtir');
    else if (dx < -110) decidir('recusar');
    else {
        card.style.transform = '';
        carimbo.textContent = '';
    }
}
card.addEventListener('pointerup', soltar);
card.addEventListener('pointercancel', soltar);

document.addEventListener('keydown', (evento) => {
    if (evento.target.closest('input, textarea, select')) return;
    if (evento.key === 'ArrowRight') decidir('curtir');
    if (evento.key === 'ArrowLeft') decidir('recusar');
});
botaoCurtir.addEventListener('click', () => decidir('curtir'));
botaoRecusar.addEventListener('click', () => decidir('recusar'));
botaoDesfazer.addEventListener('click', desfazer);

function itemHistorico(imovel, recusado) {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = `detalhe.html?id=${encodeURIComponent(imovel.id)}`;
    link.textContent = `${imovel.titulo} · ${imovel.match ?? 0}%`;
    li.append(link);
    if (recusado) {
        const voltar = document.createElement('button');
        voltar.type = 'button';
        voltar.className = 'historico-voltar';
        voltar.textContent = 'Voltar ao mural';
        voltar.addEventListener('click', async () => {
            await RoomMatchApi.desfazerRecusa(imovel.id);
            fila.push(imovel);
            if (fila.length === 1) mostrarAtual();
            carregarHistorico();
        });
        li.append(voltar);
    }
    return li;
}

async function carregarHistorico() {
    try {
        const { curtidos, recusados } = await RoomMatchApi.historico();
        const vazio = (texto) => {
            const li = document.createElement('li');
            li.className = 'historico-vazio';
            li.textContent = texto;
            return li;
        };
        document.getElementById('historico-curtidos').replaceChildren(
            ...(curtidos.length ? curtidos.map((i) => itemHistorico(i, false)) : [vazio('Nada curtido ainda.')])
        );
        document.getElementById('historico-recusados').replaceChildren(
            ...(recusados.length ? recusados.map((i) => itemHistorico(i, true)) : [vazio('Nada recusado.')])
        );
    } catch (erro) { /* histórico é secundário */ }
}

(async () => {
    try {
        fila = (await RoomMatchApi.descobrir()).items || [];
    } catch (erro) {
        carregando.textContent = erro.detail || erro.message;
        return;
    }
    mostrarAtual();
    carregarHistorico();
})();
