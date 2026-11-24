/**
 * Sessão e chrome por papel (Morador ≠ Locador em 100% da navegação).
 * Depende de api.js (e mock-api.js no modo mock).
 */
function estaLogado() {
    return Boolean(RoomMatchApi.lerToken() && RoomMatchApi.lerUsuario());
}

function usuarioAtual() {
    return RoomMatchApi.lerUsuario();
}

function ehLocador() {
    const user = usuarioAtual();
    return Boolean(user && user.papel === 'Locador');
}

function ehMorador() {
    const user = usuarioAtual();
    return Boolean(user && user.papel === 'Morador');
}

/** Destino pós-login / logo home por papel. */
function paginaInicial() {
    if (ehLocador()) return 'meus-imoveis.html';
    if (ehMorador()) return 'home.html';
    return 'home.html';
}

function entrar(token, user) {
    RoomMatchApi.salvarSessao(token, user);
}

function sair() {
    RoomMatchApi.limparSessao();
    window.location.href = 'login.html';
}

function requerAuth() {
    if (!estaLogado()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function requerMorador() {
    if (!requerAuth()) return false;
    if (!ehMorador()) {
        window.location.href = paginaInicial();
        return false;
    }
    return true;
}

function requerLocador() {
    if (!requerAuth()) return false;
    if (!ehLocador()) {
        window.location.href = paginaInicial();
        return false;
    }
    return true;
}

/**
 * Links de header exclusivos por papel — não reutiliza o menu do outro.
 * Morador: Explorar · Favoritos · Mensagens · Conta
 * Locador: Meus anúncios · Publicar · Calendário · Mensagens · Conta
 */
function linksNavPorPapel() {
    const path = (window.location.pathname.split('/').pop() || '').toLowerCase();
    const ativo = (href) => (path === href.toLowerCase() ? ' ativo' : '');

    if (ehLocador()) {
        return [
            { href: 'meus-imoveis.html', texto: 'Meus anúncios', className: ativo('meus-imoveis.html') },
            { href: 'publicar-imovel.html', texto: 'Publicar', className: ativo('publicar-imovel.html') },
            { href: 'mensagens.html', texto: 'Mensagens', className: ativo('mensagens.html') },
            { href: 'perfil.html', texto: null, className: `nav-usuario${ativo('perfil.html')}`, aria: 'Minha conta' }
        ];
    }

    if (ehMorador()) {
        return [
            { href: 'home.html', texto: 'Explorar', className: ativo('home.html') },
            { href: 'favoritos.html', texto: 'Favoritos', className: ativo('favoritos.html') },
            { href: 'mensagens.html', texto: 'Mensagens', className: ativo('mensagens.html') },
            { href: 'perfil.html', texto: null, className: `nav-usuario${ativo('perfil.html')}`, aria: 'Minha conta' }
        ];
    }

    return [];
}

function montarNavPorPapel(nav) {
    if (!nav || !estaLogado()) return;
    const user = usuarioAtual();
    nav.replaceChildren();
    linksNavPorPapel().forEach((item) => {
        const a = document.createElement('a');
        a.href = item.href;
        if (item.className) a.className = item.className.trim();
        if (item.aria) a.setAttribute('aria-label', item.aria);
        if (item.texto === null) {
            a.textContent = user.iniciais || '?';
        } else {
            a.textContent = item.texto;
        }
        nav.append(a);
    });
    const sairLink = document.createElement('a');
    sairLink.className = 'sair';
    sairLink.href = '#';
    sairLink.textContent = 'Sair';
    nav.insertBefore(sairLink, nav.querySelector('.nav-usuario'));
    nav.insertBefore(criarSino(), sairLink);
}

/* ---------- Notificações (RF17/RF35): sino no menu, com contagem de não lidas ---------- */

const SINO_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
let notificacoesCache = { items: [], nao_lidas: 0 };

function criarSino() {
    const caixa = document.createElement('div');
    caixa.className = 'nav-sino';
    caixa.innerHTML = `<button type="button" class="nav-sino-botao" aria-haspopup="true" aria-expanded="false" aria-label="Notificações">${SINO_SVG}<span class="nav-sino-contagem" hidden></span></button>
        <div class="nav-sino-painel" role="region" aria-label="Notificações" hidden>
            <div class="nav-sino-topo"><strong>Notificações</strong><button type="button" class="nav-sino-lidas">Marcar todas como lidas</button></div>
            <ul class="nav-sino-lista"></ul>
        </div>`;
    const botao = caixa.querySelector('.nav-sino-botao');
    const painel = caixa.querySelector('.nav-sino-painel');
    botao.addEventListener('click', (evento) => {
        evento.stopPropagation();
        const abrir = painel.hidden;
        painel.hidden = !abrir;
        botao.setAttribute('aria-expanded', String(abrir));
        if (abrir) carregarNotificacoes();
    });
    caixa.querySelector('.nav-sino-lidas').addEventListener('click', async () => {
        const btn = caixa.querySelector('.nav-sino-lidas');
        try {
            const run = async () => {
                await RoomMatchApi.marcarNotificacoesLidas();
                await carregarNotificacoes();
            };
            if (typeof RoomMatchLoading !== 'undefined') {
                RoomMatchLoading.botaoEspera(btn, true, 'Marcando…');
                await RoomMatchLoading.durante(run(), 'Marcando notificações como lidas…');
            } else {
                if (btn) btn.disabled = true;
                await run();
            }
        } catch (erro) { /* tenta de novo no próximo ciclo */ }
        finally {
            if (typeof RoomMatchLoading !== 'undefined') {
                RoomMatchLoading.botaoEspera(btn, false);
            } else if (btn) {
                btn.disabled = false;
            }
        }
    });
    document.addEventListener('click', (evento) => {
        if (!caixa.contains(evento.target)) {
            painel.hidden = true;
            botao.setAttribute('aria-expanded', 'false');
        }
    });
    desenharSino(caixa);
    return caixa;
}

function desenharSino(caixa) {
    const { items, nao_lidas: naoLidas } = notificacoesCache;
    const contagem = caixa.querySelector('.nav-sino-contagem');
    contagem.hidden = !naoLidas;
    contagem.textContent = naoLidas > 9 ? '9+' : String(naoLidas);
    caixa.querySelector('.nav-sino-botao').setAttribute(
        'aria-label', naoLidas ? `Notificações: ${naoLidas} não lidas` : 'Notificações'
    );
    const lista = caixa.querySelector('.nav-sino-lista');
    lista.replaceChildren();
    if (!items.length) {
        const vazio = document.createElement('li');
        vazio.className = 'nav-sino-vazio';
        vazio.textContent = 'Nenhuma notificação por enquanto.';
        lista.append(vazio);
    }
    items.forEach((n) => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = n.link || '#';
        link.className = `nav-sino-item${n.lida ? '' : ' nao-lida'}`;

        const avatar = document.createElement('span');
        avatar.className = 'nav-sino-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        if (n.foto_url) {
            avatar.style.backgroundImage = `url("${n.foto_url}")`;
        } else {
            avatar.textContent = n.iniciais || (n.tipo === 'favorito' ? '♥' : '?');
        }

        const corpo = document.createElement('span');
        corpo.className = 'nav-sino-corpo';
        const titulo = document.createElement('strong');
        titulo.textContent = n.nome || (n.tipo === 'favorito' ? 'Favorito' : 'RoomMatch');
        const texto = document.createElement('span');
        texto.className = 'nav-sino-texto';
        texto.textContent = n.texto || '';
        const quando = document.createElement('small');
        quando.textContent = n.criada_em
            ? new Date(n.criada_em).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            })
            : '';
        corpo.append(titulo, texto, quando);

        link.append(avatar, corpo);
        if (!n.lida && Number(n.nao_lidas) > 0) {
            const badge = document.createElement('span');
            badge.className = 'nav-sino-badge';
            badge.textContent = Number(n.nao_lidas) > 9 ? '9+' : String(n.nao_lidas);
            link.append(badge);
        }

        link.addEventListener('click', (ev) => {
            if (n.lida) return;
            const ids = Array.isArray(n.ids) && n.ids.length ? n.ids : [n.id];
            // Marca como lida em paralelo à navegação; se for âncora vazia, espera o loading.
            const marcar = () => RoomMatchApi.marcarNotificacoesLidas(ids)
                .then(() => carregarNotificacoes())
                .catch(() => {});
            if ((link.getAttribute('href') || '#') === '#' && typeof RoomMatchLoading !== 'undefined') {
                ev.preventDefault();
                RoomMatchLoading.durante(marcar(), 'Marcando como lida…');
            } else {
                marcar();
            }
        });
        item.append(link);
        lista.append(item);
    });
}

