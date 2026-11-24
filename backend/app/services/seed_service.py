"""
Dados fictícios para desenvolvimento e demonstração (KAN-30).

Espelha o catálogo do front (frontend/js/mock-api.js e tags-catalogo.js): usuários
de demonstração, anúncios com fotos em frontend/assets/imoveis/{slug}/ (4 fotos cada),
tags de convivência e comodidades de anúncio (Wi-Fi etc. — fora do match).
Anúncios novos: 1 locador por vaga; sem lista de residentes no anúncio.

É idempotente: cada registro é buscado pela chave natural (e-mail, nome da tag, título do
anúncio...) e só criado se não existir, então rodar duas vezes não duplica nada.
"""

from __future__ import annotations

import logging
from datetime import date
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.services import storage_service

log = logging.getLogger("roommatch.seed")

# frontend/assets/imoveis/{slug}/1.jpg … (repo root = parents[3] from this file)
_ASSETS_IMOVEIS = Path(__file__).resolve().parents[3] / "frontend" / "assets" / "imoveis"
from app.models.carrossel_imagem import CarrosselImagem
from app.models.endereco_imovel import EnderecoImovel
from app.models.imovel import Imovel
from app.models.imovel_tag import ImovelTag
from app.models.integrante_imovel import IntegranteImovel
from app.models.like import Like
from app.models.locador import Locador
from app.models.locatario import Locatario
from app.models.post import Post
from app.models.tag import Tag
from app.models.usuario import Usuario
from app.models.usuario_tag import UsuarioTag

from app.services.tags_catalogo import COMODIDADES as _COMOD, CONVIVENCIA as _CONV

# Catálogo usado no seed (= front/backend tags_catalogo).
TAGS = list(_CONV) + list(_COMOD)

