if (!requerLocador()) {
    /* redirect */
}

const form = document.getElementById('publicar-form');
const retorno = document.getElementById('publicar-retorno');

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

function extrairBairro(endereco) {
    const partes = String(endereco || '').split('·');
    return (partes[partes.length - 1] || 'Campinas').trim() || 'Campinas';
}

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!form.reportValidity()) return;

    const tagsMarcadas = tags
        .filter((t) => t.checked)
        .map((t) => t.value || t.parentElement?.textContent?.trim())
        .filter(Boolean);
    const classificacao = form.querySelector('input[name="classificacao"]:checked')?.value || 'Mista';
    const endereco = document.getElementById('endereco').value.trim();

    try {
        const criado = await RoomMatchApi.criarImovel({
            titulo: document.getElementById('titulo').value.trim(),
            tipo: tipoCurto(document.getElementById('tipo').value),
            endereco,
            bairro: extrairBairro(endereco),
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
