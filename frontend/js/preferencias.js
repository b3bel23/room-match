if (!requerAuth()) { /* redirect */ }
montarSidebarConfig('preferencias.html');

const boxAdesao = document.getElementById('pref-tags-adesao');
const boxRestricao = document.getElementById('pref-tags-restricao');
const boxesTags = [boxAdesao, boxRestricao].filter(Boolean);
const retorno = document.getElementById('pref-retorno');
const campoOrcamento = document.getElementById('pref-orcamento-bloco');
const campoLimiar = document.getElementById('pref-limiar-bloco');
const blocoDestino = document.getElementById('pref-destino-bloco');
const blocoModo = document.getElementById('pref-modo-bloco');
const locador = typeof ehLocador === 'function' && ehLocador();
const orcamentoEl = document.getElementById('pref-orcamento');
const orcamentoTexto = document.getElementById('pref-orcamento-texto');
const limiarEl = document.getElementById('pref-limiar');
const limiarTexto = document.getElementById('pref-limiar-texto');
const limiarDica = document.getElementById('pref-limiar-dica');
const catalogo = typeof RoomMatchTags !== 'undefined' ? RoomMatchTags : null;
const adesao = catalogo?.ADESAO || [
    'Aceita Animais', 'Trabalho em Casa', 'Aberto a Festas', 'Vegetariano',
    'LGBTQIA+ Acolhedor', 'Limpeza Compartilhada',
];
const restricao = catalogo?.RESTRICAO || [
    'Silêncio Noturno', 'Sem Festas', 'Sem Fumo', 'Sem Animais',
    'Visitas Restritas', 'Itens Individuais',
];

/** Schema: preferencias_moradia.destinos[{ nome, lat, lng, tipo? }] — máx. 3.
 *  preferencias_moradia.modo_transporte = foot|bike|car|bus (sem coluna nova). */
const MAX_DESTINOS = 3;
const TIPOS = Object.freeze({
    trabalho: 'Trabalho',
    faculdade: 'Faculdade',
    outro: 'Outro',
});
const MODOS = Object.freeze({
    foot: 'A pé',
    bike: 'Bicicleta',
    car: 'Carro',
    bus: 'Ônibus',
});
const MODO_PADRAO = 'foot';
const PHOTON = 'https://photon.komoot.io/api/';
const CAMPINAS = { lat: -22.9056, lng: -47.0608 };

/** Lista editável (ordem = prioridade; 1º = principal no mural). */
let destinosEscolhidos = [];
let modoTransporte = MODO_PADRAO;
let tipoNovo = '';
let lugarNovo = null;
let buscaTimer = null;
let buscaControle = null;

function normalizarModo(valor) {
    const m = String(valor || '').trim().toLowerCase();
    return MODOS[m] ? m : MODO_PADRAO;
}

function desenharModo() {
    const grupo = document.getElementById('pref-modo-opcoes');
    if (!grupo) return;
    grupo.querySelectorAll('[data-modo]').forEach((btn) => {
        const ativo = btn.dataset.modo === modoTransporte;
        btn.classList.toggle('ativa', ativo);
        btn.setAttribute('aria-pressed', String(ativo));
    });
}

document.getElementById('pref-modo-opcoes')?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-modo]');
    if (!btn || locador) return;
    modoTransporte = normalizarModo(btn.dataset.modo);
    desenharModo();
});

function mesmoLugar(a, b) {
    if (!a || !b) return false;
    return Math.abs(Number(a.lat) - Number(b.lat)) < 1e-3
        && Math.abs(Number(a.lng) - Number(b.lng)) < 1e-3;
}

function indiceDestino(lista, dest) {
    return lista.findIndex((d) => mesmoLugar(d, dest));
}

function rotuloTipo(tipo) {
    return TIPOS[tipo] || 'Definir tipo';
}

/** Chave de tipo válida, ou '' se ainda não definido (não confundir com "outro"). */
function chaveTipo(dest) {
    const t = String(dest?.tipo || '').toLowerCase();
    return TIPOS[t] ? t : '';
}

