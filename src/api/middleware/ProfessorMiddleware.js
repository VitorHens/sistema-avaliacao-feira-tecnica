const { ObjectId } = require('mongodb');
const ErrorResponse = require('../utils/ErrorResponse');

module.exports = class ProfessorMiddleware {
    validateBody = (request, response, next) => {
        const professor = request.body.professor || request.body.Professor;
        if (!professor || typeof professor !== 'object') {
            return next(new ErrorResponse(400, "O campo 'professor' é obrigatório."));
        }
        next();
    };

    validateIdParam = (request, response, next) => {
        if (!ObjectId.isValid(request.params.idProfessor)) {
            return next(new ErrorResponse(400, 'ID de professor inválido'));
        }
        next();
    };
};
