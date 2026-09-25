# Configuração e dados

## Variáveis principais

| Variável | Uso |
| --- | --- |
| `MONGODB_URI` | endereço do MongoDB; padrão local: `mongodb://localhost:27017` |
| `MONGODB_DATABASE` | nome do banco; padrão: `feira-tecnica2026` |
| `APP_BASE_PATH` | prefixo público; padrão: `/feira` |
| `PUBLIC_BASE_URL` | endereço completo usado nos QR Codes |
| `JWT_SECRET` | chave de sessão com pelo menos 32 caracteres |
| `VISITOR_TICKET_SECRET` | chave dos códigos de visitantes |
| `BOOTSTRAP_ADMIN_EMAIL` | e-mail do administrador inicial |
| `BOOTSTRAP_ADMIN_PASSWORD` | senha inicial forte do administrador |
| `PROJECTS_DATA_FILE` | caminho opcional da carga privada de projetos |

O arquivo `.env.example` é apenas uma referência. Configure as variáveis no ambiente do Node.js.

## Preparar a carga privada

Não publique a planilha oficial nem os arquivos gerados em `data/`.

```powershell
node tools/incorporar-projetos.cjs "C:\caminho\cadastro-feira.csv"
```

O comando gera `data/projetos-feira-2026.json`. Ao iniciar o servidor, a importação é repetível: projetos existentes são reconhecidos pela chave de importação e as apresentações editadas pelas equipes são preservadas.

O fluxo completo de preparação de contas pode ser executado com `tools/preparar-cadastros.cjs`. Os relatórios e as credenciais gerados também são privados.

## Contas

- Administrador: entra pelo e-mail configurado e gerencia cadastros e votação.
- Avaliador: entra pelo ID numérico fornecido pela escola.
- Aluno: entra pela matrícula ou pelo e-mail confirmado.
- Visitante: consulta projetos sem login e pode votar durante o período autorizado.

Senhas iniciais devem ser trocadas no primeiro acesso. Pendências de matrícula, turma ou e-mail precisam de conferência manual antes da distribuição das contas.
