if (!requerAuth()) {
    /* redirect */
}

const listaEl = document.getElementById('chat-itens');
const msgsEl = document.getElementById('chat-mensagens');
const tituloEl = document.getElementById('chat-titulo');
const tituloVazioEl = document.getElementById('chat-titulo-vazio');
const topoPessoaEl = document.getElementById('chat-topo-pessoa');
const topoAvatarEl = document.getElementById('chat-topo-avatar');
const topoMetaEl = document.getElementById('chat-topo-meta');
const topoMatchEl = document.getElementById('chat-topo-match');
const voltarListaEl = document.getElementById('chat-voltar-lista');
const form = document.getElementById('chat-form');
const input = document.getElementById('chat-texto');
const imovelTitulo = document.getElementById('chat-imovel-titulo');
const imovelMeta = document.getElementById('chat-imovel-meta');
const imovelLink = document.getElementById('chat-imovel-link');
const infoVazio = document.getElementById('chat-info-vazio');
const infoDetalhe = document.getElementById('chat-info-detalhe');
const infoVazioTexto = document.getElementById('chat-info-vazio-texto');
const infoVazioPrimario = document.getElementById('chat-info-vazio-primario');
const infoVazioSecundario = document.getElementById('chat-info-vazio-secundario');
const acoesEl = document.getElementById('chat-acoes');
const botaoMarcarLida = document.getElementById('chat-marcar-lida');
const botaoArquivar = document.getElementById('chat-arquivar');
const botaoBloquear = document.getElementById('chat-bloquear');
const botaoDenunciar = document.getElementById('chat-denunciar');
const layoutEl = document.querySelector('.chat-layout');
const abaAtivas = document.getElementById('chat-aba-ativas');
const abaArquivadas = document.getElementById('chat-aba-arquivadas');
const feedbackEl = document.getElementById('chat-feedback');

document.getElementById('chat-voltar').href = paginaInicial();
const imovelFoto = document.getElementById('chat-imovel-foto');
const locador = typeof ehLocador === 'function' && ehLocador();

/** Subtítulo sob o nome: deixa claro o anúncio de interesse da conversa. */
function rotuloInteresseAnuncio(conv) {
    const titulo = String(conv?.imovel_titulo || '').trim() || 'este anúncio';
    if (locador) return `Interessado(a) em: ${titulo}`;
    return `Anúncio de interesse: ${titulo}`;
}

let conversaAtiva = null;
let conversas = [];
/** 'ativas' | 'arquivadas' */
let pasta = 'ativas';
let feedbackTimer = null;
/** Cache de threads já abertas — troca de conversa fica instantânea. */
const cacheThread = new Map();
let pedidoAbrir = 0;
let pedidoLista = 0;

function mostrarFeedback(texto, { acao } = {}) {
    if (!feedbackEl) return;
    feedbackEl.replaceChildren();
    feedbackEl.hidden = !texto;
    if (!texto) return;
    const span = document.createElement('span');
    span.textContent = texto;
    feedbackEl.append(span);
    if (acao?.rotulo && typeof acao.onClick === 'function') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chat-feedback-acao';
        btn.textContent = acao.rotulo;
        btn.addEventListener('click', () => acao.onClick());
        feedbackEl.append(btn);
    }
    if (feedbackTimer) window.clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(() => {
        feedbackEl.hidden = true;
        feedbackEl.replaceChildren();
    }, 5200);
}

function marcarAba() {
    const arquivadas = pasta === 'arquivadas';
    abaAtivas?.classList.toggle('ativa', !arquivadas);
    abaArquivadas?.classList.toggle('ativa', arquivadas);
    abaAtivas?.setAttribute('aria-selected', String(!arquivadas));
    abaArquivadas?.setAttribute('aria-selected', String(arquivadas));
    layoutEl?.classList.toggle('chat-pasta-arquivadas', arquivadas);
}

