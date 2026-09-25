const express = require('express');

module.exports = class AvaliacaoRouter {
    #router = express.Router();
    #jwtMiddleware;
    #avaliacaoMiddleware;
    #avaliacaoController;

    constructor(jwtMiddleware, avaliacaoMiddleware, avaliacaoController) {
        this.#jwtMiddleware = jwtMiddleware;
        this.#avaliacaoMiddleware = avaliacaoMiddleware;
        this.#avaliacaoController = avaliacaoController;
    }

    createRoutes = () => {
        const autenticado = this.#jwtMiddleware.validateToken;
        const avaliador = this.#jwtMiddleware.permitirRoles('ADMINISTRADOR', 'AVALIADOR');
        const administrador = this.#jwtMiddleware.permitirRoles('ADMINISTRADOR');

        this.#router.get('/ranking/publico', this.#avaliacaoController.rankingPublico);
        this.#router.post('/', autenticado, avaliador, this.#avaliacaoMiddleware.validateBody, this.#avaliacaoController.store);
        this.#router.get('/', autenticado, avaliador, this.#avaliacaoController.index);
        this.#router.get(
            '/projeto/:idProjeto',
            autenticado,
            avaliador,
            this.#avaliacaoMiddleware.validateProjetoIdParam,
            this.#avaliacaoController.indexByProjeto
        );
        this.#router.get(
            '/:idAvaliacao',
            autenticado,
            avaliador,
            this.#avaliacaoMiddleware.validateIdParam,
            this.#avaliacaoController.show
        );
        this.#router.put(
            '/:idAvaliacao',
            autenticado,
            avaliador,
            this.#avaliacaoMiddleware.validateIdParam,
            this.#avaliacaoMiddleware.validateBody,
            this.#avaliacaoController.update
        );
        this.#router.delete(
            '/:idAvaliacao',
            autenticado,
            administrador,
            this.#avaliacaoMiddleware.validateIdParam,
            this.#avaliacaoController.destroy
        );

        return this.#router;
    };
};