/** Sugere tipo só quando o nome deixa claro (dados legados sem `tipo`). */
function inferirTipo(nome) {
    const n = String(nome || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    if (/(puc|unicamp|unesp|usp|faculdade|universidade|campus|colegio|escola)/.test(n)) {
        return 'faculdade';
    }
    if (/(trabalho|escritorio|empresa|hospital|estagio|cowork)/.test(n)) {
        return 'trabalho';
    }
    return '';
}

const ORDEM_TIPOS = ['trabalho', 'faculdade', 'outro'];

function proximoTipo(atual) {
    const i = ORDEM_TIPOS.indexOf(atual);
    return ORDEM_TIPOS[(i + 1) % ORDEM_TIPOS.length];
}

/** Separa "Nome — endereço" (Photon) para UI em duas linhas. */
function partesNome(nome) {
    const s = String(nome || '').trim();
    const sep = s.indexOf(' — ');
    if (sep < 0) return { titulo: s || 'Lugar', detalhe: '' };
    return {
        titulo: s.slice(0, sep).trim() || 'Lugar',
        detalhe: s.slice(sep + 3).trim(),
    };
}

function desenharDestinos() {
    const lista = document.getElementById('pref-destinos-salvos');
    const vazio = document.getElementById('pref-destinos-vazio');
    if (!lista) return;
    lista.replaceChildren();
    destinosEscolhidos.forEach((d, i) => {
        const tipoKey = chaveTipo(d) || 'sem-tipo';
        const { titulo, detalhe } = partesNome(d.nome);
        const principal = i === 0;

        const li = document.createElement('li');
        li.className = `pref-destino-chip pref-destino-chip--${tipoKey}`;
        if (principal) li.classList.add('is-principal');

        const corpo = document.createElement('div');
        corpo.className = 'pref-destino-chip-corpo';

        const topo = document.createElement('div');
        topo.className = 'pref-destino-chip-topo';

        const badge = document.createElement('button');
        badge.type = 'button';
        badge.className = `pref-destino-badge pref-destino-badge--${tipoKey}`;
        badge.textContent = rotuloTipo(chaveTipo(d));
        badge.title = 'Trocar tipo (trabalho, faculdade ou outro)';
        badge.setAttribute('aria-label', `Tipo: ${rotuloTipo(chaveTipo(d))}. Clique para alterar.`);
        badge.addEventListener('click', () => {
            d.tipo = proximoTipo(chaveTipo(d) || 'outro');
            desenharDestinos();
        });
        topo.append(badge);

        if (principal) {
            const selo = document.createElement('span');
            selo.className = 'pref-destino-selo-principal';
            selo.textContent = 'Principal';
            topo.append(selo);
        }

        const nomeEl = document.createElement('strong');
        nomeEl.className = 'pref-destino-chip-titulo';
        nomeEl.textContent = titulo;

        corpo.append(topo, nomeEl);
        if (detalhe) {
            const ende = document.createElement('span');
            ende.className = 'pref-destino-chip-detalhe';
            ende.textContent = detalhe;
            corpo.append(ende);
        }

        const acoes = document.createElement('div');
        acoes.className = 'pref-destino-chip-acoes';
        if (!principal) {
            const subir = document.createElement('button');
            subir.type = 'button';
            subir.className = 'pref-destino-chip-btn pref-destino-chip-principal';
            subir.textContent = 'Tornar principal';
            subir.setAttribute('aria-label', `Tornar ${titulo} o destino principal`);
            subir.addEventListener('click', () => {
                destinosEscolhidos.splice(i, 1);
                destinosEscolhidos.unshift(d);
                desenharDestinos();
            });
            acoes.append(subir);
        }
        const remover = document.createElement('button');
        remover.type = 'button';
        remover.className = 'pref-destino-chip-btn pref-destino-chip-remover';
        remover.textContent = 'Remover';
        remover.setAttribute('aria-label', `Remover ${titulo}`);
        remover.addEventListener('click', () => {
            destinosEscolhidos.splice(i, 1);
            desenharDestinos();
            atualizarFormDestino();
        });
        acoes.append(remover);

        li.append(corpo, acoes);
        lista.append(li);
    });
    if (vazio) vazio.hidden = destinosEscolhidos.length > 0;
    atualizarFormDestino();
}

function atualizarFormDestino() {
    const wrapTitulo = document.getElementById('pref-destino-titulo-wrap');
    const campoTitulo = document.getElementById('pref-destino-titulo');
    const botaoAdd = document.getElementById('pref-destino-add');
    const grupo = document.getElementById('pref-destino-tipos');
    const cheio = destinosEscolhidos.length >= MAX_DESTINOS;

    grupo?.querySelectorAll('[data-tipo]').forEach((btn) => {
        const ativo = btn.dataset.tipo === tipoNovo;
        btn.classList.toggle('ativa', ativo);
        btn.setAttribute('aria-pressed', String(ativo));
        btn.disabled = Boolean(cheio && !ativo);
    });

    const dicaTipo = document.getElementById('pref-destino-tipo-dica');
    if (dicaTipo) {
        if (cheio) {
            dicaTipo.textContent = 'Limite de 3 destinos. Remova um para adicionar outro.';
        } else if (!tipoNovo) {
            dicaTipo.textContent = 'Selecione Trabalho, Faculdade ou Outro para continuar.';
        } else {
            dicaTipo.textContent = `Tipo escolhido: ${rotuloTipo(tipoNovo)}. Agora busque onde fica.`;
        }
    }

    if (wrapTitulo) wrapTitulo.hidden = tipoNovo !== 'outro';
    if (tipoNovo !== 'outro' && campoTitulo) campoTitulo.value = '';

    const tituloOk = tipoNovo !== 'outro'
        || String(campoTitulo?.value || '').trim().length >= 2;
    if (botaoAdd) {
        botaoAdd.disabled = Boolean(
            cheio || !tipoNovo || !lugarNovo || !tituloOk
        );
        botaoAdd.title = cheio
            ? 'Limite de 3 destinos — remova um para adicionar'
            : (!tipoNovo ? 'Escolha o tipo primeiro' : '');
        botaoAdd.textContent = tipoNovo
            ? `Adicionar ${rotuloTipo(tipoNovo).toLowerCase()}`
            : 'Adicionar à lista';
    }
}

function fecharSugestoes() {
    const ul = document.getElementById('pref-destino-sugestoes');
    const campo = document.getElementById('pref-destino-busca');
    if (ul) {
        ul.hidden = true;
        ul.replaceChildren();
    }
    campo?.setAttribute('aria-expanded', 'false');
}

function mostrarLugarEscolhido() {
    const el = document.getElementById('pref-destino-lugar');
    if (!el) return;
    if (!lugarNovo) {
        el.hidden = true;
        el.textContent = '';
        return;
    }
    el.hidden = false;
    el.textContent = `Lugar: ${lugarNovo.nome}`;
}

async function buscarLugares(texto) {
    const q = String(texto || '').trim();
    if (q.length < 3) return [];
    if (buscaControle) buscaControle.abort();
    buscaControle = new AbortController();
    const url = `${PHOTON}?q=${encodeURIComponent(q)}&limit=6&lat=${CAMPINAS.lat}&lon=${CAMPINAS.lng}`;
    const dados = await fetch(url, { signal: buscaControle.signal }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
    });
    return (dados.features || [])
        .filter((f) => f.properties?.countrycode === 'BR')
        .slice(0, 5)
        .map((f) => {
            const p = f.properties || {};
            const rua = [p.street, p.housenumber].filter(Boolean).join(', ');
            const nome = p.name || rua || p.city || 'Lugar';
            const detalhe = [p.name ? rua : '', p.district, p.city]
                .filter(Boolean)
                .filter((parte, i, todas) => parte !== nome && todas.indexOf(parte) === i)
                .join(', ');
            return {
                nome: detalhe ? `${nome} — ${detalhe}` : nome,
                lat: f.geometry.coordinates[1],
                lng: f.geometry.coordinates[0],
            };
        });
}

