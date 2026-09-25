const { setSessionCookie } = require('../http/SessionCookie');
const asyncHandler = require('../utils/AsyncHandler');

module.exports = class ProfessorController {
    #professorService;

    constructor(professorService) {
        this.#professorService = professorService;
    }

    login = asyncHandler(async (request, response) => {
        const dados = request.body.professor || request.body.Professor;
        const resultado = await this.#professorService.loginProfessor(dados);
        setSessionCookie(response, resultado.token);
        response.status(200).json({
            success: true,
            message: 'Login realizado com sucesso',
            data: resultado,
        });
    });

    changePassword = asyncHandler(async (request, response) => {
        await this.#professorService.changePassword(request.usuario.idProfessor, request.body);
        response.json({ success: true, message: 'Senha alterada com sucesso.' });
    });

    store = asyncHandler(async (request, response) => {
        const dados = request.body.professor || request.body.Professor;
        const professor = await this.#professorService.createProfessor(dados);
        response.status(201).json({
            success: true,
            message: 'Professor cadastrado com sucesso',
            data: { professor },
        });
    });

    index = asyncHandler(async (request, response) => {
        const professores = await this.#professorService.findAll();
        response.json({ success: true, data: { professores } });
    });

    show = asyncHandler(async (request, response) => {
        const professor = await this.#professorService.findById(request.params.idProfessor);
        response.json({ success: true, data: { professor } });
    });

    update = asyncHandler(async (request, response) => {
        const professor = await this.#professorService.updateProfessor(
            request.params.idProfessor,
            request.body
        );
        response.json({
            success: true,
            message: 'Professor atualizado com sucesso',
            data: { professor },
        });
    });

    destroy = asyncHandler(async (request, response) => {
        const excluido = await this.#professorService.deleteProfessor(request.params.idProfessor);
        if (!excluido) {
            return response.status(404).json({
                success: false,
                message: 'Professor não encontrado',
            });
        }
        response.json({
            success: true,
            message: 'Professor excluído com sucesso',
            data: null,
        });
    });
};
