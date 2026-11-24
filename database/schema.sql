-- Schema completo do RoomMatch, GERADO a partir das migrações Alembic (não edite à mão).
-- Para regenerar: cd backend && alembic upgrade head --sql > ../database/schema.sql
-- Para criar o banco de verdade, use: cd backend && alembic upgrade head

BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> c169f2866b86

CREATE TABLE imoveis (
    id_imovel SERIAL NOT NULL,
    valor_aluguel NUMERIC(10, 2) NOT NULL,
    valor_condominio NUMERIC(10, 2),
    valor_iptu NUMERIC(10, 2),
    valor_contas_extras NUMERIC(10, 2),
    tipo_imovel VARCHAR(50) NOT NULL,
    quantidade_quartos INTEGER NOT NULL,
    vagas_disponiveis INTEGER NOT NULL,
    area_m2 NUMERIC(6, 2),
    descricao TEXT,
    status_disponibilidade VARCHAR(20),
    PRIMARY KEY (id_imovel)
);

CREATE INDEX ix_imoveis_id_imovel ON imoveis (id_imovel);

CREATE TABLE pessoas (
    id_pessoa SERIAL NOT NULL,
    nome VARCHAR(120) NOT NULL,
    tipo_pessoa VARCHAR(20) NOT NULL,
    PRIMARY KEY (id_pessoa)
);

CREATE INDEX ix_pessoas_id_pessoa ON pessoas (id_pessoa);

CREATE TABLE tags (
    id_tag SERIAL NOT NULL,
    nome VARCHAR(50) NOT NULL,
    categoria VARCHAR(30),
    PRIMARY KEY (id_tag),
    UNIQUE (nome)
);

CREATE INDEX ix_tags_id_tag ON tags (id_tag);

CREATE TABLE administradores (
    id_administrador INTEGER NOT NULL,
    nivel_acesso VARCHAR(20) NOT NULL,
    data_admissao DATE NOT NULL,
    PRIMARY KEY (id_administrador),
    FOREIGN KEY(id_administrador) REFERENCES pessoas (id_pessoa)
);

CREATE TABLE avaliacoes (
    id_avaliacao SERIAL NOT NULL,
    id_imovel INTEGER NOT NULL,
    id_pessoa INTEGER NOT NULL,
    nota INTEGER NOT NULL,
    comentario TEXT,
    data_avaliacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (id_avaliacao),
    FOREIGN KEY(id_imovel) REFERENCES imoveis (id_imovel),
    FOREIGN KEY(id_pessoa) REFERENCES pessoas (id_pessoa)
);

CREATE INDEX ix_avaliacoes_id_avaliacao ON avaliacoes (id_avaliacao);

CREATE TABLE carrossel_imagens (
    id_imagem SERIAL NOT NULL,
    id_imovel INTEGER NOT NULL,
    url_imagem VARCHAR(255) NOT NULL,
    ordem_exibicao INTEGER,
    PRIMARY KEY (id_imagem),
    FOREIGN KEY(id_imovel) REFERENCES imoveis (id_imovel)
);

CREATE INDEX ix_carrossel_imagens_id_imagem ON carrossel_imagens (id_imagem);

CREATE TABLE carrossel_moradores (
    id_carrossel_morador SERIAL NOT NULL,
    id_pessoa INTEGER NOT NULL,
    id_imovel INTEGER NOT NULL,
    url_imagem VARCHAR(255) NOT NULL,
    ordem_exibicao INTEGER,
    PRIMARY KEY (id_carrossel_morador),
    FOREIGN KEY(id_imovel) REFERENCES imoveis (id_imovel),
    FOREIGN KEY(id_pessoa) REFERENCES pessoas (id_pessoa)
);

CREATE INDEX ix_carrossel_moradores_id_carrossel_morador ON carrossel_moradores (id_carrossel_morador);