# papel: "locador" | "locatario" | None (só mora num imóvel, sem perfil de busca/anúncio)
# `foto` = arquivo em frontend/assets/perfis/ (também sobe para Storage no backfill).
USUARIOS = [
    {
        "email": "locador@demo.com", "nome": "Ana Ribeiro", "papel": "locador", "cpf_cnpj": "11111111111",
        "telefone": "(19) 99712-4408", "genero": "Mulher Cisgênero", "ocupacao": "cbo-2",
        "emprego": "autonomo", "faculdade": "puc-campinas-campus1",
        "cidade_atual": "Campinas", "data_nascimento": date(1992, 4, 18),
        "bio": "Arquiteta e locadora na região de Barão Geraldo. Prefiro casas tranquilas e bem cuidadas.",
        "foto": "perfil-ana.jpg",
        "tags": ["Aceita Animais", "Sem Festas", "Silêncio Noturno"],
    },
    {
        "email": "locador2@demo.com", "nome": "Carlos Mendes", "papel": "locador", "cpf_cnpj": "22222222222",
        "telefone": "(19) 98105-6632", "genero": "Homem Cisgênero", "ocupacao": "cbo-1",
        "emprego": "empregador", "faculdade": "",
        "cidade_atual": "Campinas", "data_nascimento": date(1986, 11, 3),
        "bio": "Investidor imobiliário no Cambuí. Anúncios com foco em kitnets e studios para profissionais.",
        "foto": "perfil-carlos.jpg",
        "tags": ["Trabalho em Casa", "Sem Fumo", "Silêncio Noturno"],
    },
    # destino → locatarios.preferencias_moradia.destino (schema JSONB); usado no mural/stats.
    {
        "email": "morador@demo.com", "nome": "Marina Souza", "papel": "locatario", "orcamento": 1200, "limiar": 70,
        "telefone": "(19) 99471-2830", "genero": "Mulher Cisgênero", "ocupacao": "estudante",
        "emprego": "estagio", "faculdade": "puc-campinas-campus1",
        "cidade_atual": "Campinas", "data_nascimento": date(2002, 7, 9),
        "bio": "Estudante de Psicologia na PUC. Busco quarto calmo, pet friendly, perto do campus.",
        "foto": "perfil-marina.jpg",
        "tags": ["Aceita Animais", "Silêncio Noturno", "Trabalho em Casa"],
        "raio_busca_km": 15,
        "destinos": [
            {"nome": "PUC Campinas · Campus I", "lat": -22.8345, "lng": -47.0525, "tipo": "faculdade"},
            {"nome": "Estágio no Centro", "lat": -22.9056, "lng": -47.0608, "tipo": "trabalho"},
        ],
    },
    {
        "email": "morador2@demo.com", "nome": "Rafael Lima", "papel": "locatario", "orcamento": 800, "limiar": 50,
        "telefone": "(19) 98852-7164", "genero": "Homem Cisgênero", "ocupacao": "estudante",
        "emprego": "bolsista", "faculdade": "unicamp-campinas",
        "cidade_atual": "Campinas", "data_nascimento": date(2001, 1, 22),
        "bio": "Mestrando na UNICAMP. Vegetariano, LGBTQIA+ safe e preciso de espaço para estudar em casa.",
        "foto": "perfil-rafael.jpg",
        "tags": ["Vegetariano", "LGBTQIA+ Acolhedor", "Trabalho em Casa"],
        "raio_busca_km": 12,
        "destinos": [
            {"nome": "UNICAMP", "lat": -22.8184, "lng": -47.0647, "tipo": "faculdade"},
            {"nome": "Academia Barão", "lat": -22.8225, "lng": -47.0820, "tipo": "outro"},
        ],
    },
    {
        "email": "morador3@demo.com", "nome": "Beatriz Alves", "papel": "locatario", "orcamento": 1500, "limiar": 40,
        "telefone": "(19) 99630-1187", "genero": "Mulher Cisgênero", "ocupacao": "cbo-3",
        "emprego": "clt", "faculdade": "",
        "cidade_atual": "Campinas", "data_nascimento": date(1998, 9, 14),
        "bio": "Técnica de enfermagem no Centro. Quero casa com gente tranquila e que aceite meu gato.",
        "foto": "perfil-beatriz.jpg",
        "tags": ["Aceita Animais", "Trabalho em Casa", "Sem Festas"],
        "raio_busca_km": 20,
        "destinos": [
            {"nome": "Hospital no Centro", "lat": -22.9056, "lng": -47.0608, "tipo": "trabalho"},
            {"nome": "Cambuí", "lat": -22.8940, "lng": -47.0490, "tipo": "outro"},
            {"nome": "Taquaral", "lat": -22.8720, "lng": -47.0480, "tipo": "outro"},
        ],
    },
    {
        "email": "residente1@demo.com", "nome": "Lucas Prado", "papel": None,
        "telefone": "(19) 98244-5091", "genero": "Homem Cisgênero", "ocupacao": "estudante",
        "emprego": "estudante-sem-vinculo", "faculdade": "puc-campinas-campus1",
        "cidade_atual": "Campinas", "data_nascimento": date(2003, 3, 5),
        "bio": "Moro na república do Barão. Curso Administração na PUC.",
        "foto": "perfil-lucas.jpg",
        "tags": ["Aceita Animais", "Trabalho em Casa"],
    },
    {
        "email": "residente2@demo.com", "nome": "Julia Campos", "papel": None,
        "telefone": "(19) 99118-7742", "genero": "Mulher Cisgênero", "ocupacao": "estudante",
        "emprego": "estagio", "faculdade": "unicamp-campinas",
        "cidade_atual": "Campinas", "data_nascimento": date(2002, 12, 1),
        "bio": "Estágio em design. Gosto de casa organizada e silêncio à noite.",
        "foto": "perfil-julia.jpg",
        "tags": ["Silêncio Noturno", "Aceita Animais"],
    },
    {
        "email": "residente3@demo.com", "nome": "Pedro Rocha", "papel": None,
        "telefone": "(19) 98765-3304", "genero": "Homem Cisgênero", "ocupacao": "cbo-5",
        "emprego": "sem-carteira", "faculdade": "",
        "cidade_atual": "Campinas", "data_nascimento": date(1999, 6, 28),
        "bio": "Trabalho com delivery e divido casa em Sousas. Tranquilo e sem festas.",
        "foto": "perfil-pedro.jpg",
        "tags": ["Sem Festas", "Organizado"],
    },
    # Locadores extras — 1 anúncio novo cada (demo realista RMC).
    {
        "email": "locador3@demo.com", "nome": "Fernanda Dias", "papel": "locador", "cpf_cnpj": "33333333333",
        "telefone": "(19) 99120-4410", "genero": "Mulher Cisgênero", "ocupacao": "cbo-2",
        "emprego": "clt", "faculdade": "",
        "cidade_atual": "Campinas", "data_nascimento": date(1988, 2, 14),
        "bio": "Locadora de quartos em Barão Geraldo, perto da UNICAMP.",
        "foto": "perfil-ana.jpg",
        "tags": ["Sem Fumo", "Silêncio Noturno", "Organizado"],
    },
    {
        "email": "locador4@demo.com", "nome": "Patrícia Nogueira", "papel": "locador", "cpf_cnpj": "44444444444",
        "telefone": "(19) 99231-5521", "genero": "Mulher Cisgênero", "ocupacao": "cbo-4",
        "emprego": "autonomo", "faculdade": "",
        "cidade_atual": "Campinas", "data_nascimento": date(1979, 8, 21),
        "bio": "Administro pensionato feminino em Barão. Contas inclusas e casa organizada.",
        "foto": "perfil-ana.jpg",
        "tags": ["Sem Festas", "Organizado", "Silêncio Noturno"],
    },
    {
        "email": "locador5@demo.com", "nome": "Ricardo Almeida", "papel": "locador", "cpf_cnpj": "55555555555",
        "telefone": "(19) 98342-6632", "genero": "Homem Cisgênero", "ocupacao": "cbo-1",
        "emprego": "empregador", "faculdade": "",
        "cidade_atual": "Campinas", "data_nascimento": date(1984, 5, 9),
        "bio": "Studios e kitnets mobiliados no Cambuí para profissionais e pós-graduação.",
        "foto": "perfil-carlos.jpg",
        "tags": ["Trabalho em Casa", "Silêncio Noturno", "Sem Fumo"],
    },
    {
        "email": "locador6@demo.com", "nome": "Sofia Martins", "papel": "locador", "cpf_cnpj": "66666666666",
        "telefone": "(19) 98453-7743", "genero": "Mulher Cisgênero", "ocupacao": "cbo-2",
        "emprego": "clt", "faculdade": "",
        "cidade_atual": "Campinas", "data_nascimento": date(1990, 11, 30),
        "bio": "Quarto em apartamento no Centro, bom para quem trabalha em plantão ou comércio.",
        "foto": "perfil-ana.jpg",
        "tags": ["Trabalho em Casa", "LGBTQIA+ Acolhedor", "Sem Festas"],
    },
    {
        "email": "locador7@demo.com", "nome": "Eduardo Pires", "papel": "locador", "cpf_cnpj": "77777777777",
        "telefone": "(19) 98564-8854", "genero": "Homem Cisgênero", "ocupacao": "cbo-5",
        "emprego": "autonomo", "faculdade": "",
        "cidade_atual": "Campinas", "data_nascimento": date(1987, 3, 17),
        "bio": "Casa compartilhada em bairro residencial com custo mais acessível.",
        "foto": "perfil-carlos.jpg",
        "tags": ["Aceita Animais", "Sem Festas", "Organizado"],
    },
    {
        "email": "locador8@demo.com", "nome": "Camila Ferreira", "papel": "locador", "cpf_cnpj": "88888888888",
        "telefone": "(19) 98675-9965", "genero": "Mulher Cisgênero", "ocupacao": "cbo-2",
        "emprego": "autonomo", "faculdade": "puc-campinas-campus1",
        "cidade_atual": "Campinas", "data_nascimento": date(1991, 7, 4),
        "bio": "Suítes perto do Shopping Dom Pedro e da região da Nova Campinas.",
        "foto": "perfil-ana.jpg",
        "tags": ["Trabalho em Casa", "Silêncio Noturno", "LGBTQIA+ Acolhedor"],
    },
    {
        "email": "locador9@demo.com", "nome": "Bruno Teixeira", "papel": "locador", "cpf_cnpj": "99999999999",
        "telefone": "(19) 98786-1076", "genero": "Homem Cisgênero", "ocupacao": "cbo-3",
        "emprego": "clt", "faculdade": "",
        "cidade_atual": "Campinas", "data_nascimento": date(1985, 12, 12),
        "bio": "Kitnets compactas em Barão Geraldo para quem quer privacidade perto do campus.",
        "foto": "perfil-carlos.jpg",
        "tags": ["Trabalho em Casa", "Sem Fumo", "Organizado"],
    },
    {
        "email": "locador10@demo.com", "nome": "Larissa Moura", "papel": "locador", "cpf_cnpj": "10101010101",
        "telefone": "(19) 98897-2187", "genero": "Mulher Cisgênero", "ocupacao": "cbo-4",
        "emprego": "servidor", "faculdade": "",
        "cidade_atual": "Campinas", "data_nascimento": date(1983, 9, 25),
        "bio": "República mista no Taquaral, perto do parque e do comércio.",
        "foto": "perfil-ana.jpg",
        "tags": ["Aceita Animais", "Silêncio Noturno", "Trabalho em Casa"],
    },
    {
        "email": "locador11@demo.com", "nome": "Gustavo Ramos", "papel": "locador", "cpf_cnpj": "12121212121",
        "telefone": "(19) 98908-3298", "genero": "Homem Cisgênero", "ocupacao": "cbo-7",
        "emprego": "clt", "faculdade": "",
        "cidade_atual": "Campinas", "data_nascimento": date(1982, 1, 8),
        "bio": "Quarto em casa no Parque Via Norte / Costa e Silva — opção econômica.",
        "foto": "perfil-carlos.jpg",
        "tags": ["Sem Festas", "Aceita Animais", "Organizado"],
    },
    {
        "email": "locador12@demo.com", "nome": "Isabela Duarte", "papel": "locador", "cpf_cnpj": "13131313131",
        "telefone": "(19) 99019-4309", "genero": "Mulher Cisgênero", "ocupacao": "cbo-2",
        "emprego": "autonomo", "faculdade": "",
        "cidade_atual": "Campinas", "data_nascimento": date(1989, 6, 16),
        "bio": "Suíte em apartamento no Cambuí com foco em silêncio e home office.",
        "foto": "perfil-ana.jpg",
        "tags": ["Silêncio Noturno", "Trabalho em Casa", "Sem Fumo"],
    },
]

