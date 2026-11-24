/**
 * Cliente HTTP central (KAN-49).
 *
 * Modo:
 *  - Padrão: `live` (API real + banco). Mock só com `?api=mock` explícito.
 *  - `?api=mock` ou `?api=live` na URL troca e guarda a escolha neste navegador.
 *  - Manual: localStorage 'roommatch-api-mode' ('mock'|'live') e 'roommatch-api-base'.
 *  - Em localhost a base padrão é http://127.0.0.1:8000.
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

    /**
     * Endereço da API publicada (ex.: 'https://roommatch-api.onrender.com'), sem barra no fim.
     * Preencha depois do deploy (ver README, "Deploy").
     */
    const API_PRODUCAO = '';
    const EM_DESENVOLVIMENTO = ['localhost', '127.0.0.1', ''].includes(global.location.hostname);

    try {
        const pedido = new URLSearchParams(global.location.search).get('api');
        if (pedido === 'mock' || pedido === 'live') localStorage.setItem(CHAVE_MODE, pedido);
    } catch (erro) {
        /* sem localStorage: segue o padrão */
    }

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

    function modoPadrao() {
        // RoomMatch usa dados reais (API + banco). Mock só com ?api=mock explícito.
        return 'live';
    }

    function modo() {
        try {
            const salvo = localStorage.getItem(CHAVE_MODE);
            // Migra quem ainda tinha mock gravado por padrão antigo do localhost.
            if (salvo === 'mock') {
                const pedido = new URLSearchParams(global.location.search).get('api');
                if (pedido !== 'mock') {
                    localStorage.setItem(CHAVE_MODE, 'live');
                    return 'live';
                }
            }
            return salvo || modoPadrao();
        } catch (erro) {
            return modoPadrao();
        }
    }

    function basePadrao() {
        return (!EM_DESENVOLVIMENTO && API_PRODUCAO) || 'http://127.0.0.1:8000';
    }

    function baseUrl() {
        try {
            return localStorage.getItem(CHAVE_BASE) || basePadrao();
        } catch (erro) {
            return basePadrao();
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

        const texto = await resposta.text();
        let dados = null;
        try {
            dados = texto ? JSON.parse(texto) : null;
        } catch (erro) {
            dados = { detail: texto };
        }

        if (resposta.status === 401) {
            limparSessao();
            if (!opcoes.silencioso) window.location.href = 'login.html';
            const detail = detalheErro(dados, 401);
            throw Object.assign(new Error(detail || 'Não autenticado.'), { status: 401, detail });
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

    /** Escapa texto vindo do servidor antes de ir para innerHTML (anúncios, mensagens). */
    function esc(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }
    global.escHtml = esc;

    const api = {
        CONTRATO,
        esc,
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
        excluirImovel: (id) => request(`/imoveis/${id}`, { method: 'DELETE' }),
        enviarFotos: (id, arquivos) => {
            const corpo = new FormData();
            arquivos.forEach((arquivo, i) => corpo.append('fotos', arquivo, arquivo.name || `foto-${i + 1}.jpg`));
            return request(`/imoveis/${id}/fotos`, { method: 'POST', body: corpo });
        },
        removerFoto: (id, idImagem) => request(`/imoveis/${id}/fotos/${idImagem}`, { method: 'DELETE' }),
        listarFavoritos: () => request('/favoritos'),
        alternarFavorito: (id) => request(`/favoritos/${id}`, { method: 'POST' }),
        stats: () => request('/stats', {
            auth: Boolean(lerToken()),
            silencioso: true
        }),
        meuPerfil: () => request('/me'),
        atualizarPerfil: (payload) => request('/me', { method: 'PATCH', body: payload }),
        alterarSenha: (payload) => request('/me/senha', { method: 'POST', body: payload }),
        redefinirSenha: (token, senhaNova) => request('/auth/redefinir', {
            method: 'POST',
            body: { token, senha_nova: senhaNova },
            auth: false,
            silencioso: true
        }),
        recuperarSenha: (email) => request('/auth/recuperar', {
            method: 'POST',
            body: { email },
            auth: false,
            silencioso: true
        }),
        listarNotificacoes: () => request('/notificacoes', { silencioso: true }),
        marcarNotificacoesLidas: (ids) => request('/notificacoes/lidas', {
            method: 'POST',
            body: ids ? { ids } : {},
            silencioso: true
        }),
        rotaOnibus: (params) => request(`/mobilidade/rota?${new URLSearchParams(params)}`),
        reenviarVerificacao: () => request('/me/verificacao', { method: 'POST' }),
        verificarEmail: (token) => request('/auth/verificar', {
            method: 'POST',
            body: { token },
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
