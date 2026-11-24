/**
 * Cidades da RMC (Campinas) + busca digitável para "cidade atual".
 */
(function (global) {
    const CIDADES_RMC = Object.freeze([
        'Americana',
        'Artur Nogueira',
        'Campinas',
        'Cosmópolis',
        'Engenheiro Coelho',
        'Holambra',
        'Hortolândia',
        'Indaiatuba',
        'Itatiba',
        'Jaguariúna',
        'Monte Mor',
        'Morungaba',
        'Nova Odessa',
        'Paulínia',
        'Pedreira',
        "Santa Bárbara d'Oeste",
        'Santo Antônio de Posse',
        'Sumaré',
        'Valinhos',
        'Vinhedo',
        'Jundiaí',
        'Limeira',
        'Piracicaba',
        'Rio Claro',
        'São Paulo',
    ]);

    function semAcento(texto) {
        return String(texto || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    /**
     * @param {HTMLElement} host
     * @param {HTMLInputElement} inputEl  input name=cidade_atual (visível)
     */
    function montarBusca(host, inputEl) {
        if (!host || !inputEl) return;

        host.replaceChildren();
        host.classList.add('cidade-busca', 'faculdade-busca');

        const uid = inputEl.id || 'cidade-atual';
        inputEl.classList.add('faculdade-busca-input');
        inputEl.placeholder = 'Digite ou selecione a cidade…';
        inputEl.setAttribute('role', 'combobox');
        inputEl.setAttribute('aria-autocomplete', 'list');
        inputEl.setAttribute('aria-controls', `${uid}-lista`);
        inputEl.setAttribute('aria-expanded', 'false');
        inputEl.setAttribute('aria-haspopup', 'listbox');
        inputEl.maxLength = Math.min(Number(inputEl.maxLength) || 100, 100);

        const campo = document.createElement('div');
        campo.className = 'faculdade-busca-campo';

        const seta = document.createElement('button');
        seta.type = 'button';
        seta.className = 'faculdade-busca-seta';
        seta.setAttribute('aria-label', 'Abrir lista de cidades');
        seta.tabIndex = -1;
        seta.innerHTML = '<span aria-hidden="true">▾</span>';

        const lista = document.createElement('div');
        lista.id = `${uid}-lista`;
        lista.className = 'faculdade-lista';
        lista.hidden = true;
        lista.setAttribute('role', 'listbox');
        lista.setAttribute('aria-label', 'Sugestões de cidade');

        campo.append(inputEl, seta, lista);
        host.append(campo);

        let aberta = false;
        let indiceAtivo = -1;
        let blurTimer = 0;

        function fecharLista() {
            aberta = false;
            lista.hidden = true;
            inputEl.setAttribute('aria-expanded', 'false');
            host.classList.remove('faculdade-busca--aberta');
            indiceAtivo = -1;
        }

        function abrirLista() {
            aberta = true;
            lista.hidden = false;
            inputEl.setAttribute('aria-expanded', 'true');
            host.classList.add('faculdade-busca--aberta');
        }

        function aplicar(valor) {
            inputEl.value = String(valor || '').slice(0, 100);
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
            fecharLista();
        }

        function appendItem(nome, opts) {
            const especial = Boolean(opts?.especial);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'faculdade-item';
            if (especial) btn.classList.add('faculdade-item--especial');
            btn.dataset.cidade = nome;
            btn.setAttribute('role', 'option');
            const ativo = especial
                ? !String(inputEl.value || '').trim()
                : semAcento(inputEl.value) === semAcento(nome);
            btn.classList.toggle('ativo', ativo);
            btn.setAttribute('aria-selected', ativo ? 'true' : 'false');
            const titulo = document.createElement('span');
            titulo.className = 'faculdade-item-titulo';
            titulo.textContent = opts?.rotulo || nome;
            btn.append(titulo);
            if (opts?.sub) {
                const sub = document.createElement('span');
                sub.className = 'faculdade-item-sub';
                sub.textContent = opts.sub;
                btn.append(sub);
            }
            lista.append(btn);
        }

        function pintar(filtro) {
            const q = semAcento(filtro).trim();
            lista.replaceChildren();

            if (!q || semAcento('limpar selecao').startsWith(q) || semAcento('limpar').startsWith(q)) {
                appendItem('', {
                    especial: true,
                    rotulo: 'Limpar seleção',
                    sub: 'Remove a cidade escolhida',
                });
            }

            const hits = CIDADES_RMC.filter((c) => !q || semAcento(c).includes(q));
            if (!hits.length && !lista.querySelector('.faculdade-item')) {
                const vazio = document.createElement('p');
                vazio.className = 'faculdade-lista-vazia';
                vazio.textContent = 'Nenhuma cidade na lista. Você pode manter o que digitou.';
                lista.append(vazio);
                indiceAtivo = -1;
                return;
            }
            hits.forEach((nome) => appendItem(nome));
            indiceAtivo = -1;
        }

        function marcarTeclado(i) {
            const itens = [...lista.querySelectorAll('.faculdade-item')];
            itens.forEach((el) => el.classList.remove('foco-teclado'));
            if (!itens.length) return;
            indiceAtivo = ((i % itens.length) + itens.length) % itens.length;
            const el = itens[indiceAtivo];
            el.classList.add('foco-teclado');
            el.scrollIntoView({ block: 'nearest' });
        }

        lista.addEventListener('mousedown', (ev) => ev.preventDefault());
        lista.addEventListener('click', (ev) => {
            const item = ev.target.closest('.faculdade-item');
            if (!item) return;
            aplicar(item.dataset.cidade ?? '');
        });

        seta.addEventListener('mousedown', (ev) => ev.preventDefault());
        seta.addEventListener('click', () => {
            if (aberta) {
                fecharLista();
                return;
            }
            pintar(inputEl.value);
            abrirLista();
            inputEl.focus();
        });

        inputEl.addEventListener('focus', () => {
            window.clearTimeout(blurTimer);
            pintar(inputEl.value);
            abrirLista();
        });

        inputEl.addEventListener('blur', () => {
            window.clearTimeout(blurTimer);
            blurTimer = window.setTimeout(() => {
                fecharLista();
                inputEl.value = String(inputEl.value || '').trim().slice(0, 100);
            }, 140);
        });

        let debounce = 0;
        inputEl.addEventListener('input', () => {
            window.clearTimeout(debounce);
            debounce = window.setTimeout(() => {
                pintar(inputEl.value);
                if (!aberta) abrirLista();
            }, 60);
        });

        inputEl.addEventListener('keydown', (ev) => {
            const itens = [...lista.querySelectorAll('.faculdade-item')];
            if (ev.key === 'Escape') {
                ev.preventDefault();
                fecharLista();
                return;
            }
            if (ev.key === 'ArrowDown') {
                ev.preventDefault();
                if (!aberta) {
                    pintar(inputEl.value);
                    abrirLista();
                }
                marcarTeclado(indiceAtivo + 1);
                return;
            }
            if (ev.key === 'ArrowUp') {
                ev.preventDefault();
                if (!aberta) {
                    pintar(inputEl.value);
                    abrirLista();
                }
                marcarTeclado(indiceAtivo <= 0 ? itens.length - 1 : indiceAtivo - 1);
                return;
            }
            if (ev.key === 'Enter' && aberta && itens.length) {
                ev.preventDefault();
                const alvo = indiceAtivo >= 0 ? itens[indiceAtivo] : itens[0];
                if (alvo) aplicar(alvo.dataset.cidade || '');
            }
        });

        document.addEventListener('click', (ev) => {
            if (!host.contains(ev.target)) fecharLista();
        });
    }

    global.RoomMatchCidadesRmc = {
        CIDADES_RMC,
        montarBusca,
    };
}(window));