function escHtml(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function matchDe(conv) {
    const n = Number(conv?.match_percent ?? conv?.match);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
}

function pintarAvatar(el, pessoa) {
    if (!el) return;
    const foto = pessoa?.foto_url || '';
    const iniciais = pessoa?.iniciais || (pessoa?.nome || '?').slice(0, 2).toUpperCase();
    if (foto) {
        el.style.backgroundImage = `url("${foto}")`;
        el.textContent = '';
        el.classList.add('com-foto');
    } else {
        el.style.backgroundImage = '';
        el.textContent = iniciais;
        el.classList.remove('com-foto');
    }
}

function mostrarPainelVazio() {
    conversaAtiva = null;
    form.hidden = true;
    if (acoesEl) acoesEl.hidden = true;
    if (infoDetalhe) infoDetalhe.hidden = true;
    if (infoVazio) infoVazio.hidden = false;
    if (topoPessoaEl) topoPessoaEl.hidden = true;
    if (tituloVazioEl) {
        tituloVazioEl.hidden = false;
        tituloVazioEl.textContent = locador ? 'Nenhum interessado ainda' : 'Selecione uma conversa';
    }
    layoutEl?.classList.remove('chat-thread-aberta');

    if (locador) {
        if (infoVazioTexto) {
            infoVazioTexto.textContent =
                'Ninguém mandou mensagem ainda. Quando um morador falar com você, o anúncio da conversa aparece aqui. Você pode ter vários anúncios — gerencie todos em Meus anúncios.';
        }
        if (infoVazioPrimario) {
            infoVazioPrimario.href = 'meus-imoveis.html';
            infoVazioPrimario.textContent = 'Ver meus anúncios';
        }
        if (infoVazioSecundario) {
            infoVazioSecundario.hidden = false;
            infoVazioSecundario.href = 'publicar-imovel.html';
            infoVazioSecundario.textContent = 'Publicar outro anúncio';
        }
        return;
    }

    if (infoVazioTexto) {
        infoVazioTexto.textContent =
            'Nenhuma conversa ainda. Abra um anúncio no mural e toque em Conversar para iniciar.';
    }
    if (infoVazioPrimario) {
        infoVazioPrimario.href = 'home.html';
        infoVazioPrimario.textContent = 'Explorar mural';
    }
    if (infoVazioSecundario) {
        infoVazioSecundario.hidden = false;
        infoVazioSecundario.href = 'favoritos.html';
        infoVazioSecundario.textContent = 'Ver favoritos';
    }
}

function mostrarPainelDetalhe() {
    if (infoVazio) infoVazio.hidden = true;
    if (infoDetalhe) infoDetalhe.hidden = false;
}

function horaCurta(iso) {
    try {
        return new Date(iso).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    } catch (erro) {
        return '';
    }
}

function marcarAtivoNaLista(id) {
    listaEl.querySelectorAll('.chat-item').forEach((btn) => {
        const ativo = String(btn.dataset.id) === String(id);
        btn.classList.toggle('ativo', ativo);
        btn.setAttribute('aria-current', ativo ? 'true' : 'false');
    });
}

function renderLista() {
    marcarAba();
    listaEl.replaceChildren();
    listaEl.classList.add('chat-itens-trocando');
    window.requestAnimationFrame(() => {
        listaEl.classList.remove('chat-itens-trocando');
    });
    if (!conversas.length) {
        const vazio = document.createElement('p');
        vazio.className = 'chat-vazio';
        vazio.textContent = pasta === 'arquivadas'
            ? 'Nenhuma conversa arquivada.'
            : 'Nenhuma conversa ainda.';
        listaEl.append(vazio);
        return;
    }
    conversas.forEach((c, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.id = String(c.id);
        btn.className = `chat-item${conversaAtiva && String(conversaAtiva.id) === String(c.id) ? ' ativo' : ''}`;
        btn.style.animationDelay = `${Math.min(i, 8) * 28}ms`;
        if (conversaAtiva && String(conversaAtiva.id) === String(c.id)) {
            btn.setAttribute('aria-current', 'true');
        }

        const avatar = document.createElement('span');
        avatar.className = 'chat-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        pintarAvatar(avatar, c.outro);

        const corpo = document.createElement('span');
        corpo.className = 'chat-item-corpo';

        const topoLinha = document.createElement('span');
        topoLinha.className = 'chat-item-topo';
        const nome = document.createElement('strong');
        nome.className = 'chat-item-nome';
        nome.textContent = c.outro?.nome || 'Contato';
        topoLinha.append(nome);
        const match = matchDe(c);
        if (match != null) {
            const pill = document.createElement('em');
            pill.className = 'chat-match';
            pill.textContent = `${match}%`;
            pill.title = `${match}% de afinidade`;
            topoLinha.append(pill);
        }

        const imovel = document.createElement('span');
        imovel.className = 'chat-item-imovel';
        imovel.textContent = rotuloInteresseAnuncio(c);
        imovel.title = rotuloInteresseAnuncio(c);
        const preview = document.createElement('span');
        preview.className = 'chat-item-preview';
        preview.textContent = c.ultima_mensagem || 'Sem mensagens';
        corpo.append(topoLinha, imovel, preview);

        const lado = document.createElement('span');
        lado.className = 'chat-item-lado';
        const naoLidas = Number(c.nao_lidas) || 0;
        if (naoLidas && pasta === 'ativas') {
            const badge = document.createElement('em');
            badge.className = 'chat-badge';
            badge.textContent = naoLidas > 9 ? '9+' : String(naoLidas);
            lado.append(badge);
        }

        btn.append(avatar, corpo);
        if (lado.childNodes.length) btn.append(lado);
        btn.addEventListener('click', () => abrir(c.id, { instantaneo: true }));
        listaEl.append(btn);
    });
}

function pintarTopo(conv) {
    if (tituloVazioEl) tituloVazioEl.hidden = true;
    if (topoPessoaEl) topoPessoaEl.hidden = false;
    pintarAvatar(topoAvatarEl, conv.outro);
    if (tituloEl) tituloEl.textContent = conv.outro?.nome || 'Contato';
    if (topoMetaEl) {
        const interesse = rotuloInteresseAnuncio(conv);
        topoMetaEl.textContent = interesse;
        topoMetaEl.title = interesse;
    }
    const match = matchDe(conv);
    if (topoMatchEl) {
        if (match != null) {
            topoMatchEl.hidden = false;
            topoMatchEl.textContent = `${match}%`;
            topoMatchEl.title = `${match}% de afinidade com o anúncio`;
        } else {
            topoMatchEl.hidden = true;
        }
    }
}

function renderMensagens(conv) {
    msgsEl.replaceChildren();
    const msgs = conv.mensagens || [];
    if (!msgs.length) {
        const vazio = document.createElement('p');
        vazio.className = 'chat-vazio';
        vazio.textContent = 'Nenhuma mensagem ainda. Escreva a primeira.';
        msgsEl.append(vazio);
        return;
    }
    msgs.forEach((m) => {
        const bolha = document.createElement('div');
        bolha.className = `bolha ${m.minha ? 'minha' : 'deles'}`;
        const lidaTxt = m.minha ? (m.lida ? ' · lida' : ' · enviada') : '';
        bolha.innerHTML = `${escHtml(m.texto)}<small>${escHtml(m.autor_nome)} · ${horaCurta(m.em)}${lidaTxt}</small>`;
        msgsEl.append(bolha);
    });
    msgsEl.scrollTop = msgsEl.scrollHeight;
}

function renderPainelImovel(conv) {
    mostrarPainelDetalhe();
    imovelTitulo.textContent = conv.imovel_titulo;
    imovelMeta.textContent = conv.imovel_bairro
        ? `${conv.imovel_bairro} · R$ ${Number(conv.imovel_preco || 0).toLocaleString('pt-BR')}/mês`
        : '';
    imovelLink.href = `detalhe.html?id=${encodeURIComponent(conv.imovel_id)}`;
    imovelLink.textContent = locador ? 'Abrir meu anúncio' : 'Ver anúncio';
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
}

function renderAcoes(conv) {
    const bloqueado = Boolean(conv.contato_bloqueado);
    form.hidden = false;
    if (acoesEl) acoesEl.hidden = false;
    if (botaoMarcarLida) {
        botaoMarcarLida.disabled = bloqueado || !(Number(conv.nao_lidas) > 0);
        botaoMarcarLida.textContent = Number(conv.nao_lidas) > 0
            ? `Marcar como lida (${conv.nao_lidas})`
            : 'Tudo lido';
    }
    if (botaoArquivar) {
        const arquivada = (conv.status_conversa || '') === 'arquivada';
        botaoArquivar.textContent = arquivada ? 'Desarquivar' : 'Arquivar';
        botaoArquivar.dataset.status = arquivada ? 'ativa' : 'arquivada';
    }
    if (botaoBloquear) {
        const euBloqueei = Boolean(conv.eu_bloqueei);
        const meBloquearam = Boolean(conv.me_bloquearam) && !euBloqueei;
        botaoBloquear.hidden = meBloquearam;
        botaoBloquear.disabled = meBloquearam;
        botaoBloquear.textContent = euBloqueei ? 'Desbloquear' : 'Bloquear';
        botaoBloquear.dataset.acao = euBloqueei ? 'desbloquear' : 'bloquear';
    }
    if (bloqueado) {
        travarComposer(true);
        form.dataset.enviando = '0';
        input.placeholder = conv.eu_bloqueei
            ? 'Você bloqueou esta pessoa — desbloqueie para conversar'
            : 'Conversa indisponível';
    } else if (form.dataset.enviando !== '1') {
        travarComposer(false);
    }
}

function renderThread(conv, { soTopo = false } = {}) {
    conversaAtiva = conv;
    layoutEl?.classList.add('chat-thread-aberta');
    if (voltarListaEl) voltarListaEl.hidden = false;
    pintarTopo(conv);
    renderAcoes(conv);
    renderPainelImovel(conv);
    if (!soTopo) renderMensagens(conv);
    marcarAtivoNaLista(conv.id);
}

function mergeLista(conv) {
    const idx = conversas.findIndex((c) => String(c.id) === String(conv.id));
    const resumido = {
        ...(idx >= 0 ? conversas[idx] : {}),
        ...conv,
        mensagens: undefined,
    };
    delete resumido.mensagens;
    if (idx >= 0) conversas[idx] = { ...conversas[idx], ...resumido };
    else conversas.unshift(resumido);
}

async function abrir(id, { instantaneo = false } = {}) {
    const pedido = ++pedidoAbrir;
    const idStr = String(id);
    const daLista = conversas.find((c) => String(c.id) === idStr);
    const emCache = cacheThread.get(idStr);

    // Troca imediata: marca ativo + pinta topo/mensagens do cache (sem esperar a API).
    if (instantaneo || emCache || daLista) {
        const preview = emCache || {
            ...daLista,
            mensagens: emCache?.mensagens || [],
        };
        renderThread(preview, { soTopo: !emCache });
        if (!emCache) {
            msgsEl.innerHTML = '<p class="chat-vazio chat-carregando">Carregando mensagens…</p>';
        }
        marcarAtivoNaLista(id);
    } else if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.preencherInline(msgsEl, 'Abrindo conversa…');
    }

    const url = new URL(window.location.href);
    url.searchParams.set('id', idStr);
    history.replaceState({}, '', url);

    try {
        const conv = await RoomMatchApi.obterConversa(id);
        if (pedido !== pedidoAbrir) return; // usuário já clicou em outra
        cacheThread.set(idStr, conv);
        mergeLista(conv);
        renderThread(conv);
        renderLista();
        if (typeof carregarNotificacoes === 'function') carregarNotificacoes();
    } catch (erro) {
        if (pedido !== pedidoAbrir) return;
        msgsEl.innerHTML = `<p class="chat-vazio">${escHtml(erro.detail || erro.message || 'Não foi possível abrir.')}</p>`;
    }
}