# `slug` é a pasta em frontend/assets/imoveis/ (4 fotos cada); `moradores` são e-mails de USUARIOS.
IMOVEIS = [
    {"slug": "republica-barao", "locador": "locador@demo.com",
     "titulo": "Quarto privativo em república · Barão Geraldo",
     "tipo": "República", "classificacao": "Mista",
     "rua": "Rua Benedito Alves Aranha", "numero": "450", "bairro": "Barão Geraldo",
     "cep": "13083-050", "lat": -22.8190, "lng": -47.0760,
     "aluguel": 950, "condominio": 0, "iptu": 45, "contas": 120, "area_m2": 14,
     "tags": ["Aceita Animais", "Silêncio Noturno", "Trabalho em Casa", "Sem Festas", "Wi-Fi", "Mobiliado"],
     "moradores": [],
     "descricao": (
         "Quarto individual mobiliado em república estudantil a ~8 minutos a pé da PUC Campinas (Campus I). "
         "Casa com 4 quartos, sala, cozinha completa e área de serviço. Wi-Fi fibra, limpeza da área comum "
         "1×/semana, silêncio após 22h, pet pequeno ok. Contas no rateio; vaga rotativa na garagem."
     )},
    {"slug": "kitnet-cambui", "locador": "locador2@demo.com",
     "titulo": "Kitnet mobiliada com varanda · Cambuí",
     "tipo": "Kitnet", "classificacao": "Mista",
     "rua": "Rua Coronel Quirino", "numero": "200", "bairro": "Cambuí",
     "cep": "13025-001", "lat": -22.8930, "lng": -47.0480,
     "aluguel": 2400, "condominio": 350, "iptu": 80, "contas": 0, "area_m2": 28,
     "tags": ["Trabalho em Casa", "Mobiliado", "Silêncio Noturno", "LGBTQIA+ Acolhedor", "Ar-condicionado", "Wi-Fi"],
     "moradores": [],
     "descricao": (
         "Kitnet independente de 28 m² no Cambuí, 100% mobiliada com ar-condicionado e varanda. "
         "Prédio com portaria 24h e elevador. Contas básicas inclusas no pacote. Perto do comércio."
     )},
    {"slug": "casa-sousas", "locador": "locador@demo.com",
     "titulo": "Quarto em casa com quintal · Sousas",
     "tipo": "Casa", "classificacao": "Mista",
     "rua": "Rua das Orquídeas", "numero": "120", "bairro": "Sousas",
     "cep": "13106-000", "lat": -22.8770, "lng": -47.0080,
     "aluguel": 580, "condominio": 0, "iptu": 70, "contas": 110, "area_m2": 16,
     "tags": ["Aceita Animais", "Sem Festas", "Trabalho em Casa", "Wi-Fi", "Mobiliado"],
     "moradores": [],
     "descricao": (
         "Quarto arejado em casa térrea em Sousas com quintal, churrasqueira e garagem. "
         "Casa compartilhada; pet friendly; sem festas. Contas divididas entre os moradores."
     )},
    {"slug": "suite-taquaral", "locador": "locador@demo.com",
     "titulo": "Suíte com banheiro privativo · Taquaral",
     "tipo": "Apartamento", "classificacao": "Feminina",
     "rua": "Avenida José Bonifácio", "numero": "890", "bairro": "Taquaral",
     "cep": "13087-000", "lat": -22.8720, "lng": -47.0485,
     "aluguel": 820, "condominio": 180, "iptu": 60, "contas": 95, "area_m2": 18,
     "tags": ["Silêncio Noturno", "Trabalho em Casa", "LGBTQIA+ Acolhedor", "Ar-condicionado", "Mobiliado", "Wi-Fi"],
     "moradores": [],
     "descricao": (
         "Suíte (quarto + banheiro + closet) em apartamento no Taquaral, república feminina. "
         "Perto do Parque Portugal; condomínio com academia e portaria. Contas já estimadas no rateio."
     )},
    {"slug": "republica-masc-barao", "locador": "locador3@demo.com",
     "titulo": "Quarto em república masculina · Barão Geraldo",
     "tipo": "República", "classificacao": "Masculina",
     "rua": "Rua Salvador de Toledo Piza Júnior", "numero": "312", "bairro": "Barão Geraldo",
     "cep": "13083-200", "lat": -22.8165, "lng": -47.0690,
     "aluguel": 750, "condominio": 0, "iptu": 40, "contas": 130, "area_m2": 12,
     "tags": ["Silêncio Noturno", "Trabalho em Casa", "Sem Fumo", "Wi-Fi", "Mobiliado"],
     "moradores": [],
     "descricao": (
         "Quarto individual em república só masculina a ~10 min a pé da UNICAMP. "
         "Casa com 5 quartos, cozinha completa, lavanderia e Wi-Fi fibra. Silêncio após 23h; "
         "contas (água, luz, internet) no rateio. Ideal para graduação ou mestrado."
     )},
    {"slug": "pensionato-fem-barao", "locador": "locador4@demo.com",
     "titulo": "Quarto em pensionato feminino · Barão Geraldo",
     "tipo": "República", "classificacao": "Feminina",
     "rua": "Rua José Cantusio", "numero": "88", "bairro": "Barão Geraldo",
     "cep": "13084-010", "lat": -22.8210, "lng": -47.0725,
     "aluguel": 1100, "condominio": 0, "iptu": 0, "contas": 0, "area_m2": 14,
     "tags": ["Sem Festas", "Organizado", "Silêncio Noturno", "Wi-Fi", "Mobiliado", "Sem Fumo"],
     "moradores": [],
     "descricao": (
         "Quarto grande em pensionato feminino em Barão Geraldo. Água, energia, gás e internet "
         "inclusos no valor. Casa administrada, mobiliada, limpeza das áreas comuns incluída. "
         "Ambiente tranquilo para estudo; visitas com horário."
     )},
    {"slug": "kitnet-studio-cambui", "locador": "locador5@demo.com",
     "titulo": "Studio mobiliado 20 m² · Cambuí",
     "tipo": "Kitnet", "classificacao": "Mista",
     "rua": "Avenida Benjamin Constant", "numero": "1540", "bairro": "Cambuí",
     "cep": "13025-245", "lat": -22.8965, "lng": -47.0510,
     "aluguel": 3000, "condominio": 0, "iptu": 0, "contas": 0, "area_m2": 20,
     "tags": ["Mobiliado", "Ar-condicionado", "Wi-Fi", "Trabalho em Casa", "Silêncio Noturno"],
     "moradores": [],
     "descricao": (
         "Studio de 20 m² no Cambuí, mobiliado com ar-condicionado, cama de casal, cooktop e "
         "micro-ondas. Pacote com água, luz, internet, condomínio e IPTU inclusos. "
         "Perto do Bosque dos Jequitibás e do comércio da região."
     )},
    {"slug": "quarto-apto-centro", "locador": "locador6@demo.com",
     "titulo": "Quarto em apartamento · Centro",
     "tipo": "Apartamento", "classificacao": "Mista",
     "rua": "Rua Barão de Jaguara", "numero": "980", "bairro": "Centro",
     "cep": "13015-001", "lat": -22.9058, "lng": -47.0605,
     "aluguel": 900, "condominio": 220, "iptu": 50, "contas": 100, "area_m2": 13,
     "tags": ["Trabalho em Casa", "Wi-Fi", "Mobiliado", "LGBTQIA+ Acolhedor", "Sem Festas"],
     "moradores": [],
     "descricao": (
         "Quarto mobiliado em apartamento no Centro de Campinas, perto de pontos de ônibus e "
         "comércio. Bom para quem trabalha em plantão ou no centro expandido. "
         "Áreas comuns organizadas; sem festas."
     )},
    {"slug": "casa-jardim-eulina", "locador": "locador7@demo.com",
     "titulo": "Quarto em casa compartilhada · Jardim Eulina",
     "tipo": "Casa", "classificacao": "Mista",
     "rua": "Rua Doutor Antônio Carlos Couto de Barros", "numero": "245", "bairro": "Jardim Eulina",
     "cep": "13063-010", "lat": -22.9280, "lng": -47.0900,
     "aluguel": 600, "condominio": 0, "iptu": 45, "contas": 0, "area_m2": 11,
     "tags": ["Aceita Animais", "Sem Festas", "Wi-Fi", "Mobiliado", "Organizado"],
     "moradores": [],
     "descricao": (
         "Quarto em casa térrea no Jardim Eulina — opção mais acessível longe do Barão. "
         "Água, luz e internet inclusas. Pet pequeno ok; ambiente familiar e sem festas. "
         "Acesso a ônibus para o Centro e UNICAMP."
     )},
    {"slug": "suite-nova-campinas", "locador": "locador8@demo.com",
     "titulo": "Suíte perto do Dom Pedro · Nova Campinas",
     "tipo": "Apartamento", "classificacao": "Mista",
     "rua": "Rua Dr. Romeu Tortima", "numero": "510", "bairro": "Nova Campinas",
     "cep": "13092-310", "lat": -22.8520, "lng": -47.0250,
     "aluguel": 1050, "condominio": 250, "iptu": 70, "contas": 90, "area_m2": 17,
     "tags": ["Trabalho em Casa", "Silêncio Noturno", "Ar-condicionado", "Wi-Fi", "Mobiliado", "LGBTQIA+ Acolhedor"],
     "moradores": [],
     "descricao": (
         "Suíte com banheiro privativo em apartamento perto do Shopping Dom Pedro. "
         "Escrivania para home office, ar-condicionado e Wi-Fi. Condomínio com portaria. "
         "Perfil misto, foco em silêncio e estudo."
     )},
    {"slug": "kitnet-barao", "locador": "locador9@demo.com",
     "titulo": "Kitnet compacta · Barão Geraldo",
     "tipo": "Kitnet", "classificacao": "Mista",
     "rua": "Avenida 1", "numero": "720", "bairro": "Barão Geraldo",
     "cep": "13083-750", "lat": -22.8240, "lng": -47.0780,
     "aluguel": 1600, "condominio": 180, "iptu": 40, "contas": 80, "area_m2": 22,
     "tags": ["Mobiliado", "Wi-Fi", "Trabalho em Casa", "Sem Fumo", "Ar-condicionado"],
     "moradores": [],
     "descricao": (
         "Kitnet compacta de 22 m² em Barão Geraldo, independente, mobiliada com ar-condicionado. "
         "Privacidade total (não é quarto compartilhado). Boa para quem quer ficar perto do campus "
         "sem viver em república."
     )},
    {"slug": "republica-taquaral", "locador": "locador10@demo.com",
     "titulo": "Quarto em república mista · Taquaral",
     "tipo": "República", "classificacao": "Mista",
     "rua": "Rua Coronel Quirino", "numero": "1850", "bairro": "Taquaral",
     "cep": "13025-002", "lat": -22.8755, "lng": -47.0500,
     "aluguel": 680, "condominio": 0, "iptu": 35, "contas": 120, "area_m2": 12,
     "tags": ["Aceita Animais", "Silêncio Noturno", "Trabalho em Casa", "Wi-Fi", "Mobiliado"],
     "moradores": [],
     "descricao": (
         "Quarto individual em república mista no Taquaral, perto do Parque Portugal. "
         "Casa com cozinha equipada, sala e Wi-Fi. Pet pequeno sob combinado. "
         "Contas no rateio; silêncio noturno combinado entre os moradores."
     )},
    {"slug": "casa-costa-silva", "locador": "locador11@demo.com",
     "titulo": "Quarto econômico em casa · Costa e Silva",
     "tipo": "Casa", "classificacao": "Mista",
     "rua": "Rua Cirilo Chiavegato", "numero": "64", "bairro": "Parque Via Norte",
     "cep": "13088-120", "lat": -22.8650, "lng": -47.0350,
     "aluguel": 550, "condominio": 0, "iptu": 30, "contas": 0, "area_m2": 10,
     "tags": ["Sem Festas", "Aceita Animais", "Wi-Fi", "Mobiliado", "Organizado"],
     "moradores": [],
     "descricao": (
         "Quarto mobiliado em casa no Parque Via Norte / região Costa e Silva. "
         "Valor acessível com água, luz e internet inclusas. Ambiente organizado, "
         "sem festas; pet sob conversa. Opção econômica com acesso à Dom Pedro."
     )},
    {"slug": "suite-apto-cambui", "locador": "locador12@demo.com",
     "titulo": "Suíte silenciosa em apartamento · Cambuí",
     "tipo": "Apartamento", "classificacao": "Feminina",
     "rua": "Rua Maria Monteiro", "numero": "810", "bairro": "Cambuí",
     "cep": "13025-151", "lat": -22.8910, "lng": -47.0460,
     "aluguel": 1350, "condominio": 320, "iptu": 75, "contas": 85, "area_m2": 16,
     "tags": ["Silêncio Noturno", "Trabalho em Casa", "Sem Fumo", "Ar-condicionado", "Mobiliado", "Wi-Fi"],
     "moradores": [],
     "descricao": (
         "Suíte em apartamento no Cambuí (república feminina), com ar-condicionado e escrivaninha. "
         "Prédio silencioso, portaria e elevador. Foco em home office e descanso. "
         "Contas rateadas; sem fumantes."
     )},
]

