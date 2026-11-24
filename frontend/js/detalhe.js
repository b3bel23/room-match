const params = new URLSearchParams(window.location.search);
const ID_IMOVEL = (params.get('id') || '').trim();
const botaoFavoritar = document.getElementById('favoritar');
const botaoDenunciar = document.getElementById('denunciar-anuncio');
const linkConversar = document.querySelector('a.btn-conversar, a[href="#conversar"]');
let imovelAtual = null;

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR');
}

/** Quebra muro de texto em parágrafos curtos para leitura fluida. */
function formatarDescricaoEmParagrafos(texto) {
    const bruto = String(texto || '').trim();
    if (!bruto) return [];
    let partes = bruto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (partes.length === 1) {
        const unico = partes[0].replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
        if (unico.length <= 220) return [unico];
        const frases = unico.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [unico];
        partes = [];
        let buf = '';
        frases.forEach((f) => {
            const frase = f.trim();
            if (!frase) return;
            const proximo = buf ? `${buf} ${frase}` : frase;
            if (buf && proximo.length > 200) {
                partes.push(buf);
                buf = frase;
            } else {
                buf = proximo;
            }
        });
        if (buf) partes.push(buf);
    }
    return partes;
}

function mostrarFavorito(favorito) {
    if (!botaoFavoritar) return;
    botaoFavoritar.textContent = favorito ? '♥ Favoritado' : '♥ Favoritar';
    botaoFavoritar.classList.toggle('favoritado', favorito);
}

function formatarMotivosBloqueio(eleg) {
    const motivos = [];
    if (!eleg) return motivos;

    if (!eleg.limiar_ok) {
        const match = Math.round(Number(eleg.match) || 0);
        const limiar = Math.round(Number(eleg.limiar ?? eleg.limiar_compatibilidade) || 0);
        motivos.push(
            `A afinidade com este anúncio é ${match}%, e nas suas preferências você pediu no mínimo ${limiar}%. ` +
            'Baixe o limiar ou escolha um imóvel com hábitos mais parecidos.'
        );
    }
    if (!eleg.orcamento_ok) {
        const preco = Number(imovelAtual?.preco);
        const orcamento = Number(eleg.orcamento ?? eleg.orcamento_maximo);
        const precoTxt = Number.isFinite(preco) ? `R$ ${formatarPreco(preco)}` : 'este valor';
        const orcTxt = Number.isFinite(orcamento) ? `R$ ${formatarPreco(orcamento)}` : 'seu orçamento';
        motivos.push(
            `O total mensal (${precoTxt}) está acima do seu orçamento máximo (${orcTxt}). ` +
            'Aumente o orçamento nas Preferências ou veja anúncios mais baratos.'
        );
    }
    if (!motivos.length) {
        motivos.push('A conversa não está liberada para este anúncio com as preferências atuais.');
    }
    return motivos;
}

function mostrarBloqueioChat(eleg) {
    const box = document.getElementById('chat-bloqueio');
    const lista = document.getElementById('chat-bloqueio-motivos');
    if (!box || !lista) return;

    if (!eleg || eleg.chat_liberado) {
        box.hidden = true;
        lista.replaceChildren();
        return;
    }

    const motivos = formatarMotivosBloqueio(eleg);
    lista.replaceChildren(...motivos.map((texto) => {
        const li = document.createElement('li');
        li.textContent = texto;
        return li;
    }));
    box.hidden = false;
}

