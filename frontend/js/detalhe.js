const params = new URLSearchParams(window.location.search);
const ID_IMOVEL = params.get('id') || 'kitnet-cambui';
const botaoFavoritar = document.getElementById('favoritar');
const linkConversar = document.querySelector('a.btn-conversar, a[href="#conversar"]');
let imovelAtual = null;

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR');
}

function mostrarFavorito(favorito) {
    if (!botaoFavoritar) return;
    botaoFavoritar.textContent = favorito ? '♥ Favoritado' : '♥ Favoritar';
    botaoFavoritar.classList.toggle('favoritado', favorito);
}

function montarAcoesPorPapel(imovel) {
    const acoes = document.querySelector('.acoes');
    if (!acoes) return;

    if (!estaLogado()) {
        if (botaoFavoritar) botaoFavoritar.disabled = true;
        return;
    }

    const user = usuarioAtual();
    const proprio = ehLocador() && imovel.locador_id === user.id;

    if (ehLocador()) {
        if (botaoFavoritar) botaoFavoritar.hidden = true;

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

            let visitas = acoes.querySelector('a[data-acao="visitas"]');
            if (!visitas) {
                visitas = document.createElement('a');
                visitas.className = 'btn btn-secondary';
                visitas.dataset.acao = 'visitas';
                visitas.textContent = 'Agenda de visitas';
                acoes.append(visitas);
            }
            visitas.href = 'calendario-visitas.html';
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
                linkConversar.textContent = 'Chat bloqueado (match/orçamento)';
                linkConversar.setAttribute('aria-disabled', 'true');
                linkConversar.classList.add('btn-disabled');
                linkConversar.title = [
                    !eleg.limiar_ok ? `Match ${eleg.match}% < limiar ${eleg.limiar}%` : null,
                    !eleg.orcamento_ok ? `Preço acima do orçamento R$ ${eleg.orcamento}` : null
                ].filter(Boolean).join(' · ');
            } else {
                linkConversar.textContent = 'Conversar com locador';
                linkConversar.removeAttribute('aria-disabled');
                linkConversar.classList.remove('btn-disabled');
                linkConversar.title = '';
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
        (imovel.tags || []).slice(0, 6).forEach((nome, i) => {
            const span = document.createElement('span');
            span.className = i === 0 ? 'tag tag-destaque' : 'tag';
            span.textContent = nome;
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
    if (trajetoStrong) trajetoStrong.textContent = `${imovel.deslocamento_min} min · ${imovel.destino}`;
    if (trajetoSpan) {
        const km = imovel.distancia_km ? `${imovel.distancia_km} km · ` : '';
        trajetoSpan.textContent = `${km}estimativa com dados abertos de transporte`;
    }

    const afinidade = document.querySelector('.afinidade');
    if (afinidade) {
        if (ehLocador()) {
            afinidade.textContent = 'Seu anúncio';
            afinidade.hidden = !estaLogado();
        } else {
            const match = imovel.match_percent ?? imovel.match ?? 0;
            afinidade.textContent = `${match}%`;
            afinidade.title = `${match}% de afinidade`;
            afinidade.setAttribute('aria-label', `${match}% de afinidade`);
            afinidade.hidden = false;
        }
    }

    const classificacao = document.querySelector('.moradores-cabecalho span');
    if (classificacao) classificacao.textContent = imovel.classificacao || 'Mista';

    const desc = document.getElementById('imovel-descricao');
    if (desc) desc.textContent = imovel.descricao || '';

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
        const partes = [
            imovel.endereco,
            imovel.area_m2 ? `${imovel.area_m2} m²` : null,
            imovel.mobiliado === true ? 'Mobiliado' : imovel.mobiliado === false ? 'Sem mobília' : null,
            imovel.vagas ? `${imovel.vagas} vaga${imovel.vagas > 1 ? 's' : ''}` : null
        ].filter(Boolean);
        resumo.textContent = partes.join(' · ');
    }

    const contasNota = document.getElementById('contas-detalhe');
    if (contasNota) contasNota.textContent = imovel.contas_detalhe || '';

    const listaMoradores = document.getElementById('moradores-lista');
    const moradoresVazio = document.getElementById('moradores-vazio');
    const moradores = imovel.moradores_atuais || [];
    if (listaMoradores) {
        listaMoradores.replaceChildren();
        moradores.forEach((m) => {
            const li = document.createElement('li');
            li.className = 'morador';
            li.innerHTML = `<span class="morador-foto ${m.estilo || 'foto-1'}">${m.iniciais || '?'}</span>
                <div><strong>${m.nome}</strong><span>${m.linha}</span></div>`;
            listaMoradores.append(li);
        });
    }
    if (moradoresVazio) {
        moradoresVazio.hidden = moradores.length > 0;
        if (!moradores.length) {
            moradoresVazio.textContent = ehLocador()
                ? 'Nenhum morador cadastrado neste anúncio ainda.'
                : 'Imóvel individual — sem moradores no mesmo cômodo.';
        }
    }

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
}

async function iniciar() {
    try {
        const imovel = await RoomMatchApi.obterImovel(ID_IMOVEL);
        preencher(imovel);
    } catch (erro) {
        const h2 = document.querySelector('.info > h2');
        if (h2) h2.textContent = erro.message || 'Imóvel não encontrado';
        return;
    }

    if (!estaLogado() || !ehMorador() || !botaoFavoritar || botaoFavoritar.hidden) {
        return;
    }

    mostrarFavorito(await ehFavorito(ID_IMOVEL));
    botaoFavoritar.addEventListener('click', async () => {
        mostrarFavorito(await alternarFavorito(ID_IMOVEL));
    });
}

iniciar();