# (e-mail do locatário, slug do imóvel)
FAVORITOS = [("morador@demo.com", "kitnet-cambui"), ("morador2@demo.com", "suite-taquaral")]

ENTRADA_PADRAO = date(2025, 8, 1)


def _tag(db: Session, nome: str) -> Tag:
    from app.services.tags_catalogo import canonico, eh_comodidade

    canon = canonico(nome) or str(nome or "").strip()
    categoria = "comodidade" if eh_comodidade(canon) else "convivencia"
    tag = db.query(Tag).filter(Tag.nome == canon).first()
    if tag is None:
        tag = Tag(nome=canon, categoria=categoria)
        db.add(tag)
        db.flush()
    elif tag.categoria != categoria:
        tag.categoria = categoria
    return tag


def _canonicalizar_tags_legado(db: Session) -> None:
    """Reaponta imovel_tags/usuario_tags de aliases (Pet Friendly…) para o nome canônico."""
    from app.models.imovel_tag import ImovelTag
    from app.models.usuario_tag import UsuarioTag
    from app.services.tags_catalogo import _ALIASES

    for antigo, novo in _ALIASES.items():
        if not novo or antigo == novo:
            continue
        velha = db.query(Tag).filter(Tag.nome == antigo).first()
        if velha is None:
            continue
        nova = _tag(db, novo)
        if velha.id_tag == nova.id_tag:
            continue
        for liga in (
            db.query(ImovelTag).filter(ImovelTag.id_tag == velha.id_tag).all()
        ):
            existe = (
                db.query(ImovelTag)
                .filter(
                    ImovelTag.id_imovel == liga.id_imovel,
                    ImovelTag.id_tag == nova.id_tag,
                )
                .first()
            )
            db.delete(liga)
            if existe is None:
                db.add(ImovelTag(id_imovel=liga.id_imovel, id_tag=nova.id_tag))
        for liga in (
            db.query(UsuarioTag).filter(UsuarioTag.id_tag == velha.id_tag).all()
        ):
            existe = (
                db.query(UsuarioTag)
                .filter(
                    UsuarioTag.id_usuario == liga.id_usuario,
                    UsuarioTag.id_tag == nova.id_tag,
                )
                .first()
            )
            db.delete(liga)
            if existe is None:
                db.add(UsuarioTag(id_usuario=liga.id_usuario, id_tag=nova.id_tag))
        db.flush()