function montarFormDestino() {
    const grupo = document.getElementById('pref-destino-tipos');
    const campoBusca = document.getElementById('pref-destino-busca');
    const campoTitulo = document.getElementById('pref-destino-titulo');
    const ul = document.getElementById('pref-destino-sugestoes');
    const botaoAdd = document.getElementById('pref-destino-add');
    if (!grupo || !campoBusca || !botaoAdd) return;

    grupo.querySelectorAll('[data-tipo]').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (destinosEscolhidos.length >= MAX_DESTINOS) return;
            tipoNovo = btn.dataset.tipo || '';
            atualizarFormDestino();
        });
    });

    campoTitulo?.addEventListener('input', atualizarFormDestino);

    campoBusca.addEventListener('input', () => {
        lugarNovo = null;
        mostrarLugarEscolhido();
        atualizarFormDestino();
        const q = campoBusca.value.trim();
        window.clearTimeout(buscaTimer);
        if (q.length < 3) {
            fecharSugestoes();
            return;
        }
        buscaTimer = window.setTimeout(async () => {
            try {
                const itens = await buscarLugares(q);
                if (!ul) return;
                ul.replaceChildren();
                if (!itens.length) {
                    ul.hidden = true;
                    return;
                }
                itens.forEach((item) => {
                    const li = document.createElement('li');
                    li.setAttribute('role', 'option');
                    li.textContent = item.nome;
                    li.tabIndex = 0;
                    li.addEventListener('click', () => escolherLugar(item));
                    li.addEventListener('keydown', (ev) => {
                        if (ev.key === 'Enter') escolherLugar(item);
                    });
                    ul.append(li);
                });
                ul.hidden = false;
                campoBusca.setAttribute('aria-expanded', 'true');
            } catch (erro) {
                if (erro.name !== 'AbortError') fecharSugestoes();
            }
        }, 280);
    });

    function escolherLugar(item) {
        lugarNovo = {
            nome: String(item.nome).slice(0, 100),
            lat: Number(item.lat),
            lng: Number(item.lng),
        };
        campoBusca.value = lugarNovo.nome;
        fecharSugestoes();
        mostrarLugarEscolhido();
        atualizarFormDestino();
    }

    botaoAdd.addEventListener('click', () => {
        if (!tipoNovo || !lugarNovo || destinosEscolhidos.length >= MAX_DESTINOS) return;
        let nome = lugarNovo.nome;
        if (tipoNovo === 'outro') {
            nome = String(campoTitulo?.value || '').trim().slice(0, 100);
            if (nome.length < 2) {
                campoTitulo?.reportValidity?.();
                return;
            }
        }
        const item = {
            nome,
            lat: lugarNovo.lat,
            lng: lugarNovo.lng,
            tipo: tipoNovo,
        };
        if (indiceDestino(destinosEscolhidos, item) >= 0) {
            retorno.textContent = 'Esse lugar já está na lista.';
            retorno.classList.add('erro');
            retorno.hidden = false;
            return;
        }
        destinosEscolhidos.push(item);
        tipoNovo = '';
        lugarNovo = null;
        if (campoTitulo) campoTitulo.value = '';
        campoBusca.value = '';
        fecharSugestoes();
        mostrarLugarEscolhido();
        desenharDestinos();
        retorno.hidden = true;
    });

    document.addEventListener('click', (ev) => {
        if (!blocoDestino?.contains(ev.target)) fecharSugestoes();
    });

    desenharDestinos();
}

