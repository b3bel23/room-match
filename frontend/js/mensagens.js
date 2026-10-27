if (!requerAuth()) {
    /* redirect */
}

const listaEl = document.getElementById('chat-itens');
const msgsEl = document.getElementById('chat-mensagens');
const tituloEl = document.getElementById('chat-titulo');
const form = document.getElementById('chat-form');
const input = document.getElementById('chat-texto');
const imovelTitulo = document.getElementById('chat-imovel-titulo');
const imovelMeta = document.getElementById('chat-imovel-meta');
const imovelLink = document.getElementById('chat-imovel-link');
const agendarLink = document.getElementById('chat-agendar-link');
const imovelFoto = document.getElementById('chat-imovel-foto');

let conversaAtiva = null;
let conversas = [];

function horaCurta(iso) {
    try {
        return new Date(iso).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    } catch (erro) {
        return '';
    }
}

function renderLista() {
    listaEl.replaceChildren();
    if (!conversas.length) {
        const vazio = document.createElement('p');
        vazio.className = 'chat-vazio';
        vazio.textContent = 'Nenhuma conversa ainda.';
        listaEl.append(vazio);
        return;
    }
    conversas.forEach((c) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `chat-item${conversaAtiva && conversaAtiva.id === c.id ? ' ativo' : ''}`;
        btn.innerHTML = `<strong>${c.outro?.nome || 'Contato'} · ${c.imovel_titulo}</strong>
            <span>${c.ultima_mensagem || 'Sem mensagens'}</span>`;
        btn.addEventListener('click', () => abrir(c.id));
        listaEl.append(btn);
    });
}

function renderThread(conv) {
    conversaAtiva = conv;
    tituloEl.textContent = `${conv.outro?.nome || 'Contato'} · ${conv.imovel_titulo}`;
    imovelTitulo.textContent = conv.imovel_titulo;
    imovelMeta.textContent = conv.imovel_bairro
        ? `${conv.imovel_bairro} · R$ ${Number(conv.imovel_preco || 0).toLocaleString('pt-BR')}/mês`
        : '';
    imovelLink.href = `detalhe.html?id=${encodeURIComponent(conv.imovel_id)}`;
    if (typeof ehLocador === 'function' && ehLocador()) {
        agendarLink.href = 'calendario-visitas.html';
        agendarLink.textContent = 'Ver agenda de visitas';
        agendarLink.hidden = false;
        imovelLink.textContent = 'Abrir meu anúncio';
    } else {
        agendarLink.href = `agendar-visita.html?id=${encodeURIComponent(conv.imovel_id)}`;
        agendarLink.textContent = 'Agendar visita';
        agendarLink.hidden = false;
        imovelLink.textContent = 'Ver anúncio';
    }
    if (imovelFoto) {
        if (typeof ImovelFotos !== 'undefined' && conv.imovel_id) {
            ImovelFotos.iniciarCarrossel(
                imovelFoto,
                ImovelFotos.lista({ id: conv.imovel_id, capa: conv.imovel_capa }),
                { intervalo: 3600 }
            );
            imovelFoto.hidden = false;
        } else if (conv.imovel_capa) {
            imovelFoto.style.backgroundImage = `url("${conv.imovel_capa}")`;
            imovelFoto.style.backgroundSize = 'cover';
            imovelFoto.hidden = false;
        } else {
            imovelFoto.style.backgroundImage = '';
            imovelFoto.hidden = true;
        }
    }
    form.hidden = false;

    msgsEl.replaceChildren();
    (conv.mensagens || []).forEach((m) => {
        const bolha = document.createElement('div');
        bolha.className = `bolha ${m.minha ? 'minha' : 'deles'}`;
        bolha.innerHTML = `${m.texto}<small>${m.autor_nome} · ${horaCurta(m.em)}</small>`;
        msgsEl.append(bolha);
    });
    msgsEl.scrollTop = msgsEl.scrollHeight;
    renderLista();
}

async function abrir(id) {
    const conv = await RoomMatchApi.obterConversa(id);
    renderThread(conv);
    const url = new URL(window.location.href);
    url.searchParams.set('id', id);
    history.replaceState({}, '', url);
}

async function carregar() {
    const { items } = await RoomMatchApi.listarConversas();
    conversas = items;
    renderLista();
    const id = new URLSearchParams(window.location.search).get('id');
    if (id && conversas.some((c) => c.id === id)) {
        await abrir(id);
    } else if (conversas[0]) {
        await abrir(conversas[0].id);
    }
}

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!conversaAtiva) return;
    const texto = input.value.trim();
    if (!texto) return;
    input.value = '';
    const conv = await RoomMatchApi.enviarMensagem(conversaAtiva.id, texto);
    const idx = conversas.findIndex((c) => c.id === conv.id);
    if (idx >= 0) conversas[idx] = conv;
    else conversas.unshift(conv);
    renderThread(conv);
});

carregar().catch((erro) => {
    msgsEl.innerHTML = `<p class="chat-vazio">${erro.message}</p>`;
});
