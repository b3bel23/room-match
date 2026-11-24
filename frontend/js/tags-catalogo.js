/**
 * Catálogo de tags: convivência (match) vs comodidades de anúncio (não entram no match).
 * Cadastro ↔ preferências ↔ publicar/editar anúncio.
 *
 * Schema intacto: nomes vão em `tags` / `imovel_tags` / `usuario_tags` (VARCHAR 50).
 * Conflitos: ao marcar uma tag, as incompatíveis são desmarcadas automaticamente.
 */
(function (global) {
    const ADESAO = [
        'Aceita Animais',
        'Trabalho em Casa',
        'Aberto a Festas',
        'Vegetariano',
        'Vegano',
        'LGBTQIA+ Acolhedor',
        'Limpeza Compartilhada',
        'Visitas Bem-vindas',
        'Aceita Fumo',
        'Flexível com Horários',
        'Casais Bem-vindos',
        'Cozinha Compartilhada',
        'Amigável a Estudantes',
        'Vida Ativa / Esporte',
        'Organizado',
    ];

    const RESTRICAO = [
        'Silêncio Noturno',
        'Sem Festas',
        'Sem Fumo',
        'Sem Animais',
        'Visitas Restritas',
        'Itens Individuais',
        'Sem Álcool',
        'Sem Visitas Noturnas',
        'Cozinha Separada',
        'Quarto Individual',
    ];

    /** Infraestrutura do imóvel — só no anúncio; fora do cálculo de afinidade. */
    const COMODIDADES = [
        'Wi-Fi',
        'Ar-condicionado',
        'Lavanderia',
        'Garagem',
        'Mobiliado',
        'Área de Lazer',
        'Portaria 24h',
        'Elevador',
        'Varanda',
        'Armários',
    ];

    const CONVIVENCIA = [...ADESAO, ...RESTRICAO];

    /**
     * Significado curto e inclusivo (UI). Linguagem respeitosa; sem excluir identidades.
     */
    const SIGNIFICADOS = {
        'Aceita Animais': 'Animais de estimação são bem-vindos.',
        'Trabalho em Casa': 'Espaço e rotina adequados para trabalhar ou estudar em casa.',
        'Aberto a Festas': 'Encontros sociais e festas ocasionais são bem-vindos.',
        'Vegetariano': 'Alimentação vegetariana (sem carne).',
        'Vegano': 'Alimentação vegana (sem produtos de origem animal).',
        'LGBTQIA+ Acolhedor': 'Ambiente respeitoso e seguro para pessoas LGBTQIA+.',
        'Limpeza Compartilhada': 'Faxina e organização são divididas entre moradores.',
        'Visitas Bem-vindas': 'Visitas de amigos e família são bem-vindas.',
        'Aceita Fumo': 'Fumo de tabaco é permitido (com regras da casa).',
        'Flexível com Horários': 'Horários de chegar, sair e barulho leve são flexíveis.',
        'Casais Bem-vindos': 'Casais (qualquer composição) são bem-vindos na casa.',
        'Cozinha Compartilhada': 'Cozinha e utensílios são compartilhados.',
        'Amigável a Estudantes': 'Rotina compatível com estudos e vida acadêmica.',
        'Vida Ativa / Esporte': 'Estilo de vida ativo, com caminhadas ou esporte.',
        'Organizado': 'Valoriza organização e ordem nos espaços comuns.',
        'Silêncio Noturno': 'Ambiente calmo à noite — evita barulho alto.',
        'Sem Festas': 'Sem festas ou encontros barulhentos na casa.',
        'Sem Fumo': 'Não se fuma tabaco na casa.',
        'Sem Animais': 'Não há espaço ou permissão para animais.',
        'Visitas Restritas': 'Visitas com aviso prévio e limites combinados.',
        'Itens Individuais': 'Cada pessoa cuida dos próprios itens e limpeza.',
        'Sem Álcool': 'Sem consumo de álcool na casa.',
        'Sem Visitas Noturnas': 'Visitas não pernoitam nem ficam até tarde.',
        'Cozinha Separada': 'Prefere cozinha ou utensílios pouco compartilhados.',
        'Quarto Individual': 'Quarto só seu — sem dividir o dormitório.',
        'Wi-Fi': 'Internet Wi-Fi disponível.',
        'Ar-condicionado': 'Ambiente com ar-condicionado.',
        'Lavanderia': 'Lavanderia ou tanque/máquina disponíveis.',
        'Garagem': 'Vaga ou garagem para veículo.',
        'Mobiliado': 'Mobília básica inclusa.',
        'Área de Lazer': 'Área comum de lazer no imóvel ou condomínio.',
        'Portaria 24h': 'Portaria ou segurança 24 horas.',
        'Elevador': 'Prédio com elevador.',
        'Varanda': 'Há varanda ou sacada.',
        'Armários': 'Armários ou guarda-roupa disponíveis.',
    };

    /** Nomes antigos → canônicos (dados já salvos no banco). */
    const ALIASES = {
        'Pet Friendly': 'Aceita Animais',
        'Home Office': 'Trabalho em Casa',
        'Sem Pets': 'Sem Animais',
        'LGBTQIA+ Safe': 'LGBTQIA+ Acolhedor',
        'LGBTQIA+ acolhedor': 'LGBTQIA+ Acolhedor',
        'Aceita Casais': 'Casais Bem-vindos',
        'Casais bem-vindos': 'Casais Bem-vindos',
        // Removidas do catálogo — não entram mais no match/UI.
        'Sem Casais': null,
        'Rotina Matinal': null,
        'Cannabis ok': null,
        '420 Friendly': null,
        '420 friendly': null,
    };

    /**
     * Pares incompatíveis (adesão × restrição ou opostos).
     * Só precisa listar um lado; `conflitosDe` espelha.
     */
    const CONFLICTOS_BASE = {
        'Aberto a Festas': ['Sem Festas', 'Silêncio Noturno'],
        'Aceita Animais': ['Sem Animais'],
        'Visitas Bem-vindas': ['Visitas Restritas', 'Sem Visitas Noturnas'],
        'Aceita Fumo': ['Sem Fumo'],
        'Cozinha Compartilhada': ['Cozinha Separada'],
        'Limpeza Compartilhada': ['Itens Individuais'],
        'Flexível com Horários': ['Silêncio Noturno'],
        'Vida Ativa / Esporte': [],
    };

    function normalizar(nome) {
        return String(nome || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function canonico(nome) {
        const bruto = String(nome || '').trim();
        if (!bruto) return null;
        if (Object.prototype.hasOwnProperty.call(ALIASES, bruto)) {
            return ALIASES[bruto];
        }
        const chave = Object.keys(ALIASES).find((k) => normalizar(k) === normalizar(bruto));
        if (chave) return ALIASES[chave];
        return bruto;
    }

    function significado(nome) {
        const c = canonico(nome) || nome;
        return SIGNIFICADOS[c] || '';
    }

    const COMODIDADES_NORM = new Set(COMODIDADES.map(normalizar));
    ['wifi', 'wi-fi', 'ar condicionado', 'ar-condicionado', 'mobiliado'].forEach((a) => {
        COMODIDADES_NORM.add(a);
    });

    /** Mapa completo nome → conflitos (bidirecional). */
    const CONFLICTOS = (() => {
        const mapa = {};
        function add(a, b) {
            if (!a || !b || a === b) return;
            if (!mapa[a]) mapa[a] = new Set();
            if (!mapa[b]) mapa[b] = new Set();
            mapa[a].add(b);
            mapa[b].add(a);
        }
        Object.entries(CONFLICTOS_BASE).forEach(([origem, lista]) => {
            (lista || []).forEach((alvo) => add(origem, alvo));
        });
        const out = {};
        Object.keys(mapa).forEach((k) => {
            out[k] = [...mapa[k]];
        });
        return out;
    })();

    function conflitosDe(nome) {
        const c = canonico(nome) || nome;
        return CONFLICTOS[c] || [];
    }

    function ehComodidade(nome) {
        const c = canonico(nome);
        if (c == null) return false;
        return COMODIDADES_NORM.has(normalizar(c));
    }

    const CONVIVENCIA_NORM = new Set(CONVIVENCIA.map(normalizar));

    function ehConvivenciaCatalogo(nome) {
        const c = canonico(nome);
        if (!c || ehComodidade(c)) return false;
        return CONVIVENCIA_NORM.has(normalizar(c));
    }

    function filtrarConvivencia(lista) {
        const saida = [];
        const vistos = new Set();
        (lista || []).forEach((t) => {
            const c = canonico(t);
            if (!c || ehComodidade(c) || !ehConvivenciaCatalogo(c)) return;
            const chave = normalizar(c);
            if (vistos.has(chave)) return;
            vistos.add(chave);
            saida.push(c);
        });
        return saida;
    }

    function tagsParaMatch(lista) {
        return filtrarConvivencia(lista);
    }

    /**
     * Afinidade inteligente (espelha backend/matching_service):
     * adesão precisa estar no anúncio; restrição ok se não houver conflito
     * (anúncio em silêncio = neutro). Conflito duro → teto 35%.
     */
    function matchPercent(tagsMorador, tagsAnuncio) {
        const doMorador = tagsParaMatch(tagsMorador);
        if (!doMorador.length) return 0;
        const noAnuncio = new Set(tagsParaMatch(tagsAnuncio));
        const adesao = new Set(ADESAO);
        const restricao = new Set(RESTRICAO);
        const cobre = { Vegetariano: ['Vegano'] };
        let pontos = 0;
        let conflitoDuro = false;

        function temConflito(tag) {
            return conflitosDe(tag).some((c) => noAnuncio.has(c));
        }
        function adesaoCoberta(tag) {
            if (noAnuncio.has(tag)) return true;
            return (cobre[tag] || []).some((alt) => noAnuncio.has(alt));
        }

        doMorador.forEach((tag) => {
            if (temConflito(tag)) {
                conflitoDuro = true;
                return;
            }
            if (restricao.has(tag)) {
                pontos += 1;
            } else if (adesao.has(tag)) {
                if (adesaoCoberta(tag)) pontos += 1;
            } else if (noAnuncio.has(tag)) {
                pontos += 1;
            }
        });

        let score = Math.round((100 * pontos) / doMorador.length);
        if (conflitoDuro) score = Math.min(score, 35);
        return score;
    }

    function filtrarComodidades(lista) {
        const saida = [];
        const vistos = new Set();
        (lista || []).forEach((t) => {
            const c = canonico(t);
            if (!c || !ehComodidade(c)) return;
            const chave = normalizar(c);
            if (vistos.has(chave)) return;
            vistos.add(chave);
            saida.push(c);
        });
        return saida;
    }

    /** Divide uma lista mista (ex.: imovel_tags) em convivência + comodidades. */
    function separar(lista) {
        return {
            convivencia: filtrarConvivencia(lista),
            comodidades: filtrarComodidades(lista),
        };
    }

    function escapar(texto) {
        return String(texto || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Ícones de traço (24×24) por tag canônica — currentColor, sem dependência externa.
     * Inspirados no traço arredondado do catálogo Ultimate Regular (Streamline).
     */
    const ICONES = {
        'Aceita Animais': '<circle cx="11" cy="5.5" r="1.6"/><circle cx="17" cy="7.5" r="1.5"/><circle cx="7" cy="9" r="1.5"/><circle cx="16.5" cy="13.5" r="1.5"/><path d="M9.5 14.5c0-2.2 1.6-4 3.5-4s3.5 1.8 3.5 4v1.2c0 1.3-1 2.3-2.3 2.3h-2.4c-1.3 0-2.3-1-2.3-2.3z"/>',
        'Sem Animais': '<circle cx="11" cy="5.5" r="1.6"/><circle cx="17" cy="7.5" r="1.5"/><circle cx="7" cy="9" r="1.5"/><path d="M9.5 14.5c0-2.2 1.6-4 3.5-4s3.5 1.8 3.5 4"/><path d="M4 4l16 16"/>',
        'Trabalho em Casa': '<rect x="3" y="5" width="14" height="10" rx="1.5"/><path d="M7 19h10M12 15v4M17 8h4v7a1 1 0 0 1-1 1h-3"/>',
        'Aberto a Festas': '<path d="M8 11c0-2.2 1.8-4 4-4s4 1.8 4 4v7H8z"/><path d="M7 18h10M10 7V5m4 2V5"/>',
        'Sem Festas': '<path d="M8 11c0-2.2 1.8-4 4-4s4 1.8 4 4v7H8z"/><path d="M7 18h10M4 4l16 16"/>',
        'Vegetariano': '<path d="M12 21c4-3.2 7-7 7-11a7 7 0 1 0-14 0c0 4 3 7.8 7 11z"/><path d="M12 10v4"/>',
        'Vegano': '<path d="M5 14c3-7 11-9 14-9-1 8-5 14-9 16-2-2-4.5-5-5-7z"/><path d="M8 17c2-1 4-3 5-5"/>',
        'LGBTQIA+ Acolhedor': '<path d="M12 20s-7-4.4-7-10a4.5 4.5 0 0 1 7-3.7A4.5 4.5 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
        'Limpeza Compartilhada': '<path d="M6 21V10l4-2 4 2v11"/><path d="M6 14h8M10 8V4"/>',
        'Visitas Bem-vindas': '<path d="M4 20V7l8-4 8 4v13"/><path d="M10 20v-6h4v6"/>',
        'Visitas Restritas': '<path d="M4 20V7l8-4 8 4v13"/><path d="M10 20v-6h4v6"/><path d="M15 11h4"/>',
        'Aceita Fumo': '<path d="M4 18h8M14 18h2M18 18h2"/><path d="M8 18V9a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2"/><path d="M16 10c1.2-1 2-2.2 2-3.5"/>',
        'Sem Fumo': '<path d="M4 18h8M14 18h2"/><path d="M8 18V9a2 2 0 0 1 2-2"/><path d="M4 4l16 16"/>',
        'Flexível com Horários': '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
        'Casais Bem-vindos': '<circle cx="8.5" cy="8" r="2.5"/><circle cx="15.5" cy="8" r="2.5"/><path d="M3.5 18c.6-3 2.6-4.5 5-4.5s4.2 1.2 5 3.5c.7-2.2 2.5-3.5 5-3.5 2.3 0 4.2 1.4 5 4.5"/>',
        'Cozinha Compartilhada': '<path d="M5 10h14v2H5z"/><path d="M7 12v7M17 12v7M10 5v5M14 5v5"/>',
        'Cozinha Separada': '<path d="M5 10h14v2H5z"/><path d="M7 12v7M17 12v7"/><path d="M12 4v16"/>',
        'Amigável a Estudantes': '<path d="M3 9l9-4 9 4-9 4-9-4z"/><path d="M7 11.5V16c2 1.5 6 1.5 8 0v-4.5"/>',
        'Vida Ativa / Esporte': '<circle cx="12" cy="5" r="2"/><path d="M8 21l2-7 2 2 2-2 2 7M6 12l4-2h4l4 2"/>',
        'Organizado': '<path d="M8 7h11M8 12h11M8 17h11"/><path d="M4 7h.01M4 12h.01M4 17h.01"/>',
        'Silêncio Noturno': '<path d="M14 4a7 7 0 1 0 6 10 6 6 0 0 1-6-10z"/>',
        'Itens Individuais': '<rect x="4" y="5" width="7" height="14" rx="1.5"/><rect x="13" y="5" width="7" height="14" rx="1.5"/>',
        'Sem Álcool': '<path d="M8 4h8l-1.5 7H9.5L8 4z"/><path d="M9.5 11v6a2.5 2.5 0 0 0 5 0v-6"/><path d="M4 4l16 16"/>',
        'Sem Visitas Noturnas': '<path d="M4 20V7l8-4 8 4v6"/><path d="M14 18a4 4 0 1 0 0-0.01M14 16v2"/>',
        'Quarto Individual': '<path d="M3 18V10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8"/><path d="M3 13h16v5H3zM19 13v5"/>',
        'Wi-Fi': '<path d="M5 12.5a9 9 0 0 1 14 0"/><path d="M8.5 15.5a4.5 4.5 0 0 1 7 0"/><circle cx="12" cy="19" r="1.2"/>',
        'Ar-condicionado': '<rect x="3" y="6" width="18" height="8" rx="2"/><path d="M7 18v1M12 18v2M17 18v1"/>',
        'Lavanderia': '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 6h2"/>',
        'Garagem': '<path d="M4 19V9l8-5 8 5v10"/><path d="M8 19v-6h8v6"/>',
        'Mobiliado': '<path d="M4 10h16v3H4z"/><path d="M6 13v5M18 13v5M4 18h16"/>',
        'Área de Lazer': '<circle cx="12" cy="8" r="3"/><path d="M6 20c1.5-4 4-6 6-6s4.5 2 6 6"/>',
        'Portaria 24h': '<path d="M12 3l8 4v6c0 4.5-3.2 7.5-8 9-4.8-1.5-8-4.5-8-9V7z"/><path d="M12 8v4l2 2"/>',
        'Elevador': '<rect x="6" y="3" width="12" height="18" rx="1.5"/><path d="M12 8l-2 3h4l-2-3zM12 16l-2-3h4l-2 3z"/>',
        'Varanda': '<path d="M4 14h16v5H4z"/><path d="M6 14V8h12v6M8 8V6h8v2"/>',
        'Armários': '<rect x="4" y="3" width="7" height="18" rx="1"/><rect x="13" y="3" width="7" height="18" rx="1"/><path d="M9.5 12h.01M17.5 12h.01"/>',
    };

    const ICONE_PADRAO = '<path d="M7 4h7l3 3v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M14 4v4h4"/>';

    /** SVG inline da tag (string HTML controlada). */
    function iconeHtml(nome) {
        const c = canonico(nome) || nome;
        const inner = ICONES[c] || ICONE_PADRAO;
        return (
            '<svg class="tag-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            + 'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            + inner
            + '</svg>'
        );
    }

    function criarIcone(nome) {
        const wrap = document.createElement('span');
        wrap.className = 'tag-ico-wrap';
        wrap.setAttribute('aria-hidden', 'true');
        wrap.innerHTML = iconeHtml(nome);
        return wrap;
    }

    /**
     * Cria label.pilula com ícone + nome + significado (title + texto auxiliar).
     * @param {string} nome
     * @param {{ name?: string, tipo?: 'checkbox'|'radio', classe?: string }} [opts]
     */
    function criarPilula(nome, opts = {}) {
        const c = canonico(nome) || nome;
        const sig = significado(c);
        const name = opts.name || 'tag';
        const label = document.createElement('label');
        label.className = opts.classe || 'pilula';
        if (sig) label.title = sig;

        const input = document.createElement('input');
        input.className = 'visually-hidden';
        input.type = opts.tipo || 'checkbox';
        input.name = name;
        input.value = c;

        const corpo = document.createElement('span');
        corpo.className = 'pilula-corpo';
        corpo.append(criarIcone(c));
        const textos = document.createElement('span');
        textos.className = 'pilula-textos';
        const titulo = document.createElement('span');
        titulo.className = 'pilula-nome';
        titulo.textContent = c;
        textos.append(titulo);
        if (sig) {
            const ajuda = document.createElement('span');
            ajuda.className = 'pilula-significado';
            ajuda.textContent = sig;
            textos.append(ajuda);
        }
        corpo.append(textos);

        label.append(input, corpo);
        return label;
    }

    /**
     * Checkbox (preferências) com ícone + significado no title e texto auxiliar.
     */
    function criarCheck(nome) {
        const c = canonico(nome) || nome;
        const sig = significado(c);
        const label = document.createElement('label');
        label.className = 'config-tag';
        if (sig) label.title = sig;

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = c;

        const texto = document.createElement('span');
        texto.className = 'config-tag-texto';
        const titulo = document.createElement('span');
        titulo.className = 'config-tag-nome';
        titulo.textContent = c;
        texto.append(titulo);
        if (sig) {
            const ajuda = document.createElement('span');
            ajuda.className = 'config-tag-significado';
            ajuda.textContent = sig;
            texto.append(ajuda);
        }

        label.append(input, criarIcone(c), texto);
        return label;
    }

    /**
     * Ao marcar uma tag, desmarca as incompatíveis no mesmo conjunto de inputs.
     * @param {Iterable<HTMLInputElement>} inputs
     * @param {{ onChange?: () => void }} [opcoes]
     */
    function ligarConflitos(inputs, opcoes) {
        const lista = [...(inputs || [])].filter(Boolean);
        if (!lista.length) return;
        const aoMudar = typeof opcoes?.onChange === 'function' ? opcoes.onChange : null;

        lista.forEach((input) => {
            input.addEventListener('change', () => {
                if (!input.checked) {
                    if (aoMudar) aoMudar();
                    return;
                }
                const bloquear = new Set(conflitosDe(input.value));
                lista.forEach((outro) => {
                    if (outro === input || !outro.checked) return;
                    if (bloquear.has(outro.value)) {
                        outro.checked = false;
                    }
                });
                if (aoMudar) aoMudar();
            });
        });
    }

    /** Remove pares conflitantes já marcados (ex.: perfil antigo). Mantém a 1ª vista. */
    function limparConflitosMarcados(inputs) {
        const lista = [...(inputs || [])].filter((i) => i && i.checked);
        const vistos = new Set();
        lista.forEach((input) => {
            if (!input.checked) return;
            if (vistos.has(input.value)) return;
            vistos.add(input.value);
            const bloquear = new Set(conflitosDe(input.value));
            lista.forEach((outro) => {
                if (outro === input || !outro.checked) return;
                if (bloquear.has(outro.value)) outro.checked = false;
            });
        });
    }

    global.RoomMatchTags = {
        ADESAO,
        RESTRICAO,
        COMODIDADES,
        CONVIVENCIA,
        CONFLICTOS,
        SIGNIFICADOS,
        paraMorador: () => [...CONVIVENCIA],
        paraLocador: () => [...CONVIVENCIA],
        ehComodidade,
        filtrarConvivencia,
        filtrarComodidades,
        tagsParaMatch,
        matchPercent,
        ehConvivenciaCatalogo,
        separar,
        normalizar,
        canonico,
        significado,
        conflitosDe,
        ligarConflitos,
        limparConflitosMarcados,
        ICONES,
        iconeHtml,
        criarIcone,
        criarPilula,
        criarCheck,
        escapar,
    };
}(window));
