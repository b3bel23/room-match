/**
 * Universidades com atuação no estado de São Paulo, divididas por campus.
 * Fonte de referência: Cadastro e-MEC (MEC) + campi oficiais das IES, UF SP.
 * Lista estática para o front (sem consulta ao e-MEC em runtime).
 * Valores estáveis (API); rótulos didáticos (UI).
 */
(function (global) {
    /** @type {{ id: string, nome: string, campi: { valor: string, rotulo: string }[] }[]} */
    const GRUPOS = Object.freeze([
        {
            id: 'ufabc',
            nome: 'UFABC — Universidade Federal do ABC',
            campi: [
                { valor: 'ufabc-santo-andre', rotulo: 'Campus Santo André' },
                { valor: 'ufabc-sao-bernardo', rotulo: 'Campus São Bernardo do Campo' }
            ]
        },
        {
            id: 'ufscar',
            nome: 'UFSCar — Universidade Federal de São Carlos',
            campi: [
                { valor: 'ufscar-sao-carlos', rotulo: 'Campus São Carlos (sede)' },
                { valor: 'ufscar-araras', rotulo: 'Campus Araras' },
                { valor: 'ufscar-sorocaba', rotulo: 'Campus Sorocaba' },
                { valor: 'ufscar-lagoa-do-sino', rotulo: 'Campus Lagoa do Sino (Buri)' }
            ]
        },
        {
            id: 'unifesp',
            nome: 'UNIFESP — Universidade Federal de São Paulo',
            campi: [
                { valor: 'unifesp-sao-paulo', rotulo: 'Campus São Paulo (Vila Clementino)' },
                { valor: 'unifesp-baixada-santista', rotulo: 'Campus Baixada Santista (Santos)' },
                { valor: 'unifesp-diadema', rotulo: 'Campus Diadema' },
                { valor: 'unifesp-guarulhos', rotulo: 'Campus Guarulhos' },
                { valor: 'unifesp-osasco', rotulo: 'Campus Osasco' },
                { valor: 'unifesp-sjc', rotulo: 'Campus São José dos Campos' },
                { valor: 'unifesp-zona-leste', rotulo: 'Campus Zona Leste (São Paulo)' }
            ]
        },
        {
            id: 'unicamp',
            nome: 'UNICAMP — Universidade Estadual de Campinas',
            campi: [
                { valor: 'unicamp-campinas', rotulo: 'Campus Campinas (Cidade Universitária Zeferino Vaz)' },
                { valor: 'unicamp-limeira', rotulo: 'Campus Limeira (Faculdade de Tecnologia)' },
                { valor: 'unicamp-piracicaba', rotulo: 'Campus Piracicaba (FOP)' }
            ]
        },
        {
            id: 'unesp',
            nome: 'UNESP — Universidade Estadual Paulista “Júlio de Mesquita Filho”',
            campi: [
                { valor: 'unesp-aracatuba', rotulo: 'Campus Araçatuba' },
                { valor: 'unesp-araraquara', rotulo: 'Campus Araraquara' },
                { valor: 'unesp-assis', rotulo: 'Campus Assis' },
                { valor: 'unesp-bauru', rotulo: 'Campus Bauru' },
                { valor: 'unesp-botucatu', rotulo: 'Campus Botucatu' },
                { valor: 'unesp-dracena', rotulo: 'Campus Dracena' },
                { valor: 'unesp-franca', rotulo: 'Campus Franca' },
                { valor: 'unesp-guaratingueta', rotulo: 'Campus Guaratinguetá' },
                { valor: 'unesp-ilha-solteira', rotulo: 'Campus Ilha Solteira' },
                { valor: 'unesp-itapeva', rotulo: 'Campus Itapeva' },
                { valor: 'unesp-jaboticabal', rotulo: 'Campus Jaboticabal' },
                { valor: 'unesp-marilia', rotulo: 'Campus Marília' },
                { valor: 'unesp-ourinhos', rotulo: 'Campus Ourinhos' },
                { valor: 'unesp-presidente-prudente', rotulo: 'Campus Presidente Prudente' },
                { valor: 'unesp-registro', rotulo: 'Campus Registro' },
                { valor: 'unesp-rio-claro', rotulo: 'Campus Rio Claro' },
                { valor: 'unesp-rosana', rotulo: 'Campus Rosana' },
                { valor: 'unesp-sj-boa-vista', rotulo: 'Campus São João da Boa Vista' },
                { valor: 'unesp-sj-rio-preto', rotulo: 'Campus São José do Rio Preto' },
                { valor: 'unesp-sjc', rotulo: 'Campus São José dos Campos' },
                { valor: 'unesp-sao-paulo', rotulo: 'Campus São Paulo' },
                { valor: 'unesp-sao-vicente', rotulo: 'Campus São Vicente' },
                { valor: 'unesp-sorocaba', rotulo: 'Campus Sorocaba' },
                { valor: 'unesp-tupa', rotulo: 'Campus Tupã' }
            ]
        },
        {
            id: 'univesp',
            nome: 'UNIVESP — Universidade Virtual do Estado de São Paulo',
            campi: [
                { valor: 'univesp-ead', rotulo: 'Polos EaD em São Paulo (ensino a distância)' }
            ]
        },
        {
            id: 'usp',
            nome: 'USP — Universidade de São Paulo',
            campi: [
                { valor: 'usp-cidade-universitaria', rotulo: 'Cidade Universitária (Butantã, São Paulo)' },
                { valor: 'usp-leste', rotulo: 'USP Leste — EACH (São Paulo)' },
                { valor: 'usp-ribeirao-preto', rotulo: 'Campus Ribeirão Preto' },
                { valor: 'usp-sao-carlos', rotulo: 'Campus São Carlos' },
                { valor: 'usp-piracicaba', rotulo: 'Campus Piracicaba (ESALQ)' },
                { valor: 'usp-bauru', rotulo: 'Campus Bauru' },
                { valor: 'usp-pirassununga', rotulo: 'Campus Pirassununga' },
                { valor: 'usp-lorena', rotulo: 'Campus Lorena' },
                { valor: 'usp-santos', rotulo: 'Campus Santos' }
            ]
        },
        {
            id: 'uscs',
            nome: 'USCS — Universidade Municipal de São Caetano do Sul',
            campi: [
                { valor: 'uscs-centro', rotulo: 'Campus Centro (São Caetano do Sul)' },
                { valor: 'uscs-conceicao', rotulo: 'Campus Conceição (São Caetano do Sul)' }
            ]
        },
        {
            id: 'mackenzie',
            nome: 'Mackenzie — Universidade Presbiteriana Mackenzie',
            campi: [
                { valor: 'mackenzie-higienopolis', rotulo: 'Campus Higienópolis (São Paulo)' },
                { valor: 'mackenzie-alphaville', rotulo: 'Campus Alphaville (Barueri)' },
                { valor: 'mackenzie-campinas', rotulo: 'Campus Campinas' }
            ]
        },
        {
            id: 'puc-campinas',
            nome: 'PUC-Campinas — Pontifícia Universidade Católica de Campinas',
            campi: [
                { valor: 'puc-campinas-campus1', rotulo: 'Campus I — Central (Campinas)' },
                { valor: 'puc-campinas-campus2', rotulo: 'Campus II (Campinas)' }
            ]
        },
        {
            id: 'puc-sp',
            nome: 'PUC-SP — Pontifícia Universidade Católica de São Paulo',
            campi: [
                { valor: 'puc-sp-monte-alegre', rotulo: 'Campus Monte Alegre (Perdizes, São Paulo)' },
                { valor: 'puc-sp-consolacao', rotulo: 'Campus Consolação (São Paulo)' },
                { valor: 'puc-sp-santana', rotulo: 'Campus Santana (São Paulo)' },
                { valor: 'puc-sp-sorocaba', rotulo: 'Campus Sorocaba' }
            ]
        },
        {
            id: 'unaerp',
            nome: 'UNAERP — Universidade de Ribeirão Preto',
            campi: [
                { valor: 'unaerp-ribeirao-preto', rotulo: 'Campus Ribeirão Preto' },
                { valor: 'unaerp-guarujá', rotulo: 'Campus Guarujá' }
            ]
        },
        {
            id: 'unasp',
            nome: 'UNASP — Universidade Adventista de São Paulo',
            campi: [
                { valor: 'unasp-sao-paulo', rotulo: 'Campus São Paulo' },
                { valor: 'unasp-engenharia', rotulo: 'Campus Engenheiro Coelho' },
                { valor: 'unasp-ht', rotulo: 'Campus Hortolândia' }
            ]
        },
        {
            id: 'anhembi-morumbi',
            nome: 'Universidade Anhembi Morumbi',
            campi: [
                { valor: 'anhembi-morumbi-vila-olimpia', rotulo: 'Campus Vila Olímpia (São Paulo)' },
                { valor: 'anhembi-morumbi-mooca', rotulo: 'Campus Mooca (São Paulo)' },
                { valor: 'anhembi-morumbi-paulista', rotulo: 'Campus Paulista (São Paulo)' },
                { valor: 'anhembi-morumbi-sao-jose', rotulo: 'Campus São José dos Campos' }
            ]
        },
        {
            id: 'universidade-brasil',
            nome: 'Universidade Brasil',
            campi: [
                { valor: 'universidade-brasil-sp', rotulo: 'Campi em São Paulo' }
            ]
        },
        {
            id: 'braz-cubas',
            nome: 'Universidade Braz Cubas',
            campi: [
                { valor: 'braz-cubas-mogi', rotulo: 'Campus Mogi das Cruzes' }
            ]
        },
        {
            id: 'unisantos',
            nome: 'UNISANTOS — Universidade Católica de Santos',
            campi: [
                { valor: 'unisantos-santos', rotulo: 'Campus Santos' }
            ]
        },
        {
            id: 'unicid',
            nome: 'UNICID — Universidade Cidade de São Paulo',
            campi: [
                { valor: 'unicid-tatuape', rotulo: 'Campus Tatuapé (São Paulo)' },
                { valor: 'unicid-pinheiros', rotulo: 'Campus Pinheiros (São Paulo)' },
                { valor: 'unicid-cesar', rotulo: 'Campus Cesário (São Paulo)' }
            ]
        },
        {
            id: 'cruzeiro-do-sul',
            nome: 'Universidade Cruzeiro do Sul',
            campi: [
                { valor: 'cruzeiro-do-sul-sao-miguel', rotulo: 'Campus São Miguel Paulista (São Paulo)' },
                { valor: 'cruzeiro-do-sul-liberdade', rotulo: 'Campus Liberdade (São Paulo)' },
                { valor: 'cruzeiro-do-sul-santo-amaro', rotulo: 'Campus Santo Amaro (São Paulo)' }
            ]
        },
        {
            id: 'unifran',
            nome: 'UNIFRAN — Universidade de Franca',
            campi: [
                { valor: 'unifran-franca', rotulo: 'Campus Franca' }
            ]
        },
        {
            id: 'unimar',
            nome: 'UNIMAR — Universidade de Marília',
            campi: [
                { valor: 'unimar-marilia', rotulo: 'Campus Marília' }
            ]
        },
        {
            id: 'umc',
            nome: 'UMC — Universidade de Mogi das Cruzes',
            campi: [
                { valor: 'umc-mogi', rotulo: 'Campus Mogi das Cruzes' },
                { valor: 'umc-villa-lobos', rotulo: 'Campus Villa Lobos (São Paulo)' }
            ]
        },
        {
            id: 'unisa',
            nome: 'UNISA — Universidade de Santo Amaro',
            campi: [
                { valor: 'unisa-santo-amaro', rotulo: 'Campus Santo Amaro (São Paulo)' }
            ]
        },
        {
            id: 'uniso',
            nome: 'UNISO — Universidade de Sorocaba',
            campi: [
                { valor: 'uniso-sorocaba', rotulo: 'Campus Sorocaba' }
            ]
        },
        {
            id: 'unitau',
            nome: 'UNITAU — Universidade de Taubaté',
            campi: [
                { valor: 'unitau-taubate', rotulo: 'Campus Taubaté' }
            ]
        },
        {
            id: 'unoeste',
            nome: 'UNOESTE — Universidade do Oeste Paulista',
            campi: [
                { valor: 'unoeste-presidente-prudente', rotulo: 'Campus Presidente Prudente' },
                { valor: 'unoeste-guarujá', rotulo: 'Campus Guarujá' },
                { valor: 'unoeste-jaú', rotulo: 'Campus Jaú' }
            ]
        },
        {
            id: 'ibirapuera',
            nome: 'Universidade Ibirapuera',
            campi: [
                { valor: 'ibirapuera-chacara', rotulo: 'Campus Chácara Flora (São Paulo)' }
            ]
        },
        {
            id: 'umesp',
            nome: 'UMESP — Universidade Metodista de São Paulo',
            campi: [
                { valor: 'umesp-rudge-ramos', rotulo: 'Campus Rudge Ramos (São Bernardo do Campo)' },
                { valor: 'umesp-centro', rotulo: 'Campus Centro (São Bernardo do Campo)' }
            ]
        },
        {
            id: 'unimes',
            nome: 'UNIMES — Universidade Metropolitana de Santos',
            campi: [
                { valor: 'unimes-santos', rotulo: 'Campus Santos' }
            ]
        },
        {
            id: 'uninove',
            nome: 'UNINOVE — Universidade Nove de Julho',
            campi: [
                { valor: 'uninove-memorial', rotulo: 'Campus Memorial (São Paulo)' },
                { valor: 'uninove-vila-maria', rotulo: 'Campus Vila Maria (São Paulo)' },
                { valor: 'uninove-santo-amaro', rotulo: 'Campus Santo Amaro (São Paulo)' },
                { valor: 'uninove-vergueiro', rotulo: 'Campus Vergueiro (São Paulo)' },
                { valor: 'uninove-barra-funda', rotulo: 'Campus Barra Funda (São Paulo)' },
                { valor: 'uninove-sbc', rotulo: 'Campus São Bernardo do Campo' },
                { valor: 'uninove-maua', rotulo: 'Campus Mauá' },
                { valor: 'uninove-guarulhos', rotulo: 'Campus Guarulhos' },
                { valor: 'uninove-osasco', rotulo: 'Campus Osasco' },
                { valor: 'uninove-sjc', rotulo: 'Campus São José dos Campos' },
                { valor: 'uninove-bauru', rotulo: 'Campus Bauru' }
            ]
        },
        {
            id: 'unip',
            nome: 'UNIP — Universidade Paulista',
            campi: [
                { valor: 'unip-anchorena', rotulo: 'Campus Anchorena (São Paulo)' },
                { valor: 'unip-tucuruvi', rotulo: 'Campus Tucuruvi (São Paulo)' },
                { valor: 'unip-paranagua', rotulo: 'Campus Paraíso / Vergueiro (São Paulo)' },
                { valor: 'unip-north-west', rotulo: 'Campus Norte / Chácara San Martin (São Paulo)' },
                { valor: 'unip-alphaville', rotulo: 'Campus Alphaville (Barueri)' },
                { valor: 'unip-campinas', rotulo: 'Campus Campinas' },
                { valor: 'unip-santos', rotulo: 'Campus Santos' },
                { valor: 'unip-sao-jose', rotulo: 'Campus São José dos Campos' },
                { valor: 'unip-sorocaba', rotulo: 'Campus Sorocaba' },
                { valor: 'unip-ribeirao', rotulo: 'Campus Ribeirão Preto' },
                { valor: 'unip-bauru', rotulo: 'Campus Bauru' },
                { valor: 'unip-aracatuba', rotulo: 'Campus Araçatuba' },
                { valor: 'unip-assis', rotulo: 'Campus Assis' },
                { valor: 'unip-jundiai', rotulo: 'Campus Jundiaí' },
                { valor: 'unip-limeira', rotulo: 'Campus Limeira' },
                { valor: 'unip-marilia', rotulo: 'Campus Marília' },
                { valor: 'unip-presidente-prudente', rotulo: 'Campus Presidente Prudente' },
                { valor: 'unip-sao-carlos', rotulo: 'Campus São Carlos' },
                { valor: 'unip-sao-jose-rio-preto', rotulo: 'Campus São José do Rio Preto' }
            ]
        },
        {
            id: 'unisanta',
            nome: 'UNISANTA — Universidade Santa Cecília',
            campi: [
                { valor: 'unisanta-santos', rotulo: 'Campus Santos' }
            ]
        },
        {
            id: 'usf',
            nome: 'USF — Universidade São Francisco',
            campi: [
                { valor: 'usf-braganca', rotulo: 'Campus Bragança Paulista' },
                { valor: 'usf-itatiba', rotulo: 'Campus Itatiba' },
                { valor: 'usf-campinas', rotulo: 'Campus Campinas' },
                { valor: 'usf-sao-paulo', rotulo: 'Campus São Paulo' }
            ]
        },
        {
            id: 'sao-judas',
            nome: 'Universidade São Judas Tadeu',
            campi: [
                { valor: 'sao-judas-mooca', rotulo: 'Campus Mooca (São Paulo)' },
                { valor: 'sao-judas-butanta', rotulo: 'Campus Butantã (São Paulo)' },
                { valor: 'sao-judas-paulista', rotulo: 'Campus Paulista (São Paulo)' },
                { valor: 'sao-judas-santo-amaro', rotulo: 'Campus Santo Amaro (São Paulo)' },
                { valor: 'sao-judas-abc', rotulo: 'Campus ABC (São Bernardo do Campo)' },
                { valor: 'sao-judas-unimonte', rotulo: 'Campus Unimonte (Santos)' }
            ]
        }
    ]);

    const EXTRAS = Object.freeze([
        { valor: '', rotulo: 'Selecione (opcional)' },
        { valor: 'nao-aplica', rotulo: 'Nenhuma — não estou estudando' },
        { valor: 'outra-ies-sp', rotulo: 'Outra faculdade / universidade em SP' }
    ]);

    const TODOS = Object.freeze([
        ...EXTRAS.filter((e) => e.valor),
        ...GRUPOS.flatMap((g) => g.campi)
    ]);

    /** IES antiga (sem campus) → campus padrão. */
    const LEGADO_IES = Object.freeze({
        ufabc: 'ufabc-santo-andre',
        ufscar: 'ufscar-sao-carlos',
        unifesp: 'unifesp-sao-paulo',
        unicamp: 'unicamp-campinas',
        unesp: 'unesp-sao-paulo',
        univesp: 'univesp-ead',
        usp: 'usp-cidade-universitaria',
        uscs: 'uscs-centro',
        mackenzie: 'mackenzie-higienopolis',
        'puc-campinas': 'puc-campinas-campus1',
        'puc-sp': 'puc-sp-monte-alegre',
        unaerp: 'unaerp-ribeirao-preto',
        unasp: 'unasp-sao-paulo',
        'anhembi-morumbi': 'anhembi-morumbi-vila-olimpia',
        'universidade-brasil': 'universidade-brasil-sp',
        'braz-cubas': 'braz-cubas-mogi',
        unisantos: 'unisantos-santos',
        unicid: 'unicid-tatuape',
        'cruzeiro-do-sul': 'cruzeiro-do-sul-sao-miguel',
        unifran: 'unifran-franca',
        unimar: 'unimar-marilia',
        umc: 'umc-mogi',
        unisa: 'unisa-santo-amaro',
        uniso: 'uniso-sorocaba',
        unitau: 'unitau-taubate',
        unoeste: 'unoeste-presidente-prudente',
        ibirapuera: 'ibirapuera-chacara',
        umesp: 'umesp-rudge-ramos',
        unimes: 'unimes-santos',
        uninove: 'uninove-memorial',
        unip: 'unip-campinas',
        unisanta: 'unisanta-santos',
        usf: 'usf-campinas',
        'sao-judas': 'sao-judas-mooca'
    });

    function listaPlana() {
        return TODOS;
    }

    /** Mapeia textos livres, siglas ou IES sem campus → valor do catálogo. */
    function normalizar(texto) {
        const bruto = String(texto || '').trim();
        if (!bruto) return '';

        const t = bruto
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        if (TODOS.some((u) => u.valor === bruto) || TODOS.some((u) => u.valor === t)) {
            return TODOS.find((u) => u.valor === bruto || u.valor === t).valor;
        }

        if (LEGADO_IES[bruto] || LEGADO_IES[t]) {
            return LEGADO_IES[bruto] || LEGADO_IES[t];
        }

        const alias = [
            [/unicamp.*limeira|limeira.*unicamp/, 'unicamp-limeira'],
            [/unicamp.*piracicaba|piracicaba.*unicamp|fop/, 'unicamp-piracicaba'],
            [/unicamp|estadual de campinas|barao geraldo|zeferino vaz/, 'unicamp-campinas'],
            [/puc[\s-]?campinas.*ii|campus ?ii.*puc/, 'puc-campinas-campus2'],
            [/puc[\s-]?campinas|pontificia universidade catolica de campinas/, 'puc-campinas-campus1'],
            [/puc[\s-]?sp.*sorocaba|sorocaba.*puc/, 'puc-sp-sorocaba'],
            [/puc[\s-]?sp.*santana|santana.*puc/, 'puc-sp-santana'],
            [/puc[\s-]?sp.*consolacao|consolacao.*puc/, 'puc-sp-consolacao'],
            [/puc[\s-]?sp|puc[\s-]?sao paulo|monte alegre|perdizes/, 'puc-sp-monte-alegre'],
            [/usp.*leste|each/, 'usp-leste'],
            [/usp.*ribeirao|ribeirao preto.*usp/, 'usp-ribeirao-preto'],
            [/usp.*sao carlos|sao carlos.*usp/, 'usp-sao-carlos'],
            [/usp.*piracicaba|esalq/, 'usp-piracicaba'],
            [/usp.*bauru/, 'usp-bauru'],
            [/usp.*pirassununga/, 'usp-pirassununga'],
            [/usp.*lorena/, 'usp-lorena'],
            [/usp.*santos/, 'usp-santos'],
            [/\busp\b|butanta|cidade universitaria|universidade de sao paulo/, 'usp-cidade-universitaria'],
            [/unesp.*rio claro/, 'unesp-rio-claro'],
            [/unesp.*botucatu/, 'unesp-botucatu'],
            [/unesp.*bauru/, 'unesp-bauru'],
            [/unesp.*jaboticabal/, 'unesp-jaboticabal'],
            [/unesp.*sorocaba/, 'unesp-sorocaba'],
            [/\bunesp\b|julio de mesquita/, 'unesp-sao-paulo'],
            [/univesp|universidade virtual/, 'univesp-ead'],
            [/unifesp.*diadema/, 'unifesp-diadema'],
            [/unifesp.*osasco/, 'unifesp-osasco'],
            [/unifesp.*guarulhos/, 'unifesp-guarulhos'],
            [/unifesp.*santos|baixada santista/, 'unifesp-baixada-santista'],
            [/unifesp.*sjc|sao jose dos campos.*unifesp/, 'unifesp-sjc'],
            [/unifesp|federal de sao paulo|vila clementino/, 'unifesp-sao-paulo'],
            [/ufscar.*araras/, 'ufscar-araras'],
            [/ufscar.*sorocaba/, 'ufscar-sorocaba'],
            [/ufscar.*buri|lagoa do sino/, 'ufscar-lagoa-do-sino'],
            [/ufscar|federal de sao carlos/, 'ufscar-sao-carlos'],
            [/ufabc.*bernardo|sao bernardo.*ufabc/, 'ufabc-sao-bernardo'],
            [/ufabc|federal do abc|santo andre/, 'ufabc-santo-andre'],
            [/uscs/, 'uscs-centro'],
            [/mackenzie.*campinas/, 'mackenzie-campinas'],
            [/mackenzie.*alphaville/, 'mackenzie-alphaville'],
            [/mackenzie/, 'mackenzie-higienopolis'],
            [/unip.*campinas/, 'unip-campinas'],
            [/unip\b|universidade paulista/, 'unip-campinas'],
            [/uninove/, 'uninove-memorial'],
            [/sao judas/, 'sao-judas-mooca'],
            [/anhembi/, 'anhembi-morumbi-vila-olimpia'],
            [/cruzeiro do sul/, 'cruzeiro-do-sul-sao-miguel'],
            [/unicid/, 'unicid-tatuape'],
            [/unaerp/, 'unaerp-ribeirao-preto'],
            [/unifran|de franca/, 'unifran-franca'],
            [/uniso|de sorocaba/, 'uniso-sorocaba'],
            [/unitau|de taubate/, 'unitau-taubate'],
            [/usf.*itatiba/, 'usf-itatiba'],
            [/usf.*braganca/, 'usf-braganca'],
            [/usf|sao francisco/, 'usf-campinas'],
            [/umesp|metodista/, 'umesp-rudge-ramos'],
            [/braz cubas/, 'braz-cubas-mogi'],
            [/unimar|de marilia/, 'unimar-marilia'],
            [/unoeste|oeste paulista/, 'unoeste-presidente-prudente'],
            [/unisanta|santa cecilia/, 'unisanta-santos'],
            [/unisantos|catolica de santos/, 'unisantos-santos'],
            [/unisa\b|santo amaro/, 'unisa-santo-amaro'],
            [/unimes|metropolitana de santos/, 'unimes-santos'],
            [/\bumc\b|mogi das cruzes/, 'umc-mogi'],
            [/unasp.*engenheiro|engenheiro coelho/, 'unasp-engenharia'],
            [/unasp.*hortolandia/, 'unasp-ht'],
            [/unasp|adventista/, 'unasp-sao-paulo'],
            [/ibirapuera/, 'ibirapuera-chacara'],
            [/universidade brasil/, 'universidade-brasil-sp'],
            [/nao (estudo|se aplica)|nao aplica/, 'nao-aplica']
        ];

        for (const [re, valor] of alias) {
            if (re.test(t)) return valor;
        }

        return 'outra-ies-sp';
    }

    function preencherSelect(selectEl, valorAtual) {
        if (!selectEl) return;
        const escolhido = normalizar(valorAtual);

        selectEl.replaceChildren();

        // Placeholder + “Nenhuma” primeiro (quem não estuda acha na hora).
        selectEl.append(new Option(EXTRAS[0].rotulo, ''));
        const nenhuma = EXTRAS.find((e) => e.valor === 'nao-aplica');
        if (nenhuma) selectEl.append(new Option(nenhuma.rotulo, nenhuma.valor));

        GRUPOS.forEach((grupo) => {
            const og = document.createElement('optgroup');
            og.label = grupo.nome;
            grupo.campi.forEach((campus) => {
                og.append(new Option(campus.rotulo, campus.valor));
            });
            selectEl.append(og);
        });

        EXTRAS.filter((e) => e.valor && e.valor !== 'nao-aplica').forEach((item) => {
            selectEl.append(new Option(item.rotulo, item.valor));
        });

        if (escolhido && [...selectEl.options].some((o) => o.value === escolhido)) {
            selectEl.value = escolhido;
        } else {
            selectEl.value = '';
        }
    }

    function semAcento(s) {
        return String(s || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    /** Itens pesquisáveis: campus com nome da IES + extras. */
    function catalogoBusca() {
        const itens = [];
        EXTRAS.filter((e) => e.valor).forEach((e) => {
            itens.push({
                valor: e.valor,
                rotulo: e.rotulo,
                grupo: '',
                busca: semAcento(e.rotulo + ' ' + e.valor),
            });
        });
        GRUPOS.forEach((g) => {
            const nomeCurto = (g.nome.split('—')[0] || g.nome).trim();
            g.campi.forEach((c) => {
                itens.push({
                    valor: c.valor,
                    rotulo: c.rotulo,
                    grupo: nomeCurto,
                    busca: semAcento(`${nomeCurto} ${g.nome} ${c.rotulo} ${c.valor}`),
                });
            });
        });
        return itens;
    }

    function rotuloSelecionado(valor) {
        if (!valor) return '';
        const item = catalogoBusca().find((i) => i.valor === valor);
        if (!item) return valor;
        return item.grupo ? `${item.grupo} · ${item.rotulo}` : item.rotulo;
    }

    /**
     * Combobox (lista suspensa): atalhos + campo que abre/fecha a lista.
     * Sincroniza o <select> oculto. Após escolher, a lista fecha.
     * @param {HTMLElement} host
     * @param {HTMLSelectElement} selectEl
     * @param {string} [valorAtual]
     */
    function montarBusca(host, selectEl, valorAtual) {
        if (!host || !selectEl) return;
        preencherSelect(selectEl, valorAtual);
        selectEl.classList.add('escolha-select-sync');
        selectEl.setAttribute('aria-hidden', 'true');
        selectEl.tabIndex = -1;

        const catalogo = catalogoBusca();
        const uid = selectEl.id || 'faculdade';

        host.replaceChildren();
        host.classList.add('faculdade-busca');

        const atalhos = document.createElement('div');
        atalhos.className = 'faculdade-atalhos';
        [
            { valor: 'nao-aplica', curto: 'Nenhuma' },
            { valor: 'outra-ies-sp', curto: 'Outra em SP' },
            { valor: '', curto: 'Limpar seleção' },
        ].forEach((a) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'faculdade-atalho';
            b.dataset.valor = a.valor;
            b.textContent = a.curto;
            atalhos.append(b);
        });

        const campo = document.createElement('div');
        campo.className = 'faculdade-busca-campo';

        const input = document.createElement('input');
        input.type = 'text';
        input.id = `${uid}-pesquisa`;
        input.className = 'faculdade-busca-input';
        input.placeholder = 'Digite ou selecione a faculdade…';
        input.autocomplete = 'off';
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-label', 'Digite ou selecione a faculdade ou universidade');
        input.setAttribute('aria-controls', `${uid}-lista`);
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-expanded', 'false');
        input.setAttribute('aria-haspopup', 'listbox');

        const seta = document.createElement('button');
        seta.type = 'button';
        seta.className = 'faculdade-busca-seta';
        seta.setAttribute('aria-label', 'Abrir lista de faculdades');
        seta.tabIndex = -1;
        seta.innerHTML = '<span aria-hidden="true">▾</span>';

        const lista = document.createElement('div');
        lista.id = `${uid}-lista`;
        lista.className = 'faculdade-lista';
        lista.hidden = true;
        lista.setAttribute('role', 'listbox');
        lista.setAttribute('aria-label', 'Sugestões de faculdade');

        campo.append(input, seta, lista);
        host.append(atalhos, campo);

        let aberta = false;
        let indiceAtivo = -1;
        let filtroAtual = '';
        let blurTimer = 0;
        let editando = false;

        function fecharLista() {
            aberta = false;
            lista.hidden = true;
            input.setAttribute('aria-expanded', 'false');
            host.classList.remove('faculdade-busca--aberta');
            indiceAtivo = -1;
            lista.querySelectorAll('.faculdade-item').forEach((el) => {
                el.classList.remove('foco-teclado');
            });
        }

        function abrirLista() {
            aberta = true;
            lista.hidden = false;
            input.setAttribute('aria-expanded', 'true');
            host.classList.add('faculdade-busca--aberta');
        }

        function textoNoCampo() {
            const v = selectEl.value;
            if (!v) {
                input.value = '';
                input.placeholder = 'Digite ou selecione a faculdade…';
                return;
            }
            input.value = rotuloSelecionado(v);
            input.placeholder = 'Digite ou selecione a faculdade…';
        }

        function atualizarAtalhos() {
            const v = selectEl.value;
            atalhos.querySelectorAll('.faculdade-atalho').forEach((b) => {
                b.classList.toggle('ativo', b.dataset.valor === v);
            });
        }

        function aplicarValor(valor) {
            selectEl.value = valor;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            editando = false;
            filtroAtual = '';
            textoNoCampo();
            atualizarAtalhos();
            fecharLista();
        }

        function marcarTeclado(i) {
            const itens = [...lista.querySelectorAll('.faculdade-item')];
            itens.forEach((el) => el.classList.remove('foco-teclado'));
            if (!itens.length) {
                indiceAtivo = -1;
                return;
            }
            indiceAtivo = ((i % itens.length) + itens.length) % itens.length;
            const el = itens[indiceAtivo];
            el.classList.add('foco-teclado');
            el.scrollIntoView({ block: 'nearest' });
        }

        function pintarLista(filtro) {
            const q = semAcento(filtro).trim();
            filtroAtual = filtro;
            lista.replaceChildren();
            let hits = catalogo;
            if (q) {
                hits = catalogo.filter((i) => i.busca.includes(q));
            } else {
                const prioridade = new Set([
                    'nao-aplica',
                    'outra-ies-sp',
                    'unicamp-campinas',
                    'puc-campinas-campus1',
                    'puc-campinas-campus2',
                    'usp-cidade-universitaria',
                    'unesp-rio-claro',
                    'univesp-ead',
                ]);
                hits = catalogo.filter((i) => prioridade.has(i.valor));
            }

            if (!hits.length) {
                const vazio = document.createElement('p');
                vazio.className = 'faculdade-lista-vazia';
                vazio.textContent = 'Nenhuma faculdade encontrada. Tente outra busca ou “Outra em SP”.';
                lista.append(vazio);
                return;
            }

            const limite = q ? 40 : hits.length;
            const selecionado = selectEl.value;
            hits.slice(0, limite).forEach((item) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'faculdade-item';
                btn.dataset.valor = item.valor;
                btn.setAttribute('role', 'option');
                const ativo = item.valor === selecionado;
                btn.classList.toggle('ativo', ativo);
                btn.setAttribute('aria-selected', ativo ? 'true' : 'false');
                const titulo = document.createElement('span');
                titulo.className = 'faculdade-item-titulo';
                titulo.textContent = item.grupo || item.rotulo;
                btn.append(titulo);
                if (item.grupo) {
                    const sub = document.createElement('span');
                    sub.className = 'faculdade-item-sub';
                    sub.textContent = item.rotulo;
                    btn.append(sub);
                }
                lista.append(btn);
            });
            if (q && hits.length > limite) {
                const mais = document.createElement('p');
                mais.className = 'faculdade-lista-vazia';
                mais.textContent = `Mostrando ${limite} de ${hits.length}. Refine a busca.`;
                lista.append(mais);
            }
            indiceAtivo = -1;
        }

        function abrirComFiltro(filtro) {
            pintarLista(filtro);
            abrirLista();
        }

        atalhos.addEventListener('click', (ev) => {
            const b = ev.target.closest('.faculdade-atalho');
            if (!b) return;
            aplicarValor(b.dataset.valor);
        });

        lista.addEventListener('mousedown', (ev) => {
            // Evita blur do input antes do click na opção.
            ev.preventDefault();
        });

        lista.addEventListener('click', (ev) => {
            const item = ev.target.closest('.faculdade-item');
            if (!item) return;
            aplicarValor(item.dataset.valor);
        });

        seta.addEventListener('mousedown', (ev) => ev.preventDefault());
        seta.addEventListener('click', () => {
            if (aberta) {
                fecharLista();
                if (!editando) textoNoCampo();
                return;
            }
            editando = true;
            input.value = '';
            abrirComFiltro('');
            input.focus();
        });

        input.addEventListener('focus', () => {
            window.clearTimeout(blurTimer);
            if (!aberta) {
                editando = true;
                const selecionado = rotuloSelecionado(selectEl.value);
                if (input.value === selecionado) input.value = '';
                abrirComFiltro(input.value);
            }
        });

        input.addEventListener('blur', () => {
            window.clearTimeout(blurTimer);
            blurTimer = window.setTimeout(() => {
                fecharLista();
                editando = false;
                textoNoCampo();
            }, 140);
        });

        let debounce = 0;
        input.addEventListener('input', () => {
            editando = true;
            window.clearTimeout(debounce);
            debounce = window.setTimeout(() => {
                abrirComFiltro(input.value);
            }, 80);
        });

        input.addEventListener('keydown', (ev) => {
            const itens = [...lista.querySelectorAll('.faculdade-item')];
            if (ev.key === 'Escape') {
                ev.preventDefault();
                fecharLista();
                editando = false;
                textoNoCampo();
                input.blur();
                return;
            }
            if (ev.key === 'ArrowDown') {
                ev.preventDefault();
                if (!aberta) abrirComFiltro(editando ? input.value : '');
                marcarTeclado(indiceAtivo + 1);
                return;
            }
            if (ev.key === 'ArrowUp') {
                ev.preventDefault();
                if (!aberta) abrirComFiltro(editando ? input.value : '');
                marcarTeclado(indiceAtivo <= 0 ? itens.length - 1 : indiceAtivo - 1);
                return;
            }
            if (ev.key === 'Enter') {
                if (!aberta || !itens.length) return;
                ev.preventDefault();
                const alvo = indiceAtivo >= 0 ? itens[indiceAtivo] : itens[0];
                if (alvo) aplicarValor(alvo.dataset.valor);
            }
        });

        selectEl.addEventListener('change', () => {
            if (!editando) textoNoCampo();
            atualizarAtalhos();
        });

        document.addEventListener('click', (ev) => {
            if (!host.contains(ev.target)) {
                fecharLista();
                editando = false;
                textoNoCampo();
            }
        });

        textoNoCampo();
        atualizarAtalhos();
        fecharLista();
    }

    global.RoomMatchUniversidadesSp = {
        GRUPOS,
        UNIVERSIDADES_SP: listaPlana(),
        normalizar,
        preencherSelect,
        montarBusca,
        rotuloSelecionado,
    };
}(window));