function montarAcoesPorPapel(imovel) {
    const acoes = document.querySelector('.acoes');
    if (!acoes) return;

    if (!estaLogado()) {
        if (botaoFavoritar) botaoFavoritar.disabled = true;
        mostrarBloqueioChat(null);
        return;
    }

    const user = usuarioAtual();
    const proprio = ehLocador() && imovel.locador_id === user.id;

    if (ehLocador()) {
        if (botaoFavoritar) botaoFavoritar.hidden = true;
        mostrarBloqueioChat(null);

        if (proprio) {
            if (linkConversar) {
                linkConversar.textContent = 'Ver interessados';
                linkConversar.href = 'mensagens.html';
                linkConversar.classList.remove('btn-conversar');
            }
            let editar = acoes.querySelector('a[data-acao="editar"]');
            if (!editar) {
                editar = document.createElement('a');
                editar.className = 'btn btn-primary';
                editar.dataset.acao = 'editar';
                editar.textContent = 'Editar anúncio';
                acoes.prepend(editar);
            }
            editar.href = `editar-anuncio.html?id=${encodeURIComponent(imovel.id)}`;

        } else if (linkConversar) {
            linkConversar.hidden = true;
        }
        return;
    }

    if (ehMorador()) {
        if (botaoFavoritar) botaoFavoritar.hidden = false;
        if (linkConversar) {
            linkConversar.hidden = false;
            linkConversar.href = '#conversar';
            linkConversar.classList.add('btn-conversar');
            const eleg = imovel.elegibilidade;
            if (eleg && !eleg.chat_liberado) {
                // Texto curto no botão (não corta); o motivo completo fica no aviso abaixo.
                linkConversar.textContent = 'Conversa indisponível';
                linkConversar.setAttribute('aria-disabled', 'true');
                linkConversar.classList.add('btn-disabled');
                const resumo = formatarMotivosBloqueio(eleg).join(' ');
                linkConversar.title = resumo;
                linkConversar.dataset.bloqueioMsg = resumo;
                mostrarBloqueioChat(eleg);
            } else {
                linkConversar.textContent = 'Conversar com locador';
                linkConversar.removeAttribute('aria-disabled');
                linkConversar.classList.remove('btn-disabled');
                linkConversar.title = '';
                delete linkConversar.dataset.bloqueioMsg;
                mostrarBloqueioChat(null);
            }
        }
        acoes.querySelectorAll('a[data-acao]').forEach((el) => el.remove());
    }
}

