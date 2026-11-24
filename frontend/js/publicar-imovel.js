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
        fotos.length < FOTOS_MINIMO
            ? `Adicione no mínimo ${FOTOS_MINIMO} fotos.`
            : ''
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

function montarPilulas(container, nomes, name) {
    if (!container) return;
    container.replaceChildren();
    (nomes || []).forEach((nome) => {
        if (typeof RoomMatchTags !== 'undefined' && RoomMatchTags.criarPilula) {
            container.append(RoomMatchTags.criarPilula(nome, { name }));
            return;
        }
        const label = document.createElement('label');
        label.className = 'pilula';
        label.innerHTML =
            `<input class="visually-hidden" type="checkbox" name="${name}" value="${nome}">` +
            `<span>${nome}</span>`;
        container.append(label);
    });
}

const catalogo = typeof RoomMatchTags !== 'undefined' ? RoomMatchTags : null;
montarPilulas(document.getElementById('tags-adesao'), catalogo?.ADESAO || [], 'tag');
montarPilulas(document.getElementById('tags-restricao'), catalogo?.RESTRICAO || [], 'tag');
montarPilulas(document.getElementById('tags-comodidades'), catalogo?.COMODIDADES || [], 'comodidade');

// Tags/comodidades opcionais — sem min/máx inventados na UI.
const tags = [...form.querySelectorAll('input[name="tag"]')];
const comodidades = [...form.querySelectorAll('input[name="comodidade"]')];
const contador = document.getElementById('tags-contador');
const contadorComod = document.getElementById('comodidades-contador');

function textoContador(n) {
    return `${n} selecionada${n === 1 ? '' : 's'}`;
}

function atualizarTags() {
    if (contador) contador.textContent = textoContador(tags.filter((t) => t.checked).length);
    if (contadorComod) {
        contadorComod.textContent = textoContador(comodidades.filter((t) => t.checked).length);
    }
}

if (catalogo?.ligarConflitos) {
    catalogo.ligarConflitos(tags, { onChange: atualizarTags });
    comodidades.forEach((el) => el.addEventListener('change', atualizarTags));
} else {
    [...tags, ...comodidades].forEach((el) => el.addEventListener('change', atualizarTags));
}
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

/* Trava contra clique duplo e evita novo create se só o upload de fotos falhou. */
let publicando = false;
let anuncioCriadoId = null;

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (publicando) return;
    if (!form.reportValidity()) return;

    const cepCampo = document.getElementById('cep');
    if (typeof RoomMatchCep !== 'undefined' && cepCampo) {
        const cepOk = RoomMatchCep.validarCep(cepCampo.value);
        if (!cepOk.ok) {
            cepCampo.setCustomValidity(cepOk.mensagem);
            cepCampo.reportValidity();
            return;
        }
        cepCampo.value = cepOk.cep;
        cepCampo.setCustomValidity('');
    }

    const tagsMarcadas = tags
        .filter((t) => t.checked)
        .map((t) => t.value || t.parentElement?.textContent?.trim())
        .filter(Boolean);
    const comodidadesMarcadas = comodidades
        .filter((t) => t.checked)
        .map((t) => t.value || t.parentElement?.textContent?.trim())
        .filter(Boolean);
    const classificacao = form.querySelector('input[name="classificacao"]:checked')?.value || 'Mista';
    const enderecoSchema = cepUi ? cepUi.ler() : RoomMatchCep.lerCampos(form);
    const endereco = RoomMatchCep.montarEnderecoExibicao(enderecoSchema);
    const botao = form.querySelector('button[type="submit"]');

    publicando = true;
    if (typeof RoomMatchLoading !== 'undefined') {
        RoomMatchLoading.botaoEspera(botao, true, anuncioCriadoId ? 'Enviando fotos…' : 'Publicando…');
        RoomMatchLoading.mostrar(anuncioCriadoId ? 'Enviando fotos…' : 'Publicando anúncio…');
    } else if (botao) {
        botao.disabled = true;
    }
    try {
        let id = anuncioCriadoId;
        if (!id) {
            const criado = await RoomMatchApi.criarImovel({
                titulo: document.getElementById('titulo').value.trim(),
                descricao: (document.getElementById('descricao')?.value || '').trim() || null,
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
                comodidades: comodidadesMarcadas,
                classificacao
            });
            id = criado.id;
            anuncioCriadoId = id;
        }
        // Fotos: multipart no servidor; no mock ficam no próprio anúncio (data URL).
        if (RoomMatchApi.modo() === 'live') {
            if (typeof RoomMatchLoading !== 'undefined') {
                RoomMatchLoading.mostrar('Enviando fotos…');
            }
            await RoomMatchApi.enviarFotos(id, fotos.map((f) => f.arquivo));
        } else {
            const urls = fotos.map((f) => f.url);
            await RoomMatchApi.atualizarImovel(id, { fotos: urls, capa: urls[0] });
        }
        retorno.textContent = 'Anúncio publicado.';
        retorno.hidden = false;
        if (typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.mostrar('Abrindo seus anúncios…');
        }
        window.setTimeout(() => {
            window.location.href = `meus-imoveis.html?novo=${encodeURIComponent(id)}`;
        }, 600);
    } catch (erro) {
        publicando = false;
        retorno.textContent = erro.detail || erro.message;
        retorno.hidden = false;
        if (typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.forcarEsconder();
            RoomMatchLoading.botaoEspera(botao, false);
        } else if (botao) {
            botao.disabled = false;
        }
    }
});
