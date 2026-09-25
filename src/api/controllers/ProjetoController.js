const asyncHandler = require('../utils/AsyncHandler');
const { publicBaseUrl } = require('../utils/AppBasePath');

module.exports = class ProjetoController {
    #service;

    constructor(service) {
        this.#service = service;
    }

    store = asyncHandler(async (request, response) => {
        const projeto = await this.#service.createProjeto(request.body.projeto || request.body);
        response.status(201).json({
            success: true,
            message: 'Projeto salvo com sucesso',
            data: { projeto },
        });
    });

    index = asyncHandler(async (request, response) => {
        const projetos = await this.#service.findAll();
        response.json({ success: true, data: { projetos } });
    });

    indexPublic = asyncHandler(async (request, response) => {
        const projetos = await this.#service.findAll();
        response.json({
            success: true,
            data: { projetos: projetos.map(projeto => this.#toPublic(projeto)) },
        });
    });

    meu = asyncHandler(async (request, response) => {
        const projeto = await this.#service.findMeuProjeto(request.usuario);
        response.json({ success: true, data: { projeto } });
    });

    qrMeu = asyncHandler(async (request, response) => {
        const baseUrl = publicBaseUrl(request);
        const dados = await this.#service.gerarQrCodeMeuProjeto(request.usuario, baseUrl);
        response.json({ success: true, data: dados });
    });

    qrPorMatricula = asyncHandler(async (request, response) => {
        const baseUrl = publicBaseUrl(request);
        const dados = await this.#service.gerarQrCodePorMatricula(
            request.query.matricula,
            baseUrl
        );
        response.json({ success: true, data: dados });
    });

    show = asyncHandler(async (request, response) => {
        const projeto = await this.#service.findById(request.params.idProjeto);
        response.json({ success: true, data: { projeto } });
    });

    showPublic = asyncHandler(async (request, response) => {
        const projeto = await this.#service.findById(request.params.idProjeto);
        response.json({
            success: true,
            data: { projeto: this.#toPublic(projeto) },
        });
    });

    update = asyncHandler(async (request, response) => {
        const projeto = await this.#service.updateProjeto(
            request.params.idProjeto,
            request.body,
            request.usuario
        );
        response.json({
            success: true,
            message: 'Projeto atualizado com sucesso',
            data: { projeto },
        });
    });

    destroy = asyncHandler(async (request, response) => {
        const excluido = await this.#service.deleteProjeto(request.params.idProjeto);
        response.json({
            success: true,
            data: null,
            message: excluido ? 'Projeto excluído' : 'Projeto não encontrado',
        });
    });

    #toPublic(projeto) {
        return {
            id: projeto.id,
            tema: projeto.tema,
            curso: projeto.curso,
            representante: projeto.representante
                ? { nome: projeto.representante.nome, turma: projeto.representante.turma }
                : null,
            integrantes: (projeto.integrantes || []).map(integrante => ({
                nome: integrante.nome,
                turma: integrante.turma,
            })),
            descricao: projeto.descricao || null,
            objetivo: projeto.objetivo || null,
            problema: projeto.problema || null,
            solucao: projeto.solucao || null,
            diferencial: projeto.diferencial || null,
            tecnologias: projeto.tecnologias || [],
            imagens: projeto.imagens || [],
            links: projeto.links || {},
            localizacao: projeto.localizacao || null,
            statusProjeto: projeto.statusProjeto || null,
        };
    }
};