voltarListaEl?.addEventListener('click', () => {
    layoutEl?.classList.remove('chat-thread-aberta');
    voltarListaEl.hidden = true;
});

async function carregarLista({ manterThread = false, abrirPrimeira = false } = {}) {
    const pedido = ++pedidoLista;
    const { items } = await RoomMatchApi.listarConversas(
        pasta === 'arquivadas' ? { arquivadasApenas: true } : {}
    );
    if (pedido !== pedidoLista) return;
    conversas = items;
    renderLista();

    if (manterThread && conversaAtiva
        && conversas.some((c) => String(c.id) === String(conversaAtiva.id))) {
        return;
    }

    const idUrl = new URLSearchParams(window.location.search).get('id');
    if (abrirPrimeira && idUrl && conversas.some((c) => String(c.id) === String(idUrl))) {
        await abrir(idUrl, { instantaneo: true });
        return;
    }
    if (abrirPrimeira && conversas[0] && window.matchMedia('(min-width: 961px)').matches) {
        await abrir(conversas[0].id, { instantaneo: true });
        return;
    }
    if (!conversas.length || !manterThread) {
        mostrarPainelVazio();
        if (!conversas.length) {
            msgsEl.innerHTML = pasta === 'arquivadas'
                ? '<p class="chat-vazio">Arquive uma conversa pelo botão Arquivar para vê-la aqui.</p>'
                : (locador
                    ? '<p class="chat-vazio">Quando um morador interessado mandar mensagem, a conversa aparece aqui.</p>'
                    : '<p class="chat-vazio">Nenhuma conversa ainda. Comece pelo mural ou pelos favoritos.</p>');
        }
    }
}

