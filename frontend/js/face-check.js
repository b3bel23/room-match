/**
 * Verifica se a imagem de perfil contém pelo menos um rosto.
 * 1) FaceDetector nativo (Chromium), quando funciona
 * 2) BlazeFace (TF.js) via CDN — URLs estáveis
 */
(function (global) {
    const SCRIPTS_BLAZE = [
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js',
        'https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js'
    ];

    let blazeModelPromise = null;
    const scriptsPendentes = new Map();

    function carregarScript(src) {
        if (scriptsPendentes.has(src)) return scriptsPendentes.get(src);

        const promessa = new Promise((resolve, reject) => {
            const existente = document.querySelector(`script[data-rm-face-src="${src}"]`);
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

    async function detectarComFaceDetector(img) {
        if (typeof FaceDetector !== 'function') return null;
        try {
            const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
            const faces = await detector.detect(img);
            return Array.isArray(faces) ? faces.length : 0;
        } catch (erro) {
            // API presente mas quebrada / sem permissão → tenta fallback
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

    /**
     * @param {string} dataUrl
     * @returns {Promise<{ ok: boolean, rostos: number, motor: string }>}
     */
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

    global.RoomMatchFaceCheck = {
        exigirRosto,
        aquecer() {
            // Pré-carrega o modelo em background (ignora falha).
            garantirBlazeFace().catch(() => {});
        }
    };
}(window));
