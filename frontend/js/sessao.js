// Sem backend por enquanto: o login fica guardado só neste navegador.
const CHAVE_LOGADO = 'roommatch-logado';

function entrar() {
    try {
        localStorage.setItem(CHAVE_LOGADO, '1');
    } catch (erro) {
        // sem armazenamento disponível: a pessoa continua como visitante
    }
}

function estaLogado() {
    try {
        return localStorage.getItem(CHAVE_LOGADO) === '1';
    } catch (erro) {
        return false;
    }
}