def _aplicar_perfil(usuario: Usuario, dados: dict) -> None:
    """Completa campos de perfil do seed (idempotente: sempre alinha ao catálogo demo)."""
    usuario.nome = dados["nome"]
    if dados.get("telefone"):
        usuario.telefone = dados["telefone"]
    if dados.get("genero"):
        usuario.genero = dados["genero"]
    if "ocupacao" in dados:
        usuario.ocupacao = dados.get("ocupacao") or None
    if "emprego" in dados:
        usuario.emprego = dados.get("emprego") or None
    if "faculdade" in dados:
        usuario.faculdade = dados.get("faculdade") or None
    if dados.get("cidade_atual"):
        usuario.cidade_atual = dados["cidade_atual"]
    if dados.get("data_nascimento"):
        usuario.data_nascimento = dados["data_nascimento"]
    if dados.get("bio"):
        usuario.bio = dados["bio"]
    if dados.get("foto_url"):
        usuario.foto_perfil = dados["foto_url"]
    usuario.tags_convivencia = dados["tags"]
    usuario.status_verificacao = True


def _usuario(db: Session, dados: dict, senha_hash: str) -> Usuario:
    usuario = db.query(Usuario).filter(Usuario.email == dados["email"]).first()
    if usuario is None:
        usuario = Usuario(
            nome=dados["nome"],
            email=dados["email"],
            senha_hash=senha_hash,
            cidade_atual=dados.get("cidade_atual") or "Campinas",
            tags_convivencia=dados["tags"],
            status_verificacao=True,
        )
        db.add(usuario)
        db.flush()
    _aplicar_perfil(usuario, dados)
    for nome in dados["tags"]:
        id_tag = _tag(db, nome).id_tag
        if db.get(UsuarioTag, (usuario.id_usuario, id_tag)) is None:
            db.add(UsuarioTag(id_usuario=usuario.id_usuario, id_tag=id_tag))

    if dados["papel"] == "locador" and db.get(Locador, usuario.id_usuario) is None:
        db.add(Locador(id_locador=usuario.id_usuario, cpf_cnpj=dados["cpf_cnpj"]))
    if dados["papel"] == "locatario":
        from app.services.destinos_service import gravar_em_prefs

        locatario = db.get(Locatario, usuario.id_usuario)
        lista_dest = dados.get("destinos") or (
            [dados["destino"]] if dados.get("destino") else []
        )
        prefs = gravar_em_prefs({}, lista_dest) if lista_dest else {}
        if locatario is None:
            locatario = Locatario(
                id_locatario=usuario.id_usuario,
                orcamento_maximo=dados["orcamento"],
                tags_estilo_vida=dados["tags"],
                limiar_compatibilidade=dados["limiar"],
                raio_busca_km=dados.get("raio_busca_km"),
                preferencias_moradia=prefs or None,
            )
            db.add(locatario)
        else:
            # Re-seed idempotente: completa destinos/raio alinhados ao schema.
            if lista_dest:
                locatario.preferencias_moradia = gravar_em_prefs(
                    locatario.preferencias_moradia, lista_dest
                )
            if dados.get("raio_busca_km") is not None:
                locatario.raio_busca_km = dados["raio_busca_km"]
            if dados.get("orcamento") is not None:
                locatario.orcamento_maximo = dados["orcamento"]
            if dados.get("limiar") is not None:
                locatario.limiar_compatibilidade = dados["limiar"]
            locatario.tags_estilo_vida = dados["tags"]
    db.flush()
    return usuario


