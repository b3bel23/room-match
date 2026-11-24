/**
 * Ocupação e situação de emprego — chips rápidos + valores estáveis (API).
 * Compatível com cadastros antigos (CBO / PNAD).
 */
(function (global) {
    const ICO = {
        estudante: '<path d="M3 9l9-4 9 4-9 4-9-4z"/><path d="M7 11.5V16c2 1.5 6 1.5 8 0v-4.5"/>',
        estagio: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h5"/>',
        profissional: '<circle cx="12" cy="8" r="3"/><path d="M5 20c1.2-3.5 3.8-5 7-5s5.8 1.5 7 5"/>',
        escritorio: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 22h10M12 18v4"/>',
        vendas: '<path d="M4 7h12l2 4H6z"/><path d="M6 11v8h10v-8M9 15h2"/>',
        tecnico: '<path d="M14.5 4.5l5 5-9 9H5.5v-5z"/><path d="M12 7l5 5"/>',
        gestao: '<path d="M4 18V8l4-3 4 3v10"/><path d="M12 10h8v8H12"/>',
        industria: '<path d="M3 20V9l5 3V9l5 3V6l5 3v11z"/>',
        manutencao: '<path d="M14 5a4 4 0 0 1 5 5l-8.5 8.5H6v-4.5z"/>',
        agro: '<path d="M5 19c3-8 11-12 15-12-1 7-5 13-9 15-2.5-1.5-5-4-6-3z"/>',
        seguranca: '<path d="M12 3l8 4v5c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V7z"/>',
        aposentado: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
        vazio: '<circle cx="12" cy="12" r="8"/><path d="M8 12h8"/>',
        outra: '<circle cx="12" cy="12" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
        clt: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
        semCarteira: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M4 4l16 16"/>',
        autonomo: '<circle cx="12" cy="8" r="3"/><path d="M6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1M16 6l3 2-3 2"/>',
        soEstudo: '<path d="M4 19h16M6 19V9l6-3 6 3v10"/>',
        desempregado: '<circle cx="12" cy="8" r="3"/><path d="M5 20c1-3 3.5-5 7-5s6 2 7 5M8 12l8 4M16 12l-8 4"/>',
        servidor: '<path d="M4 20h16M6 20V10l6-4 6 4v10"/><path d="M10 20v-5h4v5"/>',
        bolsa: '<path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
        empregador: '<path d="M3 20V9l5 3V9l5 3V6l5 3v11z"/><path d="M10 20v-4h4v4"/>',
        militar: '<path d="M12 3l2.5 5H20l-4 3.5L18 18l-6-3.5L6 18l2-6.5L4 8h5.5z"/>',
        familiar: '<path d="M8 18c0-2.5 1.8-4 4-4s4 1.5 4 4"/><circle cx="12" cy="9" r="2.5"/><path d="M5 20c.4-2 1.6-3.2 3.2-3.5M19 20c-.4-2-1.6-3.2-3.2-3.5"/>',
    };

    function svg(chave) {
        const inner = ICO[chave] || ICO.outra;
        return (
            '<svg class="escolha-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            + 'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            + inner
            + '</svg>'
        );
    }

    /** destaque: aparece na grade rápida (1 toque). */
    const OCUPACOES = Object.freeze([
        { valor: '', rotulo: 'Não informar', curto: 'Não informar', ico: 'vazio', destaque: true },
        { valor: 'estudante', rotulo: 'Estudante', curto: 'Estudante', ico: 'estudante', destaque: true },
        { valor: 'estagiario', rotulo: 'Estagiário(a)', curto: 'Estágio', ico: 'estagio', destaque: true },
        {
            valor: 'cbo-2',
            rotulo: 'Profissional (saúde, TI, educação, artes…)',
            curto: 'Profissional',
            ico: 'profissional',
            destaque: true,
        },
        {
            valor: 'cbo-5',
            rotulo: 'Vendas, atendimento ou serviços',
            curto: 'Vendas / serviços',
            ico: 'vendas',
            destaque: true,
        },
        {
            valor: 'cbo-4',
            rotulo: 'Escritório / administrativo',
            curto: 'Escritório',
            ico: 'escritorio',
            destaque: true,
        },
        { valor: 'sem-ocupacao', rotulo: 'Sem ocupação no momento', curto: 'Sem ocupação', ico: 'vazio', destaque: true },
        { valor: 'cbo-3', rotulo: 'Técnico(a) de nível médio', curto: 'Técnico(a)', ico: 'tecnico' },
        { valor: 'cbo-1', rotulo: 'Gestão ou cargo de chefia', curto: 'Gestão', ico: 'gestao' },
        { valor: 'cbo-7', rotulo: 'Indústria ou produção', curto: 'Indústria', ico: 'industria' },
        { valor: 'cbo-8', rotulo: 'Manutenção ou reparos', curto: 'Manutenção', ico: 'manutencao' },
        { valor: 'cbo-6', rotulo: 'Campo, agro ou pesca', curto: 'Agro', ico: 'agro' },
        { valor: 'cbo-0', rotulo: 'Forças armadas / segurança', curto: 'Segurança', ico: 'seguranca' },
        { valor: 'aposentado', rotulo: 'Aposentado(a)', curto: 'Aposentado(a)', ico: 'aposentado' },
        { valor: 'outra', rotulo: 'Outra', curto: 'Outra', ico: 'outra' },
    ]);

    const EMPREGOS = Object.freeze([
        { valor: '', rotulo: 'Não informar', curto: 'Não informar', ico: 'vazio', destaque: true },
        { valor: 'clt', rotulo: 'CLT (carteira assinada)', curto: 'CLT', ico: 'clt', destaque: true },
        { valor: 'estagio', rotulo: 'Estágio', curto: 'Estágio', ico: 'estagio', destaque: true },
        {
            valor: 'estudante-sem-vinculo',
            rotulo: 'Só estudo (sem emprego)',
            curto: 'Só estudo',
            ico: 'soEstudo',
            destaque: true,
        },
        { valor: 'autonomo', rotulo: 'Autônomo(a) ou MEI', curto: 'Autônomo / MEI', ico: 'autonomo', destaque: true },
        { valor: 'desempregado', rotulo: 'Desempregado(a)', curto: 'Desempregado(a)', ico: 'desempregado', destaque: true },
        { valor: 'bolsista', rotulo: 'Bolsa ou pesquisa', curto: 'Bolsa', ico: 'bolsa', destaque: true },
        { valor: 'sem-carteira', rotulo: 'Trabalho sem carteira', curto: 'Sem carteira', ico: 'semCarteira' },
        { valor: 'servidor', rotulo: 'Servidor(a) público(a)', curto: 'Servidor(a)', ico: 'servidor' },
        { valor: 'empregador', rotulo: 'Empregador(a) / dono(a)', curto: 'Empregador(a)', ico: 'empregador' },
        { valor: 'militar', rotulo: 'Militar', curto: 'Militar', ico: 'militar' },
        { valor: 'aposentado', rotulo: 'Aposentado(a)', curto: 'Aposentado(a)', ico: 'aposentado' },
        { valor: 'familiar', rotulo: 'Trabalho familiar (sem salário)', curto: 'Familiar', ico: 'familiar' },
        { valor: 'outro', rotulo: 'Outra', curto: 'Outra', ico: 'outra' },
    ]);

    function listaDoTipo(tipo) {
        return tipo === 'emprego' ? EMPREGOS : OCUPACOES;
    }

    /** Mapeia textos livres antigos → valor do catálogo. */
    function normalizarOcupacao(texto) {
        const t = String(texto || '').trim().toLowerCase();
        if (!t) return '';
        const direto = OCUPACOES.find((o) => o.valor && o.valor === t);
        if (direto) return direto.valor;
        if (t.includes('estud')) return 'estudante';
        if (t.includes('estag')) return 'estagiario';
        if (t.includes('aposent') || t.includes('pension')) return 'aposentado';
        if (t.includes('profission') || t.includes('cient') || t.includes('arte')
            || t.includes('saúde') || t.includes('saude') || t.includes('ti')
            || t.includes('educa')) return 'cbo-2';
        if (t.includes('tecnic')) return 'cbo-3';
        if (t.includes('administ') || t.includes('escrit')) return 'cbo-4';
        if (t.includes('comerc') || t.includes('venda') || t.includes('servi')
            || t.includes('atend')) return 'cbo-5';
        if (t.includes('dirig') || t.includes('gestor') || t.includes('empres')
            || t.includes('chef')) return 'cbo-1';
        if (t.includes('militar') || t.includes('policia') || t.includes('bombeiro')
            || t.includes('segura')) return 'cbo-0';
        if (t.includes('industr') || t.includes('produ')) return 'cbo-7';
        if (t.includes('manuten') || t.includes('repar')) return 'cbo-8';
        if (t.includes('agro') || t.includes('pesca') || t.includes('florest')
            || t.includes('campo')) return 'cbo-6';
        if (t.includes('sem ') || t.includes('desemp')) return 'sem-ocupacao';
        return OCUPACOES.some((o) => o.valor === t) ? t : 'outra';
    }

    function normalizarEmprego(texto) {
        const t = String(texto || '').trim().toLowerCase();
        if (!t) return '';
        const direto = EMPREGOS.find((o) => o.valor && o.valor === t);
        if (direto) return direto.valor;
        if (t.includes('clt') || (t.includes('carteira') && !t.includes('sem'))) return 'clt';
        if (t.includes('sem carteira')) return 'sem-carteira';
        if (t.includes('servidor') || t.includes('estatut') || t.includes('público') || t.includes('publico')) {
            return 'servidor';
        }
        if (t.includes('militar')) return 'militar';
        if (t.includes('autônom') || t.includes('autonom') || t.includes('mei')
            || t.includes('conta própria') || t.includes('conta propria')) {
            return 'autonomo';
        }
        if (t.includes('empregador') || t.includes('dono')) return 'empregador';
        if (t.includes('estágio') || t.includes('estagio')) return 'estagio';
        if (t.includes('bols') || t.includes('pesquis')) return 'bolsista';
        if (t.includes('familiar')) return 'familiar';
        if (t.includes('desemp')) return 'desempregado';
        if (t.includes('só estudo') || t.includes('so estudo') || t.includes('estud')) {
            return 'estudante-sem-vinculo';
        }
        if (t.includes('aposent') || t.includes('pension')) return 'aposentado';
        return EMPREGOS.some((o) => o.valor === t) ? t : 'outro';
    }

    function preencherSelect(selectEl, tipo, valorAtual) {
        if (!selectEl) return;
        const lista = listaDoTipo(tipo);
        const normalizar = tipo === 'emprego' ? normalizarEmprego : normalizarOcupacao;
        const escolhido = normalizar(valorAtual);

        selectEl.replaceChildren();
        lista.forEach((item) => {
            selectEl.append(new Option(item.rotulo, item.valor));
        });
        if (escolhido && [...selectEl.options].some((o) => o.value === escolhido)) {
            selectEl.value = escolhido;
        } else if (!escolhido) {
            selectEl.value = '';
        } else {
            selectEl.value = '';
        }
    }

    function criarChip(item, name) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'escolha-chip';
        btn.dataset.valor = item.valor;
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', 'false');
        btn.title = item.rotulo;
        btn.innerHTML = (
            '<span class="escolha-chip-ico">' + svg(item.ico) + '</span>'
            + '<span class="escolha-chip-texto">'
            + '<span class="escolha-chip-curto"></span>'
            + '</span>'
        );
        btn.querySelector('.escolha-chip-curto').textContent = item.curto || item.rotulo;
        if (name) btn.setAttribute('data-grupo', name);
        return btn;
    }

    /**
     * UI de chips sincronizada a um <select> (mesmo name/value no form).
     * @param {HTMLElement} host
     * @param {HTMLSelectElement} selectEl
     * @param {'ocupacao'|'emprego'} tipo
     * @param {string} [valorAtual]
     */
    function montarEscolha(host, selectEl, tipo, valorAtual) {
        if (!host || !selectEl) return;
        preencherSelect(selectEl, tipo, valorAtual);
        selectEl.classList.add('escolha-select-sync');
        selectEl.setAttribute('aria-hidden', 'true');
        selectEl.tabIndex = -1;

        const lista = listaDoTipo(tipo);
        const rapidas = lista.filter((o) => o.destaque);
        const extras = lista.filter((o) => o.valor && !o.destaque);
        const name = selectEl.name || tipo;

        host.replaceChildren();
        host.classList.add('escolha-chips');
        host.setAttribute('role', 'radiogroup');
        host.setAttribute(
            'aria-label',
            tipo === 'emprego' ? 'Situação de emprego' : 'Ocupação'
        );

        const gradeRapida = document.createElement('div');
        gradeRapida.className = 'escolha-grade';
        rapidas.forEach((item) => gradeRapida.append(criarChip(item, name)));
        host.append(gradeRapida);

        let gradeExtra = null;
        let btnMais = null;
        if (extras.length) {
            btnMais = document.createElement('button');
            btnMais.type = 'button';
            btnMais.className = 'escolha-mais';
            btnMais.setAttribute('aria-expanded', 'false');
            btnMais.textContent = 'Mais opções';

            gradeExtra = document.createElement('div');
            gradeExtra.className = 'escolha-grade escolha-grade-extra';
            gradeExtra.hidden = true;
            extras.forEach((item) => gradeExtra.append(criarChip(item, name)));

            btnMais.addEventListener('click', () => {
                const aberto = gradeExtra.hidden;
                gradeExtra.hidden = !aberto;
                btnMais.setAttribute('aria-expanded', aberto ? 'true' : 'false');
                btnMais.textContent = aberto ? 'Menos opções' : 'Mais opções';
                if (aberto) {
                    const ativo = gradeExtra.querySelector('.escolha-chip.ativo');
                    (ativo || gradeExtra.querySelector('.escolha-chip'))?.focus();
                }
            });

            host.append(btnMais, gradeExtra);
        }

        function sincronizar() {
            const atual = selectEl.value;
            host.querySelectorAll('.escolha-chip').forEach((chip) => {
                const on = chip.dataset.valor === atual;
                chip.classList.toggle('ativo', on);
                chip.setAttribute('aria-checked', on ? 'true' : 'false');
            });
            // Se o valor está só em "mais opções", abre o painel.
            if (gradeExtra && atual && extras.some((e) => e.valor === atual) && gradeExtra.hidden) {
                gradeExtra.hidden = false;
                if (btnMais) {
                    btnMais.setAttribute('aria-expanded', 'true');
                    btnMais.textContent = 'Menos opções';
                }
            }
        }

        host.addEventListener('click', (ev) => {
            const chip = ev.target.closest('.escolha-chip');
            if (!chip || !host.contains(chip)) return;
            selectEl.value = chip.dataset.valor;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            sincronizar();
        });

        selectEl.addEventListener('change', sincronizar);
        sincronizar();
    }

    global.RoomMatchClassificacoes = {
        OCUPACOES,
        EMPREGOS,
        normalizarOcupacao,
        normalizarEmprego,
        preencherSelect,
        montarEscolha,
    };
}(window));
