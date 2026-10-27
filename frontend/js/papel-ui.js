/**
 * Personaliza copy e blocos por papel em cada tela (sem reciclar texto/CTAs).
 * Carregar depois de sessao.js.
 */
(function () {
    function path() {
        return (window.location.pathname.split('/').pop() || '').toLowerCase();
    }

    function setText(sel, texto) {
        const el = document.querySelector(sel);
        if (el && texto != null) el.textContent = texto;
    }

    function personalizarHome() {
        if (path() !== 'home.html') return;
        if (typeof ehLocador === 'function' && ehLocador()) {
            window.location.replace('meus-imoveis.html');
            return;
        }
        if (typeof ehMorador === 'function' && ehMorador()) {
            setText('.hero h1', 'Seu mural na região metropolitana de Campinas');
            setText('.hero-lead, .hero .hero-lead', 'Afinidade com seus hábitos, rateio transparente e tempo até a faculdade ou o trabalho.');
            document.querySelectorAll('.stat-logado').forEach((el) => { el.hidden = false; });
            const cta = document.querySelector('.cta-banner');
            if (cta) cta.hidden = true;
            const buscar = document.querySelector('.filter-bar .btn-buscar');
            if (buscar) buscar.textContent = 'Buscar';
        }
    }

    function personalizarMeusImoveis() {
        if (path() !== 'meus-imoveis.html') return;
        setText('.page-bar h1', 'Painel do locador');
        setText('.page-bar-sub, .conteudo-sub', 'Gerencie anúncios, visitas e interessados');
        setText('.conteudo h2', 'Meus anúncios');
    }

    function personalizarCalendario() {
        if (path() !== 'calendario-visitas.html') return;
        if (typeof ehLocador === 'function' && ehLocador()) {
            setText('.page-bar h1', 'Agenda do locador');
            setText('.page-bar-sub', 'Pedidos de visita nos seus imóveis');
            setText('.conteudo h2', 'Visitas recebidas');
            setText('.conteudo-sub', 'Confirme horários com quem tem interesse nos seus anúncios');
        } else if (typeof ehMorador === 'function' && ehMorador()) {
            setText('.page-bar h1', 'Agenda do morador');
            setText('.page-bar-sub', 'Horários que você pediu');
            setText('.conteudo h2', 'Minhas visitas');
            setText('.conteudo-sub', 'Acompanhe pedidos enviados aos locadores');
        }
    }

    function personalizarMensagens() {
        if (path() !== 'mensagens.html') return;
        const tituloLista = document.querySelector('.chat-lista h2');
        const infoH2 = document.querySelector('.chat-info h2');
        if (typeof ehLocador === 'function' && ehLocador()) {
            document.title = 'Interessados · Room Match';
            if (tituloLista) tituloLista.textContent = 'Interessados';
            if (infoH2) infoH2.textContent = 'Seu anúncio';
            const agendar = document.getElementById('chat-agendar-link');
            if (agendar) {
                agendar.textContent = 'Ver agenda de visitas';
                agendar.href = 'calendario-visitas.html';
                agendar.hidden = false;
            }
        } else if (typeof ehMorador === 'function' && ehMorador()) {
            document.title = 'Mensagens · Room Match';
            if (tituloLista) tituloLista.textContent = 'Conversas com locadores';
            if (infoH2) infoH2.textContent = 'Anúncio';
        }
    }

    function personalizarPreferencias() {
        if (path() !== 'preferencias.html') return;
        // Campos = schema locatario (orcamento_maximo, limiar_compatibilidade, tags).
        // Só o contexto da página muda; nomes/labels de campo são os do banco.
        if (typeof ehLocador === 'function' && ehLocador()) {
            setText('.page-bar-sub', 'Perfil locador');
        } else if (typeof ehMorador === 'function' && ehMorador()) {
            setText('.page-bar-sub', 'Perfil locatário');
        }
    }

    function personalizarPerfil() {
        if (path() !== 'perfil.html') return;
        if (typeof ehLocador === 'function' && ehLocador()) {
            setText('.conteudo-sub', 'Dados do cadastro do locador — todos os campos editáveis, inclusive o tipo de perfil.');
            setText('.page-bar-sub', 'Conta locador');
        } else if (typeof ehMorador === 'function' && ehMorador()) {
            setText('.conteudo-sub', 'Dados do cadastro do morador — todos os campos editáveis, inclusive o tipo de perfil.');
            setText('.page-bar-sub', 'Conta morador');
        }
    }

    function personalizarFavoritos() {
        if (path() !== 'favoritos.html') return;
        if (typeof ehLocador === 'function' && ehLocador()) {
            window.location.replace('meus-imoveis.html');
        }
    }

    function personalizarSegurancaTermos() {
        const p = path();
        if (p !== 'seguranca.html' && p !== 'termos.html') return;
        if (typeof ehLocador === 'function' && ehLocador()) {
            setText('.page-bar-sub', 'Conta locador');
        } else if (typeof ehMorador === 'function' && ehMorador()) {
            setText('.page-bar-sub', 'Conta morador');
        }
    }

    function personalizarPublicarEditar() {
        const p = path();
        if (p !== 'publicar-imovel.html' && p !== 'editar-anuncio.html') return;
        if (typeof ehMorador === 'function' && ehMorador()) {
            window.location.replace('home.html');
        }
    }

    function personalizarAgendar() {
        if (path() !== 'agendar-visita.html') return;
        if (typeof ehLocador === 'function' && ehLocador()) {
            window.location.replace('calendario-visitas.html');
        }
        setText('.page-bar h1', 'Agendar visita');
        setText('.page-bar-sub', 'Pedido enviado ao locador do anúncio');
    }

    function aplicar() {
        if (typeof estaLogado === 'function' && !estaLogado()) return;
        personalizarHome();
        personalizarMeusImoveis();
        personalizarCalendario();
        personalizarMensagens();
        personalizarPreferencias();
        personalizarPerfil();
        personalizarFavoritos();
        personalizarSegurancaTermos();
        personalizarPublicarEditar();
        personalizarAgendar();
    }

    window.RoomMatchPapelUi = { aplicar };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', aplicar);
    } else {
        aplicar();
    }
}());
