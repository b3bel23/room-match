/**
 * Interações da página Como funciona: papéis, accordion e match ao vivo.
 */
(function () {
    const IMOVEL_TAGS = ['Pet Friendly', 'Silêncio Noturno', 'Home Office'];

    function ativarPapel(papel) {
        const botoes = document.querySelectorAll('.cf-papel-btn');
        const paineis = {
            morador: document.getElementById('cf-painel-morador'),
            locador: document.getElementById('cf-painel-locador')
        };

        botoes.forEach((btn) => {
            const ativo = btn.dataset.papel === papel;
            btn.classList.toggle('ativo', ativo);
            btn.setAttribute('aria-selected', ativo ? 'true' : 'false');
        });

        Object.entries(paineis).forEach(([chave, painel]) => {
            if (!painel) return;
            const mostrar = chave === papel;
            painel.hidden = !mostrar;
            painel.setAttribute('aria-hidden', mostrar ? 'false' : 'true');
            painel.classList.toggle('ativo', mostrar);
        });
    }

    function ligarPapeis() {
        document.querySelectorAll('.cf-papel-btn').forEach((btn) => {
            btn.addEventListener('click', () => ativarPapel(btn.dataset.papel));
            btn.addEventListener('keydown', (evento) => {
                if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') return;
                evento.preventDefault();
                const outro = btn.dataset.papel === 'morador' ? 'locador' : 'morador';
                ativarPapel(outro);
                document.querySelector(`.cf-papel-btn[data-papel="${outro}"]`)?.focus();
            });
        });
    }

    function ligarAccordion() {
        document.querySelectorAll('.cf-steps').forEach((lista) => {
            lista.querySelectorAll('.cf-step-toggle').forEach((toggle) => {
                toggle.addEventListener('click', () => {
                    const step = toggle.closest('.cf-step');
                    const abrir = !step.classList.contains('aberto');
                    lista.querySelectorAll('.cf-step').forEach((s) => {
                        s.classList.remove('aberto');
                        s.querySelector('.cf-step-toggle')?.setAttribute('aria-expanded', 'false');
                    });
                    if (abrir) {
                        step.classList.add('aberto');
                        toggle.setAttribute('aria-expanded', 'true');
                    }
                });
            });
        });
    }

    function tagsUsuarioAtivas() {
        return [...document.querySelectorAll('#cf-tags-user .cf-tag.ativo')]
            .map((el) => el.dataset.tag);
    }

    function atualizarMatch() {
        const userTags = tagsUsuarioAtivas();
        const ring = document.getElementById('cf-match-ring');
        const num = document.getElementById('cf-match-num');
        const label = document.getElementById('cf-match-label');
        const imovelTags = document.querySelectorAll('.cf-tags-imovel .cf-tag');

        imovelTags.forEach((el) => {
            const comum = userTags.includes(el.textContent.trim());
            el.classList.toggle('comum', comum);
            el.classList.toggle('fixo', !comum);
        });

        let pct = 0;
        if (userTags.length) {
            const comuns = userTags.filter((t) => IMOVEL_TAGS.includes(t)).length;
            pct = Math.round((comuns / userTags.length) * 100);
        }

        if (ring) ring.style.setProperty('--match', String(pct));
        if (num) num.textContent = String(pct);
        if (label) {
            if (!userTags.length) {
                label.textContent = 'Escolha ao menos um hábito para calcular a afinidade.';
            } else if (pct >= 70) {
                label.textContent = 'Afinidade alta. A conversa pode ser liberada.';
            } else if (pct >= 40) {
                label.textContent = 'Afinidade média. Ajuste hábitos ou o mínimo aceito no perfil.';
            } else {
                label.textContent = 'Afinidade baixa. Poucos hábitos em comum com este anúncio.';
            }
        }
    }

    function ligarMatch() {
        document.querySelectorAll('#cf-tags-user .cf-tag').forEach((tag) => {
            tag.addEventListener('click', () => {
                tag.classList.toggle('ativo');
                atualizarMatch();
            });
        });
        atualizarMatch();
    }

    function ligarCopiar() {
        const feedback = document.getElementById('cf-copy-feedback');
        document.querySelectorAll('[data-copy]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const texto = btn.getAttribute('data-copy');
                try {
                    await navigator.clipboard.writeText(texto);
                    if (feedback) {
                        feedback.hidden = false;
                        feedback.textContent = `Copiado: ${texto}`;
                        window.setTimeout(() => { feedback.hidden = true; }, 2200);
                    }
                    const original = btn.textContent;
                    btn.textContent = 'Copiado!';
                    window.setTimeout(() => { btn.textContent = original; }, 1600);
                } catch (erro) {
                    if (feedback) {
                        feedback.hidden = false;
                        feedback.textContent = texto;
                    }
                }
            });
        });
    }

    function iniciar() {
        ligarPapeis();
        ligarAccordion();
        ligarMatch();
        ligarCopiar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
}());
