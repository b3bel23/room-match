# Importa todos os models para registrá-los no Base.metadata antes do create_all.
# Divergência: Destino, ProgramaAuxilio e ElegibilidadeUsuario do README ficam para o pós-MVP; MoradorAtual = IntegranteImovel no repo.
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.models.administrador import Administrador
from app.models.locador import Locador
from app.models.locatario import Locatario
from app.models.tag import Tag
from app.models.usuario_tag import UsuarioTag
from app.models.imovel import Imovel
from app.models.imovel_tag import ImovelTag
from app.models.endereco_imovel import EnderecoImovel
from app.models.integrante_imovel import IntegranteImovel
from app.models.carrossel_imagem import CarrosselImagem
from app.models.carrossel_morador import CarrosselMorador
from app.models.post import Post
from app.models.like import Like
from app.models.match import Match
from app.models.conversa import Conversa
from app.models.mensagem import Mensagem
from app.models.avaliacao import Avaliacao
from app.models.visita import Visita
from app.models.rota_mobilidade import RotaMobilidade
from app.models.denuncia import Denuncia

__all__ = [
    "Pessoa", "Usuario", "Administrador", "Locador", "Locatario", "Tag", "UsuarioTag",
    "Imovel", "ImovelTag", "EnderecoImovel", "IntegranteImovel", "CarrosselImagem",
    "CarrosselMorador", "Post", "Like", "Match", "Conversa", "Mensagem", "Avaliacao",
    "Visita", "RotaMobilidade", "Denuncia",
]