function preencherBarra(el) {
    if (!el) return;
    const min = Number(el.min) || 0;
    const max = Number(el.max) || 100;
    const val = Number(el.value) || 0;
    const pct = max === min ? 0 : ((val - min) / (max - min)) * 100;
    el.style.setProperty('--preenchimento', `${pct}%`);
    el.setAttribute('aria-valuenow', String(val));
}

/** Valor gravado quando o slider está no teto (= esse valor ou mais, sem cortar chat). */
const ORCAMENTO_SEM_TETO = 999999;

function formatarOrcamento(n) {
    const v = Math.round(Number(n) || 0);
    const max = Number(orcamentoEl?.max) || 10000;
    if (v >= max) {
        return `R$ ${max.toLocaleString('pt-BR')} ou mais`;
    }
    return `R$ ${v.toLocaleString('pt-BR')}`;
}

function pulsarValor(el) {
    if (!el) return;
    el.classList.remove('pref-slider-pulse');
    void el.offsetWidth;
    el.classList.add('pref-slider-pulse');
}

function dicaLimiar(valor) {
    const v = Number(valor) || 0;
    if (v >= 85) {
        return 'Muito exigente: só anúncios quase 100% alinhados. Pode sobrar pouca opção.';
    }
    if (v >= 60) {
        return 'Equilíbrio: boa afinidade sem fechar demais o mural.';
    }
    if (v >= 30) {
        return 'Mais flexível: mais anúncios aparecem, com adequação mediana ao seu perfil.';
    }
    return 'Pouco exigente: muitas opções, mas várias vão destoar das suas preferências.';
}

