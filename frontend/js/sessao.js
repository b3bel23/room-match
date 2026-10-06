// Sem backend por enquanto: o login fica guardado só neste navegador.
const CHAVE_LOGADO = 'roommatch-logado';
const CHAVE_PAPEL = 'roommatch-papel';
const CHAVE_VISITAS = 'roommatch-visitas';

// O papel ('locador' ou 'locatario') vem do cadastro; no login, mantém o último guardado.
function entrar(papel) {
    try {
        localStorage.setItem(CHAVE_LOGADO, '1');
        if (papel) localStorage.setItem(CHAVE_PAPEL, papel);
    } catch (erro) {
        // sem armazenamento disponível: a pessoa continua como visitante
    }
}

function sair() {
    try {
        localStorage.removeItem(CHAVE_LOGADO);
    } catch (erro) {
        // sem armazenamento disponível: nada a limpar
    }
}

function estaLogado() {
    try {
        return localStorage.getItem(CHAVE_LOGADO) === '1';
    } catch (erro) {
        return false;
    }
}

function ehLocador() {
    try {
        return localStorage.getItem(CHAVE_PAPEL) === 'locador';
    } catch (erro) {
        return false;
    }
}

// Visitas que o locatário agendou neste navegador (sem backend por enquanto).
function visitasAgendadas() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_VISITAS)) || [];
    } catch (erro) {
        return [];
    }
}

function agendarVisita(visita) {
    try {
        localStorage.setItem(CHAVE_VISITAS, JSON.stringify([...visitasAgendadas(), visita]));
    } catch (erro) {
        // sem armazenamento: a visita só aparece na confirmação da tela
    }
}

document.body.classList.toggle('visitante', !estaLogado());

// O locatário vê só as próprias visitas, não o calendário do locador.
if (!ehLocador()) {
    document.querySelectorAll('a[href="calendario-visitas.html"]').forEach((link) => {
        link.href = 'minhas-visitas.html';
        link.textContent = 'Minhas visitas';
    });
}
