# Sistema de Avaliação da Feira Técnica

> Projeto em desenvolvimento para a Feira Técnica 2026 dos Colégios Univap.

Aplicação web para organizar projetos, acessos de alunos e professores, avaliações da banca, votação de visitantes, rankings, crachás e QR Codes.

## Estado do projeto

O sistema está funcional para testes locais, mas ainda precisa ser validado no servidor e na rede que serão usados durante a feira. Dados reais de estudantes não fazem parte deste repositório público.

## Funcionalidades

- catálogo público com busca, filtros e página de cada projeto;
- login separado para aluno, avaliador e administrador;
- edição da apresentação do projeto pelos alunos autorizados;
- avaliação da banca com histórico e ranking;
- votação de visitantes com período configurável e códigos opcionais;
- geração de QR Codes e crachás;
- cadastro e importação de professores por CSV;
- importação privada dos projetos e participantes;
- interface responsiva para computador e celular;
- proteção de rotas, cookies de sessão, limite de tentativas e validações.

## Tecnologias

- Node.js e Express;
- MongoDB;
- JavaScript, HTML e CSS;
- JWT, bcrypt e cookies `HttpOnly`;
- testes nativos do Node.js.

## Estrutura

```text
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   ├── dao/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   └── public/
│       ├── css/
│       ├── imagens/
│       └── js/
├── tests/
├── tools/
├── nginx/conf/
├── Server.js
└── index.js
```

## Executar localmente

Requisitos: Node.js 20 ou superior e MongoDB em execução.

```bash
git clone https://github.com/VitorHens/sistema-avaliacao-feira-tecnica.git
cd sistema-avaliacao-feira-tecnica
npm ci
npm start
```

Abra `http://localhost:3000/feira/`. Para desenvolvimento com reinício automático, use `npm run dev`.

As variáveis disponíveis estão documentadas em [`.env.example`](.env.example). O projeto não carrega o arquivo automaticamente: configure as variáveis no ambiente do processo.

## Dados privados da feira

Nomes, matrículas, e-mails e credenciais devem permanecer fora do GitHub. O diretório `data/` é ignorado pelo Git.

Para gerar localmente a carga de projetos a partir do CSV oficial:

```powershell
node tools/incorporar-projetos.cjs "C:\caminho\cadastro-feira.csv"
```

O comando cria `data/projetos-feira-2026.json`. A aplicação importa esse arquivo sem substituir apresentações já editadas. Também é possível definir outro caminho com `PROJECTS_DATA_FILE`.

Consulte [Configuração e dados](docs/CONFIGURACAO.md) antes de distribuir acessos.

## Testes e qualidade

```bash
npm test
node tools/check-frontend.cjs
npm audit --omit=dev
```

Na revisão de 25 de setembro de 2026, os 40 testes passaram, 32 scripts do front-end foram validados e a auditoria encontrou 0 vulnerabilidades conhecidas nas dependências de produção.

## Implantação

O sistema aceita publicação sob o prefixo `/feira/` e inclui uma configuração mínima de Nginx. Antes de usar em produção, configure HTTPS, segredos persistentes, URL pública dos QR Codes e backup do MongoDB.

Veja o passo a passo em [Implantação](docs/IMPLANTACAO.md).

## Segurança

- `.env`, `data/`, logs, backups e credenciais não são versionados;
- segredos JWT e da votação devem ter pelo menos 32 caracteres;
- cookies de sessão usam `HttpOnly` e `SameSite=Lax`;
- contas de teste só podem ser ativadas fora de produção;
- respostas internas não expõem pilhas de erro ao usuário;
- senhas são armazenadas com bcrypt.

A senha inicial baseada na turma e a senha inicial dos avaliadores são temporárias e devem ser trocadas no primeiro acesso. Leia [Segurança](SECURITY.md) antes de publicar o sistema na internet.

## Próximos passos

- validar todos os fluxos com o MongoDB e a rede reais da escola;
- revisar as pendências da planilha antes de liberar contas;
- adicionar imagens demonstrativas sem dados pessoais;
- acompanhar a execução automática dos testes no GitHub Actions;
- realizar teste de restauração do backup.

## Créditos

Projeto acadêmico desenvolvido a partir da base do professor Hélio Lourenço Esperidião Ferreira, com organização e evolução no repositório de Vitor Hens.