function sincronizarOrcamento() {
    if (!orcamentoEl) return;
    preencherBarra(orcamentoEl);
    const max = Number(orcamentoEl.max) || 10000;
    const noTeto = Number(orcamentoEl.value) >= max;
    if (orcamentoTexto) {
        orcamentoTexto.textContent = formatarOrcamento(orcamentoEl.value);
        pulsarValor(orcamentoTexto);
    }
    orcamentoEl.setAttribute(
        'aria-valuetext',
        noTeto
            ? `R$ ${max.toLocaleString('pt-BR')} ou mais — sem teto`
            : formatarOrcamento(orcamentoEl.value)
    );
    const dicaOrc = document.getElementById('pref-orcamento-dica');
    if (dicaOrc) {
        dicaOrc.textContent = noTeto
            ? `No máximo do controle: R$ ${max.toLocaleString('pt-BR')} ou mais — o chat não corta por preço.`
            : 'Arraste para ajustar. Anúncios acima desse valor não liberam conversa.';
    }
}

function sincronizarLimiar() {
    if (!limiarEl) return;
    preencherBarra(limiarEl);
    if (limiarTexto) {
        limiarTexto.textContent = `${limiarEl.value}%`;
        pulsarValor(limiarTexto);
    }
    if (limiarDica) {
        limiarDica.textContent = dicaLimiar(limiarEl.value);
    }
}

orcamentoEl?.addEventListener('input', sincronizarOrcamento);
limiarEl?.addEventListener('input', sincronizarLimiar);
sincronizarOrcamento();
sincronizarLimiar();

if (locador) {
    if (campoOrcamento) campoOrcamento.hidden = true;
    if (campoLimiar) campoLimiar.hidden = true;
    if (blocoDestino) blocoDestino.hidden = true;
    if (blocoModo) blocoModo.hidden = true;
    orcamentoEl?.removeAttribute('required');
    limiarEl?.removeAttribute('required');
    const sub = document.querySelector('.page-bar-sub');
    if (sub) sub.textContent = 'Estilo e regras da casa';
    const tipGeral = document.querySelector('.conteudo h2 .tip-panel');
    if (tipGeral) {
        tipGeral.textContent = 'Hábitos e regras do imóvel que você anuncia. Preço e endereço ficam no anúncio.';
    }
    const adesaoTitulo = document.getElementById('pref-adesao-titulo');
    const adesaoTip = document.getElementById('pref-adesao-tip');
    const restricaoTitulo = document.getElementById('pref-restricao-titulo');
    const restricaoTip = document.getElementById('pref-restricao-tip');
    const nota = document.getElementById('pref-tags-nota-locador');
    function renomearTitulo(el, texto) {
        if (!el) return;
        const tip = el.querySelector('.tip');
        el.replaceChildren(document.createTextNode(texto + ' '));
        if (tip) el.append(tip);
    }
    renomearTitulo(adesaoTitulo, 'O que a casa oferece');
    renomearTitulo(restricaoTitulo, 'Regras da casa');
    if (adesaoTip) {
        adesaoTip.textContent = 'Características positivas do imóvel ou da república (ex.: pet friendly, home office).';
    }
    if (restricaoTip) {
        restricaoTip.textContent = 'Limites que valem no imóvel (ex.: silêncio noturno, sem festas). Opcional — melhora o match.';
    }
    if (nota) nota.hidden = false;
} else {
    montarFormDestino();
}