CREATE TABLE enderecos_imovel (
    id_endereco SERIAL NOT NULL,
    id_imovel INTEGER NOT NULL,
    rua VARCHAR(150) NOT NULL,
    numero VARCHAR(20),
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    cep VARCHAR(9),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    PRIMARY KEY (id_endereco),
    FOREIGN KEY(id_imovel) REFERENCES imoveis (id_imovel),
    UNIQUE (id_imovel)
);

CREATE INDEX ix_enderecos_imovel_id_endereco ON enderecos_imovel (id_endereco);

CREATE TABLE imovel_tags (
    id_imovel INTEGER NOT NULL,
    id_tag INTEGER NOT NULL,
    PRIMARY KEY (id_imovel, id_tag),
    FOREIGN KEY(id_imovel) REFERENCES imoveis (id_imovel) ON DELETE CASCADE,
    FOREIGN KEY(id_tag) REFERENCES tags (id_tag) ON DELETE CASCADE
);

CREATE TABLE integrantes_imovel (
    id_integrante SERIAL NOT NULL,
    id_pessoa INTEGER NOT NULL,
    id_imovel INTEGER NOT NULL,
    data_entrada DATE NOT NULL,
    data_saida DATE,
    status_moradia VARCHAR(20),
    PRIMARY KEY (id_integrante),
    FOREIGN KEY(id_imovel) REFERENCES imoveis (id_imovel),
    FOREIGN KEY(id_pessoa) REFERENCES pessoas (id_pessoa)
);

CREATE INDEX ix_integrantes_imovel_id_integrante ON integrantes_imovel (id_integrante);

CREATE TABLE rotas_mobilidade (
    id_rota SERIAL NOT NULL,
    id_imovel INTEGER NOT NULL,
    destino VARCHAR(150) NOT NULL,
    meio_transporte VARCHAR(30) NOT NULL,
    distancia_km NUMERIC(6, 2),
    tempo_estimado_min INTEGER,
    PRIMARY KEY (id_rota),
    FOREIGN KEY(id_imovel) REFERENCES imoveis (id_imovel)
);

CREATE INDEX ix_rotas_mobilidade_id_rota ON rotas_mobilidade (id_rota);

CREATE TABLE usuarios (
    id_usuario INTEGER NOT NULL,
    email VARCHAR(120) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    data_nascimento DATE,
    foto_perfil VARCHAR(255),
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT now(),
    bio TEXT,
    cidade_atual VARCHAR(100),
    status_verificacao BOOLEAN,
    tags_convivencia VARCHAR[],
    PRIMARY KEY (id_usuario),
    FOREIGN KEY(id_usuario) REFERENCES pessoas (id_pessoa)
);

CREATE UNIQUE INDEX ix_usuarios_email ON usuarios (email);

CREATE TABLE locadores (
    id_locador INTEGER NOT NULL,
    cpf_cnpj VARCHAR(20) NOT NULL,
    quantidade_imoveis_anunciados INTEGER,
    PRIMARY KEY (id_locador),
    FOREIGN KEY(id_locador) REFERENCES usuarios (id_usuario),
    UNIQUE (cpf_cnpj)
);

CREATE TABLE locatarios (
    id_locatario INTEGER NOT NULL,
    orcamento_maximo NUMERIC(10, 2) NOT NULL,
    tags_estilo_vida VARCHAR[],
    preferencias_moradia JSONB,
    raio_busca_km NUMERIC(5, 2),
    PRIMARY KEY (id_locatario),
    FOREIGN KEY(id_locatario) REFERENCES usuarios (id_usuario)
);