async function trocarPasta(nova) {
    if (pasta === nova) return;
    pasta = nova;
    marcarAba();
    conversaAtiva = null;
    cacheThread.clear();
    layoutEl?.classList.remove('chat-thread-aberta');
    if (voltarListaEl) voltarListaEl.hidden = true;
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.preencherInline(listaEl, 'Carregando…');
    }
    try {
        await carregarLista({ abrirPrimeira: true });
    } catch (erro) {
        listaEl.innerHTML = `<p class="chat-vazio">${escHtml(erro.detail || erro.message)}</p>`;
    }
}

abaAtivas?.addEventListener('click', () => trocarPasta('ativas'));
abaArquivadas?.addEventListener('click', () => trocarPasta('arquivadas'));

async function carregar() {
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.preencherInline(listaEl, 'Carregando conversas…');
        RoomMatchLoading.preencherInline(msgsEl, 'Carregando…');
    }
    const run = async () => {
        marcarAba();
        await carregarLista({ abrirPrimeira: true });
    };
    if (typeof RoomMatchLoading !== 'undefined') {
        await RoomMatchLoading.durante(run(), 'Carregando mensagens…');
        return;
    }
    await run();
}

function travarComposer(travado) {
    const enviar = form.querySelector('button[type="submit"]');
    form.dataset.enviando = travado ? '1' : '0';
    form.classList.toggle('chat-composer-enviando', travado);
    form.setAttribute('aria-busy', travado ? 'true' : 'false');
    input.disabled = travado;
    input.readOnly = travado;
    input.setAttribute('aria-disabled', travado ? 'true' : 'false');
    input.placeholder = travado ? 'Enviando mensagem…' : 'Escreva uma mensagem…';
    if (travado) input.blur();
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.botaoEspera(enviar, travado, travado ? 'Enviando…' : null);
    } else if (enviar) {
        enviar.disabled = travado;
    }
}

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!conversaAtiva || conversaAtiva.contato_bloqueado
        || form.dataset.enviando === '1' || input.disabled) return;
    const texto = input.value.trim();
    if (!texto) return;
    input.value = '';

    travarComposer(true);
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.mostrar('Enviando mensagem…');
    }

    const pendente = document.createElement('div');
    pendente.className = 'bolha minha bolha-enviando';
    pendente.setAttribute('aria-busy', 'true');
    pendente.setAttribute('aria-live', 'polite');
    pendente.innerHTML =
        `${escHtml(texto)}` +
        '<small><span class="chat-enviando-dots" aria-hidden="true">' +
        '<i></i><i></i><i></i></span> Enviando…</small>';
    const vazio = msgsEl.querySelector('.chat-vazio');
    if (vazio) vazio.remove();
    msgsEl.append(pendente);
    msgsEl.scrollTop = msgsEl.scrollHeight;

    try {
        const conv = await RoomMatchApi.enviarMensagem(conversaAtiva.id, texto);
        cacheThread.set(String(conv.id), conv);
        mergeLista(conv);
        renderThread(conv);
        renderLista();
    } catch (erro) {
        pendente.remove();
        input.value = texto;
        window.alert(erro.detail || erro.message || 'Não foi possível enviar.');
    } finally {
        if (typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.esconder();
        }
        travarComposer(false);
        input.focus();
    }
});

