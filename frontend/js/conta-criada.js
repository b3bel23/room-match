const papel = new URLSearchParams(window.location.search).get('papel') === 'locador'
    || ehLocador()
    ? 'Locador'
    : 'Morador';

// Tela de confirmação: mostra o recado por 8 segundos e leva à página principal do papel.
const ESPERA_SEGUNDOS = 8;
const destino = papel === 'Locador'
    ? { href: 'meus-imoveis.html', nome: 'Meus anúncios' }
    : { href: 'home.html', nome: 'Explorar' };

const texto = document.querySelector('.conta-criada-texto');
const contagem = document.getElementById('conta-criada-contagem');
const barra = document.querySelector('.conta-criada-barra span');
const botaoIr = document.getElementById('conta-criada-ir');

texto.textContent = papel === 'Locador'
    ? 'Sua conta de Locador está pronta. Agora você já pode publicar seus anúncios.'
    : 'Sua conta de Morador está pronta. Explore o mural e veja seus matches.';
botaoIr.href = destino.href;
botaoIr.textContent = `Ir agora para ${destino.nome === 'Explorar' ? 'o Explorar' : destino.nome}`;

let restante = ESPERA_SEGUNDOS;

function mostrarContagem() {
    const unidade = restante === 1 ? 'segundo' : 'segundos';
    const lugar = destino.nome === 'Explorar' ? 'ao Explorar' : 'a Meus anúncios';
    contagem.textContent = `Você será levado ${lugar} em ${restante} ${unidade}.`;
}

mostrarContagem();
barra.style.animationDuration = `${ESPERA_SEGUNDOS}s`;
document.querySelector('.conta-criada-barra').classList.add('rodando');

const relogio = window.setInterval(() => {
    restante -= 1;
    if (restante > 0) {
        mostrarContagem();
        return;
    }
    window.clearInterval(relogio);
    contagem.textContent = 'Redirecionando…';
    window.location.replace(destino.href);
}, 1000);