function montarChecks(container, nomes) {
    if (!container) return;
    container.replaceChildren();
    nomes.forEach((tag) => {
        if (catalogo?.criarCheck) {
            container.append(catalogo.criarCheck(tag));
            return;
        }
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${tag}"> ${tag}`;
        container.append(label);
    });
}
montarChecks(boxAdesao, adesao);
montarChecks(boxRestricao, restricao);

const inputsTagsPref = boxesTags.flatMap((box) =>
    [...box.querySelectorAll('input[type="checkbox"]')]
);
const contadorTagsEl = document.getElementById('pref-tags-contador');
const dicaTagsEl = document.getElementById('pref-tags-dica');

function atualizarContadorTags() {
    const n = inputsTagsPref.filter((i) => i.checked).length;
    if (contadorTagsEl) {
        contadorTagsEl.textContent = `${n} ${n === 1 ? 'selecionada' : 'selecionadas'}`;
    }
    if (dicaTagsEl) {
        if (locador) {
            dicaTagsEl.innerHTML = n >= 3
                ? 'A afinidade do morador usa só as tags <strong>marcadas</strong> dele ÷ as que batem com as suas aqui. Desmarcado = neutro. Bom perfil para match.'
                : 'Só o que você marcar no anúncio/perfil entra na afinidade do morador (desmarcado = neutro). Recomendamos <strong>3 ou mais</strong> para aparecer compatível com mais gente.';
        } else {
            dicaTagsEl.innerHTML = n >= 3
                ? 'Só tags <strong>marcadas</strong> entram: se todas as suas batem com o anúncio, é 100% — tags a mais no anúncio não baixam. Não marcar = neutro; rejeição de verdade vai em <strong>Meus limites</strong>.'
                : 'Só tags <strong>marcadas</strong> entram (ex.: 1 sua no anúncio = 100%; 1 de 2 = 50%). Não marcar = neutro; se não aceitar algo, use <strong>Meus limites</strong>. Recomendamos <strong>3 ou mais</strong>.';
        }
    }
}

if (catalogo?.ligarConflitos) {
    catalogo.ligarConflitos(inputsTagsPref, { onChange: atualizarContadorTags });
} else {
    inputsTagsPref.forEach((i) => i.addEventListener('change', atualizarContadorTags));
}
atualizarContadorTags();

function lerDestinosDoPerfil(user) {
    const brutos = Array.isArray(user.destinos) && user.destinos.length
        ? user.destinos
        : (user.destino ? [user.destino] : []);
    const lista = [];
    brutos.forEach((dest) => {
        if (!dest || !Number.isFinite(Number(dest.lat)) || !Number.isFinite(Number(dest.lng))) return;
        const item = {
            nome: dest.nome || 'Destino',
            lat: Number(dest.lat),
            lng: Number(dest.lng),
        };
        const tipo = String(dest.tipo || '').toLowerCase();
        if (TIPOS[tipo]) {
            item.tipo = tipo;
        } else {
            const sugerido = inferirTipo(item.nome);
            if (sugerido) item.tipo = sugerido;
        }
        if (indiceDestino(lista, item) < 0) lista.push(item);
    });
    return lista.slice(0, MAX_DESTINOS);
}

function serializarDestinos() {
    return destinosEscolhidos.slice(0, MAX_DESTINOS).map((d) => {
        const out = {
            nome: String(d.nome).slice(0, 100),
            lat: Number(d.lat),
            lng: Number(d.lng),
        };
        if (TIPOS[d.tipo]) out.tipo = d.tipo;
        return out;
    });
}

/** Snapshot do formulário — compara pra avisar ao sair sem salvar. */
let snapshotSalvo = '';
let liberarSaida = false;
let dialogoSaida = null;
let urlPendenteSaida = null;