def _url_foto_seed(slug: str, ordem: int, id_imovel: int) -> str:
    """Sobe o JPG local para o Storage (se configurado) ou usa o caminho do Pages."""
    relativo_pages = f"../assets/imoveis/{slug}/{ordem}.jpg"
    arquivo = _ASSETS_IMOVEIS / slug / f"{ordem}.jpg"
    if not arquivo.is_file():
        log.warning("Foto seed ausente: %s", arquivo)
        return relativo_pages
    if settings.storage_backend.lower() == "supabase":
        try:
            return storage_service.salvar(
                f"imoveis/seed/{slug}/{ordem}.jpg",
                arquivo.read_bytes(),
                upsert=True,
            )
        except storage_service.ErroStorage:
            log.exception("Falha ao subir foto seed %s/%s.jpg; mantém URL do Pages", slug, ordem)
            return relativo_pages
    # Dev local: espelha em uploads/ para a API servir; senão URL do Pages.
    try:
        return storage_service.salvar(
            f"imoveis/{id_imovel}/{ordem}.jpg",
            arquivo.read_bytes(),
            upsert=True,
        )
    except Exception:
        return relativo_pages


def _imovel(db: Session, dados: dict, usuarios: dict[str, Usuario]) -> Post:
    locador = usuarios[dados["locador"]]
    post = (
        db.query(Post)
        .filter(Post.id_locador == locador.id_usuario, Post.titulo == dados["titulo"])
        .first()
    )
    if post is None:
        imovel = Imovel(
            valor_aluguel=dados["aluguel"],
            valor_condominio=dados["condominio"],
            valor_iptu=dados["iptu"],
            valor_contas_extras=dados["contas"],
            tipo_imovel=dados["tipo"],
            quantidade_quartos=1,
            vagas_disponiveis=1,
            area_m2=dados["area_m2"],
            descricao=dados["descricao"],
        )
        db.add(imovel)
        db.flush()
        db.add(
            EnderecoImovel(
                id_imovel=imovel.id_imovel, rua=dados["rua"], numero=dados["numero"],
                bairro=dados["bairro"], cidade="Campinas", estado="SP",
                cep=dados.get("cep"),
                latitude=dados.get("lat"), longitude=dados.get("lng"),
            )
        )
        if dados.get("classificacao"):
            imovel.classificacao = dados["classificacao"]
        post = Post(
            id_imovel=imovel.id_imovel, id_locador=locador.id_usuario,
            titulo=dados["titulo"], descricao=dados["descricao"],
        )
        db.add(post)
        db.flush()
    else:
        # Re-seed: atualiza texto/valores/coords sem duplicar o anúncio.
        imovel = db.get(Imovel, post.id_imovel)
        if imovel is not None:
            imovel.valor_aluguel = dados["aluguel"]
            imovel.valor_condominio = dados["condominio"]
            imovel.valor_iptu = dados["iptu"]
            imovel.valor_contas_extras = dados["contas"]
            imovel.area_m2 = dados["area_m2"]
            imovel.descricao = dados["descricao"]
            if dados.get("classificacao"):
                imovel.classificacao = dados["classificacao"]
        post.titulo = dados["titulo"]
        post.descricao = dados["descricao"]
        endereco = db.query(EnderecoImovel).filter(EnderecoImovel.id_imovel == post.id_imovel).first()
        if endereco is not None:
            endereco.rua = dados["rua"]
            endereco.numero = dados["numero"]
            endereco.bairro = dados["bairro"]
            if dados.get("cep"):
                endereco.cep = dados["cep"]
            if dados.get("lat") is not None:
                endereco.latitude = dados["lat"]
                endereco.longitude = dados["lng"]
    id_imovel = post.id_imovel

    for nome in dados["tags"]:
        id_tag = _tag(db, nome).id_tag
        if db.get(ImovelTag, (id_imovel, id_tag)) is None:
            db.add(ImovelTag(id_imovel=id_imovel, id_tag=id_tag))

    for ordem in range(1, 5):
        url = _url_foto_seed(dados["slug"], ordem, id_imovel)
        existe = (
            db.query(CarrosselImagem)
            .filter(
                CarrosselImagem.id_imovel == id_imovel,
                CarrosselImagem.ordem_exibicao == ordem,
            )
            .first()
        )
        if existe is None:
            db.add(CarrosselImagem(id_imovel=id_imovel, url_imagem=url, ordem_exibicao=ordem))
        elif existe.url_imagem != url:
            # Re-seed: troca caminho relativo antigo por URL do Storage (ou vice-versa).
            existe.url_imagem = url

    emails_moradores = set(dados.get("moradores") or [])
    # Remove integrantes que não estão mais no catálogo (anúncios sem residentes).
    for liga in (
        db.query(IntegranteImovel).filter(IntegranteImovel.id_imovel == id_imovel).all()
    ):
        email = next(
            (e for e, u in usuarios.items() if u.id_usuario == liga.id_pessoa),
            None,
        )
        if email not in emails_moradores:
            db.delete(liga)
    for email in emails_moradores:
        morador = usuarios[email]
        ja_mora = (
            db.query(IntegranteImovel)
            .filter(IntegranteImovel.id_imovel == id_imovel, IntegranteImovel.id_pessoa == morador.id_usuario)
            .first()
        )
        if ja_mora is None:
            db.add(
                IntegranteImovel(
                    id_pessoa=morador.id_usuario, id_imovel=id_imovel,
                    data_entrada=ENTRADA_PADRAO, status_moradia="ativo",
                )
            )
    db.flush()
    return post