async function carregarNotificacoes() {
    if (!estaLogado() || typeof RoomMatchApi === 'undefined') return;
    try {
        notificacoesCache = await RoomMatchApi.listarNotificacoes();
        document.querySelectorAll('.nav-sino').forEach(desenharSino);
    } catch (erro) { /* sem rede: mantém o que já tinha */ }
}

function iniciarNotificacoes() {
    if (!estaLogado()) return;
    // Adia o primeiro fetch para não competir com mural/stats no carregamento.
    window.setTimeout(carregarNotificacoes, 800);
    window.setInterval(() => {
        if (document.visibilityState === 'visible') carregarNotificacoes();
    }, 90000);
}

function atualizarNavPorPapel() {
    if (!estaLogado()) return;

    document.querySelectorAll('header nav.nav-logado').forEach(montarNavPorPapel);

    document.querySelectorAll('header.site-header nav').forEach((nav) => {
        if (nav.classList.contains('nav-visitante')) return;
        montarNavPorPapel(nav);
    });

    document.querySelectorAll('a.logo, header a[href="home.html"]').forEach((a) => {
        if (a.querySelector('img') || a.classList.contains('logo')) {
            a.setAttribute('href', paginaInicial());
        }
    });
    document.querySelectorAll('header.site-header > a[href="home.html"]').forEach((a) => {
        a.setAttribute('href', paginaInicial());
    });
}

