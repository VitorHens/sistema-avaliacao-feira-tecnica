const express = require('express');

module.exports = class AlunoRouter {
    #router = express.Router();
    #jwt;
    #middleware;
    #controller;

    constructor(jwt, middleware, controller) {
        this.#jwt = jwt;
        this.#middleware = middleware;
        this.#controller = controller;
    }

    createRoutes = () => {
        const autenticado = this.#jwt.validateToken;
        const aluno = this.#jwt.permitirRoles('ALUNO');
        const administrador = this.#jwt.permitirRoles('ADMINISTRADOR');

        this.#router.post('/login', this.#middleware.validateLoginBody, this.#controller.login);
        this.#router.get('/me', autenticado, aluno, this.#controller.me);
        this.#router.put('/me/senha', autenticado, aluno, this.#controller.changePassword);
        this.#router.post('/', autenticado, administrador, this.#middleware.validateCreateBody, this.#controller.store);
        this.#router.get('/', autenticado, administrador, this.#controller.index);
        return this.#router;
    };
};
