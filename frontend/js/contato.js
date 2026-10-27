(function () {
    const form = document.getElementById('contato-form');
    const retorno = document.getElementById('contato-retorno');
    const btn = form?.querySelector('button[type="submit"]');
    if (!form) return;

    const CHAVE = 'roommatch-suporte-tickets';

    function mostrar(texto, erro) {
        if (!retorno) return;
        retorno.hidden = false;
        retorno.textContent = texto;
        retorno.classList.toggle('erro', Boolean(erro));
    }

    function guardarTicket(ticket) {
        try {
            const lista = JSON.parse(localStorage.getItem(CHAVE) || '[]');
            lista.unshift(ticket);
            localStorage.setItem(CHAVE, JSON.stringify(lista.slice(0, 30)));
        } catch (erro) {
            /* ignore */
        }
    }

    form.addEventListener('submit', (evento) => {
        evento.preventDefault();
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const dados = {
            id: `sup-${Date.now()}`,
            em: new Date().toISOString(),
            nome: document.getElementById('contato-nome').value.trim(),
            email: document.getElementById('contato-email').value.trim(),
            assunto: document.getElementById('contato-assunto').value,
            mensagem: document.getElementById('contato-mensagem').value.trim()
        };

        if (btn) btn.disabled = true;
        guardarTicket(dados);
        mostrar(
            `Pedido ${dados.id} registrado. Retornaremos em ${dados.email}. Você também pode acompanhar pelo GitHub: github.com/silverwying/room-match/issues`,
            false
        );
        form.reset();
        if (btn) btn.disabled = false;
    });
}());
