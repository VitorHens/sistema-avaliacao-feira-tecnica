# Segurança

## Dados que não devem ser publicados

- planilhas com nomes, matrículas, turmas ou e-mails;
- arquivos de `data/` e `backups/`;
- `.env`, segredos JWT e códigos de visitantes;
- credenciais e relatórios de importação;
- logs de produção.

## Antes de disponibilizar na internet

- use HTTPS;
- troque todas as senhas iniciais;
- configure `NODE_ENV=production`;
- use `JWT_SECRET` e `VISITOR_TICKET_SECRET` exclusivos, com pelo menos 32 caracteres;
- permita em CORS somente origens conhecidas;
- limite o acesso ao MongoDB;
- teste backup e restauração;
- execute `npm audit --omit=dev` e todos os testes.

## Relato de falhas

Não abra uma issue pública contendo credenciais, dados de alunos ou detalhes exploráveis. Entre em contato de forma privada com o responsável pelo repositório.
