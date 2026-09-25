const express = require("express");
const path = require("path");

const MongoDatabase = require("./src/api/database/MongoDatabase");
const seedDatabase = require("./src/api/database/SeedDatabase");
const migrarAvaliacoes = require("./src/api/database/MigrarAvaliacoes");
const MeuTokenJWT = require("./src/api/http/MeuTokenJWT");
const { SESSION_COOKIE_NAME, clearSessionCookie } = require("./src/api/http/SessionCookie");
const JwtMiddleware = require("./src/api/middleware/JwtMiddleware");
const ProfessorMiddleware = require("./src/api/middleware/ProfessorMiddleware");
const ProjetoMiddleware = require("./src/api/middleware/ProjetoMiddleware");
const AvaliacaoMiddleware = require("./src/api/middleware/AvaliacaoMiddleware");
const AlunoMiddleware = require("./src/api/middleware/AlunoMiddleware");
const ProfessorDAOMongo = require("./src/api/dao/ProfessorDAOMongo");
const ProjetoDAOMongo = require("./src/api/dao/ProjetoDAOMongo");
const AvaliacaoDAOMongo = require("./src/api/dao/AvaliacaoDAOMongo");
const AlunoDAOMongo = require("./src/api/dao/AlunoDAOMongo");
const ProfessorService = require("./src/api/services/ProfessorService");
const ProjetoService = require("./src/api/services/ProjetoService");
const AvaliacaoService = require("./src/api/services/AvaliacaoService");
const AlunoService = require("./src/api/services/AlunoService");
const ProfessorController = require("./src/api/controllers/ProfessorController");
const ProjetoController = require("./src/api/controllers/ProjetoController");
const AvaliacaoController = require("./src/api/controllers/AvaliacaoController");
const AlunoController = require("./src/api/controllers/AlunoController");
const ProfessorRouter = require("./src/api/routes/ProfessorRouter");
const ProjetoRouter = require("./src/api/routes/ProjetoRouter");
const AvaliacaoRouter = require("./src/api/routes/AvaliacaoRouter");
const AlunoRouter = require("./src/api/routes/AlunoRouter");
const ErrorResponse = require("./src/api/utils/ErrorResponse");
const logger = require("./src/api/utils/Logger");
const loginRateLimit = require('./src/api/middleware/LoginRateLimit');
const { getAppBasePath, stripBasePath } = require('./src/api/utils/AppBasePath');

const PAGINAS_PROTEGIDAS = new Map([
    ["/qrcodes.html", ["ADMINISTRADOR", "ALUNO"]],
    ["/aluno.html", ["ALUNO"]],
    ["/cracha-aluno.html", ["ALUNO"]],
    ["/dashboard.html", ["ADMINISTRADOR", "AVALIADOR"]],
    ["/projetos-consulta.html", ["ADMINISTRADOR", "AVALIADOR"]],
    ["/projetos-editar.html", ["ADMINISTRADOR"]],
    ["/avaliacoes-cadastro.html", ["ADMINISTRADOR", "AVALIADOR"]],
    ["/avaliacoes-consulta.html", ["ADMINISTRADOR", "AVALIADOR"]],
    ["/avaliacoes-editar.html", ["ADMINISTRADOR", "AVALIADOR"]],
    ["/professores-novo.html", ["ADMINISTRADOR"]],
    ["/professores-importar.html", ["ADMINISTRADOR"]],
    ["/professores-consulta.html", ["ADMINISTRADOR"]],
    ["/professores-editar.html", ["ADMINISTRADOR"]],
    ["/alunos-cadastro.html", ["ADMINISTRADOR"]],
    ["/alunos-consulta.html", ["ADMINISTRADOR"]],
    ["/receberExcel.html", ["ADMINISTRADOR"]],
    ["/configuracoes-votacao.html", ["ADMINISTRADOR"]],
].map(([url, roles]) => [url.toLowerCase(), roles]));

function lerCookies(request) {
    return Object.fromEntries(
        String(request.headers.cookie || "")
            .split(";")
            .map(parte => parte.trim())
            .filter(Boolean)
            .map(parte => {
                const separador = parte.indexOf("=");
                if (separador === -1) return [parte, ""];
                return [
                    parte.slice(0, separador),
                    parte.slice(separador + 1),
                ];
            })
    );
}

