// O calendário de visitas é uma tela do locador.
if (!estaLogado()) {
    window.location.href = 'login.html';
} else if (!ehLocador()) {
    window.location.href = 'minhas-visitas.html';
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const STATUS = {
    pendente: 'Pendente de aprovação',
    confirmada: 'Confirmada',
    remarcada: 'Remarcada / alterada'
};

// Sem backend por enquanto: visitas de exemplo, em dias a partir de hoje.
const REPUBLICA = 'Quarto em república · Barão Geraldo';
const KITNET = 'Kitnet mobiliada · Cambuí';
const VISITAS = [
    { dias: 1, hora: '10h', nome: 'Ana Souza', imovel: REPUBLICA, status: 'confirmada' },
    { dias: 1, hora: '16h', nome: 'Bruno Lima', imovel: KITNET, status: 'pendente' },
    { dias: 3, hora: '11h', nome: 'Carla Dias', imovel: REPUBLICA, status: 'remarcada' },
    { dias: 6, hora: '14h', nome: 'Diego Alves', imovel: KITNET, status: 'confirmada' },
    { dias: 9, hora: '9h', nome: 'Elisa Rocha', imovel: REPUBLICA, status: 'pendente' }
];

const hoje = new Date();
const grade = document.getElementById('calendario-grade');
const titulo = document.getElementById('mes-titulo');
const filtroImovel = document.getElementById('calendario-imovel');
let mes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

function chave(data) {
    return `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
}

function visitasPorDia() {
    const porDia = {};
    VISITAS.forEach((visita) => {
        if (filtroImovel.value && visita.imovel !== filtroImovel.value) return;
        const data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + visita.dias);
        (porDia[chave(data)] ||= []).push(visita);
    });
    return porDia;
}

function criarDia(numero, visitas, ehHoje) {
    const dia = document.createElement('div');
    dia.className = `calendario-dia${ehHoje ? ' hoje' : ''}`;

    const rotulo = document.createElement('span');
    rotulo.className = 'calendario-numero';
    rotulo.textContent = numero;
    dia.append(rotulo);

    if (visitas.length) {
        const lista = document.createElement('ul');
        visitas.forEach((visita) => {
            const item = document.createElement('li');
            const ponto = document.createElement('span');
            ponto.className = `ponto ponto-${visita.status}`;
            ponto.title = STATUS[visita.status];
            const oculto = document.createElement('span');
            oculto.className = 'visually-hidden';
            oculto.textContent = `${STATUS[visita.status]}: `;
            item.append(ponto, oculto, `${visita.nome} · ${visita.hora}`);
            lista.append(item);
        });
        dia.append(lista);
    }
    return dia;
}

function desenhar() {
    titulo.textContent = `${MESES[mes.getMonth()]} ${mes.getFullYear()}`;
    grade.replaceChildren();

    DIAS_SEMANA.forEach((nome) => {
        const cabecalho = document.createElement('span');
        cabecalho.className = 'calendario-dia-semana';
        cabecalho.textContent = nome;
        grade.append(cabecalho);
    });

    const porDia = visitasPorDia();
    const primeiroDiaSemana = mes.getDay();
    const totalDias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();

    for (let i = 0; i < primeiroDiaSemana; i += 1) {
        const vazio = document.createElement('div');
        vazio.className = 'calendario-dia vazio';
        grade.append(vazio);
    }
    for (let numero = 1; numero <= totalDias; numero += 1) {
        const data = new Date(mes.getFullYear(), mes.getMonth(), numero);
        grade.append(criarDia(numero, porDia[chave(data)] || [], chave(data) === chave(hoje)));
    }
}

document.getElementById('mes-anterior').addEventListener('click', () => {
    mes = new Date(mes.getFullYear(), mes.getMonth() - 1, 1);
    desenhar();
});
document.getElementById('mes-proximo').addEventListener('click', () => {
    mes = new Date(mes.getFullYear(), mes.getMonth() + 1, 1);
    desenhar();
});
filtroImovel.addEventListener('change', desenhar);

desenhar();
