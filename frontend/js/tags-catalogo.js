/**
 * Catálogo único de tags de convivência (cadastro ↔ preferências ↔ anúncios).
 * Morador e locador editam o mesmo conjunto em Preferências.
 */
(function (global) {
    const TAGS_CONVIVENCIA = [
        'Pet Friendly',
        'Home Office',
        'Aberto a Festas',
        'Vegetariano',
        '420 Friendly',
        'LGBTQIA+ Safe',
        'Limpeza Compartilhada',
        'Silêncio Noturno',
        'Sem Festas',
        'Sem Fumo',
        'Sem Pets',
        'Visitas Restritas',
        'Itens Individuais',
        'Mobiliado'
    ];

    global.RoomMatchTags = {
        CONVIVENCIA: TAGS_CONVIVENCIA,
        paraMorador: () => [...TAGS_CONVIVENCIA],
        paraLocador: () => [...TAGS_CONVIVENCIA]
    };
}(window));
