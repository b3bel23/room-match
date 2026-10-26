/**
 * Catálogo único de tags de convivência (morador ↔ imóvel).
 * Manter alinhado com seed dos anúncios e matching.service.py.
 */
(function (global) {
    const TAGS_CONVIVENCIA = [
        'Pet Friendly',
        'Home Office',
        'Silêncio Noturno',
        'Sem Festas',
        'Sem Fumo',
        'LGBTQIA+ Safe',
        'Vegetariano',
        '420 Friendly',
        'Sem Pets',
        'Mobiliado'
    ];

    global.RoomMatchTags = {
        CONVIVENCIA: TAGS_CONVIVENCIA,
        paraMorador: () => [...TAGS_CONVIVENCIA],
        paraLocador: () => [...TAGS_CONVIVENCIA]
    };
}(window));
