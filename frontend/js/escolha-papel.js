const opcoes = [...document.querySelectorAll('input[name="papel"]')];
const continuar = document.getElementById('papel-continuar');

function atualizarContinuar() {
    const escolhido = opcoes.find((opcao) => opcao.checked).value;
    const nome = escolhido === 'locador' ? 'Locador' : 'Locatário';
    continuar.textContent = `Continuar como ${nome}`;
    continuar.href = `cadastro.html?papel=${escolhido}`;
}

opcoes.forEach((opcao) => opcao.addEventListener('change', atualizarContinuar));
atualizarContinuar();
