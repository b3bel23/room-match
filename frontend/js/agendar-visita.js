// Agendar visita é uma ação de quem está logado.
if (!estaLogado()) {
    window.location.href = 'login.html';
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_EXTENSO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

// Sem backend por enquanto: o locador atende de segunda a sábado, em horários fixos.
const HORARIOS_SEMANA = ['10h', '14h', '16h'];
const HORARIOS_SABADO = ['9h', '11h'];

const IMOVEL = 'Kitnet mobiliada · Cambuí';

const form = document.getElementById('agendar-form');
const confirmar = document.getElementById('agendar-confirmar');
const nota = document.getElementById('agendar-nota');
const retorno = document.getElementById('agendar-retorno');
const grade = document.getElementById('calendario-grade');
const titulo = document.getElementById('mes-titulo');
const anterior = document.getElementById('mes-anterior');
const proximo = document.getElementById('mes-proximo');
const blocoHorarios = document.getElementById('horarios');
const tituloHorarios = document.getElementById('horarios-titulo');
const listaHorarios = document.getElementById('horarios-lista');

const hoje = new Date();
hoje.setHours(0, 0, 0, 0);
const mesInicial = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
let mes = new Date(mesInicial);
let diaEscolhido = null;
let horarioEscolhido = null;

function horariosDo(data) {
    if (data.getDay() === 0) return [];
    return data.getDay() === 6 ? HORARIOS_SABADO : HORARIOS_SEMANA;
}

function disponivel(data) {
    return data >= hoje && horariosDo(data).length > 0;
}

function descreverDia(data) {
    return `${DIAS_EXTENSO[data.getDay()]}, ${data.getDate()} de ${MESES[data.getMonth()]}`;
}

function desenharMes() {
    titulo.textContent = `${MESES[mes.getMonth()][0].toUpperCase()}${MESES[mes.getMonth()].slice(1)} de ${mes.getFullYear()}`;
    anterior.disabled = mes <= mesInicial;
    grade.replaceChildren();

    DIAS_SEMANA.forEach((nome) => {
        const cabecalho = document.createElement('span');
        cabecalho.className = 'calendario-semana';
        cabecalho.textContent = nome;
        grade.append(cabecalho);
    });

    for (let i = 0; i < mes.getDay(); i++) {
        const vazio = document.createElement('span');
        vazio.className = 'calendario-vazio';
        grade.append(vazio);
    }

    const total = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    for (let numero = 1; numero <= total; numero++) {
        const data = new Date(mes.getFullYear(), mes.getMonth(), numero);
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'calendario-dia';
        botao.textContent = numero;
        botao.disabled = !disponivel(data);
        if (diaEscolhido && data.getTime() === diaEscolhido.getTime()) botao.classList.add('selecionado');
        botao.setAttribute('aria-label', descreverDia(data));
        botao.addEventListener('click', () => escolherDia(data));
        grade.append(botao);
    }
}

function escolherDia(data) {
    diaEscolhido = data;
    horarioEscolhido = null;
    confirmar.disabled = true;
    desenharMes();

    tituloHorarios.textContent = `Horários disponíveis · ${descreverDia(data)}`;
    listaHorarios.replaceChildren();
    horariosDo(data).forEach((hora) => {
        const rotulo = document.createElement('label');
        rotulo.className = 'horario';
        const opcao = document.createElement('input');
        opcao.className = 'visually-hidden';
        opcao.type = 'radio';
        opcao.name = 'horario';
        opcao.value = hora;
        opcao.addEventListener('change', () => {
            horarioEscolhido = hora;
            confirmar.disabled = false;
        });
        const texto = document.createElement('span');
        texto.textContent = hora;
        rotulo.append(opcao, texto);
        listaHorarios.append(rotulo);
    });
    blocoHorarios.hidden = false;
}

anterior.addEventListener('click', () => {
    mes = new Date(mes.getFullYear(), mes.getMonth() - 1, 1);
    desenharMes();
});

proximo.addEventListener('click', () => {
    mes = new Date(mes.getFullYear(), mes.getMonth() + 1, 1);
    desenharMes();
});

form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (!diaEscolhido || !horarioEscolhido) return;

    // Sem backend por enquanto: o pedido fica guardado só neste navegador.
    agendarVisita({
        imovel: IMOVEL,
        data: `${diaEscolhido.getFullYear()}-${diaEscolhido.getMonth()}-${diaEscolhido.getDate()}`,
        hora: horarioEscolhido
    });
    retorno.textContent = `Pedido enviado para ${descreverDia(diaEscolhido)}, às ${horarioEscolhido}. Aguarde a resposta do locador no chat. Voltando ao imóvel…`;
    retorno.hidden = false;
    nota.hidden = true;

    confirmar.disabled = true;
    form.querySelectorAll('input[name="horario"], .calendario button').forEach((item) => { item.disabled = true; });

    setTimeout(() => { window.location.href = 'detalhe.html'; }, 3000);
});

desenharMes();

