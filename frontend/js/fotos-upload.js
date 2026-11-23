/**
 * Fotos de anúncio antes do envio: valida com os limites do servidor
 * (POST /imoveis/{id}/fotos: JPEG/PNG/WebP, até 5 MB, 10 por imóvel) e reduz
 * para o lado maior de 1200 px em JPEG.
 */
(function (global) {
    const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
    const TAMANHO_MAX = 5 * 1024 * 1024;
    const FOTOS_MAX = 10;
    const LADO_MAX = 1200;

    /** Mensagem de erro, ou '' se o arquivo pode ser usado. */
    function validar(arquivo) {
        if (!TIPOS.includes(arquivo.type)) return `${arquivo.name}: use JPEG, PNG ou WebP.`;
        if (arquivo.size > TAMANHO_MAX) return `${arquivo.name}: maior que 5 MB.`;
        return '';
    }

    /** Promise<{ url: dataURL, arquivo: File JPEG reduzido }>. */
    function reduzir(arquivo) {
        return new Promise((resolve, reject) => {
            const origem = URL.createObjectURL(arquivo);
            const imagem = new Image();
            imagem.onload = () => {
                const escala = Math.min(1, LADO_MAX / Math.max(imagem.width, imagem.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(imagem.width * escala);
                canvas.height = Math.round(imagem.height * escala);
                canvas.getContext('2d').drawImage(imagem, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(origem);
                const url = canvas.toDataURL('image/jpeg', 0.8);
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Não foi possível ler a imagem.'));
                        return;
                    }
                    const nome = `${(arquivo.name || 'foto').replace(/\.[^.]+$/, '')}.jpg`;
                    resolve({ url, arquivo: new File([blob], nome, { type: 'image/jpeg' }) });
                }, 'image/jpeg', 0.8);
            };
            imagem.onerror = () => {
                URL.revokeObjectURL(origem);
                reject(new Error(`${arquivo.name || 'Imagem'}: não foi possível ler.`));
            };
            imagem.src = origem;
        });
    }

    global.RoomMatchFotosUpload = { TIPOS, TAMANHO_MAX, FOTOS_MAX, validar, reduzir };
}(window));
