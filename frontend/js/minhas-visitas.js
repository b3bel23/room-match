// Minhas visitas é uma tela do locatário.
if (!estaLogado()) {
    window.location.href = 'login.html';
} else if (ehLocador()) {
    window.location.href = 'calendario-visitas.html';
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS_EXTENSO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

const lista = document.getElementById('visitas-lista');
const vazio = document.getElementById('visitas-vazio');

function paraData(texto) {
    const [ano, mes, dia] = texto.split('-').map(Number);
    return new Date(ano, mes, dia);
}

const visitas = visitasAgendadas()
    .map((visita) => ({ ...visita, data: paraData(visita.data) }))
    .sort((a, b) => a.data - b.data);

vazio.hidden = visitas.length > 0;
visitas.forEach((visita) => {
    const item = document.createElement('li');
    item.className = 'visita';

    const quando = document.createElement('strong');
    quando.textContent = `${DIAS_EXTENSO[visita.data.getDay()]}, ${visita.data.getDate()} de ${MESES[visita.data.getMonth()]}, às ${visita.hora}`;
    const imovel = document.createElement('span');
    imovel.textContent = visita.imovel;

    item.append(quando, imovel);
    lista.append(item);
});