botaoMarcarLida?.addEventListener('click', async () => {
    if (!conversaAtiva || botaoMarcarLida.disabled) return;
    const run = async () => {
        const atual = await RoomMatchApi.marcarConversaLida(conversaAtiva.id);
        const idx = conversas.findIndex((c) => String(c.id) === String(atual.id));
        if (idx >= 0) conversas[idx] = { ...conversas[idx], ...atual };
        conversaAtiva = { ...conversaAtiva, ...atual, nao_lidas: 0 };
        if (conversaAtiva.mensagens) {
            conversaAtiva.mensagens = conversaAtiva.mensagens.map((m) => (
                m.minha ? m : { ...m, lida: true }
            ));
        }
        cacheThread.set(String(conversaAtiva.id), conversaAtiva);
        renderThread(conversaAtiva);
        renderLista();
        if (typeof carregarNotificacoes === 'function') await carregarNotificacoes();
    };
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.botaoEspera(botaoMarcarLida, true, 'Marcando…');
    }
    try {
        if (typeof RoomMatchLoading !== 'undefined') {
            await RoomMatchLoading.durante(run(), 'Marcando como lida…');
        } else {
            await run();
        }
    } catch (erro) {
        window.alert(erro.detail || erro.message || 'Não foi possível marcar como lida.');
    } finally {
        if (typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.botaoEspera(botaoMarcarLida, false);
        }
        // Restaura rótulo conforme estado atual da conversa.
        if (conversaAtiva && botaoMarcarLida) {
            const n = Number(conversaAtiva.nao_lidas) || 0;
            botaoMarcarLida.disabled = Boolean(conversaAtiva.contato_bloqueado) || n <= 0;
            botaoMarcarLida.textContent = n > 0 ? `Marcar como lida (${n})` : 'Marcar como lida';
        }
    }
});