def popular(db: Session, senha: str) -> dict[str, int]:
    """Cria (ou completa) os dados de demonstração e devolve a contagem do que existe."""
    _canonicalizar_tags_legado(db)
    for nome in TAGS:
        _tag(db, nome)

    senha_hash = hash_password(senha)
    usuarios = {d["email"]: _usuario(db, d, senha_hash) for d in USUARIOS}
    posts = {d["slug"]: _imovel(db, d, usuarios) for d in IMOVEIS}

    for email, slug in FAVORITOS:
        id_locatario, id_post = usuarios[email].id_usuario, posts[slug].id_post
        existe = db.query(Like).filter(Like.id_locatario == id_locatario, Like.id_post == id_post).first()
        if existe is None:
            db.add(Like(id_locatario=id_locatario, id_post=id_post))

    for locador in db.query(Locador).filter(Locador.id_locador.in_([u.id_usuario for u in usuarios.values()])):
        locador.quantidade_imoveis_anunciados = (
            db.query(Post)
            .filter(Post.id_locador == locador.id_locador, Post.status_anuncio != "removido")
            .count()
        )
    db.commit()

    # Aquecer rotas_mobilidade a partir dos destinos seed (schema: preferencias_moradia.destino).
    from app.api.v1.mobilidade import aquecer_cache_destino

    rotas = 0
    for dados in USUARIOS:
        if dados.get("papel") != "locatario":
            continue
        lista = dados.get("destinos") or (
            [dados["destino"]] if dados.get("destino") else []
        )
        for dest in lista:
            rotas += aquecer_cache_destino(db, dest)

    return {
        "tags": db.query(Tag).count(),
        "usuarios": db.query(Usuario).count(),
        "locadores": db.query(Locador).count(),
        "locatarios": db.query(Locatario).count(),
        "imoveis": db.query(Imovel).count(),
        "fotos": db.query(CarrosselImagem).count(),
        "moradores_nos_imoveis": db.query(IntegranteImovel).count(),
        "favoritos": db.query(Like).count(),
        "rotas_mobilidade_aquecidas": rotas,
    }


def banco_e_remoto(host: Optional[str]) -> bool:
    return (host or "").lower() not in ("", "localhost", "127.0.0.1", "::1")
