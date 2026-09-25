const { setSessionCookie } = require('../http/SessionCookie');
const asyncHandler = require('../utils/AsyncHandler');

module.exports = class AlunoController {
    #service;

    constructor(service) {
        this.#service = service;
    }

    login = asyncHandler(async (request, response) => {
        const resultado = await this.#service.login(request.body.aluno || request.body);
        setSessionCookie(response, resultado.token);
        response.status(200).json({
            success: true,
            message: 'Login realizado com sucesso',
            data: resultado,
        });
    });

    store = asyncHandler(async (request, response) => {
        const aluno = await this.#service.create(request.body.aluno || request.body);
        response.status(201).json({
            success: true,
            message: 'Aluno cadastrado com sucesso',
            data: { aluno },
        });
    });

    index = asyncHandler(async (request, response) => {
        const alunos = await this.#service.findAll();
        response.json({ success: true, data: { alunos } });
    });

    me = asyncHandler(async (request, response) => {
        const aluno = await this.#service.findById(request.usuario.idAluno);
        response.json({ success: true, data: { aluno } });
    });

    changePassword = asyncHandler(async (request, response) => {
        await this.#service.changePassword(request.usuario.idAluno, request.body);
        response.json({ success: true, message: 'Senha alterada com sucesso.' });
    });
};
