const Aluno = require('../models/Aluno');
const MeuTokenJWT = require('../http/MeuTokenJWT');
const ErrorResponse = require('../utils/ErrorResponse');

module.exports = class AlunoService {
    #dao;

    constructor(dao) {
        this.#dao = dao;
    }

    create = async (dados) => {
        if (!dados || typeof dados !== 'object') {
            throw new ErrorResponse(400, 'Dados do aluno obrigatórios');
        }

        const aluno = this.#createModel(dados);
        if (await this.#dao.findByEmailOrMatricula(aluno.email, aluno.matricula)) {
            throw new ErrorResponse(400, 'Aluno já cadastrado', {
                message: 'E-mail ou matrícula já estão em uso.',
            });
        }

        aluno.id = await this.#dao.create(aluno);
        return aluno.toJSON();
    };

    login = async ({ identificacao, senha } = {}) => {
        if (!identificacao || !senha) {
            throw new ErrorResponse(400, 'Informe matrícula/e-mail e senha');
        }

        const aluno = await this.#dao.login(identificacao, senha);
        if (!aluno) {
            throw new ErrorResponse(401, 'Matrícula/e-mail ou senha inválidos');
        }

        const token = new MeuTokenJWT().gerarToken({
            email: aluno.email,
            role: 'ALUNO',
            name: aluno.nome,
            idFuncionario: aluno.id,
            matricula: aluno.matricula,
            turma: aluno.turma,
            curso: aluno.curso,
        });
        return { aluno, token };
    };

    findAll = () => this.#dao.findAll();

    findById = async id => {
        const aluno = await this.#dao.findById(id);
        if (!aluno) throw new ErrorResponse(404, 'Aluno não encontrado');
        return aluno;
    };

    changePassword = async (id, data) => {
        const current = data?.senhaAtual;
        const next = data?.novaSenha;
        if (typeof current !== 'string' || typeof next !== 'string') {
            throw new ErrorResponse(400, 'Informe a senha atual e a nova senha.');
        }
        const aluno = new Aluno();
        try { aluno.senha = next; }
        catch (error) { throw new ErrorResponse(400, 'Nova senha inválida', { message: error.message }); }
        if (next === current) throw new ErrorResponse(400, 'Escolha uma senha diferente da atual.');
        if (!await this.#dao.changePassword(id, current, next)) {
            throw new ErrorResponse(400, 'Senha atual incorreta.');
        }
        return { success: true };
    };

    #createModel(dados) {
        try {
            const aluno = new Aluno();
            aluno.nome = dados.nome;
            aluno.email = dados.email;
            aluno.senha = dados.senha;
            aluno.matricula = String(dados.matricula || '');
            aluno.turma = dados.turma;
            aluno.curso = dados.curso;
            return aluno;
        } catch (error) {
            throw new ErrorResponse(400, 'Dados do aluno inválidos', {
                message: error.message,
            });
        }
    }
};
