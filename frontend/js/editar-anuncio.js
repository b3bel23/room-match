if (!requerLocador()) {
    /* redirect */
}

const form = document.getElementById('editar-form');
const total = document.getElementById('editar-total');
const retorno = document.getElementById('editar-retorno');
const valores = ['aluguel', 'condominio', 'iptu', 'contas'].map((id) => document.getElementById(id));
const imovelId = new URLSearchParams(window.location.search).get('id');

function atualizarTotal() {
    const soma = valores.reduce((acumulado, campo) => acumulado + (Number(campo.value) || 0), 0);
    total.textContent = `R$ ${soma.toLocaleString('pt-BR')}`;
}

valores.forEach((campo) => campo.addEventListener('input', atualizarTotal));

async function carregar() {
    if (!imovelId) {
        retorno.textContent = 'Informe ?id= do anúncio.';
        retorno.hidden = false;
        return;
    }
    try {
        const imovel = await RoomMatchApi.obterImovel(imovelId);
        document.getElementById('aluguel').value = imovel.aluguel;
        document.getElementById('condominio').value = imovel.condominio;
        document.getElementById('iptu').value = imovel.iptu;
        document.getElementById('contas').value = imovel.contas;
        atualizarTotal();
    } catch (erro) {
        retorno.textContent = erro.message;
        retorno.hidden = false;
    }
}

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!imovelId) return;

    try {
        await RoomMatchApi.atualizarImovel(imovelId, {
            aluguel: document.getElementById('aluguel').value,
            condominio: document.getElementById('condominio').value,
            iptu: document.getElementById('iptu').value,
            contas: document.getElementById('contas').value
        });
        retorno.textContent = 'Alterações salvas.';
        retorno.hidden = false;
    } catch (erro) {
        retorno.textContent = erro.detail || erro.message;
        retorno.hidden = false;
    }
});

carregar();
