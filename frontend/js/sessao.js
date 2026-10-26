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
            { href: 'calendario-visitas.html', texto: 'Visitas', className: ativo('calendario-visitas.html') },
            { href: 'mensagens.html', texto: 'Mensagens', className: ativo('mensagens.html') },
            { href: 'perfil.html', texto: null, className: `nav-usuario${ativo('perfil.html')}`, aria: 'Minha conta' }
        ];
    }

    if (ehMorador()) {
        return [
            { href: 'home.html', texto: 'Explorar', className: ativo('home.html') },
            { href: 'favoritos.html', texto: 'Favoritos', className: ativo('favoritos.html') },
            { href: 'calendario-visitas.html', texto: 'Minhas visitas', className: ativo('calendario-visitas.html') },
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
    nav.append(sairLink);
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

function atualizarChromeSessao() {
    document.body.classList.toggle('visitante', !estaLogado());
    document.body.classList.toggle('papel-locador', ehLocador());
    document.body.classList.toggle('papel-morador', ehMorador());
    const user = usuarioAtual();
    if (!user) return;

    document.querySelectorAll('.usuario-foto, a.nav-usuario, span.nav-usuario').forEach((el) => {
        if (el.classList.contains('usuario-foto') || el.classList.contains('nav-usuario')) {
            el.textContent = user.iniciais || '?';
        }
    });
    document.querySelectorAll('.usuario').forEach((el) => {
        const foto = el.querySelector('.usuario-foto');
        if (foto) {
            foto.textContent = user.iniciais || '?';
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
        link.onclick = (evento) => {
            evento.preventDefault();
            sair();
        };
        if (!link.getAttribute('href') || link.getAttribute('href') === 'login.html') {
            link.setAttribute('href', '#');
        }
    });
}

document.body.classList.toggle('visitante', !estaLogado());
document.body.classList.toggle('papel-locador', ehLocador());
document.body.classList.toggle('papel-morador', ehMorador());

document.addEventListener('DOMContentLoaded', () => {
    atualizarNavPorPapel();
    atualizarChromeSessao();
    ligarSair();
});
