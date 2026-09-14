// index.js
require("dotenv").config();

const Server = require("./Server");
const logger = require("./src/api/utils/Logger");

// Endereço base usado para montar as URLs dos QR Codes.
// Em produção, troque pelo domínio/IP real do servidor.
process.env.BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/**
 * Arquivo principal de inicialização do servidor.
 * 
 * Responsabilidades:
 * - Cria a instância do servidor
 * - Inicializa todas as dependências (banco, middlewares, rotas)
 * - Inicia o servidor na porta especificada
 * 
 * Observação sobre async/await:
 * - server.init() retorna uma Promise, pois inicializa conexões assíncronas (ex: MongoDB)
 * - É necessário usar await para garantir que o servidor só comece a ouvir requisições após a inicialização completa
 */
(async () => {
    const method = 'Main';
    logger.info(`🚀 ${method} - Iniciando aplicação`);

    try {
        // Cria instância do servidor na porta 3000
        const server = new Server(3000);
        logger.debug(`🔍 ${method} - Instância do Server criada`, { porta: 3000 });

        // Inicializa o servidor (conexão com DB, middlewares, roteadores)
        logger.debug(`🔄 ${method} - Inicializando servidor...`);
        await server.init();
        logger.debug(`✅ ${method} - Servidor inicializado com sucesso`);

        // Inicia o servidor Express na porta configurada
        logger.debug(`🔄 ${method} - Iniciando servidor HTTP...`);
        server.run();

        logger.info(`✅ ${method} - Servidor iniciado com sucesso!`);
        logger.info(`🌐 ${method} - Acesse http://localhost:3000`);

    } catch (error) {
        // Registra o erro com detalhes completos
        logger.error(`❌ ${method} - Erro ao iniciar o servidor`, {
            error: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code,
        });

        // Também exibe no console para visibilidade imediata (caso o logger falhe)
        console.error('❌ Erro fatal ao iniciar o servidor:', error.message);
        console.error('📋 Stack trace:', error.stack);

        // Encerra o processo com código de erro
        process.exit(1);
    }
})();

// Tratamento de eventos não capturados (para garantir robustez)
process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ Unhandled Rejection - Promessa rejeitada sem tratamento', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise?.toString(),
    });
    console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('❌ Uncaught Exception - Exceção não capturada', {
        error: error.message,
        stack: error.stack,
        name: error.name,
    });
    console.error('❌ Uncaught Exception:', error);
    // Em produção, pode-se reiniciar o processo aqui
    process.exit(1);
});

// Captura sinais de encerramento para finalização limpa
process.on('SIGINT', () => {
    logger.info('🛑 Recebido SIGINT - Encerrando aplicação...');
    console.log('🛑 Encerrando aplicação...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('🛑 Recebido SIGTERM - Encerrando aplicação...');
    console.log('🛑 Encerrando aplicação...');
    process.exit(0);
});