async function recarregarConversaAtiva() {
    if (!conversaAtiva) return;
    const conv = await RoomMatchApi.obterConversa(conversaAtiva.id);
    cacheThread.set(String(conv.id), conv);
    mergeLista(conv);
    renderThread(conv);
    renderLista();
}

botaoBloquear?.addEventListener('click', async () => {
    if (!conversaAtiva?.outro?.id) return;
    const idOutro = conversaAtiva.outro.id;
    const desfazer = botaoBloquear.dataset.acao === 'desbloquear';
    const nome = conversaAtiva.outro.nome || 'esta pessoa';
    if (desfazer) {
        if (!window.confirm(`Desbloquear ${nome}?\nVocês poderão conversar de novo.`)) return;
    } else if (!window.confirm(
        `Bloquear ${nome}?\nVocês não poderão conversar até desbloquear.`
    )) {
        return;
    }
    const rotulo = desfazer ? 'Desbloqueando…' : 'Bloqueando…';
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.botaoEspera(botaoBloquear, true, rotulo);
    } else {
        botaoBloquear.disabled = true;
    }
    try {
        const acao = async () => {
            if (desfazer) await RoomMatchApi.desbloquearUsuario(idOutro);
            else await RoomMatchApi.bloquearUsuario(idOutro);
            await recarregarConversaAtiva();
        };
        if (typeof RoomMatchLoading !== 'undefined') {
            await RoomMatchLoading.durante(acao(), rotulo);
        } else {
            await acao();
        }
    } catch (erro) {
        const msg = erro.detail || erro.message || 'Não foi possível atualizar o bloqueio.';
        window.alert(
            erro.status === 404
                ? 'Não foi possível bloquear: a API está desatualizada. Reinicie o servidor (porta 8000) e tente de novo.'
                : msg
        );
        if (typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.botaoEspera(botaoBloquear, false);
        } else {
            botaoBloquear.disabled = false;
        }
    }
});

