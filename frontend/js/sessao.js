// Sem backend por enquanto: o login fica guardado só neste navegador.
const CHAVE_LOGADO = 'roommatch-logado';
const CHAVE_PAPEL = 'roommatch-papel';
const CHAVE_VISITAS = 'roommatch-visitas';

// Papéis: 'locador' ou 'locatario'. A pessoa pode ter cadastro em um ou nos dois.
const CHAVE_CONTAS = 'roommatch-contas';

function papelAtual() {
    try {
        return localStorage.getItem(CHAVE_PAPEL) || 'locatario';
    } catch (erro) {
        return 'locatario';
    }
}

function contasCadastradas() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_CONTAS)) || [papelAtual()];
    } catch (erro) {
        return [papelAtual()];
    }
}

function trocarPapel(papel) {
    try {
        localStorage.setItem(CHAVE_PAPEL, papel);
    } catch (erro) {
        // sem armazenamento disponível: o papel não muda
    }
}

// O cadastro registra o papel como conta e passa a usá-lo; no login, mantém o último guardado.
function entrar(papel) {
    try {
        localStorage.setItem(CHAVE_LOGADO, '1');
        if (papel) {
            const contas = contasCadastradas();
            if (!contas.includes(papel)) contas.push(papel);
            localStorage.setItem(CHAVE_CONTAS, JSON.stringify(contas));
            localStorage.setItem(CHAVE_PAPEL, papel);
        }
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
    return papelAtual() === 'locador';
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
