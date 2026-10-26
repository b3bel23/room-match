/**
 * Mock API in-browser (KAN-49 bridge until FastAPI is live).
 * Persists seed + mutations in localStorage under roommatch-mock-db.
 *
 * Contrato de papéis (espelha backend: locatario / locador):
 * docs/frontend/papeis-e-rotas-api-v1.md
 */
(function (global) {
    const CHAVE_DB = 'roommatch-mock-db-v4';

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
                { iniciais: 'JS', nome: 'João Santos', linha: 'Eng. Software · 28 anos', estilo: 'foto-1' },
                { iniciais: 'AC', nome: 'Ana Costa', linha: 'Med. Veterinária · 24 anos', estilo: 'foto-2' },
                { iniciais: 'PL', nome: 'Pedro Lima', linha: 'Estudante Econ. · 22 anos', estilo: 'foto-3' }
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
                { iniciais: 'MR', nome: 'Marina Rocha', linha: 'Designer · 26 anos', estilo: 'foto-2' },
                { iniciais: 'TF', nome: 'Tiago Ferreira', linha: 'Estudante Eng. · 23 anos', estilo: 'foto-3' }
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
                { iniciais: 'LC', nome: 'Laura Campos', linha: 'Medicina · 25 anos', estilo: 'foto-2' },
                { iniciais: 'BF', nome: 'Beatriz Freitas', linha: 'Arquitetura · 24 anos', estilo: 'foto-3' }
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
            titulo: 'Quarto suite · Taquaral',
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

    const SEED_USERS = [
        {
            id: 'u-morador',
            email: 'morador@demo.com',
            senha: 'demo123',
            nome: 'Morador Demo',
            papel: 'Morador',
            tags: ['Pet Friendly', 'Silêncio Noturno', 'Home Office'],
            orcamento: 1200,
            limiar: 70
        },
        {
            id: 'u-locador',
            email: 'locador@demo.com',
            senha: 'demo123',
            nome: 'Locador Demo',
            papel: 'Locador',
            tags: ['Pet Friendly', 'Sem Festas', 'Silêncio Noturno'],
            orcamento: 5000,
            limiar: 60
        }
    ];

    const EMAILS_DEMO = SEED_USERS.map((u) => u.email);

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
            // Schema: locatario | locador (API futura pode usar estes)
            papel_schema: user.papel === 'Locador' ? 'locador' : 'locatario',
            iniciais: iniciais(user.nome),
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
                    nome: 'Morador Demo',
                    data: offsetIso(1),
                    hora: '18h',
                    status: 'confirmada'
                },
                {
                    id: 'v2',
                    imovel_id: 'kitnet-cambui',
                    usuario_id: 'u-morador',
                    nome: 'Morador Demo',
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
                            texto: 'Oi, Morador Demo! Vi que você curtiu o quarto em Barão Geraldo. Posso te mostrar o imóvel amanhã às 18h?',
                            em: agoraIso()
                        },
                        {
                            id: 'm2',
                            autor_id: 'u-morador',
                            texto: 'Oi, Locador Demo! Pode sim. O condomínio aceita pet pequeno mesmo?',
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
        const preservados = [];
        SEED_USERS.forEach((seed) => {
            const existente = db.users.find((u) => u.email === seed.email);
            if (existente) {
                preservados.push({
                    ...seed,
                    id: existente.id,
                    senha: existente.senha,
                    tags: existente.tags?.length ? existente.tags : seed.tags,
                    orcamento: existente.orcamento ?? seed.orcamento,
                    limiar: existente.limiar ?? seed.limiar
                });
            } else {
                preservados.push({ ...seed });
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
            items = items.filter((i) => i.tags.some((t) => t.toLowerCase().includes(tag)));
        }
        if (precoMax > 0) {
            items = items.filter((i) => i.preco <= precoMax);
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
            throw erro(
                403,
                'Na demo existem apenas as contas Morador Demo (morador@demo.com) e Locador Demo (locador@demo.com). Use Entrar.'
            );
        }

        if (m === 'POST' && pathname === '/auth/login') {
            const email = String(body.email || '').trim().toLowerCase();
            const encontrado = db.users.find((u) => u.email === email && u.senha === String(body.senha || ''));
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
            const criado = {
                id: `imovel-${Date.now()}`,
                titulo: body.titulo || 'Novo anúncio',
                tipo: body.tipo || 'República',
                bairro: body.bairro || 'Campinas',
                cidade: 'Campinas',
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
                endereco: body.endereco || '',
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
            if (body.nome && !EMAILS_DEMO.includes(db.users[idx].email)) {
                db.users[idx].nome = String(body.nome).trim();
            }
            if (Array.isArray(body.tags)) db.users[idx].tags = body.tags;
            if (body.orcamento_maximo !== undefined || body.orcamento !== undefined) {
                db.users[idx].orcamento = Number(body.orcamento_maximo ?? body.orcamento);
            }
            if (body.limiar_compatibilidade !== undefined || body.limiar !== undefined) {
                db.users[idx].limiar = Number(body.limiar_compatibilidade ?? body.limiar);
            }
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
                    ? 'Enviamos um link de recuperação para o e-mail informado (demo).'
                    : 'Se o e-mail existir, enviaremos o link de recuperação (demo).'
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
        demoAccounts: [
            { email: 'morador@demo.com', senha: 'demo123', papel: 'Morador', nome: 'Morador Demo' },
            { email: 'locador@demo.com', senha: 'demo123', papel: 'Locador', nome: 'Locador Demo' }
        ]
    };
}(window));
