if (!requerMorador()) {
    /* redirect */
}

const form = document.getElementById('agendar-form');
const confirmar = document.getElementById('agendar-confirmar');
const nota = document.getElementById('agendar-nota');
const retorno = document.getElementById('agendar-retorno');
const rotuloImovel = document.querySelector('.agendar-imovel');
const imovelId = new URLSearchParams(window.location.search).get('id') || 'kitnet-cambui';

(async function carregarImovel() {
    try {
        const imovel = await RoomMatchApi.obterImovel(imovelId);
        if (rotuloImovel) {
            rotuloImovel.textContent =
                `${imovel.titulo} · R$ ${Number(imovel.preco).toLocaleString('pt-BR')}/mês`;
        }
    } catch (erro) {
        if (rotuloImovel) rotuloImovel.textContent = erro.message;
    }
}());

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const horario = form.elements.horario.value;

    try {
        await RoomMatchApi.criarVisita({ imovel_id: imovelId, horario });
        retorno.textContent = `Pedido enviado para ${horario}. Veja em Calendário de visitas.`;
        retorno.hidden = false;
        nota.hidden = true;
        confirmar.disabled = true;
        form.querySelectorAll('input[name="horario"]').forEach((opcao) => { opcao.disabled = true; });
    } catch (erro) {
        retorno.textContent = erro.detail || erro.message;
        retorno.hidden = false;
    }
});
