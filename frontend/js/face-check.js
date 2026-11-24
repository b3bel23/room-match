/**
 * Verificação rigorosa de foto de perfil (data-face-perfil).
 * Aceita só retrato de uma pessoa, de frente, nítido e bem enquadrado.
 * Motor principal: BlazeFace (confiança + geometria). Fallback: FaceDetector.
 */
(function (global) {
    const SCRIPTS_BLAZE = [
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js',
        'https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js',
    ];

    const TAMANHO_MAXIMO = 5 * 1024 * 1024;
    const LADO_MINIMO = 400;
    /** Confiança mínima BlazeFace (0–1). */
    const PROB_MIN = 0.85;
    /** Rosto precisa ocupar pelo menos esta fração da área da imagem. */
    const AREA_MIN = 0.055;
    /** Largura do rosto ≥ fração da largura da imagem. */
    const LARGURA_MIN = 0.14;
    /** Centro do rosto deve ficar nesta faixa horizontal/vertical (0–1). */
    const CENTRO_MIN = 0.18;
    const CENTRO_MAX = 0.82;
    /** Proporção largura/altura do box do rosto. */
    const ASPECTO_MIN = 0.55;
    const ASPECTO_MAX = 1.45;

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

    function erroFoto(code, mensagem) {
        const err = new Error(mensagem);
        err.code = code;
        return err;
    }

    function boxDePredicao(pred) {
        // BlazeFace: topLeft / bottomRight (arrays) ou box
        if (pred.topLeft && pred.bottomRight) {
            const x1 = Number(pred.topLeft[0]);
            const y1 = Number(pred.topLeft[1]);
            const x2 = Number(pred.bottomRight[0]);
            const y2 = Number(pred.bottomRight[1]);
            return {
                x: Math.min(x1, x2),
                y: Math.min(y1, y2),
                width: Math.abs(x2 - x1),
                height: Math.abs(y2 - y1),
                prob: Array.isArray(pred.probability)
                    ? Number(pred.probability[0])
                    : Number(pred.probability || 1),
            };
        }
        // FaceDetector: boundingBox DOMRectReadOnly
        const b = pred.boundingBox || pred;
        return {
            x: Number(b.x ?? b.left ?? 0),
            y: Number(b.y ?? b.top ?? 0),
            width: Number(b.width || 0),
            height: Number(b.height || 0),
            prob: 1,
        };
    }

    function avaliarGeometria(box, imgW, imgH) {
        if (!box || box.width < 28 || box.height < 28) {
            return erroFoto(
                'ROSTO_PEQUENO',
                'Rosto pequeno demais. Aproxime um pouco a câmera.'
            );
        }

        const areaImg = imgW * imgH;
        const areaRosto = box.width * box.height;
        if (areaImg > 0 && areaRosto / areaImg < AREA_MIN) {
            return erroFoto(
                'ROSTO_DISTANTE',
                'Rosto um pouco longe. Aproxime a câmera ou recorte a foto deixando o rosto mais no centro.'
            );
        }
        if (box.width / imgW < LARGURA_MIN) {
            return erroFoto(
                'ROSTO_ESTREITO',
                'Enquadre melhor: o rosto precisa aparecer com mais destaque na foto.'
            );
        }

        const aspecto = box.width / box.height;
        if (aspecto < ASPECTO_MIN || aspecto > ASPECTO_MAX) {
            return erroFoto(
                'ENQUADRAMENTO',
                'Enquadramento inválido. Foto de frente, sem corte estranho na cabeça ou no queixo.'
            );
        }

        const cx = (box.x + box.width / 2) / imgW;
        const cy = (box.y + box.height / 2) / imgH;
        if (cx < CENTRO_MIN || cx > CENTRO_MAX || cy < CENTRO_MIN || cy > CENTRO_MAX) {
            return erroFoto(
                'FORA_DO_CENTRO',
                'Centralize o rosto na foto. Evite cantos e margens.'
            );
        }

        // Margem: box não pode colar nas bordas (corta testa/queixo).
        const margem = 0.02;
        if (
            box.x / imgW < margem
            || box.y / imgH < margem
            || (box.x + box.width) / imgW > 1 - margem
            || (box.y + box.height) / imgH > 1 - margem
        ) {
            return erroFoto(
                'CORTADO',
                'Rosto cortado nas bordas. Deixe um pouco de espaço acima da cabeça e abaixo do queixo.'
            );
        }

        return null;
    }

    async function detectarComFaceDetector(img) {
        if (typeof FaceDetector !== 'function') return null;
        try {
            const detector = new FaceDetector({ fastMode: false, maxDetectedFaces: 3 });
            const faces = await detector.detect(img);
            return Array.isArray(faces) ? faces : [];
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
            return api.load({ maxFaces: 3, scoreThreshold: PROB_MIN * 0.85 });
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
        // returnTensors=false; flipHorizontal=false
        const predicoes = await model.estimateFaces(entrada, false, false);
        if (entrada && typeof entrada.close === 'function' && entrada !== img) {
            try {
                entrada.close();
            } catch (e) {
                /* ignore */
            }
        }
        return Array.isArray(predicoes) ? predicoes : [];
    }

    function filtrarPorConfianca(predicoes, motor) {
        if (motor !== 'BlazeFace') return predicoes;
        return predicoes.filter((p) => {
            const box = boxDePredicao(p);
            return Number.isFinite(box.prob) && box.prob >= PROB_MIN;
        });
    }

    async function exigirRosto(dataUrl) {
        const img = await carregarImagem(dataUrl);
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;

        let predicoes = null;
        let motor = 'BlazeFace';

        // BlazeFace primeiro (confiança + landmarks); FaceDetector só como reserva.
        try {
            predicoes = await detectarComBlazeFace(img);
        } catch (erroBlaze) {
            predicoes = await detectarComFaceDetector(img);
            motor = 'FaceDetector';
            if (predicoes == null) {
                const falha = new Error(
                    erroBlaze.message
                        || 'Verificador de rosto indisponível. Verifique a conexão e tente de novo.'
                );
                falha.code = 'VERIFICADOR_INDISPONIVEL';
                throw falha;
            }
        }

        const confiaveis = filtrarPorConfianca(predicoes, motor);

        if (!confiaveis.length) {
            throw erroFoto(
                'SEM_ROSTO',
                'Não detectamos um rosto nítido. Use foto sua, de frente, bem iluminada, sem óculos escuros nem máscara.'
            );
        }

        if (confiaveis.length > 1) {
            throw erroFoto(
                'VARIOS_ROSTOS',
                'Detectamos mais de uma pessoa. Envie só a sua foto (retrato individual).'
            );
        }

        const box = boxDePredicao(confiaveis[0]);
        if (motor === 'BlazeFace' && box.prob < PROB_MIN) {
            throw erroFoto(
                'BAIXA_CONFIANCA',
                'Qualidade insuficiente. Foto mais nítida, boa luz e rosto de frente.'
            );
        }

        const geo = avaliarGeometria(box, imgW, imgH);
        if (geo) throw geo;

        return {
            ok: true,
            rostos: 1,
            motor,
            confianca: box.prob,
            cobertura: (box.width * box.height) / (imgW * imgH),
        };
    }

    /** Redimensiona/comprime para caber no PATCH (limite ~3M chars no data URL). */
    function comprimirParaEnvio(img, { ladoMax = 1280, qualidade = 0.82 } = {}) {
        const w0 = img.naturalWidth || img.width;
        const h0 = img.naturalHeight || img.height;
        const escala = Math.min(1, ladoMax / Math.max(w0, h0));
        const w = Math.max(1, Math.round(w0 * escala));
        const h = Math.max(1, Math.round(h0 * escala));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0, w, h);
        let dataUrl = canvas.toDataURL('image/jpeg', qualidade);
        // Se ainda passar do teto do schema (~3M), baixa a qualidade.
        let q = qualidade;
        while (dataUrl.length > 2_800_000 && q > 0.45) {
            q -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', q);
        }
        return dataUrl;
    }

    async function processarArquivo(arquivo) {
        if (!arquivo) throw new Error('Selecione uma foto.');
        if (!['image/jpeg', 'image/png'].includes(arquivo.type)) {
            throw new Error('Use uma imagem JPG ou PNG.');
        }
        if (arquivo.size > TAMANHO_MAXIMO) {
            throw new Error('A foto deve ter no máximo 5 MB.');
        }
        const dataUrlBruto = await lerArquivoComoDataUrl(arquivo);
        const img = await carregarImagem(dataUrlBruto);
        if (img.naturalWidth < LADO_MINIMO || img.naturalHeight < LADO_MINIMO) {
            throw new Error(`A foto deve ter no mínimo ${LADO_MINIMO}×${LADO_MINIMO} px.`);
        }
        // Retratos muito panorâmicos / faixa estreita costumam ser ruins.
        const razao = img.naturalWidth / img.naturalHeight;
        if (razao < 0.45 || razao > 2.2) {
            throw new Error('Proporção inválida. Use uma foto vertical ou quadrada de retrato.');
        }
        await exigirRosto(dataUrlBruto);
        const comprimida = comprimirParaEnvio(img);
        if (!comprimida || comprimida.length > 2_950_000) {
            throw new Error('Foto ainda grande demais após compactar. Tente outra imagem ou recorte mais perto do rosto.');
        }
        return comprimida;
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

    const DICA =
        'Só foto sua, sozinha, de frente, nítida e bem iluminada. Sem grupo, filtro pesado, óculos escuros ou máscara.';

    /**
     * Liga um <input type=file data-face-perfil> com verificação rigorosa.
     */
    function ligarEntrada(input, opts = {}) {
        if (!input || input.dataset.rmFaceBound === '1') return;
        input.dataset.rmFaceBound = '1';
        input.setAttribute('data-face-perfil', '1');
        input.accept = input.accept || 'image/jpeg,image/png';

        const statusEl = garantirStatusEl(input, opts.statusEl);
        if (!statusEl.dataset.rmHint) {
            statusEl.dataset.rmHint = '1';
            pintarStatus(statusEl, DICA, 'info');
            statusEl.hidden = false;
        }

        input.addEventListener('change', async () => {
            const arquivo = input.files?.[0];
            input.value = '';
            if (!arquivo) return;

            pintarStatus(statusEl, 'Analisando rosto e qualidade da foto…', 'info');
            input.setCustomValidity('Analisando foto…');

            try {
                const dataUrl = await processarArquivo(arquivo);
                input.setCustomValidity('');
                pintarStatus(statusEl, 'Foto aprovada: rosto único, nítido e bem enquadrado.', 'ok');
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
        DICA,
        aquecer() {
            garantirBlazeFace().catch(() => {});
        },
    };

    function boot() {
        document.querySelectorAll('input[data-face-perfil]').forEach((input) => {
            garantirStatusEl(input);
            const el = document.getElementById(`${input.id || 'foto'}-face-status`);
            if (el && (el.hidden || el.classList.contains('info'))) {
                pintarStatus(el, DICA, 'info');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}(window));
