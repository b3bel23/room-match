---
name: testar-e-commitar
description: Ao terminar de escrever código, roda todos os testes necessários e só commita se tudo passar. Use quando o usuário disser que o código acabou, ou pedir "testa e commita", "finaliza e commita" ou "fecha essa tarefa".
---

# Testar e commitar

Fluxo para encerrar uma tarefa de código: validar primeiro, commitar só se estiver tudo verde.

## 1. Entender o que mudou

- `git status --short` e `git diff` (staged e não staged) para ver o escopo.
- Identifique o ticket pela branch (ex.: `feature/kan-35-afinidade` → KAN-35).
- Arquivos que você não alterou nesta tarefa (renames ou edições de outras pessoas, ou já pendentes antes) **não entram** no commit. Se houver dúvida sobre o que é seu, pergunte.

## 2. Rodar os testes necessários

Rode tudo o que se aplica às áreas alteradas. Não pule nenhuma etapa por ser "pequena".

**Back-end** (`backend/`, usar o Python do `.venv`):
1. Suíte completa: `.venv/Scripts/python.exe -m pytest -v`
2. Se algum módulo alterado não tiver teste, escreva os testes que faltam antes de seguir (casos normais, bordas, entradas vazias ou `None`, e erros esperados).
3. Verifique que os módulos alterados importam: `.venv/Scripts/python.exe -c "import app.<módulo>"`. Se o import falhar por dependência de outro ticket, registre isso no relatório.
4. Se houver rota nova ou alterada, exercite a lógica (função direta com dependências falsas, ou `TestClient` se `httpx2` estiver instalado) e cubra: resposta de sucesso, filtros, paginação, validação de parâmetros e erros (401, 403, 404).
5. Se o Postgres estiver acessível, teste contra ele. Se não estiver, diga explicitamente que a camada de banco foi testada só com fake.

**Front-end** (`frontend/`): abra as páginas alteradas e confirme que não há erro de JavaScript no console. Se não houver como rodar, diga isso.

## 3. Decidir

- **Qualquer teste falhou, ou não foi possível rodar a suíte:** NÃO commite. Mostre a saída da falha, corrija a causa e rode tudo de novo. Nunca desative, apague nem enfraqueça um teste para fazê-lo passar.
- **Tudo passou:** siga para o passo 4 (PRD) e depois o 5 (commit).

## 4. Atualizar o PRD

Se a tarefa concluiu uma funcionalidade, atualize `docs/PRD.md` conforme o `CLAUDE.md` (criando o arquivo se não existir) e inclua-o no commit.

## 5. Commitar

- Adicione somente os arquivos desta tarefa, **pelo caminho** (nunca `git add -A` nem `git add .`).
- Nunca use `--no-verify` nem pule hooks. Se um hook falhar, corrija a causa.
- Mensagem no padrão do repositório (veja `git log --oneline -10`): `tipo(escopo): resumo`, citando o ticket, com um corpo curto dizendo o que mudou e o que ficou pendente.
- Termine a mensagem com a linha de atribuição indicada pelo ambiente (`Co-Authored-By`).
- **Não faça `push`**, não abra PR e não mexa no Jira, a menos que o usuário peça. Esses são passos separados.

## 6. Relatório final

Informe, de forma direta:
- hash do commit e branch;
- quantos testes rodaram e passaram (e quais foram adicionados);
- o que **não** foi validado (banco real, HTTP, dependências de outros tickets);
- arquivos deixados de fora do commit e o motivo;
- o que ainda impede o ticket de ser dado como concluído.

Se os testes falharam e nada foi commitado, diga isso claramente, no início do relatório.