botaoDenunciar?.addEventListener('click', () => {
    if (!conversaAtiva || typeof RoomMatchDenuncia === 'undefined') return;
    RoomMatchDenuncia.abrir({
        conversaId: conversaAtiva.id,
        usuarioId: conversaAtiva.outro?.id,
        imovelId: conversaAtiva.imovel_id,
        nome: conversaAtiva.outro?.nome || conversaAtiva.imovel_titulo || 'esta conversa',
        onBloqueou: () => { recarregarConversaAtiva().catch(() => {}); },
    });
});

botaoArquivar?.addEventListener('click', async () => {
    if (!conversaAtiva) return;
    const novo = botaoArquivar.dataset.status || 'arquivada';
    const idArquivada = conversaAtiva.id;
    const nome = conversaAtiva.outro?.nome || 'Conversa';
    const rotuloArq = novo === 'arquivada' ? 'Arquivando…' : 'Restaurando…';
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.botaoEspera(botaoArquivar, true, rotuloArq);
    } else {
        botaoArquivar.disabled = true;
    }
    try {
        const run = async () => {
            const atual = await RoomMatchApi.atualizarConversa(idArquivada, {
                status_conversa: novo
            });
            cacheThread.delete(String(idArquivada));
            conversas = conversas.filter((c) => String(c.id) !== String(idArquivada));
            renderLista();

            if (novo === 'arquivada') {
                layoutEl?.classList.remove('chat-thread-aberta');
                if (voltarListaEl) voltarListaEl.hidden = window.matchMedia('(min-width: 961px)').matches;
                if (conversas[0] && window.matchMedia('(min-width: 961px)').matches) {
                    await abrir(conversas[0].id, { instantaneo: true });
                } else {
                    mostrarPainelVazio();
                    msgsEl.innerHTML = '<p class="chat-vazio">Conversa arquivada.</p>';
                }
                mostrarFeedback(`“${nome}” foi para Arquivadas.`, {
                    acao: {
                        rotulo: 'Ver arquivadas',
                        onClick: () => trocarPasta('arquivadas'),
                    },
                });
            } else {
                mostrarFeedback(`“${nome}” voltou para Ativas.`, {
                    acao: {
                        rotulo: 'Ver ativas',
                        onClick: () => trocarPasta('ativas'),
                    },
                });
                // Sai da pasta arquivadas após desarquivar.
                if (pasta === 'arquivadas') {
                    await trocarPasta('ativas');
                } else {
                    mergeLista({ ...atual, status_conversa: 'ativa' });
                    renderLista();
                    mostrarPainelVazio();
                }
            }
        };
        if (typeof RoomMatchLoading !== 'undefined') {
            await RoomMatchLoading.durante(run(), rotuloArq);
        } else {
            await run();
        }
    } catch (erro) {
        window.alert(erro.detail || erro.message || 'Não foi possível arquivar.');
    } finally {
        if (typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.botaoEspera(botaoArquivar, false);
        } else {
            botaoArquivar.disabled = false;
        }
    }
});

carregar().catch((erro) => {
    msgsEl.innerHTML = `<p class="chat-vazio">${escHtml(erro.message)}</p>`;
    if (typeof RoomMatchLoading !== 'undefined') RoomMatchLoading.forcarEsconder();
});
