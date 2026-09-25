const MeuTokenJWT = require("../http/MeuTokenJWT");

module.exports = class JwtMiddleware {
    validateToken = (request, response, next) => {
        const jwt = new MeuTokenJWT();
        if (!jwt.validarToken(request.headers.authorization)) {
            return response.status(401).json({
                success: false,
                message: "Token inválido ou expirado",
            });
        }

        const payload = jwt.payload;
        request.usuario = {
            idUsuario: payload.idFuncionario,
            idProfessor: payload.role === "ALUNO" ? null : payload.idFuncionario,
            idAluno: payload.role === "ALUNO" ? payload.idFuncionario : null,
            nome: payload.name,
            email: payload.email,
            role: payload.role,
            matricula: payload.matricula || null,
            turma: payload.turma || null,
            curso: payload.curso || null,
        };

        const refreshedToken = jwt.gerarToken({
            email: payload.email,
            role: payload.role,
            name: payload.name,
            idFuncionario: payload.idFuncionario,
            matricula: payload.matricula,
            turma: payload.turma,
            curso: payload.curso,
        });
        response.setHeader("Authorization", `Bearer ${refreshedToken}`);
        next();
    };

    permitirRoles = (...rolesPermitidos) => (request, response, next) => {
        const role = request.usuario?.role;
        if (!role) {
            return response.status(401).json({
                success: false,
                message: "Usuário não autenticado",
            });
        }
        if (!rolesPermitidos.includes(role)) {
            return response.status(403).json({
                success: false,
                message: "Você não tem permissão para realizar esta ação",
            });
        }
        next();
    };
};
