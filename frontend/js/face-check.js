/**
 * Verificação de rosto em foto de perfil (todas as telas com data-face-perfil).
 * FaceDetector nativo → fallback BlazeFace (CDN).
 */
(function (global) {
    const SCRIPTS_BLAZE = [
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js',
        'https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js'
    ];
    const TAMANHO_MAXIMO = 5 * 1024 * 1024;
    const LADO_MINIMO = 200;

    let blazeModelPromise = null;
    const scriptsPendentes = new Map();

    function carregarScript(src) {
        if (scriptsPendentes.has(src)) return scriptsPendentes.get(src);

        const promessa = new Promise((resolve, reject) => {
            const existente = document.querySelector(`script[data-rm-face-src="${CSS.escape(src)}"]`)
                || document.querySelector(`script[data-rm-face-src="${src}"]`);
            if (existente) {
                if (existente.dataset.rmFaceReady === '1') {
                    resolve();
                    return;
                }
                existente.addEventListener('load', () => resolve(), { once: true });
                existente.addEventListener('error', () => reject(new Error('Falha ao carregar verificador de rosto.')), { once: true });
                return;
            }

            const s = document.createElement('script');
            s.src = src;
            s.async = false;
            s.dataset.rmFaceSrc = src;
            s.onload = () => {
                s.dataset.rmFaceReady = '1';
                resolve();
            };
            s.onerror = () => reject(new Error('Falha ao carregar verificador de rosto (rede/CDN).'));
            document.head.appendChild(s);
        });

        scriptsPendentes.set(src, promessa);
        promessa.catch(() => scriptsPendentes.delete(src));
        return promessa;
    }

    function carregarImagem(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Imagem inválida.'));
            img.src = dataUrl;
        });
    }

    function lerArquivoComoDataUrl(arquivo) {
        return new Promise((resolve, reject) => {
            const leitor = new FileReader();
            leitor.onload = () => resolve(String(leitor.result || ''));
            leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
            leitor.readAsDataURL(arquivo);
        });
    }

    async function detectarComFaceDetector(img) {
        if (typeof FaceDetector !== 'function') return null;
        try {
            const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
            const faces = await detector.detect(img);
            return Array.isArray(faces) ? faces.length : 0;
        } catch (erro) {
            return null;
        }
    }

    async function garantirBlazeFace() {
        if (blazeModelPromise) return blazeModelPromise;
        blazeModelPromise = (async () => {
            for (const src of SCRIPTS_BLAZE) {
                await carregarScript(src);
            }
            const tf = global.tf;
            const api = global.blazeface;
            if (!tf || !api || typeof api.load !== 'function') {
                throw new Error('Verificador de rosto indisponível. Verifique a conexão e tente de novo.');
            }
            try {
                await tf.setBackend('webgl');
            } catch (erro) {
                await tf.setBackend('cpu');
            }
            await tf.ready();
            return api.load();
        })().catch((erro) => {
            blazeModelPromise = null;
            throw erro;
        });
        return blazeModelPromise;
    }

    async function detectarComBlazeFace(img) {
        const model = await garantirBlazeFace();
        let entrada = img;
        try {
            if (typeof createImageBitmap === 'function') {
                entrada = await createImageBitmap(img);
            }
        } catch (erro) {
            entrada = img;
        }
        const predicoes = await model.estimateFaces(entrada, false);
        if (entrada && typeof entrada.close === 'function' && entrada !== img) {
            try {
                entrada.close();
            } catch (e) {
                /* ignore */
            }
        }
        return Array.isArray(predicoes) ? predicoes.length : 0;
    }

    async function exigirRosto(dataUrl) {
        const img = await carregarImagem(dataUrl);
        let rostos = await detectarComFaceDetector(img);
        let motor = 'FaceDetector';

        if (rostos == null) {
            try {
                rostos = await detectarComBlazeFace(img);
                motor = 'BlazeFace';
            } catch (erro) {
                const falha = new Error(
                    erro.message || 'Verificador de rosto indisponível. Verifique a conexão e tente de novo.'
                );
                falha.code = 'VERIFICADOR_INDISPONIVEL';
                throw falha;
            }
        }

        if (!rostos || rostos < 1) {
            const err = new Error(
                'Não detectamos um rosto na foto. Use uma imagem nítida do seu rosto (de frente, bem iluminada).'
            );
            err.code = 'SEM_ROSTO';
            throw err;
        }

        return { ok: true, rostos, motor };
    }

    async function processarArquivo(arquivo) {
        if (!arquivo) throw new Error('Selecione uma foto.');
        if (!['image/jpeg', 'image/png'].includes(arquivo.type)) {
            throw new Error('Use uma imagem JPG ou PNG.');
        }
        if (arquivo.size > TAMANHO_MAXIMO) {
            throw new Error('A foto deve ter no máximo 5 MB.');
        }
        const dataUrl = await lerArquivoComoDataUrl(arquivo);
        const img = await carregarImagem(dataUrl);
        if (img.naturalWidth < LADO_MINIMO || img.naturalHeight < LADO_MINIMO) {
            throw new Error('A foto deve ter no mínimo 200×200 px.');
        }
        await exigirRosto(dataUrl);
        return dataUrl;
    }

    function garantirStatusEl(input, statusEl) {
        if (statusEl) return statusEl;
        const id = `${input.id || 'foto'}-face-status`;
        let el = document.getElementById(id);
        if (el) return el;
        el = document.createElement('p');
        el.id = id;
        el.className = 'face-check-status';
        el.hidden = true;
        const ancora = input.closest('.foto-info, .perfil-foto-acoes, .campo, .foto') || input.parentElement;
        (ancora || input.parentElement)?.appendChild(el);
        return el;
    }

    function pintarStatus(el, texto, tipo) {
        if (!el) return;
        el.hidden = !texto;
        el.textContent = texto || '';
        el.classList.remove('ok', 'erro', 'info');
        if (tipo) el.classList.add(tipo);
    }

    /**
     * Liga um <input type=file data-face-perfil> com verificação de rosto.
     * @param {HTMLInputElement} input
     * @param {{ statusEl?: HTMLElement, onAceita?: (dataUrl: string) => void, onRecusa?: (erro: Error) => void }} [opts]
     */
    function ligarEntrada(input, opts = {}) {
        if (!input || input.dataset.rmFaceBound === '1') return;
        input.dataset.rmFaceBound = '1';
        input.setAttribute('data-face-perfil', '1');
        input.accept = input.accept || 'image/jpeg,image/png';

        const statusEl = garantirStatusEl(input, opts.statusEl);
        if (!statusEl.dataset.rmHint) {
            statusEl.dataset.rmHint = '1';
            pintarStatus(statusEl, 'Verificação de rosto ativa nesta foto.', 'info');
            statusEl.hidden = false;
        }

        input.addEventListener('change', async () => {
            const arquivo = input.files?.[0];
            input.value = '';
            if (!arquivo) return;

            pintarStatus(statusEl, 'Verificando rosto na foto…', 'info');
            input.setCustomValidity('Verificando rosto na foto…');

            try {
                const dataUrl = await processarArquivo(arquivo);
                input.setCustomValidity('');
                pintarStatus(statusEl, 'Rosto detectado. Foto aceita.', 'ok');
                if (typeof opts.onAceita === 'function') opts.onAceita(dataUrl);
                input.dispatchEvent(new CustomEvent('rm-face-ok', { detail: { dataUrl }, bubbles: true }));
            } catch (erro) {
                const msg = erro.message || 'Não foi possível usar esta foto.';
                input.setCustomValidity(msg);
                pintarStatus(statusEl, msg, 'erro');
                if (typeof opts.onRecusa === 'function') opts.onRecusa(erro);
                input.dispatchEvent(new CustomEvent('rm-face-erro', { detail: { erro }, bubbles: true }));
                try {
                    input.reportValidity();
                } catch (e) {
                    /* ignore */
                }
            }
        });
    }

    function ligarTodos(mapaHooks = {}) {
        document.querySelectorAll('input[data-face-perfil], input#foto, input#perfil-foto').forEach((input) => {
            const hooks = mapaHooks[input.id] || {};
            ligarEntrada(input, hooks);
        });
    }

    global.RoomMatchFaceCheck = {
        exigirRosto,
        processarArquivo,
        ligarEntrada,
        ligarTodos,
        aquecer() {
            garantirBlazeFace().catch(() => {});
        }
    };

    function boot() {
        // Hooks específicos das páginas (se os handlers já existirem, eles registram depois).
        // Aqui só marca inputs padrão para o status visível; páginas chamam ligarEntrada com onAceita.
        document.querySelectorAll('input[data-face-perfil]').forEach((input) => {
            garantirStatusEl(input);
            const el = document.getElementById(`${input.id || 'foto'}-face-status`);
            if (el && el.hidden) {
                pintarStatus(el, 'Verificação de rosto ativa nesta foto.', 'info');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}(window));
