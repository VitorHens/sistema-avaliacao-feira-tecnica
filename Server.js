// Server.js
const express = require("express");
const cors = require("cors");
const path = require("path");

const ErrorResponse = require("./src/api/utils/ErrorResponse");
const logger = require("./src/api/utils/Logger"); // <-- Logger profissional

// Middlewares
const JwtMiddleware = require("./src/api/middleware/JwtMiddleware");

// Roteadores
const ProfessorRouter = require("./src/api/routes/ProfessorRouter");
const ProjetoRouter = require("./src/api/routes/ProjetoRouter");
const AvaliacaoRouter = require("./src/api/routes/AvaliacaoRouter");

// Middlewares específicos das entidades
const ProfessorMiddleware = require("./src/api/middleware/ProfessorMiddleware");
const ProjetoMiddleware = require("./src/api/middleware/ProjetoMiddleware");
const AvaliacaoMiddleware = require("./src/api/middleware/AvaliacaoMiddleware");

// Controllers
const ProfessorController = require("./src/api/controllers/ProfessorController");
const ProjetoController = require("./src/api/controllers/ProjetoController");
const AvaliacaoController = require("./src/api/controllers/AvaliacaoController");

// Services
const ProfessorService = require("./src/api/services/ProfessorService");
const ProjetoService = require("./src/api/services/ProjetoService");
const AvaliacaoService = require("./src/api/services/AvaliacaoService");

// DAOs MongoDB
const ProfessorDAOMongo = require("./src/api/dao/ProfessorDAOMongo");
const ProjetoDAOMongo = require("./src/api/dao/ProjetoDAOMongo");
const AvaliacaoDAOMongo = require("./src/api/dao/AvaliacaoDAOMongo");

// Banco de dados MongoDB
const MongoDatabase = require("./src/api/database/MongoDatabase");

// Para seed
const bcrypt = require("bcrypt");

