const express = require("express");

module.exports = class ProjetoRouter {
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
        this.#router.get("/publicos", this.#controller.indexPublic);
        this.#router.get(
            "/publico/:idProjeto",
            this.#middleware.validateIdParam,
            this.#controller.showPublic
        );

        this.#router.get(
            "/meu",
            this.#jwt.validateToken,
            this.#jwt.permitirRoles("ALUNO"),
            this.#controller.meu
        );

        this.#router.get(
            "/meu/qrcode",
            this.#jwt.validateToken,
            this.#jwt.permitirRoles("ALUNO"),
            this.#controller.qrMeu
        );

        this.#router.get(
            "/buscar-matricula",
            this.#jwt.validateToken,
            this.#jwt.permitirRoles("ADMINISTRADOR"),
            this.#controller.qrPorMatricula
        );

        this.#router.post(
            "/",
            this.#jwt.validateToken,
            this.#jwt.permitirRoles("ADMINISTRADOR"),
            this.#middleware.validateBody,
            this.#controller.store
        );

        this.#router.get(
            "/",
            this.#jwt.validateToken,
            this.#jwt.permitirRoles("ADMINISTRADOR", "AVALIADOR"),
            this.#controller.index
        );

        this.#router.get(
            "/:idProjeto",
            this.#jwt.validateToken,
            this.#jwt.permitirRoles("ADMINISTRADOR", "AVALIADOR"),
            this.#middleware.validateIdParam,
            this.#controller.show
        );

        this.#router.put(
            "/:idProjeto",
            this.#jwt.validateToken,
            this.#jwt.permitirRoles("ADMINISTRADOR", "ALUNO"),
            this.#middleware.validateIdParam,
            this.#middleware.validateUpdateBody,
            this.#controller.update
        );

        this.#router.delete(
            "/:idProjeto",
            this.#jwt.validateToken,
            this.#jwt.permitirRoles("ADMINISTRADOR"),
            this.#middleware.validateIdParam,
            this.#controller.destroy
        );

        return this.#router;
    };
};