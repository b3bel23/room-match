if (!requerAuth()) { /* redirect */ }
montarSidebarConfig('preferencias.html');

const box = document.getElementById('pref-tags');
const retorno = document.getElementById('pref-retorno');
const tagsDoPapel = (typeof RoomMatchTags !== 'undefined')
    ? (ehLocador() ? RoomMatchTags.paraLocador() : RoomMatchTags.paraMorador())
    : [
        'Pet Friendly', 'Home Office', 'Silêncio Noturno', 'Sem Festas',
        'Sem Fumo', 'LGBTQIA+ Safe', 'Vegetariano', '420 Friendly', 'Sem Pets', 'Mobiliado'
    ];

tagsDoPapel.forEach((tag) => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${tag}"> ${tag}`;
    box.append(label);
});

async function carregar() {
    const user = await RoomMatchApi.meuPerfil();
    document.getElementById('pref-orcamento').value =
        user.orcamento_maximo ?? user.orcamento ?? (ehLocador() ? 0 : 1200);
    document.getElementById('pref-limiar').value =
        user.limiar_compatibilidade ?? user.limiar ?? (ehLocador() ? 60 : 70);
    const set = new Set(user.tags || []);
    box.querySelectorAll('input').forEach((input) => {
        input.checked = set.has(input.value);
    });
}

document.getElementById('pref-form').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const tags = [...box.querySelectorAll('input:checked')].map((i) => i.value);
    try {
        const user = await RoomMatchApi.atualizarPerfil({
            orcamento_maximo: document.getElementById('pref-orcamento').value,
            limiar_compatibilidade: document.getElementById('pref-limiar').value,
            tags
        });
        entrar(RoomMatchApi.lerToken(), user);
        retorno.textContent = 'Preferências salvas. Elas entram no cálculo de afinidade na hora.';
        retorno.classList.remove('erro');
        retorno.hidden = false;
    } catch (erro) {
        retorno.textContent = erro.detail || erro.message;
        retorno.classList.add('erro');
        retorno.hidden = false;
    }
});

carregar();
