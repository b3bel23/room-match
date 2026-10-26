/**
 * Liga navegação global da demo: Mensagens, config, Como funciona, Termos, Sair.
 */
(function () {
    const MAPA = [
        ['a[href="#"]:not(.sair)', null],
    ];

    function trocar(seletorTexto, href) {
        document.querySelectorAll('a').forEach((a) => {
            const t = (a.textContent || '').trim().toLowerCase();
            if (t === seletorTexto.toLowerCase() && (a.getAttribute('href') === '#' || !a.getAttribute('href'))) {
                a.setAttribute('href', href);
            }
        });
    }

    function aplicar() {
        trocar('mensagens', 'mensagens.html');
        trocar('perfil', 'perfil.html');
        trocar('preferências', 'preferencias.html');
        trocar('preferencias', 'preferencias.html');
        trocar('segurança', 'seguranca.html');
        trocar('seguranca', 'seguranca.html');
        trocar('termos', 'termos.html');
        trocar('termos e privacidade', 'termos.html');
        trocar('como funciona', 'como-funciona.html');
        trocar('conversar com locador', '#conversar');
        trocar('esqueci minha senha', 'recuperar-senha.html');
        trocar('meus anúncios', 'meus-imoveis.html');
        trocar('ir para meus anúncios', 'meus-imoveis.html');

        document.querySelectorAll('a.usuario, a.nav-usuario, .usuario, .nav-usuario').forEach((el) => {
            if (el.tagName === 'A') {
                el.setAttribute('href', 'perfil.html');
                return;
            }
            if (typeof estaLogado === 'function' && estaLogado()) {
                el.style.cursor = 'pointer';
                el.title = 'Abrir perfil';
                el.addEventListener('click', () => { window.location.href = 'perfil.html'; });
            }
        });

        const conversar = document.querySelector('a[href="#conversar"], a.btn-conversar');
        if (conversar) {
            conversar.addEventListener('click', async (evento) => {
                if (conversar.getAttribute('href') !== '#conversar' && !conversar.classList.contains('btn-conversar')) {
                    return;
                }
                evento.preventDefault();
                if (!estaLogado()) {
                    window.location.href = 'login.html';
                    return;
                }
                if (typeof ehLocador === 'function' && ehLocador()) {
                    window.location.href = 'mensagens.html';
                    return;
                }
                if (conversar.getAttribute('aria-disabled') === 'true') {
                    window.alert(conversar.title || 'Chat bloqueado: ajuste limiar/orçamento nas preferências.');
                    return;
                }
                const id = new URLSearchParams(window.location.search).get('id') || 'kitnet-cambui';
                try {
                    const conv = await RoomMatchApi.abrirConversa({ imovel_id: id });
                    window.location.href = `mensagens.html?id=${encodeURIComponent(conv.id)}`;
                } catch (erro) {
                    window.alert(erro.detail || erro.message);
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', aplicar);
    } else {
        aplicar();
    }
}());
