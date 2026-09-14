// src/api/http/MeuTokenJWT.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/Logger');

/**
 * Classe responsável por gerar e validar tokens JWT (JSON Web Token) para autenticação.
 * 
 * Implementa:
 * - Geração de token com claims personalizados;
 * - Validação de token, incluindo verificação de expiração;
 * - Configuração de cabeçalhos e payload do JWT.
 * 
 * Os atributos principais são privados e podem ser acessados/modificados via getters/setters.
 */
module.exports = class MeuTokenJWT {
    // Atributos privados
    #key;            // Chave secreta usada para assinar o token
    #alg;            // Algoritmo de criptografia
    #type;           // Tipo do token
    #iss;            // Emissor do token
    #aud;            // Destinatário do token
    #sub;            // Assunto do token
    #duracaoToken;   // Tempo de validade do token (em segundos)
    #payload;        // Payload decodificado do token

    /**
     * Construtor da classe MeuTokenJWT
     * Inicializa valores padrão como chave secreta, algoritmo, tipo e duração do token.
     */
    constructor() {
        const method = 'MeuTokenJWT.constructor';
        this.#key = process.env.JWT_SECRET;

        if (!this.#key || this.#key.length < 32) {
            throw new Error("JWT_SECRET deve ser definida no arquivo .env com pelo menos 32 caracteres.");
        }
        this.#alg = "HS256";
        this.#type = "JWT";
        this.#iss = process.env.JWT_ISSUER || "feira-tecnica-api";
        this.#aud = process.env.JWT_AUDIENCE || "feira-tecnica-web";
        this.#sub = "acesso_sistema";
        this.#duracaoToken = Number(process.env.JWT_EXPIRES_IN_SECONDS) || 86400;
        this.#payload = null;

        logger.info(`⬆️ ${method} - Instância criada`, {
            alg: this.#alg,
            type: this.#type,
            iss: this.#iss,
            aud: this.#aud,
            sub: this.#sub,
            duracaoToken: this.#duracaoToken,
        });
    }

    /**
     * Gera um token JWT assinado com os claims fornecidos.
     * @param {Object} claims - Objeto com informações do usuário: { email, role, name, idFuncionario }
     * @returns {string} Token JWT assinado
     */
    gerarToken = (claims) => {
        const method = 'MeuTokenJWT.gerarToken';
        logger.debug(`🟢 ${method} - Gerando token`, {
            email: claims?.email,
            role: claims?.role,
            name: claims?.name,
            idFuncionario: claims?.idFuncionario,
        });

        try {
            const headers = {
                alg: this.#alg,
                typ: this.#type,
            };

            const payload = {
                iss: this.#iss,
                aud: this.#aud,
                sub: this.#sub,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + this.#duracaoToken,
                nbf: Math.floor(Date.now() / 1000),
                jti: crypto.randomBytes(16).toString("hex"),

                email: claims.email,
                role: claims.role,
                name: claims.name,
                idFuncionario: claims.idFuncionario,
            };

            const token = jwt.sign(payload, this.#key, {
                algorithm: this.#alg,
                header: headers,
            });

            logger.info(`✅ ${method} - Token gerado com sucesso`, {
                email: claims?.email,
                idFuncionario: claims?.idFuncionario,
                expiracao: new Date(payload.exp * 1000).toISOString(),
                jti: payload.jti,
            });

            return token;
        } catch (error) {
            logger.error(`❌ ${method} - Erro ao gerar token`, {
                email: claims?.email,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    };

    /**
     * Valida um token JWT.
     * @param {string} stringToken - Token JWT a ser validado (pode incluir prefixo "Bearer ")
     * @returns {boolean} true se o token for válido, false caso contrário
     * 
     * Armazena o payload decodificado em #payload se a validação for bem-sucedida.
     */
    validarToken = (stringToken) => {
        const method = 'MeuTokenJWT.validarToken';
        const hasToken = !!stringToken;

        logger.debug(`🔍 ${method} - Validando token`, {
            hasToken,
            tokenLength: stringToken?.length || 0,
        });

        if (!stringToken) {
            logger.warn(`⚠️ ${method} - Token não fornecido`);
            return false;
        }

        if (stringToken.trim() === "") {
            logger.warn(`⚠️ ${method} - Token em branco`);
            return false;
        }

        const token = stringToken.replace("Bearer ", "").trim();

        try {
            const decoded = jwt.verify(token, this.#key, {
                algorithms: [this.#alg],
            });
            this.#payload = decoded;

            logger.info(`✅ ${method} - Token válido`, {
                email: decoded.email,
                role: decoded.role,
                name: decoded.name,
                idFuncionario: decoded.idFuncionario,
                expiracao: new Date(decoded.exp * 1000).toISOString(),
                jti: decoded.jti,
            });

            return true;
        } catch (err) {
            let errorType = 'Erro geral';
            if (err instanceof jwt.TokenExpiredError) {
                errorType = 'Token expirado';
                logger.warn(`⚠️ ${method} - Token expirado`, {
                    expiracao: new Date(err.expiredAt).toISOString(),
                });
            } else if (err instanceof jwt.JsonWebTokenError) {
                errorType = 'Token inválido';
                logger.warn(`⚠️ ${method} - Token inválido`, {
                    message: err.message,
                });
            } else {
                logger.error(`❌ ${method} - Erro geral na validação do token`, {
                    error: err.message,
                    stack: err.stack,
                });
            }
            return false;
        }
    };

    // Getters e Setters para atributos privados

    get key() { return this.#key; }
    set key(value) {
        logger.debug('🔑 MeuTokenJWT.key - Chave atualizada');
        this.#key = value;
    }

    get alg() { return this.#alg; }
    set alg(value) {
        logger.debug('🔑 MeuTokenJWT.alg - Algoritmo atualizado', { alg: value });
        this.#alg = value;
    }

    get type() { return this.#type; }
    set type(value) {
        logger.debug('🔑 MeuTokenJWT.type - Tipo atualizado', { type: value });
        this.#type = value;
    }

    get iss() { return this.#iss; }
    set iss(value) {
        logger.debug('🔑 MeuTokenJWT.iss - Emissor atualizado', { iss: value });
        this.#iss = value;
    }

    get aud() { return this.#aud; }
    set aud(value) {
        logger.debug('🔑 MeuTokenJWT.aud - Destinatário atualizado', { aud: value });
        this.#aud = value;
    }

    get sub() { return this.#sub; }
    set sub(value) {
        logger.debug('🔑 MeuTokenJWT.sub - Assunto atualizado', { sub: value });
        this.#sub = value;
    }

    get duracaoToken() { return this.#duracaoToken; }
    set duracaoToken(value) {
        logger.debug('🔑 MeuTokenJWT.duracaoToken - Duração atualizada', { duracaoToken: value });
        this.#duracaoToken = value;
    }

    get payload() { return this.#payload; }
    set payload(value) {
        logger.debug('🔑 MeuTokenJWT.payload - Payload atualizado', {
            hasPayload: !!value,
        });
        this.#payload = value;
    }
};
