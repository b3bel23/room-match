/**
 * Sidebar de configuração — menus distintos por papel (sem itens reciclados).
 */
function montarSidebarConfig(ativo) {
    const aside = document.querySelector('aside.sidebar');
    if (!aside) return;

    let itens = [];
    if (typeof ehLocador === 'function' && ehLocador()) {
        itens = [
            ['perfil.html', 'Perfil'],
            ['preferencias.html', 'Preferências'],
            ['meus-imoveis.html', 'Meus anúncios'],
            ['publicar-imovel.html', 'Publicar anúncio'],
            ['calendario-visitas.html', 'Calendário de visitas'],
            ['mensagens.html', 'Mensagens'],
            ['seguranca.html', 'Segurança'],
            ['termos.html', 'Termos']
        ];
    } else if (typeof ehMorador === 'function' && ehMorador()) {
        itens = [
            ['perfil.html', 'Perfil'],
            ['preferencias.html', 'Preferências'],
            ['favoritos.html', 'Favoritos'],
            ['calendario-visitas.html', 'Calendário de visitas'],
            ['mensagens.html', 'Mensagens'],
            ['seguranca.html', 'Segurança'],
            ['termos.html', 'Termos']
        ];
    } else {
        itens = [
            ['perfil.html', 'Perfil'],
            ['seguranca.html', 'Segurança'],
            ['termos.html', 'Termos']
        ];
    }

    aside.innerHTML = `<p class="sidebar-rotulo">Menu</p>${
        itens.map(([href, label]) =>
            `<a class="${ativo === href ? 'ativo' : ''}" href="${href}">${label}</a>`).join('')
    }<a class="sair" href="#">Sair da conta</a>`;
    if (typeof ligarSair === 'function') ligarSair();
}
