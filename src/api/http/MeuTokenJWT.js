const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

function loadSecret() {
    if (process.env.JWT_SECRET) {
        if (Buffer.byteLength(process.env.JWT_SECRET) < 32) throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres.');
        return process.env.JWT_SECRET;
    }
    const file = path.resolve(__dirname, '../../../data/.jwt-secret');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try { fs.writeFileSync(file, crypto.randomBytes(48).toString('base64url'), { flag: 'wx', mode: 0o600 }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    const secret = fs.readFileSync(file, 'utf8').trim();
    if (secret.length < 32) throw new Error('Chave JWT local inválida. Configure JWT_SECRET.');
    return secret;
}
const SECRET = loadSecret();
const ALGORITHM = "HS256";
const TOKEN_DURATION_SECONDS = 12 * 60 * 60;
const ISSUER = 'feira-tecnica-2026';

module.exports = class MeuTokenJWT {
    #payload = null;

    gerarToken = claims => {
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: ISSUER,
            aud: ISSUER,
            sub: "acesso_sistema",
            iat: now,
            exp: now + TOKEN_DURATION_SECONDS,
            nbf: now,
            jti: crypto.randomBytes(16).toString("hex"),
            email: claims.email,
            role: claims.role,
            name: claims.name,
            idFuncionario: claims.idFuncionario,
            matricula: claims.matricula || null,
            turma: claims.turma || null,
            curso: claims.curso || null,
        };

        return jwt.sign(payload, SECRET, {
            algorithm: ALGORITHM,
            header: { alg: ALGORITHM, typ: "JWT" },
        });
    };

    validarToken = tokenValue => {
        if (typeof tokenValue !== "string" || !tokenValue.trim()) {
            this.#payload = null;
            return false;
        }

        const token = tokenValue.replace(/^Bearer\s+/i, "").trim();
        try {
            this.#payload = jwt.verify(token, SECRET, {
                algorithms: [ALGORITHM],
                issuer: ISSUER,
                audience: ISSUER,
            });
            return true;
        } catch (_) {
            this.#payload = null;
            return false;
        }
    };

    get payload() {
        return this.#payload;
    }
};