function estadoAtualPrefs() {
    const tags = boxesTags
        .flatMap((box) => [...box.querySelectorAll('input:checked')].map((i) => i.value))
        .slice()
        .sort();
    const maxOrc = Number(orcamentoEl?.max) || 10000;
    const valOrc = Number(orcamentoEl?.value ?? 1200);
    return JSON.stringify({
        tags,
        orcamento: locador ? null : (valOrc >= maxOrc ? ORCAMENTO_SEM_TETO : valOrc),
        limiar: locador ? null : Number(limiarEl?.value ?? 70),
        destinos: locador ? [] : serializarDestinos(),
        modo: locador ? null : modoTransporte,
    });
}

function temAlteracoesNaoSalvas() {
    return Boolean(snapshotSalvo) && estadoAtualPrefs() !== snapshotSalvo;
}

function marcarComoSalvo() {
    snapshotSalvo = estadoAtualPrefs();
}

function garantirDialogoSaida() {
    if (dialogoSaida) return dialogoSaida;
    dialogoSaida = document.createElement('dialog');
    dialogoSaida.className = 'pref-sair-dialogo';
    dialogoSaida.setAttribute('aria-labelledby', 'pref-sair-titulo');
    dialogoSaida.innerHTML = `
        <form method="dialog" class="pref-sair-form">
            <h2 id="pref-sair-titulo">Alterações não salvas</h2>
            <p>Você mudou as preferências. Quer salvar antes de sair?</p>
            <div class="pref-sair-acoes">
                <button type="submit" value="ficar" class="btn btn-secondary">Continuar editando</button>
                <button type="submit" value="descartar" class="btn btn-secondary">Sair sem salvar</button>
                <button type="submit" value="salvar" class="btn btn-primary">Salvar e sair</button>
            </div>
        </form>
    `;
    document.body.append(dialogoSaida);
    dialogoSaida.addEventListener('click', (ev) => {
        if (ev.target === dialogoSaida) dialogoSaida.close('ficar');
    });
    dialogoSaida.addEventListener('close', async () => {
        const acao = dialogoSaida.returnValue || 'ficar';
        const url = urlPendenteSaida;
        urlPendenteSaida = null;
        if (acao === 'ficar' || !url) return;
        if (acao === 'descartar') {
            liberarSaida = true;
            window.location.href = url;
            return;
        }
        if (acao === 'salvar') {
            const botao = formPrefs?.querySelector('button[type="submit"]');
            try {
                await salvarPreferencias({ botao });
                liberarSaida = true;
                window.location.href = url;
            } catch (_) {
                /* ficou na página com o erro */
            }
        }
    });
    return dialogoSaida;
}

function pedirSalvarAntesDeSair(url) {
    urlPendenteSaida = url || null;
    const dlg = garantirDialogoSaida();
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else {
        const ok = window.confirm('Há alterações não salvas. Sair sem salvar?');
        if (ok && urlPendenteSaida) {
            liberarSaida = true;
            window.location.href = urlPendenteSaida;
        }
    }
}