function preencher(imovel) {
    imovelAtual = imovel;
    document.title = `${imovel.titulo} · Room Match`;
    const local = document.querySelector('.page-bar .local');
    if (local) {
        local.childNodes.forEach((n) => {
            if (n.nodeType === Node.TEXT_NODE) n.textContent = '';
        });
        local.append(` ${imovel.bairro}, ${imovel.cidade || 'Campinas'}`);
    }

    const h1 = document.querySelector('.page-bar h1');
    if (h1) {
        h1.textContent = ehLocador() && imovel.locador_id === usuarioAtual()?.id
            ? 'Seu anúncio'
            : 'Detalhes do imóvel';
    }

    const h2 = document.querySelector('.info > h2');
    if (h2) h2.textContent = imovel.titulo;

    const tags = document.querySelector('.info > .tags');
    if (tags) {
        tags.replaceChildren();
        (imovel.tags || []).forEach((nome) => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = nome;
            span.title = (typeof RoomMatchTags !== 'undefined' && RoomMatchTags.significado)
                ? (RoomMatchTags.significado(nome) || nome)
                : nome;
            tags.append(span);
        });
    }

    const linhas = document.querySelectorAll('.rateio-linha');
    if (linhas.length >= 4) {
        linhas[0].children[1].textContent = `R$ ${formatarPreco(imovel.aluguel)}`;
        linhas[1].children[1].textContent = `R$ ${formatarPreco(imovel.condominio)}`;
        linhas[2].children[1].textContent = `R$ ${formatarPreco(imovel.iptu)}`;
        linhas[3].children[1].textContent = `R$ ${formatarPreco(imovel.contas)}`;
    }
    const total = document.querySelector('.rateio-total strong');
    if (total) total.textContent = `R$ ${formatarPreco(imovel.preco)}`;

    const trajetoStrong = document.querySelector('.trajeto strong');
    const trajetoSpan = document.querySelector('.trajeto span');
    const user = typeof usuarioAtual === 'function' ? usuarioAtual() : null;
    const destinosUser = (user?.destinos?.length
        ? user.destinos
        : (user?.destino ? [user.destino] : []));
    const listaDesloc = (imovel.deslocamentos && imovel.deslocamentos.length)
        ? imovel.deslocamentos
        : (imovel.destino || imovel.deslocamento_min != null
            ? [{ nome: imovel.destino, deslocamento_min: imovel.deslocamento_min, distancia_km: imovel.distancia_km }]
            : []);
    const rotuloTipo = { trabalho: 'Trabalho', faculdade: 'Faculdade', outro: 'Outro' };
    const rotuloDest = (d) => {
        const tipo = rotuloTipo[d?.tipo] || '';
        const nome = d?.nome || '';
        return tipo ? `${tipo} · ${nome}` : nome;
    };
    const comTempo = listaDesloc.filter((d) => d.deslocamento_min != null);
    if (trajetoStrong) {
        if (comTempo.length) {
            trajetoStrong.textContent = comTempo
                .map((d) => `${d.deslocamento_min} min · ${rotuloDest(d)}`)
                .join('\n');
            trajetoStrong.style.whiteSpace = 'pre-line';
        } else if (listaDesloc.length || destinosUser[0]?.nome) {
            const nomes = (listaDesloc.length ? listaDesloc : destinosUser)
                .map(rotuloDest)
                .filter(Boolean);
            trajetoStrong.textContent = nomes.map((n) => `Até ${n}`).join('\n');
            trajetoStrong.style.whiteSpace = 'pre-line';
        } else {
            trajetoStrong.textContent = 'Tempo até seus destinos';
            trajetoStrong.style.whiteSpace = '';
        }
    }
    if (trajetoSpan) {
        if (comTempo.length) {
            const km = comTempo
                .filter((d) => d.distancia_km)
                .map((d) => `${Number(d.distancia_km).toFixed(1)} km · ${rotuloDest(d)}`)
                .join('\n');
            trajetoSpan.textContent = km || 'até seus destinos de interesse';
            trajetoSpan.style.whiteSpace = km ? 'pre-line' : '';
        } else if (listaDesloc.length || destinosUser.length) {
            trajetoSpan.textContent = 'Tempos no mural quando a rota estiver no cache';
            trajetoSpan.style.whiteSpace = '';
        } else {
            trajetoSpan.textContent = 'Em Preferências: Trabalho, Faculdade ou Outro (título)';
            trajetoSpan.style.whiteSpace = '';
        }
    }

    const afinidade = document.querySelector('.afinidade');
    if (afinidade) {
        if (ehLocador()) {
            afinidade.textContent = 'Seu anúncio';
            afinidade.hidden = !estaLogado();
        } else {
            const match = imovel.match_percent ?? imovel.match ?? 0;
            afinidade.textContent = `${match}%`;
            afinidade.title = `${match}% das suas tags marcadas batem com este anúncio (não marcar = neutro; tags extras do anúncio não baixam o %)`;
            afinidade.setAttribute('aria-label', `${match}% de afinidade`);
            afinidade.hidden = false;
        }
    }

    const selo = document.getElementById('imovel-classificacao');
    if (selo) {
        const classe = (imovel.classificacao || 'Mista').trim() || 'Mista';
        const tipo = (imovel.tipo || imovel.badge || '').trim();
        // Só perfil da casa (Feminina/Masculina/Mista); tipo ajuda a ler se é compartilhada.
        const compartilhada = /rep[uú]blica|compartilh|quarto/i.test(tipo)
            ? 'Compartilhada'
            : /kitnet|est[uú]dio|individual/i.test(tipo)
                ? 'Individual'
                : null;
        selo.textContent = compartilhada ? `${classe} · ${compartilhada}` : classe;
        selo.dataset.classificacao = classe.toLowerCase();
    }

    const desc = document.getElementById('imovel-descricao');
    if (desc) {
        desc.replaceChildren();
        formatarDescricaoEmParagrafos(imovel.descricao).forEach((texto) => {
            const p = document.createElement('p');
            p.textContent = texto;
            desc.append(p);
        });
    }

    const comod = document.getElementById('imovel-comodidades');
    if (comod) {
        comod.replaceChildren();
        (imovel.comodidades || []).forEach((item) => {
            const li = document.createElement('li');
            li.textContent = item;
            comod.append(li);
        });
        comod.hidden = !(imovel.comodidades || []).length;
    }

    const resumo = document.getElementById('imovel-resumo');
    if (resumo) {
        const enderecoTxt = imovel.endereco
            || [imovel.rua, imovel.bairro].filter(Boolean).join(' · ')
            || [imovel.bairro, imovel.cidade].filter(Boolean).join(', ');
        const partes = [
            enderecoTxt,
            imovel.endereco_exato ? null : (enderecoTxt ? 'aproximado' : null),
            imovel.area_m2 ? `${imovel.area_m2} m²` : null,
            imovel.mobiliado === true ? 'Mobiliado' : imovel.mobiliado === false ? 'Sem mobília' : null,
            imovel.vagas ? `${imovel.vagas} vaga${imovel.vagas > 1 ? 's' : ''}` : null
        ].filter(Boolean);
        resumo.textContent = partes.join(' · ');
    }

    const contasNota = document.getElementById('contas-detalhe');
    if (contasNota) contasNota.textContent = imovel.contas_detalhe || '';

    if (typeof ImovelFotos !== 'undefined') {
        ImovelFotos.preencherGaleria(imovel);
    }

    document.querySelectorAll('.bloqueio').forEach((el) => {
        el.hidden = estaLogado();
    });

    const botaoRota = document.getElementById('rota-abrir');
    if (botaoRota && !estaLogado()) {
        botaoRota.disabled = true;
        botaoRota.title = 'Cadastre-se para ver o mapa';
    }

    montarAcoesPorPapel(imovel);
    if (botaoDenunciar) {
        // Dono do anúncio não denuncia o próprio post.
        const meu = estaLogado() && ehLocador() && imovel.locador_id != null
            && String(imovel.locador_id) === String((typeof usuarioAtual === 'function' ? usuarioAtual() : null)?.id);
        botaoDenunciar.hidden = Boolean(meu) || !estaLogado();
    }
}

