/**
 * Verifica se a imagem de perfil contém pelo menos um rosto.
 * 1) FaceDetector nativo (Chromium) quando disponível
 * 2) BlazeFace (TF.js) via CDN como fallback
 */
(function (global) {
    const SCRIPTS_BLAZE = [
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core@4.22.0/dist/tf-core.min.js',
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter@4.22.0/dist/tf-converter.min.js',
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.22.0/dist/tf-backend-webgl.min.js',
        'https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.1.0/dist/blazeface.min.js'
    ];

    let blazeModelPromise = null;

    function carregarScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Falha ao carregar verificador de rosto.'));
            document.head.appendChild(s);
        });
    }

    function carregarImagem(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Imagem inválida.'));
            img.crossOrigin = 'anonymous';
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
            const blazeface = global.blazeface;
            if (!tf || !blazeface) {
                throw new Error('Verificador de rosto indisponível neste navegador.');
            }
            try {
                await tf.setBackend('webgl');
            } catch (erro) {
                await tf.setBackend('cpu');
            }
            await tf.ready();
            return blazeface.load({ maxFaces: 5 });
        })().catch((erro) => {
            blazeModelPromise = null;
            throw erro;
        });
        return blazeModelPromise;
    }

    async function detectarComBlazeFace(img) {
        const model = await garantirBlazeFace();
        const predicoes = await model.estimateFaces(img, false);
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
            rostos = await detectarComBlazeFace(img);
            motor = 'BlazeFace';
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
        suportado() {
            return typeof FaceDetector === 'function' || true;
        }
    };
}(window));
