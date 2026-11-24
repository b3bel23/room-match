/** Favoritos via API (mock ou live). Mantém helpers usados por detalhe/favoritos. */

async function listarFavoritosDetalhados() {
    const dados = await RoomMatchApi.listarFavoritos();
    return (dados.items || []).map((imovel) => ({
        ...imovel,
        match: imovel.match_percent ?? imovel.match ?? 0
    }));
}

async function ehFavorito(id) {
    const dados = await RoomMatchApi.listarFavoritos();
    // IDs numéricos na API real e texto no mock/URL: compara como texto.
    return (dados.ids || []).map(String).includes(String(id));
}

async function alternarFavorito(id) {
    const dados = await RoomMatchApi.alternarFavorito(id);
    return Boolean(dados.favorito);
}
