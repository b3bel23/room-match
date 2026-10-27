# RoomMatch

Convenções para o Claude Code neste repositório.

## PRD (Product Requirements Document)

Toda vez que terminar de desenvolver uma funcionalidade, atualize o PRD em `docs/PRD.md`.

- **Se `docs/PRD.md` não existir, crie-o** antes de atualizar. Use `docs/RoomMatch_PRD.pdf` e `docs/requirements/` como base de conteúdo. O PDF é só leitura e não é o documento vivo.
- Registre no PRD, para cada funcionalidade concluída:
  - nome e ticket do Jira (ex.: KAN-35);
  - o que faz, em linguagem de produto;
  - regras de negócio e decisões tomadas (ex.: a fórmula de afinidade);
  - endpoints ou telas envolvidos;
  - status (concluída, parcial ou bloqueada) e o que ainda falta.
- Se a funcionalidade já estiver no PRD, **edite a entrada existente** em vez de duplicar.
- Se a implementação divergir do que o PRD descreve, atualize o PRD para refletir o que foi feito e deixe a divergência explícita.
- Faça a atualização do PRD antes do commit da funcionalidade, para que o código e o documento entrem juntos. A skill `testar-e-commitar` deve respeitar isso.
