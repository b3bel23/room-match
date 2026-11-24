const papel = new URLSearchParams(window.location.search).get('papel') === 'locador'
    || (typeof ehLocador === 'function' && ehLocador())
    ? 'Locador'
    : 'Morador';

// Tela de confirmação: mostra o recado e leva à ação principal do papel.
const ESPERA_SEGUNDOS = 8;
const destino = papel === 'Locador'
    ? { href: 'publicar-imovel.html', nome: 'primeiro anúncio', lugar: 'à publicação do primeiro anúncio' }
    : { href: 'home.html', nome: 'Explorar', lugar: 'ao Explorar' };

const texto = document.querySelector('.conta-criada-texto');
const contagem = document.getElementById('conta-criada-contagem');
const barra = document.querySelector('.conta-criada-barra span');
const botaoIr = document.getElementById('conta-criada-ir');

texto.textContent = papel === 'Locador'
    ? 'Sua conta de Locador está pronta. Agora publique seu primeiro anúncio — preço, endereço e fotos ficam nele.'
    : 'Sua conta de Morador está pronta. Explore o mural e veja seus matches.';
// Com o servidor, o cadastro envia um link de confirmação de e-mail (RF02).
if (typeof RoomMatchApi !== 'undefined' && RoomMatchApi.modo() === 'live') {
    texto.textContent += ' Enviamos um link para confirmar seu e-mail.';
}
botaoIr.href = destino.href;
botaoIr.textContent = papel === 'Locador'
    ? 'Publicar meu primeiro anúncio'
    : 'Ir agora para o Explorar';

let restante = ESPERA_SEGUNDOS;

function mostrarContagem() {
    const unidade = restante === 1 ? 'segundo' : 'segundos';
    contagem.textContent = `Você será levado ${destino.lugar} em ${restante} ${unidade}.`;
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
