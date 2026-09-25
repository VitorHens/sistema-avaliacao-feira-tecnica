const Professor = require("../models/Professor");
const MeuTokenJWT = require("../http/MeuTokenJWT");
const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class ProfessorService {
    #professorDAO;

    constructor(professorDAO) {
        this.#professorDAO = professorDAO;
    }

    createProfessor = async data => {
        const professor = this.#criarModelo(data, true);
        const emailExistente = professor.email && await this.#professorDAO.findByField("email", professor.email);
        if (emailExistente?.length) {
            throw new ErrorResponse(400, "E-mail já cadastrado", {
                message: `O e-mail ${professor.email} já está em uso.`,
            });
        }
        const idExistente = professor.identificador && await this.#professorDAO.findByField("identificador", professor.identificador);
        if (idExistente?.length) throw new ErrorResponse(400, "ID de professor já cadastrado.");

        professor.id = await this.#professorDAO.create(professor);
        return professor.toJSON();
    };

    loginProfessor = async data => {
        if (!data) throw new ErrorResponse(400, "Dados de login obrigatórios");
        const identificacao = typeof data.identificacao === "string" ? data.identificacao.trim() : "";
        const senha = data.senha;
        if (!identificacao || identificacao.length > 254 || typeof senha !== "string" || !senha || Buffer.byteLength(senha, "utf8") > 72) {
            throw new ErrorResponse(400, "ID ou senha inválidos");
        }
        if (!identificacao.includes('@') && !/^\d{1,64}$/.test(identificacao)) {
            throw new ErrorResponse(400, "O ID do professor deve conter apenas números.");
        }
        const encontrado = await this.#professorDAO.login(identificacao, senha);
        if (!encontrado) {
            throw new ErrorResponse(401, "ID ou senha inválidos", {
                message: "Não foi possível realizar o login.",
            });
        }

        const token = new MeuTokenJWT().gerarToken({
            email: encontrado.email,
            role: encontrado.role,
            name: encontrado.nome,
            idFuncionario: encontrado.id,
        });

        return { professor: encontrado, token };
    };

    findAll = async () => this.#professorDAO.findAll();

    changePassword = async (id, data) => {
        const current = data?.senhaAtual;
        const next = data?.novaSenha;
        if (typeof current !== "string" || typeof next !== "string") {
            throw new ErrorResponse(400, "Informe a senha atual e a nova senha.");
        }
        const validation = new Professor();
        validation.role = "ADMINISTRADOR";
        try { validation.senha = next; }
        catch (error) { throw new ErrorResponse(400, "Nova senha inválida", { message: error.message }); }
        if (next === current) throw new ErrorResponse(400, "Escolha uma senha diferente da atual.");
        if (!await this.#professorDAO.changePassword(id, current, next)) {
            throw new ErrorResponse(400, "Senha atual incorreta ou já alterada.");
        }
        return { success: true };
    };

    findById = async idProfessor => {
        const professor = await this.#professorDAO.findById(idProfessor);
        if (!professor) {
            throw new ErrorResponse(404, "Professor não encontrado", {
                message: `Não existe professor com id ${idProfessor}.`,
            });
        }
        return professor;
    };

    updateProfessor = async (idProfessor, requestBody) => {
        const data = requestBody.professor || requestBody.Professor || requestBody;
        const atual = await this.findById(idProfessor);
        const novoPapel = typeof data.role === "string" ? data.role.trim().toUpperCase() : atual.role;
        if (atual.role !== "ADMINISTRADOR" && novoPapel === "ADMINISTRADOR" && !data.senha) {
            throw new ErrorResponse(400, "Defina uma senha forte ao promover um professor a administrador.");
        }
        const professor = this.#criarModelo({
            nome: data.nome ?? atual.nome,
            email: data.email ?? atual.email,
            identificador: data.identificador ?? atual.identificador,
            senha: atual.role === "ADMINISTRADOR" && novoPapel === "AVALIADOR" ? "univap" : data.senha,
            role: novoPapel,
        }, false);
        professor.id = idProfessor;

        const mesmoEmail = professor.email ? await this.#professorDAO.findByField("email", professor.email) : [];
        if (mesmoEmail.some(item => item.id !== idProfessor)) {
            throw new ErrorResponse(400, "E-mail já cadastrado", {
                message: `O e-mail ${professor.email} já está em uso.`,
            });
        }
        const mesmoId = professor.identificador ? await this.#professorDAO.findByField("identificador", professor.identificador) : [];
        if (mesmoId.some(item => item.id !== idProfessor)) throw new ErrorResponse(400, "ID de professor já cadastrado.");

        const atualizado = await this.#professorDAO.update(professor);
        return atualizado ? this.#professorDAO.findById(idProfessor) : null;
    };

    deleteProfessor = async idProfessor => {
        const professor = new Professor();
        professor.id = idProfessor;
        return this.#professorDAO.delete(professor);
    };

    #criarModelo(data, senhaObrigatoria) {
        if (!data || typeof data !== "object") {
            throw new ErrorResponse(400, "Dados do professor obrigatórios");
        }

        try {
            const professor = new Professor();
            professor.nome = data.nome;
            professor.role = data.role || "AVALIADOR";
            professor.identificador = data.identificador;
            professor.email = data.email;
            if (professor.role === "AVALIADOR" && !professor.identificador) throw new Error("ID do professor é obrigatório.");
            if (professor.role === "ADMINISTRADOR" && !professor.email) throw new Error("E-mail do administrador é obrigatório.");
            if (senhaObrigatoria || data.senha) professor.senha = professor.role === "AVALIADOR" && senhaObrigatoria ? "univap" : data.senha;
            return professor;
        } catch (error) {
            throw new ErrorResponse(400, "Dados do professor inválidos", {
                message: error.message,
            });
        }
    }
};
