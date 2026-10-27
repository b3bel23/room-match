/**
 * Mock API in-browser (KAN-49 bridge until FastAPI is live).
 * Persists seed + mutations in localStorage under roommatch-mock-db.
 *
 * Contrato de papéis (espelha backend: locatario / locador):
 * docs/frontend/papeis-e-rotas-api-v1.md
 */
(function (global) {
    const CHAVE_DB = 'roommatch-mock-db-v10';

    function fotosSeed(id) {
        const base = `../assets/imoveis/${id}`;
        const fotos = [1, 2, 3, 4].map((n) => `${base}/${n}.jpg`);
        return { fotos, capa: fotos[0] };
    }

    const ANUNCIO_DETALHES = {
        'republica-barao': {
            descricao: 'Quarto privativo em república de estudantes a 5 min a pé da PUC. Casa ampla, convivência organizada com regras de silêncio após 22h. Aceita pet pequeno (gato).',
            distancia_km: '3,8',
            vagas: 1,
            mobiliado: true,
            contas_detalhe: 'Média de luz, gás, água, internet e streaming dividida entre 4 moradores.',
            comodidades: ['Cama + armário', 'Wi-Fi 300 Mbps', 'Cozinha equipada', 'Área de estudo', 'Vaga para bike'],
            foto_legendas: [
                'Quarto disponível (12 m²)',
                'Sala de convivência',
                'Mesa de estudo compartilhada',
                'Cozinha e área de refeições'
            ],
            moradores_atuais: [
                { iniciais: 'M1', nome: 'Morador Fake 01', linha: 'Ocupação mock · 28 anos', estilo: 'foto-1' },
                { iniciais: 'M2', nome: 'Morador Fake 02', linha: 'Ocupação mock · 24 anos', estilo: 'foto-2' },
                { iniciais: 'M3', nome: 'Morador Fake 03', linha: 'Estudante mock · 22 anos', estilo: 'foto-3' }
            ]
        },
        'kitnet-cambui': {
            descricao: 'Kitnet mobiliada no Cambuí, ideal para quem estuda na UNICAMP ou trabalha no centro. Ambiente silencioso, prédio com portaria e elevador. Uso individual — sem divisão de quarto.',
            distancia_km: '2,4',
            vagas: 1,
            mobiliado: true,
            contas_detalhe: 'Contas estimadas incluem internet fibra, energia e condomínio de água/gás.',
            comodidades: ['Cama box', 'Cooktop + micro-ondas', 'Ar condicionado', 'Armários planejados', 'Portaria 24h'],
            foto_legendas: [
                'Ambiente integrado sala/cozinha',
                'Cama e armários',
                'Banheiro privativo',
                'Vista da janela · Cambuí'
            ],
            moradores_atuais: []
        },
        'casa-sousas': {
            descricao: 'Quarto em casa térrea em Sousas, bairro residencial e arborizado. Quintal compartilhado, garagem para 1 carro e ambiente familiar. Sem festas; pet friendly.',
            distancia_km: '5,2',
            vagas: 1,
            mobiliado: false,
            contas_detalhe: 'Água, luz, gás e internet rateados conforme consumo (média informada).',
            comodidades: ['Quarto 14 m²', 'Quintal e churrasqueira', 'Garagem', 'Lavanderia', 'Wi-Fi'],
            foto_legendas: [
                'Quarto com janela para o quintal',
                'Fachada da casa',
                'Sala de TV compartilhada',
                'Quintal e área verde'
            ],
            moradores_atuais: [
                { iniciais: 'M4', nome: 'Morador Fake 04', linha: 'Ocupação mock · 26 anos', estilo: 'foto-2' },
                { iniciais: 'M5', nome: 'Morador Fake 05', linha: 'Estudante mock · 23 anos', estilo: 'foto-3' }
            ]
        },
        'suite-taquaral': {
            descricao: 'Suíte em apartamento no Taquaral, república feminina com foco em estudo e home office. Banheiro privativo, closet e varanda. Condomínio com academia e salão de festas (uso moderado).',
            distancia_km: '4,1',
            vagas: 1,
            mobiliado: true,
            contas_detalhe: 'Condomínio já inclui água; demais contas rateadas entre 3 moradoras.',
            comodidades: ['Suíte com banheiro', 'Escrivania', 'Ar condicionado', 'Academia no prédio', 'Garagem opcional'],
            foto_legendas: [
                'Suíte mobiliada (16 m²)',
                'Banheiro privativo',
                'Sala compartilhada',
                'Varanda do apartamento'
            ],
            moradores_atuais: [
                { iniciais: 'M6', nome: 'Morador Fake 06', linha: 'Ocupação mock · 25 anos', estilo: 'foto-2' },
                { iniciais: 'M7', nome: 'Morador Fake 07', linha: 'Ocupação mock · 24 anos', estilo: 'foto-3' }
            ]
        }
    };

    function imovelSeed(base) {
        const extra = ANUNCIO_DETALHES[base.id] || {};
        return { ...base, ...fotosSeed(base.id), ...extra };
    }

    /** Anúncios alinhados ao hi-fi (mural, favoritos, meus anúncios do locador). */
    const SEED_IMOVEIS = [
        imovelSeed({
            id: 'republica-barao',
            titulo: 'Quarto em república · Barão Geraldo',
            tipo: 'República',
            bairro: 'Barão Geraldo',
            cidade: 'Campinas',
            preco: 850,
            match_percent: 92,
            tags: ['Pet Friendly', 'Silêncio Noturno', 'Home Office'],
            badge: 'República',
            area_m2: 12,
            deslocamento_min: 28,
            destino: 'PUC-Campinas',
            locador_id: 'u-locador',
            aluguel: 600,
            condominio: 120,
            iptu: 45,
            contas: 85,
            classificacao: 'Mista',
            endereco: 'R. Benedito Alves Aranha, 450 · Barão Geraldo'
        }),
        imovelSeed({
            id: 'kitnet-cambui',
            titulo: 'Kitnet mobiliada · Cambuí',
            tipo: 'Kitnet',
            bairro: 'Cambuí',
            cidade: 'Campinas',
            preco: 1200,
            match_percent: 78,
            tags: ['LGBTQIA+ Safe', 'Vegetariano', 'Home Office'],
            badge: 'Kitnet',
            area_m2: 28,
            deslocamento_min: 18,
            destino: 'UNICAMP',
            locador_id: 'u-locador',
            aluguel: 980,
            condominio: 150,
            iptu: 40,
            contas: 30,
            classificacao: 'Mista',
            endereco: 'R. Coronel Quirino, 200 · Cambuí'
        }),
        imovelSeed({
            id: 'casa-sousas',
            titulo: 'Quarto casa compartilhada · Sousas',
            tipo: 'Casa',
            bairro: 'Sousas',
            cidade: 'Campinas',
            preco: 720,
            match_percent: 88,
            tags: ['Pet Friendly', 'Sem Festas', '420 Friendly'],
            badge: 'Casa',
            area_m2: 14,
            deslocamento_min: 35,
            destino: 'PUC-Campinas',
            locador_id: 'u-locador',
            aluguel: 550,
            condominio: 0,
            iptu: 80,
            contas: 90,
            classificacao: 'Mista',
            endereco: 'Rua das Flores, 120 · Sousas'
        }),
        imovelSeed({
            id: 'suite-taquaral',
            titulo: 'Quarto suíte · Taquaral',
            tipo: 'Apartamento',
            bairro: 'Taquaral',
            cidade: 'Campinas',
            preco: 980,
            match_percent: 81,
            tags: ['Silêncio Noturno', 'Home Office', 'LGBTQIA+ Safe'],
            badge: 'Apart.',
            area_m2: 16,
            deslocamento_min: 22,
            destino: 'PUCC',
            locador_id: 'u-locador',
            aluguel: 750,
            condominio: 140,
            iptu: 50,
            contas: 40,
            classificacao: 'Feminina',
            endereco: 'Av. José Bonifácio, 890 · Taquaral'
        })
    ];

    // Contas de teste do mock (só front estático; dados 100% fictícios).
    const SEED_USERS = [
        {
            id: 'u-morador',
            email: 'morador@demo.com',
            senha: 'demo123',
            nome: 'Morador Exemplo Mock',
            papel: 'Morador',
            telefone: '(19) 99471-2830',
            genero: 'Não-binário',
            ocupacao: 'estudante',
            emprego: 'estudante-sem-vinculo',
            faculdade: 'unicamp-campinas',
            foto_url: '',
            tags: ['Pet Friendly', 'Silêncio Noturno', 'Home Office'],
            orcamento: 1200,
            limiar: 70
        },
        {
            id: 'u-locador',
            email: 'locador@demo.com',
            senha: 'demo123',
            nome: 'Locador Exemplo Mock',
            papel: 'Locador',
            telefone: '(19) 98852-7164',
            genero: 'Mulher Cisgênero',
            ocupacao: 'cbo-2',
            emprego: 'autonomo',
            faculdade: 'puc-campinas-campus1',
            foto_url: '',
            tags: ['Pet Friendly', 'Sem Festas', 'Silêncio Noturno'],
            orcamento: 5000,
            limiar: 60
        }
    ];

    const CAMPOS_PERFIL = [
        'nome',
        'telefone',
        'genero',
        'ocupacao',
        'emprego',
        'faculdade',
        'foto_url',
        'email',
        'papel'
    ];

    const PAPEIS_UI = Object.freeze(['Morador', 'Locador']);

    function iniciais(nome) {
        return String(nome || '?')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0].toUpperCase())
            .join('') || '?';
    }

    function publico(user) {
        // Aliases curtos (front atual) + nomes do schema locatario.
        const orcamento_maximo = Number(user.orcamento_maximo ?? user.orcamento) || 0;
        const limiar_compatibilidade = Number(user.limiar_compatibilidade ?? user.limiar) || 0;
        return {
            id: user.id,
            email: user.email,
            nome: user.nome,
            papel: user.papel,
            papel_schema: user.papel === 'Locador' ? 'locador' : 'locatario',
            iniciais: iniciais(user.nome),
            telefone: user.telefone || '',
            genero: user.genero || '',
            ocupacao: user.ocupacao || '',
            emprego: user.emprego || '',
            faculdade: user.faculdade || '',
            foto_url: user.foto_url || '',
            tags: user.tags || [],
            orcamento: orcamento_maximo,
            limiar: limiar_compatibilidade,
            orcamento_maximo,
            limiar_compatibilidade
        };
    }

    function tokenPara(user) {
        return `mock.${btoa(unescape(encodeURIComponent(user.id)))}.sig`;
    }

    function userIdDoToken(token) {
        if (!token || !String(token).startsWith('mock.')) return null;
        try {
            const meio = String(token).split('.')[1];
            return decodeURIComponent(escape(atob(meio)));
        } catch (erro) {
            return null;
        }
    }

    function agoraIso() {
        return new Date().toISOString();
    }

    function dbPadrao() {
        return {
            users: SEED_USERS.map((u) => ({ ...u })),
            imoveis: SEED_IMOVEIS.map((i) => ({ ...i })),
            favoritos: {
                'u-morador': ['republica-barao', 'kitnet-cambui', 'casa-sousas', 'suite-taquaral']
            },
            visitas: [
                {
                    id: 'v1',
                    imovel_id: 'republica-barao',
                    usuario_id: 'u-morador',
                    nome: 'Morador Exemplo Mock',
                    data: offsetIso(1),
                    hora: '18h',
                    status: 'confirmada'
                },
                {
                    id: 'v2',
                    imovel_id: 'kitnet-cambui',
                    usuario_id: 'u-morador',
                    nome: 'Morador Exemplo Mock',
                    data: offsetIso(1),
                    hora: '10h',
                    status: 'pendente'
                }
            ],
            conversas: [
                {
                    id: 'c1',
                    imovel_id: 'republica-barao',
                    participantes: ['u-morador', 'u-locador'],
                    mensagens: [
                        {
                            id: 'm1',
                            autor_id: 'u-locador',
                            texto: 'Oi! Vi que você curtiu o quarto em Barão Geraldo. Posso te mostrar o imóvel amanhã às 18h?',
                            em: agoraIso()
                        },
                        {
                            id: 'm2',
                            autor_id: 'u-morador',
                            texto: 'Oi! Pode sim. O condomínio aceita pet pequeno mesmo?',
                            em: agoraIso()
                        },
                        {
                            id: 'm3',
                            autor_id: 'u-locador',
                            texto: 'Sim! Temos um gato e o condomínio é pet friendly. Te mando fotos do quarto por aqui.',
                            em: agoraIso()
                        },
                        {
                            id: 'm4',
                            autor_id: 'u-morador',
                            texto: 'Ótimo! E sobre o rateio das contas, a estimativa de R$ 85 inclui internet?',
                            em: agoraIso()
                        }
                    ]
                }
            ]
        };
    }

    function offsetIso(dias) {
        const d = new Date();
        d.setDate(d.getDate() + dias);
        return d.toISOString().slice(0, 10);
    }

    function sincronizarCatalogoDemo(db) {
        SEED_IMOVEIS.forEach((seed) => {
            const idx = db.imoveis.findIndex((i) => i.id === seed.id);
            if (idx >= 0) {
                db.imoveis[idx] = { ...db.imoveis[idx], ...seed };
            } else {
                db.imoveis.push({ ...seed });
            }
        });
    }

    function sincronizarUsuariosDemo(db) {
        const emailsSeed = new Set(SEED_USERS.map((u) => u.email));
        const preservados = [];

        SEED_USERS.forEach((seed) => {
            const existente = db.users.find(
                (u) => u.id === seed.id || u.email === seed.email
            );
            if (existente) {
                // Contas seed: identidade sempre fictícia do seed (preenchida).
                // Prefs/senha/foto do navegador podem permanecer.
                preservados.push({
                    ...seed,
                    id: existente.id || seed.id,
                    senha: existente.senha || seed.senha || '',
                    tags: existente.tags?.length ? existente.tags : seed.tags,
                    orcamento: existente.orcamento ?? seed.orcamento,
                    limiar: existente.limiar ?? seed.limiar,
                    nome: seed.nome,
                    telefone: seed.telefone,
                    genero: seed.genero,
                    ocupacao: seed.ocupacao,
                    emprego: seed.emprego,
                    faculdade: seed.faculdade,
                    foto_url: existente.foto_url || seed.foto_url || '',
                    email: seed.email,
                    papel: PAPEIS_UI.includes(existente.papel) ? existente.papel : seed.papel
                });
            } else {
                preservados.push({ ...seed });
            }
        });

        // Contas criadas fora do seed (quando o register estiver liberado)
        db.users.forEach((u) => {
            if (!emailsSeed.has(u.email) && !preservados.some((p) => p.id === u.id)) {
                preservados.push(u);
            }
        });

        db.users = preservados;
    }

    function normalizar(db) {
        if (!db.conversas) db.conversas = dbPadrao().conversas;
        if (!db.favoritos) db.favoritos = {};
        if (!db.visitas) db.visitas = [];
        if (!db.imoveis) db.imoveis = [];
        if (!db.users) db.users = [];
        sincronizarUsuariosDemo(db);
        sincronizarCatalogoDemo(db);
        return db;
    }

    function lerDb() {
        try {
            const raw = localStorage.getItem(CHAVE_DB);
            if (!raw) {
                const seed = dbPadrao();
                localStorage.setItem(CHAVE_DB, JSON.stringify(seed));
                return seed;
            }
            return normalizar(JSON.parse(raw));
        } catch (erro) {
            return dbPadrao();
        }
    }

    function salvarDb(db) {
        try {
            localStorage.setItem(CHAVE_DB, JSON.stringify(db));
        } catch (erro) {
            /* ignore quota */
        }
    }

    function erro(status, detail) {
        const e = new Error(detail);
        e.status = status;
        e.detail = detail;
        return e;
    }

    /** Valida telefone BR quando RoomMatchTelefone estiver carregado. */
    function exigirTelefoneBr(valor) {
        if (typeof global.RoomMatchTelefone === 'undefined') {
            const digitos = String(valor || '').replace(/\D/g, '');
            if (digitos.length < 10) {
                throw erro(400, 'Informe um telefone brasileiro com DDD.');
            }
            return String(valor || '').trim();
        }
        const resultado = global.RoomMatchTelefone.validar(valor);
        if (!resultado.ok) {
            throw erro(400, resultado.mensagem || 'Telefone inválido.');
        }
        return resultado.formatado || String(valor || '').trim();
    }

    /** Normaliza aliases de tags para comparação estável. */
    function normalizarTag(tag) {
        const t = String(tag || '').trim().toLowerCase();
        if (t === 'vegano/vegetariano' || t === 'vegetariano/vegano') return 'vegetariano';
        if (t === 'silêncio' || t === 'silencio') return 'silêncio noturno';
        return t;
    }

    /**
     * Match = % das tags do usuário presentes no imóvel.
     * Visitante (sem user/tags): usa match_percent do seed.
     * Zero overlap → 0 (nunca cai no seed).
     * Sem piso/teto artificiais — resultado 0–100.
     */
    function matchPercent(user, imovel) {
        if (!user || !Array.isArray(user.tags) || !user.tags.length) {
            return Number(imovel.match_percent) || 0;
        }
        const tagsUser = user.tags.map(normalizarTag);
        const tagsImovel = new Set((imovel.tags || []).map(normalizarTag));
        const comum = tagsUser.filter((t) => tagsImovel.has(t)).length;
        return Math.round((comum / tagsUser.length) * 100);
    }

    function avaliarElegibilidadeChat(user, imovel) {
        const match = matchPercent(user, imovel);
        const limiar = Number(user && (user.limiar_compatibilidade ?? user.limiar));
        const orcamento = Number(user && (user.orcamento_maximo ?? user.orcamento));
        const limiarOk = !Number.isFinite(limiar) || match >= limiar;
        const orcamentoOk = !Number.isFinite(orcamento) || orcamento <= 0
            || Number(imovel.preco) <= orcamento;
        return {
            match,
            limiar_compatibilidade: Number.isFinite(limiar) ? limiar : null,
            orcamento_maximo: Number.isFinite(orcamento) ? orcamento : null,
            // aliases curtos (compat)
            limiar: Number.isFinite(limiar) ? limiar : null,
            orcamento: Number.isFinite(orcamento) ? orcamento : null,
            limiar_ok: limiarOk,
            orcamento_ok: orcamentoOk,
            chat_liberado: Boolean(user && user.papel === 'Morador' && limiarOk && orcamentoOk)
        };
    }

    function comMatch(imovel, user) {
        const match = matchPercent(user, imovel);
        const eleg = user && user.papel === 'Morador'
            ? avaliarElegibilidadeChat(user, imovel)
            : null;
        return {
            ...imovel,
            match_percent: match,
            match,
            elegibilidade: eleg
        };
    }

    function usuarioAutenticado(db, token) {
        const id = userIdDoToken(token);
        return db.users.find((u) => u.id === id) || null;
    }

    /** Morador no front = locatario no backend (likes, visitas solicitadas). */
    function exigirMorador(user) {
        if (!user) throw erro(401, 'Não autenticado.');
        if (user.papel !== 'Morador') {
            throw erro(403, 'Disponível apenas para moradores (locatário).');
        }
    }

    function exigirLocador(user) {
        if (!user) throw erro(401, 'Não autenticado.');
        if (user.papel !== 'Locador') {
            throw erro(403, 'Disponível apenas para locadores.');
        }
    }

    function filtrarImoveis(lista, query, user) {
        let items = lista.map((i) => comMatch(i, user));
        const tipo = (query.tipo || '').toLowerCase();
        const bairro = (query.bairro || query.q || '').toLowerCase();
        const tag = (query.tag || '').toLowerCase();
        const precoMax = Number(query.preco_max || 0);

        if (tipo && tipo !== 'todos') {
            items = items.filter((i) => i.tipo.toLowerCase().startsWith(tipo.slice(0, 4))
                || i.tipo.toLowerCase().includes(tipo)
                || (tipo === 'apart.' && i.tipo === 'Apartamento'));
        }
        if (bairro) {
            items = items.filter((i) =>
                `${i.titulo} ${i.bairro} ${i.cidade} ${i.endereco || ''}`.toLowerCase().includes(bairro));
        }
        if (tag) {
            items = items.filter((i) => (i.tags || []).some((t) => {
                const nt = normalizarTag(t);
                const nq = normalizarTag(tag);
                return nt === nq || nt.includes(nq) || nq.includes(nt);
            }));
        }
        if (Number.isFinite(precoMax) && precoMax > 0) {
            items = items.filter((i) => Number(i.preco) <= precoMax);
        }
        return items;
    }

    function parseQuery(path) {
        const i = path.indexOf('?');
        if (i < 0) return { pathname: path, query: {} };
        const pathname = path.slice(0, i);
        const query = {};
        new URLSearchParams(path.slice(i + 1)).forEach((v, k) => { query[k] = v; });
        return { pathname, query };
    }

    function parseHorario(rotulo) {
        const hoje = new Date();
        let data = new Date(hoje);
        let hora = '10h';
        if (/amanh/i.test(rotulo)) data.setDate(data.getDate() + 1);
        if (/s[aá]bado/i.test(rotulo)) {
            const dia = data.getDay();
            data.setDate(data.getDate() + ((6 - dia + 7) % 7 || 7));
        }
        const m = rotulo.match(/(\d{1,2})h/i);
        if (m) hora = `${m[1]}h`;
        return { data: data.toISOString().slice(0, 10), hora };
    }

    async function handle(method, path, body, token) {
        const db = lerDb();
        const { pathname, query } = parseQuery(path.replace(/^\/api\/v1/, ''));
        const m = method.toUpperCase();
        const user = usuarioAutenticado(db, token);

        if (m === 'POST' && pathname === '/auth/register') {
            const email = String(body.email || '').trim().toLowerCase();
            const senha = String(body.senha || '');
            const nome = String(body.nome || '').trim();
            const papel = String(body.papel || '').trim();
            if (!email || !email.includes('@')) {
                throw erro(400, 'Informe um e-mail válido.');
            }
            if (senha.length < 6) {
                throw erro(400, 'A senha deve ter ao menos 6 caracteres.');
            }
            if (!nome) throw erro(400, 'Informe o nome.');
            if (!PAPEIS_UI.includes(papel)) {
                throw erro(400, 'Tipo de perfil inválido. Use Morador ou Locador.');
            }
            if (db.users.some((u) => u.email === email)) {
                throw erro(409, 'Este e-mail já está em uso.');
            }
            const telefone = exigirTelefoneBr(body.telefone);
            const novo = {
                id: `u-${Date.now()}`,
                email,
                senha,
                nome,
                papel,
                telefone,
                genero: String(body.genero || '').trim(),
                ocupacao: String(body.ocupacao || '').trim(),
                emprego: String(body.emprego || '').trim(),
                faculdade: String(body.faculdade || '').trim(),
                foto_url: String(body.foto_url || ''),
                tags: Array.isArray(body.tags) ? body.tags : [],
                orcamento: Number(body.orcamento_maximo ?? body.orcamento) || 0,
                limiar: Number(body.limiar_compatibilidade ?? body.limiar) || 70,
                orcamento_maximo: Number(body.orcamento_maximo ?? body.orcamento) || 0,
                limiar_compatibilidade: Number(body.limiar_compatibilidade ?? body.limiar) || 70
            };
            db.users.push(novo);
            salvarDb(db);
            return { access_token: tokenPara(novo), user: publico(novo) };
        }

        if (m === 'POST' && pathname === '/auth/login') {
            const email = String(body.email || '').trim().toLowerCase();
            const senha = String(body.senha || '');
            if (!senha) throw erro(401, 'E-mail ou senha inválidos.');
            const encontrado = db.users.find((u) => u.email === email && u.senha && u.senha === senha);
            if (!encontrado) throw erro(401, 'E-mail ou senha inválidos.');
            return { access_token: tokenPara(encontrado), user: publico(encontrado) };
        }

        if (m === 'GET' && pathname === '/imoveis') {
            return { items: filtrarImoveis(db.imoveis, query, user) };
        }

        if (m === 'GET' && pathname === '/imoveis/meus') {
            exigirLocador(user);
            const items = db.imoveis
                .filter((i) => i.locador_id === user.id)
                .map((i) => comMatch(i, user));
            return { items };
        }

        const getImovel = pathname.match(/^\/imoveis\/([^/]+)$/);
        if (m === 'GET' && getImovel) {
            const imovel = db.imoveis.find((i) => i.id === getImovel[1]);
            if (!imovel) throw erro(404, 'Imóvel não encontrado.');
            return comMatch(imovel, user);
        }

        if (m === 'POST' && pathname === '/imoveis') {
            exigirLocador(user);
            const aluguel = Number(body.aluguel) || 0;
            const condominio = Number(body.condominio) || 0;
            const iptu = Number(body.iptu) || 0;
            const contas = Number(body.contas) || 0;
            const rua = String(body.rua || '').trim();
            const numero = String(body.numero || '').trim();
            const complemento = String(body.complemento || '').trim();
            const bairro = String(body.bairro || '').trim() || 'Campinas';
            const cidade = String(body.cidade || '').trim() || 'Campinas';
            const estado = String(body.estado || 'SP').trim().toUpperCase().slice(0, 2) || 'SP';
            const cep = String(body.cep || '').trim();
            const endereco = String(body.endereco || '').trim() || [
                [rua, numero].filter(Boolean).join(', '),
                complemento ? `(${complemento})` : '',
                [bairro, `${cidade}/${estado}`].filter(Boolean).join(' · ')
            ].filter(Boolean).join(' · ');
            if (!rua || !numero || !bairro || !cidade || !estado) {
                throw erro(400, 'Informe rua, número, bairro, cidade e estado (UF).');
            }
            const criado = {
                id: `imovel-${Date.now()}`,
                titulo: body.titulo || 'Novo anúncio',
                tipo: body.tipo || 'República',
                // enderecos_imovel
                cep,
                rua,
                numero,
                complemento: complemento || null,
                bairro,
                cidade,
                estado,
                endereco,
                preco: aluguel + condominio + iptu + contas,
                match_percent: 70,
                tags: body.tags || [],
                badge: body.tipo || 'Anúncio',
                area_m2: Number(body.area_m2) || 12,
                deslocamento_min: 30,
                destino: 'PUC-Campinas',
                locador_id: user.id,
                aluguel,
                condominio,
                iptu,
                contas,
                classificacao: body.classificacao || 'Mista',
                ...fotosSeed('placeholder')
            };
            db.imoveis.unshift(criado);
            salvarDb(db);
            return criado;
        }

        const patchImovel = pathname.match(/^\/imoveis\/([^/]+)$/);
        if (m === 'PATCH' && patchImovel) {
            if (!user) throw erro(401, 'Não autenticado.');
            const idx = db.imoveis.findIndex((i) => i.id === patchImovel[1]);
            if (idx < 0) throw erro(404, 'Imóvel não encontrado.');
            if (db.imoveis[idx].locador_id !== user.id) throw erro(403, 'Sem permissão.');
            const atual = { ...db.imoveis[idx], ...body };
            atual.aluguel = Number(atual.aluguel) || 0;
            atual.condominio = Number(atual.condominio) || 0;
            atual.iptu = Number(atual.iptu) || 0;
            atual.contas = Number(atual.contas) || 0;
            atual.preco = atual.aluguel + atual.condominio + atual.iptu + atual.contas;
            db.imoveis[idx] = atual;
            salvarDb(db);
            return atual;
        }

        if (m === 'GET' && pathname === '/favoritos') {
            exigirMorador(user);
            const ids = db.favoritos[user.id] || [];
            const items = ids
                .map((id) => db.imoveis.find((i) => i.id === id))
                .filter(Boolean)
                .map((i) => comMatch(i, user));
            return { items, ids };
        }

        const fav = pathname.match(/^\/favoritos\/([^/]+)$/);
        if (fav && (m === 'POST' || m === 'DELETE')) {
            exigirMorador(user);
            const id = fav[1];
            const lista = db.favoritos[user.id] || [];
            let novos;
            if (m === 'DELETE') {
                novos = lista.filter((x) => x !== id);
            } else {
                novos = lista.includes(id) ? lista.filter((x) => x !== id) : [id, ...lista];
            }
            db.favoritos[user.id] = novos;
            salvarDb(db);
            return { favorito: novos.includes(id), ids: novos };
        }

        if (m === 'GET' && pathname === '/visitas') {
            if (!user) throw erro(401, 'Não autenticado.');
            const items = db.visitas
                .filter((v) => {
                    if (user.papel === 'Locador') {
                        const imovel = db.imoveis.find((i) => i.id === v.imovel_id);
                        return imovel && imovel.locador_id === user.id;
                    }
                    return v.usuario_id === user.id;
                })
                .map((v) => {
                    const imovel = db.imoveis.find((i) => i.id === v.imovel_id);
                    return {
                        ...v,
                        imovel_titulo: imovel ? imovel.titulo : v.imovel_id
                    };
                });
            return { items };
        }

        if (m === 'POST' && pathname === '/visitas') {
            exigirMorador(user);
            const imovel = db.imoveis.find((i) => i.id === body.imovel_id);
            if (!imovel) throw erro(404, 'Imóvel não encontrado.');
            const parsed = parseHorario(body.horario || 'Amanhã, 10h');
            const visita = {
                id: `v-${Date.now()}`,
                imovel_id: imovel.id,
                usuario_id: user.id,
                nome: user.nome,
                data: body.data || parsed.data,
                hora: body.hora || parsed.hora,
                status: 'pendente',
                horario_rotulo: body.horario || ''
            };
            db.visitas.push(visita);
            salvarDb(db);
            return visita;
        }

        if (m === 'GET' && pathname === '/stats') {
            const n = db.imoveis.length;
            const matches = db.imoveis.map((i) => matchPercent(user, i));
            const matchMedio = n
                ? Math.round(matches.reduce((s, v) => s + v, 0) / n)
                : 0;
            const desloc = n
                ? Math.round(db.imoveis.reduce((s, i) => s + (i.deslocamento_min || 0), 0) / n)
                : 0;
            const meusAnuncios = user && user.papel === 'Locador'
                ? db.imoveis.filter((i) => i.locador_id === user.id).length
                : 0;
            return {
                imoveis_ativos: n,
                match_medio: matchMedio,
                deslocamento_medio: desloc,
                favoritos: user && user.papel === 'Morador'
                    ? (db.favoritos[user.id] || []).length
                    : 0,
                meus_anuncios: meusAnuncios,
                conversas: user
                    ? db.conversas.filter((c) => c.participantes.includes(user.id)).length
                    : 0
            };
        }

        if (m === 'GET' && pathname === '/me') {
            if (!user) throw erro(401, 'Não autenticado.');
            return publico(user);
        }

        if (m === 'PATCH' && pathname === '/me') {
            if (!user) throw erro(401, 'Não autenticado.');
            const idx = db.users.findIndex((u) => u.id === user.id);
            if (idx < 0) throw erro(401, 'Não autenticado.');

            CAMPOS_PERFIL.forEach((campo) => {
                if (body[campo] === undefined) return;
                if (campo === 'email') {
                    const email = String(body.email || '').trim().toLowerCase();
                    if (!email || !email.includes('@')) {
                        throw erro(400, 'Informe um e-mail válido.');
                    }
                    const conflito = db.users.some(
                        (u, i) => i !== idx && u.email === email
                    );
                    if (conflito) throw erro(409, 'Este e-mail já está em uso.');
                    db.users[idx].email = email;
                    return;
                }
                if (campo === 'foto_url') {
                    db.users[idx].foto_url = String(body.foto_url || '');
                    return;
                }
                if (campo === 'papel') {
                    const papel = String(body.papel || '').trim();
                    if (!PAPEIS_UI.includes(papel)) {
                        throw erro(400, 'Tipo de perfil inválido. Use Morador ou Locador.');
                    }
                    db.users[idx].papel = papel;
                    return;
                }
                if (campo === 'telefone') {
                    db.users[idx].telefone = exigirTelefoneBr(body.telefone);
                    return;
                }
                db.users[idx][campo] = String(body[campo] ?? '').trim();
            });

            if (Array.isArray(body.tags)) db.users[idx].tags = body.tags;
            // Schema: orcamento_maximo / limiar_compatibilidade (aliases legados: orcamento / limiar)
            if (body.orcamento_maximo !== undefined || body.orcamento !== undefined) {
                const v = Number(body.orcamento_maximo ?? body.orcamento);
                db.users[idx].orcamento = v;
                db.users[idx].orcamento_maximo = v;
            }
            if (body.limiar_compatibilidade !== undefined || body.limiar !== undefined) {
                const v = Number(body.limiar_compatibilidade ?? body.limiar);
                db.users[idx].limiar = v;
                db.users[idx].limiar_compatibilidade = v;
            }
            // id, senha e campos desconhecidos nunca entram por este PATCH.
            salvarDb(db);
            return publico(db.users[idx]);
        }

        if (m === 'POST' && pathname === '/me/senha') {
            if (!user) throw erro(401, 'Não autenticado.');
            const idx = db.users.findIndex((u) => u.id === user.id);
            if (String(body.senha_atual || '') !== db.users[idx].senha) {
                throw erro(400, 'Senha atual incorreta.');
            }
            if (!body.senha_nova || String(body.senha_nova).length < 6) {
                throw erro(400, 'Nova senha deve ter ao menos 6 caracteres.');
            }
            db.users[idx].senha = String(body.senha_nova);
            salvarDb(db);
            return { ok: true };
        }

        if (m === 'POST' && pathname === '/auth/recuperar') {
            const email = String(body.email || '').trim().toLowerCase();
            const existe = db.users.some((u) => u.email === email);
            return {
                ok: true,
                message: existe
                    ? 'Enviamos um link de recuperação para o e-mail informado.'
                    : 'Se o e-mail existir, enviaremos o link de recuperação.'
            };
        }

        function enriquecerConversa(c) {
            const imovel = db.imoveis.find((i) => i.id === c.imovel_id);
            const outroId = c.participantes.find((id) => id !== (user && user.id));
            const outro = db.users.find((u) => u.id === outroId);
            const ultima = c.mensagens[c.mensagens.length - 1];
            return {
                id: c.id,
                imovel_id: c.imovel_id,
                imovel_titulo: imovel ? imovel.titulo : c.imovel_id,
                imovel_preco: imovel ? imovel.preco : null,
                imovel_bairro: imovel ? imovel.bairro : null,
                imovel_capa: imovel ? (imovel.capa || (imovel.fotos && imovel.fotos[0]) || null) : null,
                outro: outro ? publico(outro) : null,
                ultima_mensagem: ultima ? ultima.texto : '',
                atualizado_em: ultima ? ultima.em : null,
                mensagens: c.mensagens.map((msg) => ({
                    ...msg,
                    minha: user ? msg.autor_id === user.id : false,
                    autor_nome: (db.users.find((u) => u.id === msg.autor_id) || {}).nome || 'Usuário'
                }))
            };
        }

        if (m === 'GET' && pathname === '/conversas') {
            if (!user) throw erro(401, 'Não autenticado.');
            const items = db.conversas
                .filter((c) => c.participantes.includes(user.id))
                .map(enriquecerConversa)
                .sort((a, b) => String(b.atualizado_em).localeCompare(String(a.atualizado_em)));
            return { items };
        }

        const getConv = pathname.match(/^\/conversas\/([^/]+)$/);
        if (m === 'GET' && getConv) {
            if (!user) throw erro(401, 'Não autenticado.');
            const conv = db.conversas.find((c) => c.id === getConv[1]);
            if (!conv || !conv.participantes.includes(user.id)) {
                throw erro(404, 'Conversa não encontrada.');
            }
            return enriquecerConversa(conv);
        }

        if (m === 'POST' && pathname === '/conversas') {
            if (!user) throw erro(401, 'Não autenticado.');
            const imovel = db.imoveis.find((i) => i.id === body.imovel_id);
            if (!imovel) throw erro(404, 'Imóvel não encontrado.');
            const locadorId = imovel.locador_id;
            if (user.id === locadorId) {
                throw erro(400, 'Locador já é dono do anúncio.');
            }
            if (user.papel === 'Morador') {
                const eleg = avaliarElegibilidadeChat(user, imovel);
                if (!eleg.chat_liberado) {
                    const partes = [];
                    if (!eleg.limiar_ok) {
                        partes.push(`match ${eleg.match}% abaixo do limiar ${eleg.limiar}%`);
                    }
                    if (!eleg.orcamento_ok) {
                        partes.push(
                            `preço R$ ${imovel.preco} acima do orçamento R$ ${eleg.orcamento}`
                        );
                    }
                    throw erro(
                        403,
                        `Chat bloqueado: ${partes.join('; ')}. Ajuste preferências ou escolha outro imóvel.`
                    );
                }
            }
            let conv = db.conversas.find((c) =>
                c.imovel_id === imovel.id
                && c.participantes.includes(user.id)
                && c.participantes.includes(locadorId));
            if (!conv) {
                conv = {
                    id: `c-${Date.now()}`,
                    imovel_id: imovel.id,
                    participantes: [user.id, locadorId],
                    mensagens: [
                        {
                            id: `m-${Date.now()}`,
                            autor_id: user.id,
                            texto: body.texto || `Olá! Tenho interesse em “${imovel.titulo}”.`,
                            em: agoraIso()
                        }
                    ]
                };
                db.conversas.push(conv);
                salvarDb(db);
            }
            return enriquecerConversa(conv);
        }

        const postMsg = pathname.match(/^\/conversas\/([^/]+)\/mensagens$/);
        if (m === 'POST' && postMsg) {
            if (!user) throw erro(401, 'Não autenticado.');
            const conv = db.conversas.find((c) => c.id === postMsg[1]);
            if (!conv || !conv.participantes.includes(user.id)) {
                throw erro(404, 'Conversa não encontrada.');
            }
            const texto = String(body.texto || '').trim();
            if (!texto) throw erro(400, 'Mensagem vazia.');
            conv.mensagens.push({
                id: `m-${Date.now()}`,
                autor_id: user.id,
                texto,
                em: agoraIso()
            });
            salvarDb(db);
            return enriquecerConversa(conv);
        }

        throw erro(404, `Rota mock não encontrada: ${m} ${pathname}`);
    }

    global.RoomMatchMock = {
        handle,
        matchPercent,
        avaliarElegibilidadeChat,
        normalizarTag,
        reset() {
            localStorage.removeItem(CHAVE_DB);
        },
        /** Contas de teste do mock (não usar em API real). */
        demoAccounts: Object.freeze([
            { email: 'morador@demo.com', senha: 'demo123', papel: 'Morador' },
            { email: 'locador@demo.com', senha: 'demo123', papel: 'Locador' }
        ])
    };
}(window));
