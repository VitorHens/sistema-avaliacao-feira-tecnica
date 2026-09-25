const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class AlunoMiddleware {
    validateLoginBody = (req, res, next) => {
        const aluno = req.body.aluno || req.body;
        if (typeof aluno?.identificacao !== 'string' || !aluno.identificacao.trim() || aluno.identificacao.length > 254 || typeof aluno?.senha !== 'string' || !aluno.senha || aluno.senha.length > 128) {
            return next(new ErrorResponse(400, "Dados de login incompletos", { message: "Informe matrícula/e-mail e senha." }));
        }
        next();
    };

    validateCreateBody = (req, res, next) => {
        const a = req.body.aluno || req.body;
        const campos = ["nome", "email", "senha", "matricula", "turma", "curso"];
        const faltando = campos.find(c => !a?.[c]);
        if (faltando) return next(new ErrorResponse(400, "Dados incompletos", { message: `O campo ${faltando} é obrigatório.` }));
        next();
    };
};