async function iniciar() {
    if (!ID_IMOVEL) {
        const h2 = document.querySelector('.info > h2');
        if (h2) h2.textContent = 'Imóvel não informado';
        const local = document.querySelector('.page-bar .local');
        if (local) {
            local.childNodes.forEach((n) => {
                if (n.nodeType === Node.TEXT_NODE) n.textContent = '';
            });
            local.append(' Abra um anúncio pelo mural');
        }
        return;
    }

    const carregarImovel = async () => {
        const imovel = await RoomMatchApi.obterImovel(ID_IMOVEL);
        preencher(imovel);
        return imovel;
    };

    try {
        if (typeof RoomMatchLoading !== 'undefined') {
            await RoomMatchLoading.durante(carregarImovel(), 'Carregando anúncio…');
        } else {
            await carregarImovel();
        }
    } catch (erro) {
        const h2 = document.querySelector('.info > h2');
        if (h2) h2.textContent = erro.message || 'Imóvel não encontrado';
        if (typeof RoomMatchLoading !== 'undefined') RoomMatchLoading.forcarEsconder();
        return;
    }

    if (!estaLogado() || !ehMorador() || !botaoFavoritar || botaoFavoritar.hidden) {
        return;
    }

    mostrarFavorito(await ehFavorito(ID_IMOVEL));
    botaoFavoritar.addEventListener('click', async () => {
        if (typeof RoomMatchLoading !== 'undefined') {
            RoomMatchLoading.botaoEspera(botaoFavoritar, true);
        }
        try {
            const run = () => alternarFavorito(ID_IMOVEL).then(mostrarFavorito);
            if (typeof RoomMatchLoading !== 'undefined') {
                await RoomMatchLoading.durante(run(), 'Atualizando favorito…');
            } else {
                await run();
            }
        } finally {
            if (typeof RoomMatchLoading !== 'undefined') {
                RoomMatchLoading.botaoEspera(botaoFavoritar, false);
            }
        }
    });
}

botaoDenunciar?.addEventListener('click', () => {
    if (!imovelAtual || typeof RoomMatchDenuncia === 'undefined') return;
    if (!estaLogado()) {
        window.location.href = 'login.html';
        return;
    }
    RoomMatchDenuncia.abrir({
        imovelId: imovelAtual.id,
        usuarioId: imovelAtual.locador_id || imovelAtual.locador?.id,
        nome: imovelAtual.titulo || 'este anúncio',
    });
});

iniciar();
