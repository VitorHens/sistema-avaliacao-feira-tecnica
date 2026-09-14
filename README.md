# 🎓 Sistema de Avaliação da Feira Técnica

Sistema web para cadastrar projetos, professores e avaliações da Feira Técnica. A aplicação reúne uma API REST em Node.js, autenticação JWT, persistência no MongoDB e uma interface web responsiva.

## 🚀 Funcionalidades

- Login de professores com senha criptografada e token JWT
- Cadastro e gerenciamento de professores
- Cadastro de projetos, representantes e integrantes
- Registro de avaliações
- Consulta pública de projetos por QR Code
- Validação de dados e tratamento centralizado de erros
- Logs da aplicação

## 🛠️ Tecnologias

- Node.js e Express
- MongoDB
- JSON Web Token e bcrypt
- HTML5, CSS3, JavaScript e Bootstrap
- Nginx opcional para proxy reverso

## 🏗️ Organização

O back-end segue uma arquitetura em camadas:

```text
src/api/
├── controllers/
├── dao/
├── database/
├── middleware/
├── models/
├── routes/
├── services/
└── utils/
```

## ▶️ Como executar

1. Clone o repositório e entre na pasta:

```bash
git clone https://github.com/VitorHens/sistema-avaliacao-feira-tecnica.git
cd sistema-avaliacao-feira-tecnica
```

2. Instale as dependências:

```bash
npm install
```

3. Crie o arquivo `.env` a partir do exemplo e altere os valores:

```bash
cp .env.example .env
```

No Windows PowerShell, use `Copy-Item .env.example .env`.

4. Inicie o MongoDB e execute a aplicação:

```bash
npm run dev
```

5. Abra [http://localhost:3000](http://localhost:3000).

## 🔐 Segurança

- Credenciais e chaves ficam no `.env`, que não é versionado.
- A chave `JWT_SECRET` deve possuir pelo menos 32 caracteres.
- Defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` para criar o primeiro administrador quando o banco estiver vazio.
- Em produção, restrinja `CORS_ORIGIN` ao endereço real da interface.

## 📡 Principais rotas

```text
POST   /api/v1/professores/login
GET    /api/v1/professores
POST   /api/v1/professores
GET    /api/v1/projetos
POST   /api/v1/projetos
GET    /api/v1/avaliacoes
POST   /api/v1/avaliacoes
```

Com exceção do login e das rotas públicas documentadas no código, os recursos exigem o cabeçalho `Authorization: Bearer <token>`.

## 🎯 Objetivo

Aplicar conceitos de API REST, autenticação, banco de dados NoSQL, arquitetura em camadas e desenvolvimento de interfaces em um sistema completo para a Feira Técnica.

---

Projeto acadêmico desenvolvido para a Feira Técnica.
