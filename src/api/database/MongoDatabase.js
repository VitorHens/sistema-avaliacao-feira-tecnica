// src/api/database/MongoDatabase.js
const { MongoClient } = require('mongodb');
const logger = require('../utils/Logger');

class MongoDatabase {
    static #client;
    static #db;
    #host;
    #port;
    #database;
    #user;
    #password;
    #url;

    constructor(config = {}) {
        const method = 'MongoDatabase.constructor';
        this.#host = config.host || 'localhost';
        this.#port = config.port || 27017;
        this.#database = config.database || 'feira-tecnica2026';
        this.#user = config.user || '';
        this.#password = config.password || '';
        this.#url = config.uri || this.#buildUrl();

        logger.info(`⬆️ ${method} - Instância criada`, {
            host: this.#host,
            port: this.#port,
            database: this.#database,
            hasAuth: !!(this.#user && this.#password),
        });
    }

    #buildUrl() {
        let base = `mongodb://`;
        if (this.#user && this.#password) {
            base += `${this.#user}:${this.#password}@`;
        }
        base += `${this.#host}:${this.#port}`;
        return base;
    }

    async connect() {
        const method = 'MongoDatabase.connect';
        logger.debug(`🟢 ${method} - Iniciando conexão com MongoDB`, {
            host: this.#host,
            port: this.#port,
            database: this.#database,
        });

        try {
            if (!MongoDatabase.#client) {
                MongoDatabase.#client = new MongoClient(this.#url);
                await MongoDatabase.#client.connect();
                MongoDatabase.#db = MongoDatabase.#client.db(this.#database);
                logger.info(`✅ ${method} - Conectado ao MongoDB com sucesso!`, {
                    host: this.#host,
                    port: this.#port,
                    database: this.#database,
                });
            } else {
                logger.debug(`🟢 ${method} - Reutilizando conexão existente`, {
                    database: this.#database,
                });
            }
            return MongoDatabase.#db;
        } catch (error) {
            logger.error(`❌ ${method} - Falha na conexão com MongoDB`, {
                host: this.#host,
                port: this.#port,
                database: this.#database,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    async getCollection(name) {
        const method = 'MongoDatabase.getCollection';
        logger.debug(`🟢 ${method} - Obtendo coleção`, { collectionName: name });

        try {
            const db = await this.connect();
            const collection = db.collection(name);
            logger.debug(`✅ ${method} - Coleção obtida com sucesso`, { collectionName: name });
            return collection;
        } catch (error) {
            logger.error(`❌ ${method} - Erro ao obter coleção ${name}`, {
                collectionName: name,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    async close() {
        const method = 'MongoDatabase.close';
        logger.debug(`🟢 ${method} - Iniciando fechamento da conexão`);

        try {
            if (MongoDatabase.#client) {
                await MongoDatabase.#client.close();
                MongoDatabase.#client = null;
                MongoDatabase.#db = null;
                logger.info(`✅ ${method} - Conexão com MongoDB fechada com sucesso`);
            } else {
                logger.debug(`🟢 ${method} - Nenhuma conexão ativa para fechar`);
            }
        } catch (error) {
            logger.error(`❌ ${method} - Erro ao fechar conexão com MongoDB`, {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }
}

module.exports = MongoDatabase;
