const Avaliacao = require('../models/Avaliacao');
const ErrorResponse = require('../utils/ErrorResponse');

module.exports = class AvaliacaoService {
    #avaliacaoDAO;
    #projetoDAO;

    constructor(avaliacaoDAODependency, projetoDAODependency) {
        this.#avaliacaoDAO = avaliacaoDAODependency;
        this.#projetoDAO = projetoDAODependency;
    }

    createAvaliacao = async (dados) => {
        const projetoId = this.#getProjetoId(dados);
        await this.#validarProjeto(projetoId);
        await this.#validarAvaliacaoDuplicada(projetoId, dados.avaliadorId);

        const avaliacao = this.#createModel(dados, projetoId);
        avaliacao.id = await this.#avaliacaoDAO.create(avaliacao);
        return this.#avaliacaoDAO.findById(avaliacao.id);
    };

    findAll = () => this.#avaliacaoDAO.findAll();

    findById = async (idAvaliacao) => {
        const avaliacao = await this.#avaliacaoDAO.findById(idAvaliacao);

        if (!avaliacao) {
            throw new ErrorResponse(404, 'Avaliação não encontrada', {
                message: `Não existe avaliação com id ${idAvaliacao}`,
            });
        }

        return avaliacao;
    };

    findByProjeto = (idProjeto) =>
        this.#avaliacaoDAO.findByField('projetoId', idProjeto);

    updateAvaliacao = async (idAvaliacao, requestBody) => {
        const dados = requestBody.avaliacao || requestBody;
        const atual = await this.findById(idAvaliacao);
        const projetoId = this.#getProjetoId(dados);
        if (projetoId !== atual.projeto?.id) {
            throw new ErrorResponse(400, 'Não é permitido trocar o projeto de uma avaliação.');
        }

        const avaliacao = this.#createModel({
            ...dados,
            avaliacaoAlunos: dados.avaliacaoAlunos ?? atual.avaliacaoAlunos,
            comentarioInterno: dados.comentarioInterno ?? atual.comentarioInterno,
        }, projetoId);

        avaliacao.id = idAvaliacao;

        return this.#avaliacaoDAO.update(avaliacao);
    };

    rankingPublico = async () => {
        const grupos = new Map();
        const avaliacoes = await this.#avaliacaoDAO.findAll();

        for (const avaliacao of avaliacoes) {
            const nota = Number(avaliacao.notaFinal);
            const projeto = avaliacao.projeto;

            if (
                  !projeto?.id ||
                  avaliacao.notaFinal == null || avaliacao.notaFinal === '' ||
                !Number.isFinite(nota) ||
                avaliacao.status === 'Em análise'
            ) {
                continue;
            }

            const item = grupos.get(projeto.id) || {
                projetoId: projeto.id,
                tema: projeto.tema || projeto.titulo || 'Projeto',
                curso: projeto.curso || 'Sem curso',
                soma: 0,
                avaliacoes: 0,
                atualizadoEm: null,
            };

            item.soma += nota;
            item.avaliacoes += 1;

            const data = avaliacao.dataAtualizacao || avaliacao.data;

            if (
                data &&
                (!item.atualizadoEm ||
                    new Date(data) > new Date(item.atualizadoEm))
            ) {
                item.atualizadoEm = data;
            }

            grupos.set(projeto.id, item);
        }

        const ranking = [...grupos.values()]
            .map(item => ({
                projetoId: item.projetoId,
                tema: item.tema,
                curso: item.curso,
                media: item.soma / item.avaliacoes,
                avaliacoes: item.avaliacoes,
                atualizadoEm: item.atualizadoEm,
            }))
            .sort(this.#compararRanking)
            .map((item, index) => ({
                posicao: index + 1,
                ...item,
                media: Number(item.media.toFixed(2)),
            }));

        const rankingPorCurso = {};

        for (const item of ranking) {
            const curso = item.curso || 'Sem curso';

            if (!rankingPorCurso[curso]) {
                rankingPorCurso[curso] = [];
            }

            rankingPorCurso[curso].push(item);
        }

        for (const curso of Object.keys(rankingPorCurso)) {
            rankingPorCurso[curso] = rankingPorCurso[curso].sort((a, b) => a.posicao - b.posicao);
        }

        return {
            ranking,
            rankingPorCurso,
        };
    };

    deleteAvaliacao = async (idAvaliacao) => {
        const avaliacao = new Avaliacao();
        avaliacao.id = idAvaliacao;

        return this.#avaliacaoDAO.delete(avaliacao);
    };

    async #validarProjeto(projetoId) {
        if (!await this.#projetoDAO.findById(projetoId)) {
            throw new ErrorResponse(400, 'Projeto não encontrado', {
                message: `Não existe projeto com id ${projetoId}`,
            });
        }
    }

    async #validarAvaliacaoDuplicada(projetoId, avaliadorId) {
        const avaliacoes =
            await this.#avaliacaoDAO.findByField('projetoId', projetoId);

        if (avaliacoes.some(item => item.avaliadorId === avaliadorId)) {
            throw new ErrorResponse(400, 'Avaliação duplicada', {
                message: 'Este avaliador já avaliou o projeto',
            });
        }
    }

    #getProjetoId(dados) {
        return dados.projetoId || dados.projeto?.id || dados.projeto;
    }

    #compararRanking = (a, b) =>
        b.media - a.media ||
        b.avaliacoes - a.avaliacoes ||
        a.tema.localeCompare(b.tema, 'pt-BR');

    #createModel(dados, projetoId) {
        const avaliacao = new Avaliacao();

        avaliacao.projeto = projetoId;
        avaliacao.avaliador = dados.avaliador;
        avaliacao.avaliadorId = dados.avaliadorId;

        for (const criterio of [
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
        ]) {
            avaliacao[criterio] = Number(dados[criterio]);
        }

        for (const comentario of dados.comentarios || []) {
            avaliacao.addComentario(
                typeof comentario === 'string'
                    ? comentario
                    : comentario.texto
            );
        }

        if (dados.status) {
            avaliacao.status = dados.status;
        }

        avaliacao.avaliacaoAlunos = dados.avaliacaoAlunos;
        avaliacao.comentarioInterno = dados.comentarioInterno;

        return avaliacao;
    }
};
