/**
 * Modal de denúncia (usa POST /denuncias — tabela já no schema).
 * RoomMatchDenuncia.abrir({ usuarioId?, imovelId?, conversaId?, nome? })
 */
(function (global) {
    const MOTIVOS = [
        { valor: 'assedio', rotulo: 'Assédio ou comportamento abusivo' },
        { valor: 'golpe_fraude', rotulo: 'Golpe ou fraude' },
        { valor: 'conteudo_inadequado', rotulo: 'Conteúdo inadequado' },
        { valor: 'spam', rotulo: 'Spam ou propaganda' },
        { valor: 'anuncio_falso', rotulo: 'Anúncio falso ou enganoso' },
        { valor: 'outro', rotulo: 'Outro' },
    ];

    let dialogo = null;

    function garantirDialogo() {
        if (dialogo) return dialogo;
        dialogo = document.createElement('dialog');
        dialogo.className = 'denuncia-dialogo';
        dialogo.setAttribute('aria-labelledby', 'denuncia-titulo');
        dialogo.innerHTML = `
            <form id="denuncia-form" method="dialog" class="denuncia-form">
                <h2 id="denuncia-titulo">Denunciar</h2>
                <p id="denuncia-alvo" class="denuncia-alvo"></p>
                <label for="denuncia-motivo">Motivo *</label>
                <select id="denuncia-motivo" name="motivo" required>
                    <option value="">Selecione</option>
                    ${MOTIVOS.map((m) => `<option value="${m.valor}">${m.rotulo}</option>`).join('')}
                </select>
                <label for="denuncia-descricao">Detalhes (opcional)</label>
                <textarea id="denuncia-descricao" name="descricao" maxlength="2000"
                    rows="4" placeholder="Conte o que aconteceu. Nossa equipe recebe a denúncia."></textarea>
                <label class="denuncia-bloquear" id="denuncia-bloquear-wrap" hidden>
                    <input id="denuncia-bloquear" type="checkbox">
                    Também bloquear esta pessoa (podem desbloquear depois)
                </label>
                <p id="denuncia-erro" class="denuncia-erro" hidden></p>
                <div class="denuncia-acoes">
                    <button type="button" class="btn btn-secondary" data-acao="cancelar">Cancelar</button>
                    <button type="submit" class="btn btn-primary" data-acao="enviar">Enviar denúncia</button>
                </div>
            </form>`;
        document.body.append(dialogo);

        dialogo.querySelector('[data-acao="cancelar"]').addEventListener('click', () => dialogo.close());
        dialogo.addEventListener('click', (evento) => {
            if (evento.target === dialogo) dialogo.close();
        });
        return dialogo;
    }

    function abrir(opcoes = {}) {
        if (typeof estaLogado === 'function' && !estaLogado()) {
            window.location.href = 'login.html';
            return;
        }
        const dlg = garantirDialogo();
        const form = dlg.querySelector('#denuncia-form');
        const erroEl = dlg.querySelector('#denuncia-erro');
        const alvoEl = dlg.querySelector('#denuncia-alvo');
        const motivoEl = dlg.querySelector('#denuncia-motivo');
        const descEl = dlg.querySelector('#denuncia-descricao');
        const enviarBtn = dlg.querySelector('[data-acao="enviar"]');
        const bloquearWrap = dlg.querySelector('#denuncia-bloquear-wrap');
        const bloquearEl = dlg.querySelector('#denuncia-bloquear');

        erroEl.hidden = true;
        erroEl.textContent = '';
        motivoEl.value = '';
        descEl.value = '';
        const podeBloquear = Boolean(opcoes.usuarioId);
        if (bloquearWrap) bloquearWrap.hidden = !podeBloquear;
        if (bloquearEl) bloquearEl.checked = Boolean(opcoes.bloquearPadrao);
        const nome = opcoes.nome || 'esta pessoa / anúncio';
        alvoEl.textContent = `Denúncia sobre: ${nome}. Vai direto para a equipe RoomMatch.`;

        form.onsubmit = async (evento) => {
            evento.preventDefault();
            if (!motivoEl.value) {
                motivoEl.reportValidity();
                return;
            }
            if (typeof RoomMatchLoading !== 'undefined') {
                RoomMatchLoading.botaoEspera(enviarBtn, true, 'Enviando…');
            } else {
                enviarBtn.disabled = true;
            }
            try {
                if (typeof RoomMatchApi === 'undefined' || !RoomMatchApi.criarDenuncia) {
                    throw new Error('API indisponível.');
                }
                const run = async () => {
                    const resp = await RoomMatchApi.criarDenuncia({
                        motivo: motivoEl.value,
                        descricao: descEl.value.trim() || undefined,
                        usuario_id: opcoes.usuarioId || undefined,
                        imovel_id: opcoes.imovelId || undefined,
                        conversa_id: opcoes.conversaId || undefined,
                    });
                    let extra = '';
                    if (podeBloquear && bloquearEl?.checked && RoomMatchApi.bloquearUsuario) {
                        try {
                            const b = await RoomMatchApi.bloquearUsuario(opcoes.usuarioId);
                            extra = b.mensagem ? `\n\n${b.mensagem}` : '\n\nPessoa bloqueada.';
                            if (typeof opcoes.onBloqueou === 'function') opcoes.onBloqueou();
                        } catch (erroBloq) {
                            extra = `\n\nDenúncia ok, mas o bloqueio falhou: ${
                                erroBloq.detail || erroBloq.message || 'tente pelo botão Bloquear.'
                            }`;
                        }
                    }
                    return { resp, extra };
                };
                const { resp, extra } = typeof RoomMatchLoading !== 'undefined'
                    ? await RoomMatchLoading.durante(run(), 'Enviando denúncia…')
                    : await run();
                dlg.close();
                window.alert((resp.mensagem || 'Denúncia registrada. Nossa equipe vai analisar.') + extra);
                if (typeof opcoes.onEnviou === 'function') opcoes.onEnviou(resp);
            } catch (erro) {
                erroEl.hidden = false;
                erroEl.textContent = erro.detail || erro.message || 'Não foi possível enviar.';
            } finally {
                if (typeof RoomMatchLoading !== 'undefined') {
                    RoomMatchLoading.botaoEspera(enviarBtn, false);
                } else {
                    enviarBtn.disabled = false;
                }
            }
        };

        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', 'true');
    }

    global.RoomMatchDenuncia = { abrir, MOTIVOS };
}(window));
