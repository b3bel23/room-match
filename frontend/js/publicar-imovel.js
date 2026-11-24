if (!requerLocador()) {
    /* redirect */
}

const form = document.getElementById('publicar-form');
const retorno = document.getElementById('publicar-retorno');
const cepUi = RoomMatchCep.ligarFormulario(form);

const FOTOS_MINIMO = 3;
const entradaFotos = document.getElementById('fotos-entrada');
const grade = document.getElementById('fotos-grade');
const botaoAdicionar = grade.querySelector('.foto-adicionar');
/* Fotos escolhidas: { url (data URL), arquivo (File JPEG reduzido) }. */
let fotos = [];

function validarFotos() {
    entradaFotos.setCustomValidity(
        fotos.length < FOTOS_MINIMO ? `Adicione no mínimo ${FOTOS_MINIMO} fotos.` : ''
    );
    botaoAdicionar.hidden = fotos.length >= RoomMatchFotosUpload.FOTOS_MAX;
}

function desenharFotos() {
    grade.querySelectorAll('.foto-slot:not(.foto-adicionar)').forEach((slot) => slot.remove());
    fotos.forEach((foto, indice) => {
        const slot = document.createElement('div');
        slot.className = 'foto-slot';
        const imagem = document.createElement('img');
        imagem.src = foto.url;
        imagem.alt = indice === 0 ? 'Foto de capa' : `Foto ${indice + 1}`;
        const remover = document.createElement('button');
        remover.type = 'button';
        remover.className = 'foto-remover';
        remover.textContent = '×';
        remover.setAttribute('aria-label', `Remover foto ${indice + 1}`);
        remover.addEventListener('click', () => {
            fotos.splice(indice, 1);
            desenharFotos();
        });
        slot.append(imagem, remover);
        grade.insertBefore(slot, botaoAdicionar);
    });
    validarFotos();
}

entradaFotos.addEventListener('change', async () => {
    const problemas = [];
    for (const arquivo of entradaFotos.files) {
        if (fotos.length >= RoomMatchFotosUpload.FOTOS_MAX) {
            problemas.push(`Máximo de ${RoomMatchFotosUpload.FOTOS_MAX} fotos por anúncio.`);
            break;
        }
        const invalido = RoomMatchFotosUpload.validar(arquivo);
        if (invalido) {
            problemas.push(invalido);
            continue;
        }
        try {
            fotos.push(await RoomMatchFotosUpload.reduzir(arquivo));
        } catch (erro) {
            problemas.push(erro.message);
        }
    }
    entradaFotos.value = '';
    desenharFotos();
    retorno.textContent = problemas.join(' ');
    retorno.hidden = !problemas.length;
});

validarFotos();

const TAGS_MINIMO = 3;
const TAGS_MAXIMO = 8;
const tags = [...form.querySelectorAll('input[name="tag"]')];
const contador = document.getElementById('tags-contador');

function atualizarTags() {
    const marcadas = tags.filter((tag) => tag.checked).length;
    contador.textContent = `${marcadas} selecionada${marcadas === 1 ? '' : 's'}`;
    tags.forEach((tag) => { tag.disabled = !tag.checked && marcadas >= TAGS_MAXIMO; });
    tags[0].setCustomValidity(
        marcadas < TAGS_MINIMO ? `Selecione no mínimo ${TAGS_MINIMO} tags.` : ''
    );
}

tags.forEach((tag) => tag.addEventListener('change', atualizarTags));
atualizarTags();

function tipoCurto(valor) {
    if (/kitnet/i.test(valor)) return 'Kitnet';
    if (/apart/i.test(valor)) return 'Apartamento';
    if (/casa/i.test(valor)) return 'Casa';
    return 'República';
}

document.getElementById('estado')?.addEventListener('input', (evento) => {
    evento.target.value = evento.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
});

// Volta à tela de onde veio; sem histórico do site, vai para Meus anúncios.
document.getElementById('voltar').addEventListener('click', (evento) => {
    if (document.referrer.startsWith(window.location.origin)) {
        evento.preventDefault();
        window.history.back();
    }
});

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!form.reportValidity()) return;

    const tagsMarcadas = tags
        .filter((t) => t.checked)
        .map((t) => t.value || t.parentElement?.textContent?.trim())
        .filter(Boolean);
    const classificacao = form.querySelector('input[name="classificacao"]:checked')?.value || 'Mista';
    const enderecoSchema = cepUi ? cepUi.ler() : RoomMatchCep.lerCampos(form);
    const endereco = RoomMatchCep.montarEnderecoExibicao(enderecoSchema);

    try {
        const criado = await RoomMatchApi.criarImovel({
            titulo: document.getElementById('titulo').value.trim(),
            tipo: tipoCurto(document.getElementById('tipo').value),
            // Schema enderecos_imovel / EnderecoImovel
            cep: RoomMatchCep.formatarCep(enderecoSchema.cep),
            rua: enderecoSchema.rua,
            numero: enderecoSchema.numero,
            complemento: enderecoSchema.complemento || null,
            bairro: enderecoSchema.bairro,
            cidade: enderecoSchema.cidade,
            estado: String(enderecoSchema.estado || '').toUpperCase().slice(0, 2),
            // Compatível com listagens atuais do mock
            endereco,
            aluguel: document.getElementById('aluguel').value,
            condominio: document.getElementById('condominio').value,
            iptu: document.getElementById('iptu').value,
            contas: document.getElementById('contas').value,
            tags: tagsMarcadas,
            classificacao
        });
        // Fotos: multipart no servidor; no mock ficam no próprio anúncio (data URL).
        if (RoomMatchApi.modo() === 'live') {
            await RoomMatchApi.enviarFotos(criado.id, fotos.map((f) => f.arquivo));
        } else {
            const urls = fotos.map((f) => f.url);
            await RoomMatchApi.atualizarImovel(criado.id, { fotos: urls, capa: urls[0] });
        }
        retorno.textContent = 'Anúncio publicado.';
        retorno.hidden = false;
        window.setTimeout(() => {
            window.location.href = `meus-imoveis.html?novo=${encodeURIComponent(criado.id)}`;
        }, 600);
    } catch (erro) {
        retorno.textContent = erro.detail || erro.message;
        retorno.hidden = false;
    }
});
