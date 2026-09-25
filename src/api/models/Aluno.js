module.exports = class Aluno {
    #id;
    #nome;
    #email;
    #senha;
    #matricula;
    #turma;
    #curso;

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

    get email() { return this.#email; }
    set email(value) {
        if (typeof value !== "string") throw new Error("email deve ser uma string.");
        const email = value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("email em formato inválido.");
        }
        this.#email = email;
    }

    get senha() { return this.#senha; }
    set senha(value) {
        if (typeof value !== "string" || value.length < 8) {
            throw new Error("senha deve ter pelo menos 8 caracteres.");
        }
        if (Buffer.byteLength(value, 'utf8') > 72) throw new Error('senha deve ter no máximo 72 bytes.');
        if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value) || !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
            throw new Error("senha deve possuir maiúscula, minúscula, número e caractere especial.");
        }
        this.#senha = value;
    }

    get matricula() { return this.#matricula; }
    set matricula(value) {
        if (typeof value !== "string" || value.trim().length < 3) {
            throw new Error("matrícula inválida.");
        }
        this.#matricula = value.trim();
    }

    get turma() { return this.#turma; }
    set turma(value) {
        if (typeof value !== "string" || !value.trim()) throw new Error("turma é obrigatória.");
        this.#turma = value.trim().toUpperCase();
    }

    get curso() { return this.#curso; }
    set curso(value) {
        if (typeof value !== "string" || !value.trim()) throw new Error("curso é obrigatório.");
        this.#curso = value.trim().toUpperCase();
    }

    toJSON() {
        return {
            id: this.#id,
            nome: this.#nome,
            email: this.#email,
            matricula: this.#matricula,
            turma: this.#turma,
            curso: this.#curso,
            role: "ALUNO"
        };
    }
};
