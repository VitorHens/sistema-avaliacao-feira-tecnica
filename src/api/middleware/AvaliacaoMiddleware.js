const { ObjectId } = require('mongodb');
const ErrorResponse = require('../utils/ErrorResponse');

const CRITERIOS = [
    'criatividade',
    'relevancia',
    'viabilidade',
    'apresentacao',
    'conhecimentoTecnico',
    'funcionalidade',
    'sustentabilidade',
    'trabalhoEquipe',
    'originalidade',
    'potencialMercado',
];
const CRITERIOS_ALUNO = ['participacao', 'dominio', 'comunicacao', 'comprometimento'];
const STATUS = ['Em análise', 'Aprovado', 'Reprovado', 'Classificado'];

module.exports = class AvaliacaoMiddleware {
    validateBody = (request, response, next) => {
        const avaliacao = request.body.avaliacao;
        if (!avaliacao) {
            throw new ErrorResponse(400, 'Erro na validação de dados', {
                message: "O campo 'avaliacao' é obrigatório",
            });
        }

        const projetoId = avaliacao.projetoId || avaliacao.projeto?.id || avaliacao.projeto;
        if (!ObjectId.isValid(projetoId)) {
            throw new ErrorResponse(400, 'Projeto inválido', {
                message: 'A avaliação deve possuir um projetoId válido',
            });
        }

        for (const criterio of CRITERIOS) {
            this.#validarNota(avaliacao[criterio], criterio);
        }

        if (avaliacao.comentarios !== undefined && !Array.isArray(avaliacao.comentarios)) {
            throw new ErrorResponse(400, 'Comentários inválidos', {
                message: 'comentarios deve ser um array',
            });
        }

        if (avaliacao.avaliacaoAlunos !== undefined) {
            this.#validarAvaliacaoAlunos(avaliacao.avaliacaoAlunos);
        }

        if (avaliacao.status && !STATUS.includes(avaliacao.status)) {
            throw new ErrorResponse(400, 'Status inválido', {
                message: `status deve ser um dos: ${STATUS.join(', ')}`,
            });
        }

        next();
    };

    validateIdParam = (request, response, next) => {
        this.#validarId(request.params.idAvaliacao, 'idAvaliacao', 'avaliação');
        next();
    };

    validateProjetoIdParam = (request, response, next) => {
        this.#validarId(request.params.idProjeto, 'idProjeto', 'projeto');
        next();
    };

    #validarNota(valorOriginal, campo) {
        const valor = Number(valorOriginal);
        if (
            valorOriginal === undefined ||
            valorOriginal === null ||
            valorOriginal === '' ||
            Number.isNaN(valor) ||
            valor < 0 ||
            valor > 10
        ) {
            throw new ErrorResponse(400, 'Nota inválida', {
                message: `${campo} deve ser um número entre 0 e 10`,
            });
        }
    }

    #validarAvaliacaoAlunos(alunos) {
        if (!Array.isArray(alunos)) {
            throw new ErrorResponse(400, 'Avaliação individual inválida', {
                message: 'avaliacaoAlunos deve ser um array',
            });
        }

        for (const aluno of alunos) {
            for (const criterio of CRITERIOS_ALUNO) {
                this.#validarNota(aluno[criterio], criterio);
            }
        }
    }

    #validarId(id, nomeParametro, entidade) {
        if (!id || !ObjectId.isValid(id)) {
            throw new ErrorResponse(400, `ID de ${entidade} inválido`, {
                message: `O parâmetro '${nomeParametro}' deve ser um ObjectId válido`,
            });
        }
    }
};
