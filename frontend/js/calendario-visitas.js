if (!requerAuth()) {
    /* redirect */
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const STATUS = {
    pendente: 'Pendente de aprovação',
    confirmada: 'Confirmada',
    remarcada: 'Remarcada / alterada',
    recusada: 'Recusada',
    cancelada: 'Cancelada'
};

const hoje = new Date();
const grade = document.getElementById('calendario-grade');
const titulo = document.getElementById('mes-titulo');
const filtroImovel = document.getElementById('calendario-imovel');
let mes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
let visitas = [];

function chave(data) {
    return `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
}

function dataDaVisita(visita) {
    const [y, m, d] = String(visita.data).split('-').map(Number);
    return new Date(y, m - 1, d);
}

function visitasPorDia() {
    const porDia = {};
    visitas.forEach((visita) => {
        if (filtroImovel.value && visita.imovel_titulo !== filtroImovel.value) return;
        const data = dataDaVisita(visita);
        (porDia[chave(data)] ||= []).push(visita);
    });
    return porDia;
}

function criarDia(numero, listaVisitas, ehHoje) {
    const dia = document.createElement('div');
    dia.className = `calendario-dia${ehHoje ? ' hoje' : ''}`;

    const rotulo = document.createElement('span');
    rotulo.className = 'calendario-numero';
    rotulo.textContent = numero;
    dia.append(rotulo);

    if (listaVisitas.length) {
        const lista = document.createElement('ul');
        listaVisitas.forEach((visita) => {
            const item = document.createElement('li');
            const ponto = document.createElement('span');
            ponto.className = `ponto ponto-${visita.status}`;
            ponto.title = STATUS[visita.status] || visita.status;
            const oculto = document.createElement('span');
            oculto.className = 'visually-hidden';
            oculto.textContent = `${STATUS[visita.status] || visita.status}: `;
            const rotulo = (typeof ehLocador === 'function' && ehLocador())
                ? `${visita.nome} · ${visita.hora}`
                : `${visita.imovel_titulo || 'Visita'} · ${visita.hora}`;
            item.append(ponto, oculto, rotulo);
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

function popularFiltro() {
    const titulos = [...new Set(visitas.map((v) => v.imovel_titulo).filter(Boolean))];
    const valorAtual = filtroImovel.value;
    filtroImovel.replaceChildren(new Option('Todos os imóveis', ''));
    titulos.forEach((t) => filtroImovel.append(new Option(t, t)));
    filtroImovel.value = valorAtual;
}

/* Lista abaixo do calendário: Locador confirma/recusa; Morador cancela. */
function desenharLista() {
    const lista = document.getElementById('visitas-itens');
    const vazio = document.getElementById('visitas-vazio');
    if (!lista) return;
    const locador = typeof ehLocador === 'function' && ehLocador();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const proximas = visitas
        .filter((v) => dataDaVisita(v) >= inicioHoje && ['pendente', 'confirmada'].includes(v.status))
        .sort((a, b) => dataDaVisita(a) - dataDaVisita(b));
    lista.replaceChildren();
    vazio.hidden = proximas.length > 0;
    proximas.forEach((v) => {
        const item = document.createElement('li');
        item.className = 'visita-item';
        const texto = document.createElement('div');
        const quando = dataDaVisita(v).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
        const strong = document.createElement('strong');
        strong.textContent = `${quando} · ${v.hora}`;
        const detalhe = document.createElement('span');
        detalhe.textContent = `${locador ? v.nome : v.imovel_titulo} · ${STATUS[v.status] || v.status}`;
        texto.append(strong, detalhe);
        const acoes = document.createElement('div');
        acoes.className = 'visita-acoes';
        const botoes = locador
            ? [v.status === 'pendente' && ['confirmada', 'Confirmar', 'btn-primary'], ['recusada', 'Recusar', 'btn-secondary']]
            : [['cancelada', 'Cancelar visita', 'btn-secondary']];
        botoes.filter(Boolean).forEach(([status, rotulo, classe]) => {
            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = `btn ${classe}`;
            botao.textContent = rotulo;
            botao.addEventListener('click', () => mudarStatus(v, status));
            acoes.append(botao);
        });
        item.append(texto, acoes);
        lista.append(item);
    });
}

async function mudarStatus(visita, status) {
    const retorno = document.getElementById('visitas-retorno');
    try {
        const atualizada = await RoomMatchApi.atualizarVisita(visita.id, status);
        Object.assign(visita, atualizada);
        retorno.textContent = `Visita ${STATUS[status].toLowerCase()}.`;
        retorno.classList.remove('erro');
        desenhar();
        desenharLista();
    } catch (erro) {
        retorno.textContent = erro.detail || erro.message;
        retorno.classList.add('erro');
    }
    retorno.hidden = false;
}

async function carregar() {
    try {
        const dados = await RoomMatchApi.listarVisitas();
        visitas = dados.items || [];
        popularFiltro();
        desenhar();
        desenharLista();
    } catch (erro) {
        titulo.textContent = erro.message;
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

carregar();
