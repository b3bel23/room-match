/**
 * Classificações brasileiras para cadastro de perfil.
 * - Ocupação: grandes grupos da CBO (Classificação Brasileira de Ocupações / MTE)
 * - Emprego: situação de vínculo (referência IBGE / PNAD Contínua)
 *
 * Valores estáveis (API); rótulos didáticos (UI).
 */
(function (global) {
    const OCUPACOES = Object.freeze([
        { valor: '', rotulo: 'Selecione a ocupação' },
        { valor: 'estudante', rotulo: 'Estudante' },
        { valor: 'estagiario', rotulo: 'Estagiário(a)' },
        { valor: 'cbo-0', rotulo: 'Forças Armadas, policiais e bombeiros militares' },
        { valor: 'cbo-1', rotulo: 'Dirigentes, gestores e membros do poder público' },
        { valor: 'cbo-2', rotulo: 'Profissionais das ciências e das artes' },
        { valor: 'cbo-3', rotulo: 'Técnicos de nível médio' },
        { valor: 'cbo-4', rotulo: 'Trabalhadores de serviços administrativos' },
        { valor: 'cbo-5', rotulo: 'Trabalhadores de serviços e comércio' },
        { valor: 'cbo-6', rotulo: 'Trabalhadores agropecuários, florestais e da pesca' },
        { valor: 'cbo-7', rotulo: 'Trabalhadores da indústria e da produção' },
        { valor: 'cbo-8', rotulo: 'Trabalhadores de manutenção e reparação' },
        { valor: 'aposentado', rotulo: 'Aposentado(a) ou pensionista' },
        { valor: 'sem-ocupacao', rotulo: 'Sem ocupação no momento' },
        { valor: 'outra', rotulo: 'Outra ocupação' }
    ]);

    const EMPREGOS = Object.freeze([
        { valor: '', rotulo: 'Selecione a situação de emprego' },
        { valor: 'clt', rotulo: 'Empregado(a) com carteira assinada (CLT)' },
        { valor: 'sem-carteira', rotulo: 'Empregado(a) sem carteira assinada' },
        { valor: 'servidor', rotulo: 'Servidor(a) público(a) / estatutário(a)' },
        { valor: 'militar', rotulo: 'Militar' },
        { valor: 'autonomo', rotulo: 'Conta própria, autônomo(a) ou MEI' },
        { valor: 'empregador', rotulo: 'Empregador(a)' },
        { valor: 'estagio', rotulo: 'Estágio remunerado' },
        { valor: 'bolsista', rotulo: 'Bolsista ou pesquisador(a)' },
        { valor: 'familiar', rotulo: 'Trabalho familiar não remunerado' },
        { valor: 'desempregado', rotulo: 'Desempregado(a)' },
        { valor: 'estudante-sem-vinculo', rotulo: 'Estudante sem vínculo empregatício' },
        { valor: 'aposentado', rotulo: 'Aposentado(a) ou pensionista' },
        { valor: 'outro', rotulo: 'Outra situação' }
    ]);

    /** Mapeia textos livres antigos → valor do catálogo. */
    function normalizarOcupacao(texto) {
        const t = String(texto || '').trim().toLowerCase();
        if (!t) return '';
        const direto = OCUPACOES.find((o) => o.valor && o.valor === t);
        if (direto) return direto.valor;
        if (t.includes('estud')) return 'estudante';
        if (t.includes('estag')) return 'estagiario';
        if (t.includes('aposent') || t.includes('pension')) return 'aposentado';
        if (t.includes('profission') || t.includes('cient') || t.includes('arte')) return 'cbo-2';
        if (t.includes('tecnic')) return 'cbo-3';
        if (t.includes('administ') || t.includes('escrit')) return 'cbo-4';
        if (t.includes('comerc') || t.includes('venda') || t.includes('servi')) return 'cbo-5';
        if (t.includes('dirig') || t.includes('gestor') || t.includes('empres')) return 'cbo-1';
        if (t.includes('militar') || t.includes('policia') || t.includes('bombeiro')) return 'cbo-0';
        if (t.includes('industr') || t.includes('produ')) return 'cbo-7';
        if (t.includes('manuten') || t.includes('repar')) return 'cbo-8';
        if (t.includes('agro') || t.includes('pesca') || t.includes('florest')) return 'cbo-6';
        if (t.includes('sem ') || t.includes('desemp')) return 'sem-ocupacao';
        return OCUPACOES.some((o) => o.valor === t) ? t : 'outra';
    }

    function normalizarEmprego(texto) {
        const t = String(texto || '').trim().toLowerCase();
        if (!t) return '';
        const direto = EMPREGOS.find((o) => o.valor && o.valor === t);
        if (direto) return direto.valor;
        if (t.includes('clt') || t.includes('carteira')) return 'clt';
        if (t.includes('sem carteira')) return 'sem-carteira';
        if (t.includes('servidor') || t.includes('estatut') || t.includes('público') || t.includes('publico')) {
            return 'servidor';
        }
        if (t.includes('militar')) return 'militar';
        if (t.includes('autônom') || t.includes('autonom') || t.includes('mei') || t.includes('conta própria') || t.includes('conta propria') || t.includes('aluguel')) {
            return 'autonomo';
        }
        if (t.includes('empregador') || t.includes('dono')) return 'empregador';
        if (t.includes('estágio') || t.includes('estagio')) return 'estagio';
        if (t.includes('bols') || t.includes('pesquis')) return 'bolsista';
        if (t.includes('familiar')) return 'familiar';
        if (t.includes('desemp')) return 'desempregado';
        if (t.includes('estud')) return 'estudante-sem-vinculo';
        if (t.includes('aposent') || t.includes('pension')) return 'aposentado';
        return EMPREGOS.some((o) => o.valor === t) ? t : 'outro';
    }

    function preencherSelect(selectEl, tipo, valorAtual) {
        if (!selectEl) return;
        const lista = tipo === 'emprego' ? EMPREGOS : OCUPACOES;
        const normalizar = tipo === 'emprego' ? normalizarEmprego : normalizarOcupacao;
        const escolhido = normalizar(valorAtual);

        selectEl.replaceChildren();
        lista.forEach((item) => {
            const opt = new Option(item.rotulo, item.valor);
            selectEl.append(opt);
        });
        if (escolhido && [...selectEl.options].some((o) => o.value === escolhido)) {
            selectEl.value = escolhido;
        } else {
            selectEl.value = '';
        }
    }

    global.RoomMatchClassificacoes = {
        OCUPACOES,
        EMPREGOS,
        normalizarOcupacao,
        normalizarEmprego,
        preencherSelect
    };
}(window));
