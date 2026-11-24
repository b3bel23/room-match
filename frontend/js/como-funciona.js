/**
 * Interações da página Como funciona: papéis, accordion e match ao vivo.
 * Movimento: entrada por rolagem, fotos com profundidade, linha do passo a
 * passo e afinidade que conta até o valor.
 */
(function () {
    const IMOVEL_TAGS = ['Aceita Animais', 'Silêncio Noturno', 'Trabalho em Casa'];
    const REDUZIDO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const COM_MOVIMENTO = !REDUZIDO && 'IntersectionObserver' in window;

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
            if (typeof RoomMatchTags !== 'undefined' && RoomMatchTags.matchPercent) {
                pct = RoomMatchTags.matchPercent(userTags, IMOVEL_TAGS);
            } else {
                const comuns = userTags.filter((t) => IMOVEL_TAGS.includes(t)).length;
                pct = Math.round((comuns / userTags.length) * 100);
            }
        }

        if (ring) ring.style.setProperty('--match', String(pct));
        if (num) num.textContent = String(pct);
        if (label) {
            if (!userTags.length) {
                label.textContent = 'Marque hábitos à esquerda: o que você busca precisa aparecer no anúncio; limites só falham se houver conflito.';
            } else if (userTags.length < 3) {
                label.textContent = `${pct}% — com 3 ou mais hábitos a afinidade fica mais justa e o chat com limiar alto fica mais realista.`;
            } else if (pct >= 70) {
                label.textContent = 'Afinidade alta — a conversa pode ser liberada.';
            } else if (pct >= 40) {
                label.textContent = 'Afinidade média — ajuste hábitos ou o mínimo aceito no perfil.';
            } else {
                label.textContent = 'Afinidade baixa: hábitos em falta ou conflito com o anúncio.';
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

    /* ---- Passo a passo: linha preenchida até o passo aberto ---- */

    function atualizarLinha(lista) {
        const passos = [...lista.querySelectorAll('.cf-step')];
        const aberto = passos.findIndex((p) => p.classList.contains('aberto'));
        passos.forEach((p, i) => p.classList.toggle('cf-adiante', aberto >= 0 && i > aberto));
        const alvo = aberto >= 0 ? passos[aberto].offsetTop + 30 : 0;
        lista.style.setProperty('--cf-progresso', `${alvo}px`);
    }

    // Enquanto um passo abre e outro fecha, a posição muda a cada quadro.
    function acompanharLinha(lista) {
        const inicio = performance.now();
        (function quadro(agora) {
            atualizarLinha(lista);
            if (agora - inicio < 450) window.requestAnimationFrame(quadro);
        }(inicio));
    }

    function ligarLinha() {
        const listas = [...document.querySelectorAll('.cf-steps')];
        const todas = () => listas.forEach(acompanharLinha);
        listas.forEach((lista) => lista.addEventListener('click', () => acompanharLinha(lista)));
        document.querySelectorAll('.cf-papel-btn').forEach((btn) => {
            btn.addEventListener('click', todas);
            btn.addEventListener('keydown', todas);
        });
        window.addEventListener('resize', todas);
        todas();
    }

    /* ---- Afinidade: número conta até o valor ---- */

    function contar(el, de, para) {
        window.cancelAnimationFrame(el.cfQuadro);
        if (REDUZIDO || de === para) {
            el.textContent = String(para);
            return;
        }
        const inicio = performance.now();
        (function quadro(agora) {
            const p = Math.min(1, (agora - inicio) / 700);
            const suave = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.round(de + (para - de) * suave));
            if (p < 1) el.cfQuadro = window.requestAnimationFrame(quadro);
        }(inicio));
    }

    function ligarAfinidade() {
        const ring = document.getElementById('cf-match-ring');
        const num = document.getElementById('cf-match-num');
        const board = document.querySelector('.cf-match-board');
        if (!ring || !num || !board) return;

        // O número que conta é só visual; o leitor de tela lê o valor final uma vez.
        const visual = document.createElement('span');
        visual.setAttribute('aria-hidden', 'true');
        visual.textContent = num.textContent;
        num.classList.add('cf-num-oculto');
        num.after(visual);

        const valor = () => Number(num.textContent) || 0;
        let mostrado = valor();
        let apresentado = !COM_MOVIMENTO;

        function mostrar() {
            const novo = valor();
            ring.style.setProperty('--match', String(novo));
            contar(visual, mostrado, novo);
            // O anel pulsa a cada toque, mesmo quando a porcentagem continua igual.
            if (!REDUZIDO) {
                ring.classList.remove('cf-pulso');
                void ring.offsetWidth;
                ring.classList.add('cf-pulso');
            }
            mostrado = novo;
        }

        document.querySelectorAll('#cf-tags-user .cf-tag').forEach((tag) => {
            tag.addEventListener('click', () => { if (apresentado) mostrar(); });
        });

        if (apresentado) return;

        // Antes de aparecer na tela o anel fica zerado; ao aparecer, enche até o valor.
        ring.style.setProperty('--match', '0');
        visual.textContent = '0';
        mostrado = 0;
        const observador = new IntersectionObserver((entradas) => {
            if (!entradas[0].isIntersecting) return;
            observador.disconnect();
            apresentado = true;
            window.setTimeout(mostrar, 250);
        }, { threshold: 0.25 });
        observador.observe(board);
    }

    /* ---- Blocos aparecem conforme a rolagem ---- */

    function ligarRevelar() {
        const grupos = [
            '.cf-section-head',
            '.cf-papel-btn',
            '.cf-match-board',
            '.cf-regras li',
            '.cf-cta-inner > *'
        ];
        const observador = new IntersectionObserver((entradas) => {
            entradas.forEach((entrada) => {
                if (!entrada.isIntersecting) return;
                const el = entrada.target;
                observador.unobserve(el);
                el.classList.add('cf-visivel');
                // Depois da entrada, o elemento volta às transições normais dele.
                window.setTimeout(() => {
                    el.classList.remove('cf-revela', 'cf-visivel');
                    el.style.removeProperty('--cf-atraso');
                }, 1400);
            });
        }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });

        grupos.forEach((seletor) => {
            const porPai = new Map();
            document.querySelectorAll(seletor).forEach((el) => {
                const ordem = porPai.get(el.parentElement) || 0;
                porPai.set(el.parentElement, ordem + 1);
                el.style.setProperty('--cf-atraso', `${ordem * 110}ms`);
                el.classList.add('cf-revela');
                observador.observe(el);
            });
        });
    }

    /* ---- Fotos do topo e do fim se movem mais devagar que a página ---- */

    function ligarProfundidade() {
        const fotos = [...document.querySelectorAll('.cf-hero, .cf-cta')];
        let agendado = false;

        function mover() {
            agendado = false;
            const altura = window.innerHeight;
            fotos.forEach((el) => {
                const r = el.getBoundingClientRect();
                if (r.bottom < 0 || r.top > altura) return;
                const centro = r.top + r.height / 2 - altura / 2;
                const limite = r.height * 0.13;
                const desloc = Math.max(-limite, Math.min(limite, centro * -0.12));
                el.style.setProperty('--cf-desloc', `${desloc.toFixed(1)}px`);
            });
        }

        function agendar() {
            if (agendado) return;
            agendado = true;
            window.requestAnimationFrame(mover);
        }

        window.addEventListener('scroll', agendar, { passive: true });
        window.addEventListener('resize', agendar);
        mover();
    }

    function iniciar() {
        ligarPapeis();
        ligarAccordion();
        ligarMatch();
        ligarCopiar();
        ligarLinha();
        ligarAfinidade();
        if (!COM_MOVIMENTO) return;
        document.documentElement.classList.add('cf-anima');
        ligarRevelar();
        ligarProfundidade();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
}());