CREATE TABLE usuario_tags (
    id_usuario INTEGER NOT NULL,
    id_tag INTEGER NOT NULL,
    PRIMARY KEY (id_usuario, id_tag),
    FOREIGN KEY(id_tag) REFERENCES tags (id_tag) ON DELETE CASCADE,
    FOREIGN KEY(id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
);

CREATE TABLE posts (
    id_post SERIAL NOT NULL,
    id_imovel INTEGER NOT NULL,
    id_locador INTEGER NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    data_publicacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status_anuncio VARCHAR(20),
    PRIMARY KEY (id_post),
    FOREIGN KEY(id_imovel) REFERENCES imoveis (id_imovel),
    FOREIGN KEY(id_locador) REFERENCES locadores (id_locador)
);

CREATE INDEX ix_posts_id_post ON posts (id_post);

CREATE TABLE visitas (
    id_visita SERIAL NOT NULL,
    id_locatario INTEGER NOT NULL,
    id_imovel INTEGER NOT NULL,
    data_agendada DATE NOT NULL,
    horario TIME WITHOUT TIME ZONE NOT NULL,
    status_visita VARCHAR(20),
    PRIMARY KEY (id_visita),
    FOREIGN KEY(id_imovel) REFERENCES imoveis (id_imovel),
    FOREIGN KEY(id_locatario) REFERENCES locatarios (id_locatario)
);

CREATE INDEX ix_visitas_id_visita ON visitas (id_visita);

CREATE TABLE conversas (
    id_conversa SERIAL NOT NULL,
    id_locatario INTEGER NOT NULL,
    id_post INTEGER NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status_conversa VARCHAR(20),
    PRIMARY KEY (id_conversa),
    FOREIGN KEY(id_locatario) REFERENCES locatarios (id_locatario),
    FOREIGN KEY(id_post) REFERENCES posts (id_post)
);

CREATE INDEX ix_conversas_id_conversa ON conversas (id_conversa);

CREATE TABLE denuncias (
    id_denuncia SERIAL NOT NULL,
    id_denunciante INTEGER NOT NULL,
    id_usuario_denunciado INTEGER,
    id_post_denunciado INTEGER,
    motivo VARCHAR(100) NOT NULL,
    descricao TEXT,
    data_denuncia TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status_denuncia VARCHAR(20),
    PRIMARY KEY (id_denuncia),
    FOREIGN KEY(id_denunciante) REFERENCES pessoas (id_pessoa),
    FOREIGN KEY(id_post_denunciado) REFERENCES posts (id_post),
    FOREIGN KEY(id_usuario_denunciado) REFERENCES usuarios (id_usuario)
);

CREATE INDEX ix_denuncias_id_denuncia ON denuncias (id_denuncia);

CREATE TABLE likes (
    id_like SERIAL NOT NULL,
    id_post INTEGER NOT NULL,
    id_locatario INTEGER NOT NULL,
    data_like TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (id_like),
    FOREIGN KEY(id_locatario) REFERENCES locatarios (id_locatario),
    FOREIGN KEY(id_post) REFERENCES posts (id_post)
);

CREATE INDEX ix_likes_id_like ON likes (id_like);

CREATE TABLE matches (
    id_match SERIAL NOT NULL,
    id_locatario INTEGER NOT NULL,
    id_post INTEGER NOT NULL,
    percentual_afinidade NUMERIC(5, 2) NOT NULL,
    tags_correspondentes VARCHAR[],
    data_calculo TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (id_match),
    FOREIGN KEY(id_locatario) REFERENCES locatarios (id_locatario),
    FOREIGN KEY(id_post) REFERENCES posts (id_post)
);

CREATE INDEX ix_matches_id_match ON matches (id_match);

CREATE TABLE mensagens (
    id_mensagem SERIAL NOT NULL,
    id_conversa INTEGER NOT NULL,
    id_remetente INTEGER NOT NULL,
    conteudo TEXT NOT NULL,
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status_leitura BOOLEAN,
    PRIMARY KEY (id_mensagem),
    FOREIGN KEY(id_conversa) REFERENCES conversas (id_conversa),
    FOREIGN KEY(id_remetente) REFERENCES pessoas (id_pessoa)
);

CREATE INDEX ix_mensagens_id_mensagem ON mensagens (id_mensagem);

ALTER TABLE "imoveis" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "pessoas" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "administradores" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "avaliacoes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "carrossel_imagens" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "carrossel_moradores" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "enderecos_imovel" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "imovel_tags" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "integrantes_imovel" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "rotas_mobilidade" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "locadores" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "locatarios" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "usuario_tags" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "visitas" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "conversas" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "denuncias" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "likes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "matches" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "mensagens" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "alembic_version" ENABLE ROW LEVEL SECURITY;

INSERT INTO alembic_version (version_num) VALUES ('c169f2866b86') RETURNING alembic_version.version_num;

-- Running upgrade c169f2866b86 -> d82d87d32801

ALTER TABLE usuarios ALTER COLUMN foto_perfil TYPE TEXT;

UPDATE alembic_version SET version_num='d82d87d32801' WHERE alembic_version.version_num = 'c169f2866b86';

-- Running upgrade d82d87d32801 -> 9fe30732904e

ALTER TABLE imoveis ADD COLUMN classificacao VARCHAR(20);

ALTER TABLE locatarios ADD COLUMN limiar_compatibilidade INTEGER;

ALTER TABLE usuarios ADD COLUMN genero VARCHAR(40);

ALTER TABLE usuarios ADD COLUMN ocupacao VARCHAR(120);

ALTER TABLE usuarios ADD COLUMN emprego VARCHAR(80);

ALTER TABLE usuarios ADD COLUMN faculdade VARCHAR(200);

UPDATE locatarios
        SET limiar_compatibilidade = ROUND(COALESCE(
            (preferencias_moradia->>'limiar_compatibilidade')::numeric,
            (preferencias_moradia->>'limiar')::numeric
        ))
        WHERE limiar_compatibilidade IS NULL
          AND preferencias_moradia IS NOT NULL
          AND (preferencias_moradia ? 'limiar_compatibilidade' OR preferencias_moradia ? 'limiar');

UPDATE locatarios SET preferencias_moradia = preferencias_moradia - 'limiar_compatibilidade' - 'limiar' WHERE preferencias_moradia IS NOT NULL;

UPDATE imoveis SET classificacao = 'Mista' WHERE classificacao IS NULL;

UPDATE alembic_version SET version_num='9fe30732904e' WHERE alembic_version.version_num = 'd82d87d32801';

-- Running upgrade 9fe30732904e -> 3654f88a6b5c

CREATE TABLE notificacoes (
    id_notificacao SERIAL NOT NULL,
    id_usuario INTEGER NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    texto VARCHAR(255) NOT NULL,
    link VARCHAR(255),
    lida BOOLEAN NOT NULL,
    criada_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (id_notificacao),
    FOREIGN KEY(id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
);

CREATE INDEX ix_notificacoes_criada_em ON notificacoes (criada_em);

CREATE INDEX ix_notificacoes_id_notificacao ON notificacoes (id_notificacao);

CREATE INDEX ix_notificacoes_id_usuario ON notificacoes (id_usuario);

CREATE TABLE recusas (
    id_recusa SERIAL NOT NULL,
    id_locatario INTEGER NOT NULL,
    id_post INTEGER NOT NULL,
    data_recusa TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (id_recusa),
    FOREIGN KEY(id_locatario) REFERENCES locatarios (id_locatario) ON DELETE CASCADE,
    FOREIGN KEY(id_post) REFERENCES posts (id_post) ON DELETE CASCADE,
    CONSTRAINT uq_recusa_locatario_post UNIQUE (id_locatario, id_post)
);

CREATE INDEX ix_recusas_id_recusa ON recusas (id_recusa);

ALTER TABLE rotas_mobilidade ADD COLUMN detalhes JSONB;

ALTER TABLE rotas_mobilidade ADD COLUMN calculado_em TIMESTAMP WITH TIME ZONE DEFAULT now();

CREATE INDEX ix_rotas_cache ON rotas_mobilidade (id_imovel, destino, meio_transporte);

ALTER TABLE "recusas" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "notificacoes" ENABLE ROW LEVEL SECURITY;

UPDATE alembic_version SET version_num='3654f88a6b5c' WHERE alembic_version.version_num = '9fe30732904e';

-- Running upgrade 3654f88a6b5c -> aca7d178206c

DROP INDEX ix_recusas_id_recusa;

DROP TABLE recusas;

UPDATE alembic_version SET version_num='aca7d178206c' WHERE alembic_version.version_num = '3654f88a6b5c';

COMMIT;
