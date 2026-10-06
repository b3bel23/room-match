// Publicar anúncio é uma ação de quem está logado.
if (!estaLogado()) {
    window.location.href = 'login.html';
}

const form = document.getElementById('publicar-form');
const retorno = document.getElementById('publicar-retorno');

/* Fotos: mínimo de 3 */
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

/* Tags de convivência: mínimo 3 e máximo 8 */
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

form.addEventListener('submit', (evento) => {
    evento.preventDefault();

    // Sem backend por enquanto: o anúncio não é salvo, só confirmado na tela.
    retorno.textContent = 'Anúncio publicado.';
    retorno.hidden = false;
});