async function salvarPreferencias({ botao } = {}) {
    const tags = boxesTags.flatMap((box) =>
        [...box.querySelectorAll('input:checked')].map((i) => i.value)
    );
    if (typeof RoomMatchLoading !== 'undefined') {
        if (botao) RoomMatchLoading.botaoEspera(botao, true, 'Salvando…');
        RoomMatchLoading.mostrar('Salvando preferências…');
    }
    try {
        const corpo = { tags };
        if (!locador) {
            const maxOrc = Number(orcamentoEl?.max) || 10000;
            const valOrc = Number(orcamentoEl?.value ?? 1200);
            // No teto do slider grava “sem teto” real (aceita anúncios acima de 10 mil).
            corpo.orcamento_maximo = valOrc >= maxOrc ? ORCAMENTO_SEM_TETO : valOrc;
            corpo.limiar_compatibilidade = limiarEl?.value ?? 70;
            corpo.destinos = serializarDestinos();
            corpo.modo_transporte = modoTransporte;
        }
        const user = await RoomMatchApi.atualizarPerfil(corpo);
        entrar(RoomMatchApi.lerToken(), user);
        const n = (user.destinos || corpo.destinos || []).length;
        const modoTxt = MODOS[normalizarModo(user.modo_transporte || modoTransporte)];
        retorno.textContent = locador
            ? 'Preferências da casa salvas.'
            : (n
                ? `Pronto. ${n} destino${n === 1 ? '' : 's'} · tempo ${modoTxt.toLowerCase()} no Explorar.`
                : `Preferências salvas (${modoTxt}). Sem destinos — o mural não mostra tempos.`);
        retorno.classList.remove('erro');
        retorno.hidden = false;
        if (!locador) {
            destinosEscolhidos = lerDestinosDoPerfil(user);
            modoTransporte = normalizarModo(user.modo_transporte);
            desenharDestinos();
            desenharModo();
        }
        marcarComoSalvo();
        return user;
    } catch (erro) {
        retorno.textContent = erro.detail || erro.message;
        retorno.classList.add('erro');
        retorno.hidden = false;
        throw erro;
    } finally {
        if (typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.forcarEsconder();
            if (botao) RoomMatchLoading.botaoEspera(botao, false);
        }
    }
}

async function carregar() {
    const aplicar = async () => {
        const user = await RoomMatchApi.meuPerfil();
        if (!locador) {
            const orc = Number(user.orcamento_maximo ?? user.orcamento ?? 1200);
            const lim = Number(user.limiar_compatibilidade ?? user.limiar ?? 70);
            if (orcamentoEl) {
                const min = Number(orcamentoEl.min) || 500;
                const max = Number(orcamentoEl.max) || 10000;
                // Valores ≥ teto do slider (ex.: 999999) = posição máxima = “ou mais”.
                const noSlider = orc >= max
                    ? max
                    : Math.min(max, Math.max(min, Math.round(orc / 50) * 50));
                orcamentoEl.value = String(noSlider);
                sincronizarOrcamento();
            }
            if (limiarEl) {
                limiarEl.value = String(Math.min(100, Math.max(0, Math.round(lim / 5) * 5)));
                sincronizarLimiar();
            }
            destinosEscolhidos = lerDestinosDoPerfil(user);
            modoTransporte = normalizarModo(user.modo_transporte);
            desenharDestinos();
            desenharModo();
        }
        const set = new Set(
            (typeof RoomMatchTags !== 'undefined')
                ? RoomMatchTags.filtrarConvivencia(user.tags || [])
                : (user.tags || [])
        );
        boxesTags.forEach((box) => {
            box.querySelectorAll('input').forEach((input) => {
                input.checked = set.has(input.value);
            });
        });
        if (catalogo?.limparConflitosMarcados) {
            catalogo.limparConflitosMarcados(inputsTagsPref);
        }
        atualizarContadorTags();
        marcarComoSalvo();
    };
    if (typeof RoomMatchLoading !== 'undefined') {
        await RoomMatchLoading.durante(aplicar(), 'Carregando preferências…');
        return;
    }
    await aplicar();
}

const formPrefs = document.getElementById('pref-form');
formPrefs.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const botao = evento.target.querySelector('button[type="submit"]');
    try {
        await salvarPreferencias({ botao });
    } catch (_) {
        /* retorno já preenchido */
    }
});

document.addEventListener('click', (ev) => {
    const link = ev.target.closest('a[href]');
    if (!link || liberarSaida || !temAlteracoesNaoSalvas()) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    let destino;
    try {
        destino = new URL(href, window.location.href);
    } catch (_) {
        return;
    }
    if (destino.origin !== window.location.origin) return;
    if (destino.pathname === window.location.pathname && destino.search === window.location.search) {
        return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    pedirSalvarAntesDeSair(destino.href);
}, true);

window.addEventListener('beforeunload', (ev) => {
    if (liberarSaida || !temAlteracoesNaoSalvas()) return;
    ev.preventDefault();
    ev.returnValue = '';
});

carregar().catch((erro) => {
    retorno.textContent = erro.message || 'Não foi possível carregar.';
    retorno.classList.add('erro');
    retorno.hidden = false;
});
