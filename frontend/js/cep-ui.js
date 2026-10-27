/**
 * Preenche endereço a partir do CEP (ViaCEP).
 * Campos do schema `enderecos_imovel` / EnderecoImovel:
 * cep, rua, numero, complemento?, bairro, cidade, estado.
 */
(function (global) {
    const VIA_CEP = 'https://viacep.com.br/ws';

    function soDigitos(valor) {
        return String(valor || '').replace(/\D/g, '');
    }

    function formatarCep(valor) {
        const d = soDigitos(valor).slice(0, 8);
        if (d.length <= 5) return d;
        return `${d.slice(0, 5)}-${d.slice(5)}`;
    }

    function montarEnderecoExibicao(dados) {
        const rua = (dados.rua || '').trim();
        const numero = (dados.numero || '').trim();
        const complemento = (dados.complemento || '').trim();
        const bairro = (dados.bairro || '').trim();
        const cidade = (dados.cidade || '').trim();
        const estado = (dados.estado || '').trim();

        const linha1 = [rua, numero].filter(Boolean).join(', ');
        const extra = complemento ? ` (${complemento})` : '';
        const linha2 = [bairro, cidade && estado ? `${cidade}/${estado}` : cidade || estado]
            .filter(Boolean)
            .join(' · ');
        return [linha1 + extra, linha2].filter(Boolean).join(' · ');
    }

    async function buscarCep(cep) {
        const digitos = soDigitos(cep);
        if (digitos.length !== 8) {
            throw new Error('Informe um CEP com 8 dígitos.');
        }
        const resp = await fetch(`${VIA_CEP}/${digitos}/json/`);
        if (!resp.ok) throw new Error('Não foi possível consultar o CEP.');
        const dados = await resp.json();
        if (dados.erro) throw new Error('CEP não encontrado.');
        return {
            cep: formatarCep(dados.cep || digitos),
            rua: String(dados.logradouro || '').trim(),
            complemento: String(dados.complemento || '').trim(),
            bairro: String(dados.bairro || '').trim(),
            cidade: String(dados.localidade || '').trim(),
            estado: String(dados.uf || '').trim().toUpperCase().slice(0, 2)
        };
    }

    function lerCampos(form) {
        const get = (id) => form.querySelector(`#${id}`)?.value?.trim() || '';
        return {
            cep: get('cep'),
            rua: get('rua'),
            numero: get('numero'),
            complemento: get('complemento'),
            bairro: get('bairro'),
            cidade: get('cidade'),
            estado: get('estado')
        };
    }

    function preencherCampos(form, dados, { sobrescrever = true } = {}) {
        const map = {
            cep: dados.cep,
            rua: dados.rua,
            complemento: dados.complemento,
            bairro: dados.bairro,
            cidade: dados.cidade,
            estado: dados.estado
        };
        Object.entries(map).forEach(([id, valor]) => {
            const el = form.querySelector(`#${id}`);
            if (!el || valor == null || valor === '') return;
            if (!sobrescrever && el.value.trim()) return;
            el.value = valor;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    function status(el, texto, erro) {
        if (!el) return;
        el.hidden = !texto;
        el.textContent = texto || '';
        el.classList.toggle('erro', Boolean(erro));
    }

    function ligarFormulario(form, opts = {}) {
        if (!form) return null;
        const cepInput = form.querySelector('#cep');
        const statusEl = form.querySelector('#cep-status') || opts.statusEl;
        if (!cepInput) return null;

        let ultimo = '';
        let busy = false;

        async function consultar(forcar) {
            const formatado = formatarCep(cepInput.value);
            cepInput.value = formatado;
            const digitos = soDigitos(formatado);
            if (digitos.length !== 8) {
                if (forcar) status(statusEl, 'CEP incompleto.', true);
                return;
            }
            if (!forcar && digitos === ultimo) return;
            if (busy) return;
            busy = true;
            status(statusEl, 'Buscando endereço…', false);
            try {
                const dados = await buscarCep(digitos);
                preencherCampos(form, dados, { sobrescrever: true });
                ultimo = digitos;
                const numero = form.querySelector('#numero');
                status(
                    statusEl,
                    dados.rua
                        ? 'Endereço preenchido. Confira e informe o número.'
                        : 'CEP encontrado. Complete a rua e o número.',
                    false
                );
                if (numero && !numero.value) numero.focus();
            } catch (erro) {
                ultimo = '';
                status(statusEl, erro.message || 'Falha ao buscar CEP.', true);
            } finally {
                busy = false;
            }
        }

        cepInput.addEventListener('input', () => {
            const antes = cepInput.selectionStart;
            const bruto = cepInput.value;
            cepInput.value = formatarCep(bruto);
            if (document.activeElement === cepInput && typeof antes === 'number') {
                const pos = Math.min(cepInput.value.length, antes);
                try {
                    cepInput.setSelectionRange(pos, pos);
                } catch (e) {
                    /* ignore */
                }
            }
            if (soDigitos(cepInput.value).length === 8) consultar(false);
        });

        cepInput.addEventListener('blur', () => consultar(false));

        form.querySelector('[data-acao="buscar-cep"]')?.addEventListener('click', (evento) => {
            evento.preventDefault();
            consultar(true);
        });

        return {
            consultar: () => consultar(true),
            ler: () => lerCampos(form),
            montarExibicao: () => montarEnderecoExibicao(lerCampos(form))
        };
    }

    global.RoomMatchCep = {
        formatarCep,
        soDigitos,
        buscarCep,
        montarEnderecoExibicao,
        lerCampos,
        preencherCampos,
        ligarFormulario
    };
}(window));
