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
let totalFotos = 0;

function validarFotos() {
    entradaFotos.setCustomValidity(
        totalFotos < FOTOS_MINIMO ? `Adicione no mínimo ${FOTOS_MINIMO} fotos.` : ''
    );
}

entradaFotos.addEventListener('change', () => {
    [...entradaFotos.files].forEach((arquivo) => {
        const slot = document.createElement('div');
        slot.className = 'foto-slot';
        const imagem = document.createElement('img');
        imagem.src = URL.createObjectURL(arquivo);
        imagem.alt = arquivo.name;
        slot.append(imagem);
        grade.insertBefore(slot, botaoAdicionar);
        totalFotos += 1;
    });
    entradaFotos.value = '';
    validarFotos();
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