function aplicarAvatarElemento(el, user) {
    if (!el || !user) return;
    if (user.foto_url) {
        el.style.backgroundImage = `url("${user.foto_url}")`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.textContent = '';
    } else {
        el.style.backgroundImage = '';
        el.textContent = user.iniciais || '?';
    }
}

function atualizarChromeSessao() {
    document.body.classList.toggle('visitante', !estaLogado());
    document.body.classList.toggle('papel-locador', ehLocador());
    document.body.classList.toggle('papel-morador', ehMorador());
    atualizarNavPorPapel();
    const user = usuarioAtual();
    if (!user) return;

    document.querySelectorAll('.usuario-foto, a.nav-usuario, span.nav-usuario').forEach((el) => {
        if (el.classList.contains('usuario-foto') || el.classList.contains('nav-usuario')) {
            aplicarAvatarElemento(el, user);
        }
    });
    document.querySelectorAll('.usuario').forEach((el) => {
        const foto = el.querySelector('.usuario-foto');
        if (foto) {
            aplicarAvatarElemento(foto, user);
            el.childNodes.forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE) node.textContent = '';
            });
            el.append(` ${user.nome}`);
        } else if (!el.classList.contains('nav-usuario')) {
            el.textContent = user.nome;
        }
    });
}

function ligarSair() {
    document.querySelectorAll('a.sair').forEach((link) => {
        if (!link.getAttribute('href') || link.getAttribute('href') === 'login.html') {
            link.setAttribute('href', '#');
        }
    });
    if (document.documentElement.dataset.sairDelegado === '1') return;
    document.documentElement.dataset.sairDelegado = '1';
    document.addEventListener('click', (evento) => {
        const link = evento.target.closest('a.sair');
        if (!link) return;
        evento.preventDefault();
        sair();
    });
}

document.body.classList.toggle('visitante', !estaLogado());
document.body.classList.toggle('papel-locador', ehLocador());
document.body.classList.toggle('papel-morador', ehMorador());

document.addEventListener('DOMContentLoaded', () => {
    atualizarNavPorPapel();
    atualizarChromeSessao();
    ligarSair();
    iniciarNotificacoes();
});
