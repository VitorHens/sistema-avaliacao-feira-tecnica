const { ObjectId } = require('mongodb');
const ErrorResponse = require('../utils/ErrorResponse');

const CURSOS_PERMITIDOS = [
    'ADMINISTRACAO',
    'ANALISES CLINICAS',
    'ELETRONICA',
    'INFORMATICA',
    'PUBLICIDADE',
    'QUIMICA',
];
const EQUIPAMENTOS_PERMITIDOS = [
    'EQUIPE TRAZ SEU COMPUTADOR',
    'COMPUTADOR DA ESCOLA',
];

module.exports = class ProjetoMiddleware {
    validateBody = (request, response, next) => {
        try {
            const projeto = request.body.projeto;
            if (!projeto || typeof projeto !== 'object' || Array.isArray(projeto)) {
                throw new Error("O campo 'projeto' é obrigatório.");
            }

            this.#validateTema(projeto.tema || projeto.titulo);
            this.#validateCurso(projeto.curso);
            this.#validateEquipe(projeto);
            this.#validateEquipamento(projeto);
            next();
        } catch (error) {
            next(this.#validationError(error.message));
        }
    };

    validateUpdateBody = (request, response, next) => {
        if (request.usuario?.role !== 'ALUNO') {
            return this.validateBody(request, response, next);
        }

        const projeto = request.body?.projeto;
        if (!projeto || typeof projeto !== 'object' || Array.isArray(projeto)) {
            return next(this.#validationError("O campo 'projeto' é obrigatório."));
        }
        if (projeto.tema !== undefined) {
            try {
                this.#validateTema(projeto.tema);
            } catch (error) {
                return next(this.#validationError(error.message));
            }
        }
        next();
    };

    validateIdParam = (request, response, next) => {
        if (!ObjectId.isValid(request.params.idProjeto)) {
            return next(new ErrorResponse(400, 'ID de projeto inválido', {
                message: 'O idProjeto deve ser um ObjectId válido.',
            }));
        }
        next();
    };

    #validateTema(tema) {
        if (typeof tema !== 'string') {
            throw new Error('O tema não pode ser vazio.');
        }
    }

    #validateCurso(curso) {
        if (typeof curso !== 'string' || !CURSOS_PERMITIDOS.includes(this.#normalize(curso))) {
            throw new Error('O curso informado é inválido.');
        }
    }

    #validateEquipe(projeto) {
        const representante = this.#getRepresentante(projeto);
        this.#validateParticipante(representante, 'representante', true);

        const integrantes = projeto.integrantes || projeto.grupo || [];
        if (!Array.isArray(integrantes)) throw new Error('integrantes deve ser um array.');
        if (integrantes.length > 9) {
            throw new Error('São permitidos no máximo 10 estudantes, incluindo o representante.');
        }

        const normalizados = integrantes.map(item => this.#normalizeParticipante(item));
        normalizados.forEach((integrante, index) => {
            this.#validateParticipante(integrante, `integrante ${index + 2}`, false);
        });

        const matriculas = [representante, ...normalizados]
            .map(participante => participante.matricula.trim());
        if (new Set(matriculas).size !== matriculas.length) {
            throw new Error('Existe matrícula repetida no projeto.');
        }
    }

    #validateEquipamento(projeto) {
        if (!EQUIPAMENTOS_PERMITIDOS.includes(this.#getEquipamento(projeto))) {
            throw new Error('O equipamento informado é inválido.');
        }
    }

    #getRepresentante(projeto) {
        if (projeto.representante) return this.#normalizeParticipante(projeto.representante);
        if (projeto.lider) return this.#normalizeParticipante(projeto.lider);
        return {
            nome: projeto.nomeCapitao,
            matricula: projeto.matriculaCapitao,
            turma: projeto.turmaCapitao || projeto.turma_capitao,
            email: projeto.emailCapitao,
        };
    }

    #normalizeParticipante(participante = {}) {
        const findByPrefix = prefixo => {
            const chave = Object.keys(participante).find(item => item.startsWith(prefixo));
            return chave ? participante[chave] : undefined;
        };

        return {
            nome: participante.nome || findByPrefix('nomeAluno') || findByPrefix('nomeProfessor'),
            matricula: participante.matricula || findByPrefix('matriculaAluno') || findByPrefix('matriculaProfessor'),
            turma: participante.turma || findByPrefix('turmaAluno') || findByPrefix('turmaProfessor'),
            email: participante.email,
        };
    }

    #validateParticipante(participante, descricao, emailObrigatorio) {
        if (typeof participante.nome !== 'string' || participante.nome.trim().length < 3) {
            throw new Error(`O nome do ${descricao} é inválido.`);
        }
        if (typeof participante.matricula !== 'string' || !participante.matricula.trim()) {
            throw new Error(`A matrícula do ${descricao} é obrigatória.`);
        }
        if (typeof participante.turma !== 'string' || !participante.turma.trim()) {
            throw new Error(`A turma do ${descricao} é obrigatória.`);
        }
        if (emailObrigatorio) {
            const emailValido = typeof participante.email === 'string' &&
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participante.email.trim());
            if (!emailValido) throw new Error(`O e-mail do ${descricao} é inválido.`);
        }
    }

    #getEquipamento(projeto) {
        if (typeof projeto.equipamento === 'string') {
            return projeto.equipamento.trim().toUpperCase();
        }
        if (projeto.precisaComputador !== undefined) {
            return [true, 'true'].includes(projeto.precisaComputador)
                ? 'COMPUTADOR DA ESCOLA'
                : 'EQUIPE TRAZ SEU COMPUTADOR';
        }
        return '';
    }

    #normalize(value) {
        return String(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toUpperCase();
    }

    #validationError(message) {
        return new ErrorResponse(400, 'Erro na validação de dados', { message });
    }
};