module.exports = class Server {
    #porta;
    #app;
    #router;

    #database;

    #jwtMiddleware;

    #ProfessorRouter;
    #ProfessorMiddleware;
    #ProfessorController;
    #ProfessorService;
    #ProfessorDAO;

    #projetoRouter;
    #projetoMiddleware;
    #projetoController;
    #projetoService;
    #projetoDAO;

    #avaliacaoRouter;
    #avaliacaoMiddleware;
    #avaliacaoController;
    #avaliacaoService;
    #avaliacaoDAO;

    constructor(porta) {
        logger.info('⬆️ Server.constructor()');
        this.#porta = porta ?? 8080;
        logger.debug('🔍 Porta configurada', { porta: this.#porta });
    }

    init = async () => {
        const method = 'Server.init';
        logger.info(`⬆️ ${method} - Iniciando servidor`);

        this.#app = express();
        this.#router = express.Router();

        // Middlewares globais
        this.#app.use(express.json());
        logger.debug(`✅ ${method} - express.json() configurado`);

        // Servir arquivos estáticos da pasta public (dentro de src)
        const publicPath = path.join(process.cwd(), "src/public");
        logger.debug(`📂 ${method} - Servindo arquivos estáticos de: ${publicPath}`);
        this.#app.use(express.static(publicPath));

        // CORS
        const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
        const allowedOrigins = corsOrigin === "*"
            ? "*"
            : corsOrigin.split(",").map(origin => origin.trim());
        this.#app.use(cors({ origin: allowedOrigins }));
        logger.debug(`✅ ${method} - CORS configurado`);

        this.#jwtMiddleware = new JwtMiddleware();

        // Conecta ao MongoDB
        logger.debug(`🔄 ${method} - Conectando ao MongoDB...`);
        this.#database = new MongoDatabase({
            uri: process.env.MONGO_URI,
            host: process.env.MONGO_HOST || 'localhost',
            port: Number(process.env.MONGO_PORT) || 27017,
            database: process.env.MONGO_DATABASE || 'feira-tecnica2026',
            user: process.env.MONGO_USER || '',
            password: process.env.MONGO_PASSWORD || '',
        });
        await this.#database.connect();
        logger.info(`✅ ${method} - Conectado ao MongoDB com sucesso`);

        // Executa seed (popular banco com dados iniciais se estiver vazio)
        await this.#seedDatabase();

        // Monta dependências e rotas
        this.beforeRouting();
        this.setupProfessor();
        this.setupProjeto();
        this.setupAvaliacao();
        this.setupErrorMiddleware();

        logger.info(`✅ ${method} - Servidor inicializado com sucesso`);
    }

    /**
     * Seed: cria coleções e insere dados iniciais se não existirem.
     */
     #seedDatabase = async () => {
    const method = 'Server.#seedDatabase';
    logger.debug(`🔄 ${method} - Verificando necessidade de seed`);

    try {
        const collection = await this.#database.getCollection('professores');

        await collection.createIndex(
            { email: 1 },
            { unique: true }
        );

        const totalProfessores = await collection.countDocuments();

        if (totalProfessores === 0) {
            const adminEmail = process.env.ADMIN_EMAIL;
            const adminPassword = process.env.ADMIN_PASSWORD;

            if (!adminEmail || !adminPassword) {
                logger.warn(`⚠️ ${method} - Seed ignorado: configure ADMIN_EMAIL e ADMIN_PASSWORD no .env`);
                return;
            }

            const senhaHash = await bcrypt.hash(adminPassword, 12);

            await collection.insertOne({
                nome: 'Administrador da Feira',
                email: adminEmail,
                senha: senhaHash,
                role: 'ADMINISTRADOR',
                dataCadastro: new Date(),
            });

            logger.info(`✅ ${method} - Administrador inicial criado`);
        } else {
            logger.info(`✅ ${method} - Professores já cadastrados`);
        }
    } catch (error) {
        logger.error(`❌ ${method} - Erro ao executar seed`, {
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
};

    setupProfessor = () => {
        const method = 'Server.setupProfessor';
        logger.info(`⬆️ ${method} - Configurando módulo Professor`);

        try {
            this.#ProfessorMiddleware = new ProfessorMiddleware();
            this.#ProfessorDAO = new ProfessorDAOMongo(this.#database);
            this.#ProfessorService = new ProfessorService(this.#ProfessorDAO);
            this.#ProfessorController = new ProfessorController(this.#ProfessorService);
            this.#ProfessorRouter = new ProfessorRouter(
                this.#jwtMiddleware,
                this.#ProfessorMiddleware,
                this.#ProfessorController
            );
           this.#app.use("/api/v1/professores",this.#ProfessorRouter.createRoutes()
);
            logger.info(`✅ ${method} - Rotas de Professor configuradas com sucesso`);
        } catch (error) {
            logger.error(`❌ ${method} - Erro ao configurar Professor`, {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    };

    setupProjeto = () => {
        const method = 'Server.setupProjeto';
        logger.info(`⬆️ ${method} - Configurando módulo Projeto`);

        try {
            this.#projetoMiddleware = new ProjetoMiddleware();
            this.#projetoDAO = new ProjetoDAOMongo(this.#database);
            this.#projetoService = new ProjetoService(this.#projetoDAO);
            this.#projetoController = new ProjetoController(this.#projetoService);
            this.#projetoRouter = new ProjetoRouter(
                this.#jwtMiddleware,
                this.#projetoMiddleware,
                this.#projetoController
            );
            this.#app.use('/api/v1/projetos', this.#projetoRouter.createRoutes());
            logger.info(`✅ ${method} - Rotas de Projeto configuradas com sucesso`);
        } catch (error) {
            logger.error(`❌ ${method} - Erro ao configurar Projeto`, {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    };

    setupAvaliacao = () => {
        const method = 'Server.setupAvaliacao';
        logger.info(`⬆️ ${method} - Configurando módulo Avaliação`);

        try {
            this.#avaliacaoMiddleware = new AvaliacaoMiddleware();
            this.#avaliacaoDAO = new AvaliacaoDAOMongo(this.#database);
            if (!this.#projetoDAO) this.#projetoDAO = new ProjetoDAOMongo(this.#database);
            this.#avaliacaoService = new AvaliacaoService(this.#avaliacaoDAO, this.#projetoDAO);
            this.#avaliacaoController = new AvaliacaoController(this.#avaliacaoService);
            this.#avaliacaoRouter = new AvaliacaoRouter(
                this.#jwtMiddleware,
                this.#avaliacaoMiddleware,
                this.#avaliacaoController
            );
            this.#app.use('/api/v1/avaliacoes', this.#avaliacaoRouter.createRoutes());
            logger.info(`✅ ${method} - Rotas de Avaliação configuradas com sucesso`);
        } catch (error) {
            logger.error(`❌ ${method} - Erro ao configurar Avaliação`, {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    };

    beforeRouting = () => {
        this.#app.use((req, res, next) => {
            logger.debug(`📥 ${req.method} ${req.originalUrl}`, {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            });
            next();
        });
    };

    setupErrorMiddleware = () => {
        const method = 'Server.setupErrorMiddleware';
        logger.info(`⬆️ ${method} - Configurando middleware de tratamento de erros`);

        this.#app.use((error, request, response, next) => {
            if (error instanceof ErrorResponse) {
                logger.warn(`⚠️ ${method} - Erro customizado capturado`, {
                    httpCode: error.httpCode,
                    message: error.message,
                    error: error.error,
                    url: request.originalUrl,
                    method: request.method,
                });
                return response.status(error.httpCode).json({
                    success: false,
                    message: error.message,
                    error: error.error,
                });
            }

            // Erro genérico (não tratado especificamente)
            const resposta = {
                success: false,
                message: "Ocorreu um erro interno no servidor",
                data: null,
                error: { message: error.message || "Erro interno", code: error.code },
            };

            logger.error(`❌ ${method} - Erro interno não tratado`, {
                error: error.message,
                stack: error.stack,
                code: error.code,
                url: request.originalUrl,
                method: request.method,
                body: request.body,
            });

            response.status(500).json(resposta);
        });
    };

    run = () => {
        const method = 'Server.run';
        this.#app.listen(this.#porta, () => {
            logger.info(`🚀 ${method} - Servidor rodando em http://localhost:${this.#porta}/index.html`);
            console.log(`🚀 Server rodando em http://localhost/feira-tecnica/index.html`);
        });
    };
};
