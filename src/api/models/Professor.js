const ROLES = ["ADMINISTRADOR", "AVALIADOR"];

module.exports = class Professor {
    #id;
    #identificador;
    #nome;
    #email;
    #senha;
    #role = "AVALIADOR";

    get id() { return this.#id; }
    set id(value) {
        if (!value) throw new Error("id é obrigatório.");
        this.#id = value.toString();
    }

    get nome() { return this.#nome; }
    set nome(value) {
        if (typeof value !== "string" || value.trim().length < 3) {
            throw new Error("nome deve ter pelo menos 3 caracteres.");
        }
        this.#nome = value.trim();
    }

    get identificador() { return this.#identificador; }
    set identificador(value) {
        const id = typeof value === "string" ? value.trim() : "";
        if (!id) { this.#identificador = null; return; }
        if (!/^\d{1,64}$/.test(id)) {
            throw new Error("ID deve conter apenas números, com até 64 dígitos.");
        }
        this.#identificador = id;
    }

    get email() { return this.#email; }
    set email(value) {
        const email = typeof value === "string" ? value.trim().toLowerCase() : "";
        if (!email) { this.#email = null; return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("email em formato inválido.");
        }
        this.#email = email;
    }

    get senha() { return this.#senha; }
    set senha(value) {
        if (this.#role === "AVALIADOR" && value === "univap") {
            this.#senha = value;
            return;
        }
        if (typeof value !== "string" || value.length < 8) {
            throw new Error("senha deve ter pelo menos 8 caracteres.");
        }
        if (Buffer.byteLength(value, 'utf8') > 72) throw new Error('senha deve ter no máximo 72 bytes.');
        if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value) || !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
            throw new Error("senha deve possuir maiúscula, minúscula, número e caractere especial.");
        }
        this.#senha = value;
    }

    get role() { return this.#role; }
    set role(value) {
        const role = typeof value === "string" ? value.trim().toUpperCase() : "";
        if (!ROLES.includes(role)) {
            throw new Error(`role deve ser: ${ROLES.join(" ou ")}.`);
        }
        this.#role = role;
    }

    toJSON() {
        return {
            id: this.#id,
            identificador: this.#identificador,
            nome: this.#nome,
            email: this.#email,
            role: this.#role,
        };
    }
};
