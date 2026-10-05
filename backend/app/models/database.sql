CREATE TABLE pessoa (
  id_pessoa SERIAL PRIMARY KEY,
  nome varchar(255) NOT NULL
);

CREATE TABLE usuario (
  id_usuario int PRIMARY KEY
    REFERENCES pessoa (id_pessoa) DEFERRABLE INITIALLY IMMEDIATE,
  email varchar(255) UNIQUE NOT NULL,
  senha_hash text NOT NULL,
  telefone varchar(30),
  data_nascimento date,
  foto_perfil text,
  data_cadastro timestamptz NOT NULL,
  bio text,
  cidade_atual varchar(100),
  status_verificacao varchar(30)
);

CREATE TABLE locatario (
  id_locatario int PRIMARY KEY
    REFERENCES usuario (id_usuario) DEFERRABLE INITIALLY IMMEDIATE,
  orcamento_maximo decimal(12,2),
  raio_busca_km decimal(6,2),
  limiar_compatibilidade int,
  preferencias_moradia jsonb
);

CREATE TABLE locador (
  id_locador int PRIMARY KEY
    REFERENCES usuario (id_usuario) DEFERRABLE INITIALLY IMMEDIATE,
  cpf_cnpj varchar(18) UNIQUE
);

CREATE TABLE administrador (
  id_administrador int PRIMARY KEY
    REFERENCES usuario (id_usuario) DEFERRABLE INITIALLY IMMEDIATE,
  nivel_acesso varchar(30) NOT NULL,
  data_admissao date NOT NULL
);

CREATE TABLE tag (
  id_tag SERIAL PRIMARY KEY,
  nome varchar(100) UNIQUE NOT NULL,
  categoria varchar(50)
);

CREATE TABLE usuario_tag (
  id_usuario int
    REFERENCES usuario (id_usuario) DEFERRABLE INITIALLY IMMEDIATE,
  id_tag int
    REFERENCES tag (id_tag) DEFERRABLE INITIALLY IMMEDIATE,
  PRIMARY KEY (id_usuario, id_tag)
);

CREATE TABLE imovel (
  id_imovel SERIAL PRIMARY KEY,
  id_locador int NOT NULL
    REFERENCES locador (id_locador) DEFERRABLE INITIALLY IMMEDIATE,
  valor_aluguel decimal(12,2),
  valor_condominio decimal(12,2),
  valor_iptu decimal(12,2),
  valor_contas_extras decimal(12,2),
  tipo_imovel varchar(50),
  quantidade_quartos int,
  vagas_disponiveis int,
  area_m2 decimal(10,2),
  descricao text,
  caracteristicas jsonb,
  status_disponibilidade varchar(30) NOT NULL,
  data_cadastro timestamptz NOT NULL
);

CREATE TABLE imovel_tag (
  id_imovel int
    REFERENCES imovel (id_imovel) DEFERRABLE INITIALLY IMMEDIATE,
  id_tag int
    REFERENCES tag (id_tag) DEFERRABLE INITIALLY IMMEDIATE,
  PRIMARY KEY (id_imovel, id_tag)
);

CREATE TABLE endereco_imovel (
  id_endereco SERIAL PRIMARY KEY,
  id_imovel int UNIQUE NOT NULL
    REFERENCES imovel (id_imovel) DEFERRABLE INITIALLY IMMEDIATE,
  rua varchar(255) NOT NULL,
  numero varchar(20) NOT NULL,
  complemento varchar(100),
  bairro varchar(100),
  cidade varchar(100),
  estado varchar(100),
  cep varchar(20),
  latitude decimal(10,7),
  longitude decimal(10,7)
);

CREATE TABLE morador_imovel (
  id_morador_imovel BIGSERIAL PRIMARY KEY,
  id_usuario int NOT NULL
    REFERENCES usuario (id_usuario) DEFERRABLE INITIALLY IMMEDIATE,
  id_imovel int NOT NULL
    REFERENCES imovel (id_imovel) DEFERRABLE INITIALLY IMMEDIATE,
  data_entrada date,
  data_saida date,
  status_moradia varchar(30) NOT NULL
);

CREATE TABLE carrossel_imgs (
  id_imagem BIGSERIAL PRIMARY KEY,
  id_imovel int NOT NULL
    REFERENCES imovel (id_imovel) DEFERRABLE INITIALLY IMMEDIATE,
  url_imagem text NOT NULL,
  ordem_exibicao int NOT NULL
);

CREATE TABLE conversa (
  id_conversa SERIAL PRIMARY KEY,
  id_imovel int NOT NULL
    REFERENCES imovel (id_imovel) DEFERRABLE INITIALLY IMMEDIATE,
  data_criacao timestamptz NOT NULL,
  status_conversa varchar(30) NOT NULL
);

CREATE TABLE participante_conversa (
  id_conversa int
    REFERENCES conversa (id_conversa) DEFERRABLE INITIALLY IMMEDIATE,
  id_usuario int
    REFERENCES usuario (id_usuario) DEFERRABLE INITIALLY IMMEDIATE,
  data_entrada timestamptz NOT NULL,
  PRIMARY KEY (id_conversa, id_usuario)
);

CREATE TABLE mensagem (
  id_mensagem BIGSERIAL PRIMARY KEY,
  id_conversa int NOT NULL
    REFERENCES conversa (id_conversa) DEFERRABLE INITIALLY IMMEDIATE,
  id_remetente int NOT NULL
    REFERENCES usuario (id_usuario) DEFERRABLE INITIALLY IMMEDIATE,
  conteudo text NOT NULL,
  data_envio timestamptz NOT NULL,
  status_leitura varchar(30) NOT NULL
);

CREATE TABLE interesse (
  id_interesse BIGSERIAL PRIMARY KEY,
  id_usuario int NOT NULL
    REFERENCES usuario (id_usuario) DEFERRABLE INITIALLY IMMEDIATE,
  id_imovel int NOT NULL
    REFERENCES imovel (id_imovel) DEFERRABLE INITIALLY IMMEDIATE,
  tipo_interesse varchar(20) NOT NULL,
  data_interesse timestamptz NOT NULL
);

CREATE UNIQUE INDEX ON morador_imovel (id_usuario, id_imovel);
CREATE UNIQUE INDEX ON carrossel_imgs (id_imovel, ordem_exibicao);
CREATE UNIQUE INDEX ON interesse (id_usuario, id_imovel);