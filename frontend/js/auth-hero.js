/**
 * Painéis auth / marketing: mesmo carrossel de Campinas do mural + degradê.
 */
(function () {
    function ligar() {
        if (typeof ImovelFotos === 'undefined' || !ImovelFotos.iniciarHeroCampinas) return;
        document
            .querySelectorAll('.login-hero, .page-hero.hero-degrade, .page-hero[data-hero-campinas]')
            .forEach((el) => ImovelFotos.iniciarHeroCampinas(el));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ligar);
    } else {
        ligar();
    }
}());
