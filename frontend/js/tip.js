/**
 * Tooltips: abre no clique/toque (útil no mobile) e fecha ao clicar fora.
 * Hover/focus já funciona via CSS em .tip.
 */
(function () {
    function painel(tip) {
        return tip.querySelector('.tip-panel');
    }

    function setAberto(tip, aberto) {
        tip.classList.toggle('aberto', aberto);
        const p = painel(tip);
        if (!p) return;
        p.setAttribute('aria-hidden', aberto ? 'false' : 'true');
        if (aberto) {
            p.removeAttribute('hidden');
            ajustarPosicao(tip);
        } else {
            p.setAttribute('hidden', '');
        }
    }

    function fecharTodos(exceto) {
        document.querySelectorAll('.tip.aberto').forEach((el) => {
            if (el !== exceto) setAberto(el, false);
        });
    }

    function ajustarPosicao(tip) {
        const p = painel(tip);
        if (!p) return;
        p.classList.remove('tip-baixo');
        const rect = p.getBoundingClientRect();
        if (rect.top < 8) p.classList.add('tip-baixo');
    }

    function iniciar() {
        document.querySelectorAll('.tip-panel').forEach((p) => {
            p.setAttribute('hidden', '');
            p.setAttribute('aria-hidden', 'true');
        });
    }

    document.addEventListener('click', (evento) => {
        const btn = evento.target.closest('.tip-btn');
        if (btn) {
            evento.preventDefault();
            const tip = btn.closest('.tip');
            const abrir = !tip.classList.contains('aberto');
            fecharTodos(tip);
            setAberto(tip, abrir);
            return;
        }
        if (!evento.target.closest('.tip')) fecharTodos();
    });

    document.addEventListener('mouseover', (evento) => {
        const tip = evento.target.closest('.tip');
        if (!tip || tip.classList.contains('aberto')) return;
        const p = painel(tip);
        if (p) {
            p.removeAttribute('hidden');
            p.setAttribute('aria-hidden', 'false');
            ajustarPosicao(tip);
        }
    });

    document.addEventListener('mouseout', (evento) => {
        const tip = evento.target.closest('.tip');
        if (!tip || tip.classList.contains('aberto')) return;
        if (tip.contains(evento.relatedTarget)) return;
        const p = painel(tip);
        if (p) {
            p.setAttribute('hidden', '');
            p.setAttribute('aria-hidden', 'true');
        }
    });

    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape') fecharTodos();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
}());