function obterSessao(request) {
    const token = lerCookies(request)[SESSION_COOKIE_NAME];
    if (!token) return null;

    const jwt = new MeuTokenJWT();
    return jwt.validarToken(token) ? jwt.payload : null;
}

module.exports = class Server {
    #porta;
    #app;
    #database;
    #jwtMiddleware;
    #projetoDAO;
    #basePath;

    constructor(porta = 3000) {
        this.#porta = porta;
        this.#basePath = getAppBasePath();
    }

    init = async () => {
        this.#app = express();
        this.#app.disable('x-powered-by');
        this.#app.use(stripBasePath(this.#basePath));
        const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
        if (Number.isInteger(proxyHops) && proxyHops >= 1 && proxyHops <= 3) this.#app.set('trust proxy', proxyHops);
        this.#jwtMiddleware = new JwtMiddleware();

        this.#app.use(express.json({ limit: "6mb" }));
        this.#app.use((request, response, next) => {
            response.set({
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
            });
            const origin = request.headers.origin;
            if (origin) {
                const permitted = new Set((process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(item => item.trim()).filter(Boolean));
                const sameOrigin = origin === `${request.protocol}://${request.get('host')}`;
                if (!sameOrigin && !permitted.has(origin)) return response.status(403).json({success:false,message:'Origem não autorizada.'});
                response.set('Vary', 'Origin');
                if (!sameOrigin) response.set({
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                });
            }
            if (request.method === 'OPTIONS') return response.sendStatus(204);
            next();
        });
        this.#app.use(['/api/v1/alunos/login', '/api/v1/professores/login'], loginRateLimit);
        this.#configurarLogRequisicoes();
        this.#configurarSessaoWeb();
        this.#servirArquivosPublicos();

        this.#database = new MongoDatabase({
            host: "localhost",
            port: 27017,
            database: "feira-tecnica2026",
            user: "",
            password: "",
        });

        await this.#database.connect();
        await seedDatabase(this.#database);
        await migrarAvaliacoes(this.#database);

        this.#configurarProfessor();
        this.#configurarAluno();
        await this.#configurarVotacao();
        this.#configurarProjeto();
        await this.#configurarAvaliacao();
        this.#app.use("/api/v1/avaliacoes-visitantes", await require("./src/api/routes/VisitanteRouter")(this.#database));
        this.#configurarErros();
    };

    #configurarLogRequisicoes() {
        this.#app.use((request, response, next) => {
            logger.debug(`${request.method} ${request.originalUrl}`, {
                ip: request.ip,
                userAgent: request.headers["user-agent"],
            });
            next();
        });
    }

    #configurarSessaoWeb() {
        this.#app.get("/", (request, response) => {
            response.redirect(302, `${this.#basePath}/index.html`);
        });

        this.#app.post("/api/v1/sessao/logout", (request, response) => {
            clearSessionCookie(response);
            response.json({ success: true });
        });

        this.#app.use((request, response, next) => {
            if (request.method !== "GET") return next();

            const rolesPermitidas = PAGINAS_PROTEGIDAS.get(request.path.toLowerCase());
            if (!rolesPermitidas) return next();

            const sessao = obterSessao(request);
            if (!sessao) {
                const destino = encodeURIComponent(request.originalUrl);
                return response.redirect(302, `${this.#basePath}/login.html?next=${destino}`);
            }

            if (!rolesPermitidas.includes(sessao.role)) {
                const destino = `${this.#basePath}${sessao.role === "ALUNO" ? "/aluno.html" : "/dashboard.html"}`;
                return response.redirect(302, destino);
            }

            next();
        });
    }

    #servirArquivosPublicos() {
        const publicPath = path.join(__dirname, "src/public");
        this.#app.use(express.static(publicPath));
    }

    #configurarProfessor() {
        const middleware = new ProfessorMiddleware();
        const dao = new ProfessorDAOMongo(this.#database);
        const service = new ProfessorService(dao);
        const controller = new ProfessorController(service);
        const router = new ProfessorRouter(this.#jwtMiddleware, middleware, controller);

        this.#app.use("/api/v1/professores", router.createRoutes());
    }

    #configurarAluno() {
        const middleware = new AlunoMiddleware();
        const dao = new AlunoDAOMongo(this.#database);
        const service = new AlunoService(dao);
        const controller = new AlunoController(service);
        const router = new AlunoRouter(this.#jwtMiddleware, middleware, controller);

        this.#app.use("/api/v1/alunos", router.createRoutes());
    }

    async #configurarVotacao() {
        const horario = require('./src/api/routes/HorarioAvaliacaoVisitantes');
        const codigos = require('./src/api/routes/CodigosVisitantes');
        const tickets = await this.#database.getCollection('codigosVisitantes');
        await tickets.createIndex({ hash: 1 }, { unique: true });
        const autenticado = this.#jwtMiddleware.validateToken;
        const admin = this.#jwtMiddleware.permitirRoles('ADMINISTRADOR');
        this.#app.get('/api/v1/configuracao-votacao', autenticado, admin, async (_req, res, next) => {
            try { res.json({ success: true, data: { ...horario.carregar(), codigosGerados: await tickets.countDocuments() } }); }
            catch (error) { next(error); }
        });
        this.#app.put('/api/v1/configuracao-votacao', autenticado, admin, async (req, res, next) => {
            try {
                const atual = horario.carregar();
                if (req.body?.exigirCodigo && !(await tickets.countDocuments())) {
                    return res.status(400).json({ success: false, message: 'Gere os códigos antes de exigir código na votação.' });
                }
                if (Boolean(req.body?.exigirCodigo) !== Boolean(atual.exigirCodigo)) {
                    const votes = await this.#database.getCollection('avaliacoesVisitantes');
                    if (await votes.countDocuments()) return res.status(409).json({ success: false, message: 'Não é possível trocar o modo de identificação após o início das avaliações.' });
                }
                res.json({ success: true, data: horario.salvar(req.body) });
            } catch (error) { next(error); }
        });
        this.#app.post('/api/v1/configuracao-votacao/codigos', autenticado, admin, async (req, res, next) => {
            try {
                const quantidade = req.body?.quantidade;
                if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 1000) {
                    return res.status(400).json({ success: false, message: 'Informe de 1 a 1000 códigos por lote.' });
                }
                const novos = [];
                for (let index = 0; index < quantidade; index++) {
                    const codigo = codigos.gerar();
                    await tickets.insertOne({ hash: codigos.hash(codigo), criadoEm: new Date() });
                    novos.push(codigo);
                }
                res.json({ success: true, data: { codigos: novos } });
            } catch (error) { next(error); }
        });
    }

    #configurarProjeto() {
        const middleware = new ProjetoMiddleware();
        this.#projetoDAO = new ProjetoDAOMongo(this.#database);
        const service = new ProjetoService(this.#projetoDAO);
        const controller = new ProjetoController(service);
        const router = new ProjetoRouter(this.#jwtMiddleware, middleware, controller);

        this.#app.use("/api/v1/projetos", router.createRoutes());
    }

    async #configurarAvaliacao() {
        const middleware = new AvaliacaoMiddleware();
        const dao = new AvaliacaoDAOMongo(this.#database);
        await dao.ensureIndexes();
        const service = new AvaliacaoService(dao, this.#projetoDAO);
        const controller = new AvaliacaoController(service);
        const router = new AvaliacaoRouter(this.#jwtMiddleware, middleware, controller);

        this.#app.use("/api/v1/avaliacoes", router.createRoutes());
    }

    #configurarErros() {
        this.#app.use((error, request, response, next) => {
            if (error instanceof ErrorResponse) {
                logger.warn(error.message, {
                    httpCode: error.httpCode,
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

            logger.error("Erro interno não tratado", {
                error: error.message,
                stack: error.stack,
                code: error.code,
                url: request.originalUrl,
                method: request.method,
            });

            response.status(500).json({
                success: false,
                message: "Ocorreu um erro interno no servidor",
                error: { message: "Erro interno" },
            });
        });
    }


    run = () => {
        const host = process.env.ENABLE_TEST_PROFESSOR === 'true' ? '127.0.0.1' : '0.0.0.0';
        this.#app.listen(this.#porta, host, () => {
            logger.info(`Servidor rodando em http://localhost:${this.#porta}/login.html`);
        });
    };
};
