/**
 * Cliente HTTP central (KAN-49).
 * Modo padrão: mock (RoomMatchMock) — publicável sem backend.
 * API real:
 *   localStorage.setItem('roommatch-api-mode', 'live')
 *   localStorage.setItem('roommatch-api-base', 'https://sua-api.exemplo.com')
 *
 * Contrato: docs/frontend/papeis-e-rotas-api-v1.md
 * Deploy: frontend/README.md
 */
(function (global) {
    const CHAVE_TOKEN = 'roommatch-token';
    const CHAVE_USER = 'roommatch-user';
    const CHAVE_MODE = 'roommatch-api-mode';
    const CHAVE_BASE = 'roommatch-api-base';
    const PREFIXO = '/api/v1';

    /** Contrato estável para o backend espelhar (não mudar sem atualizar docs). */
    const CONTRATO = Object.freeze({
        version: 'v1',
        prefix: PREFIXO,
        papeisUi: Object.freeze({ Morador: 'locatario', Locador: 'locador' }),
        /** Editáveis via PATCH /me. */
        camposPerfil: Object.freeze([
            'nome',
            'telefone',
            'genero',
            'ocupacao',
            'emprego',
            'faculdade',
            'foto_url',
            'email',
            'papel'
        ]),
        /**
         * Se `papel` mudar (Morador↔Locador), o backend DEVE migrar
         * registro locatario ↔ locador e invalidar permissões antigas.
         */
        filtrosImoveis: Object.freeze([
            'tipo',
            'bairro',
            'preco_max',
            'tag'
        ]),
        camposLocatario: Object.freeze([
            'orcamento_maximo',
            'limiar_compatibilidade',
            'tags'
        ]),
        camposImovelValor: Object.freeze([
            'aluguel',
            'condominio',
            'iptu',
            'contas',
            'preco'
        ]),
        /** Schema `enderecos_imovel` / EnderecoImovel (API). */
        camposEnderecoImovel: Object.freeze([
            'rua',
            'numero',
            'complemento',
            'bairro',
            'cidade',
            'estado',
            'cep',
            'latitude',
            'longitude'
        ]),
        auth: Object.freeze({
            login: 'POST /auth/login → { access_token, user }',
            register: 'POST /auth/register → { access_token, user }',
            header: 'Authorization: Bearer <access_token>'
        })
    });

    function modo() {
        try {
            return localStorage.getItem(CHAVE_MODE) || 'mock';
        } catch (erro) {
            return 'mock';
        }
    }

    function baseUrl() {
        try {
            return localStorage.getItem(CHAVE_BASE) || 'http://127.0.0.1:8000';
        } catch (erro) {
            return 'http://127.0.0.1:8000';
        }
    }

    function detalheErro(dados, status) {
        const d = dados?.detail ?? dados?.message;
        if (typeof d === 'string') return d;
        if (Array.isArray(d)) {
            return d.map((item) => item.msg || item.message || JSON.stringify(item)).join(' · ');
        }
        if (d && typeof d === 'object') return JSON.stringify(d);
        return `Erro ${status}`;
    }

    function lerToken() {
        try {
            return localStorage.getItem(CHAVE_TOKEN);
        } catch (erro) {
            return null;
        }
    }

    function salvarSessao(token, user) {
        try {
            if (token) localStorage.setItem(CHAVE_TOKEN, token);
            if (user) localStorage.setItem(CHAVE_USER, JSON.stringify(user));
            localStorage.removeItem('roommatch-logado');
        } catch (erro) {
            /* ignore */
        }
    }

    function limparSessao() {
        try {
            localStorage.removeItem(CHAVE_TOKEN);
            localStorage.removeItem(CHAVE_USER);
            localStorage.removeItem('roommatch-logado');
        } catch (erro) {
            /* ignore */
        }
    }

    function lerUsuario() {
        try {
            const raw = localStorage.getItem(CHAVE_USER);
            return raw ? JSON.parse(raw) : null;
        } catch (erro) {
            return null;
        }
    }

    async function request(path, opcoes = {}) {
        const method = (opcoes.method || 'GET').toUpperCase();
        const auth = opcoes.auth !== false;
        const body = opcoes.body;
        const token = auth ? lerToken() : null;
        const pathApi = path.startsWith('/api/')
            ? path
            : `${PREFIXO}${path.startsWith('/') ? path : `/${path}`}`;

        if (modo() === 'mock') {
            if (!global.RoomMatchMock) {
                throw Object.assign(new Error('Mock API não carregada.'), { status: 500 });
            }
            try {
                return await global.RoomMatchMock.handle(method, pathApi, body || {}, token);
            } catch (erro) {
                if (erro.status === 401) {
                    limparSessao();
                    if (!opcoes.silencioso) {
                        window.location.href = 'login.html';
                    }
                }
                throw erro;
            }
        }

        const headers = { Accept: 'application/json', ...(opcoes.headers || {}) };
        if (body !== undefined && !(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        if (token) headers.Authorization = `Bearer ${token}`;

        const resposta = await fetch(`${baseUrl()}${pathApi}`, {
            method,
            headers,
            body: body === undefined
                ? undefined
                : (body instanceof FormData ? body : JSON.stringify(body))
        });

        if (resposta.status === 401) {
            limparSessao();
            if (!opcoes.silencioso) window.location.href = 'login.html';
            throw Object.assign(new Error('Não autenticado.'), { status: 401 });
        }

        const texto = await resposta.text();
        let dados = null;
        try {
            dados = texto ? JSON.parse(texto) : null;
        } catch (erro) {
            dados = { detail: texto };
        }

        if (!resposta.ok) {
            const detail = detalheErro(dados, resposta.status);
            throw Object.assign(new Error(detail), {
                status: resposta.status,
                detail,
                body: dados
            });
        }
        return dados;
    }

    const api = {
        CONTRATO,
        modo,
        baseUrl,
        request,
        lerToken,
        lerUsuario,
        salvarSessao,
        limparSessao,
        login: (email, senha) => request('/auth/login', {
            method: 'POST',
            body: { email, senha },
            auth: false,
            silencioso: true
        }),
        register: (payload) => request('/auth/register', {
            method: 'POST',
            body: payload,
            auth: false,
            silencioso: true
        }),
        listarImoveis: (params = {}) => {
            const qs = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') qs.set(k, v);
            });
            const sufixo = qs.toString() ? `?${qs}` : '';
            return request(`/imoveis${sufixo}`, {
                auth: Boolean(lerToken()),
                silencioso: true
            });
        },
        obterImovel: (id) => request(`/imoveis/${id}`, {
            auth: Boolean(lerToken()),
            silencioso: true
        }),
        meusImoveis: () => request('/imoveis/meus'),
        criarImovel: (payload) => request('/imoveis', { method: 'POST', body: payload }),
        atualizarImovel: (id, payload) => request(`/imoveis/${id}`, { method: 'PATCH', body: payload }),
        listarFavoritos: () => request('/favoritos'),
        alternarFavorito: (id) => request(`/favoritos/${id}`, { method: 'POST' }),
        listarVisitas: () => request('/visitas'),
        criarVisita: (payload) => request('/visitas', { method: 'POST', body: payload }),
        stats: () => request('/stats', {
            auth: Boolean(lerToken()),
            silencioso: true
        }),
        meuPerfil: () => request('/me'),
        atualizarPerfil: (payload) => request('/me', { method: 'PATCH', body: payload }),
        alterarSenha: (payload) => request('/me/senha', { method: 'POST', body: payload }),
        recuperarSenha: (email) => request('/auth/recuperar', {
            method: 'POST',
            body: { email },
            auth: false,
            silencioso: true
        }),
        listarConversas: () => request('/conversas'),
        obterConversa: (id) => request(`/conversas/${id}`),
        abrirConversa: (payload) => request('/conversas', { method: 'POST', body: payload }),
        enviarMensagem: (id, texto) => request(`/conversas/${id}/mensagens`, {
            method: 'POST',
            body: { texto }
        })
    };

    global.RoomMatchApi = api;
}(window));
