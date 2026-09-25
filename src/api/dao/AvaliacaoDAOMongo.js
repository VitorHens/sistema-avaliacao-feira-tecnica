const { ObjectId } = require('mongodb');
const ErrorResponse = require('../utils/ErrorResponse');

module.exports = class AvaliacaoDAOMongo {
    #database;

    constructor(databaseInstance) {
        this.#database = databaseInstance;
    }

    async ensureIndexes() {
        const collection = await this.#database.getCollection('avaliacoes');
        await collection.createIndex(
            { projetoId: 1, avaliadorId: 1 },
            { unique: true, partialFilterExpression: { avaliadorId: { $type: 'string' } } }
        );
    }

    async create(avaliacao) {
        const collection = await this.#database.getCollection('avaliacoes');
        let result;
        try { result = await collection.insertOne(this.#modelToDocument(avaliacao)); }
        catch (error) {
            if (error.code === 11000) throw new ErrorResponse(409, 'Este professor já avaliou o projeto.');
            throw error;
        }
        if (!result.insertedId) throw new Error('Falha ao inserir avaliação');
        return result.insertedId.toString();
    }

    async delete(avaliacao) {
        const collection = await this.#database.getCollection('avaliacoes');
        const result = await collection.deleteOne({ _id: new ObjectId(avaliacao.id) });
        return result.deletedCount > 0;
    }

    async update(avaliacao) {
        const collection = await this.#database.getCollection('avaliacoes');
        const result = await collection.updateOne(
            { _id: new ObjectId(avaliacao.id) },
            {
                $set: {
                    ...this.#modelToDocument(avaliacao),
                    dataAtualizacao: new Date(),
                },
            }
        );
        return result.modifiedCount > 0;
    }

    async findAll() {
        const collection = await this.#database.getCollection('avaliacoes');
        const docs = await collection.aggregate(this.#lookupProjetoPipeline()).toArray();
        return docs.map(doc => this.#documentToObject(doc));
    }

    async findById(idAvaliacao) {
        const collection = await this.#database.getCollection('avaliacoes');
        const docs = await collection.aggregate([
            { $match: { _id: new ObjectId(idAvaliacao) } },
            ...this.#lookupProjetoPipeline(),
        ]).toArray();
        return docs[0] ? this.#documentToObject(docs[0]) : null;
    }

    async findByField(field, value) {
        const camposPermitidos = ['id', 'projetoId', 'avaliador', 'avaliadorId', 'status'];
        if (!camposPermitidos.includes(field)) {
            throw new Error(`Campo inválido para busca: ${field}`);
        }

        const filter = this.#createFilter(field, value);
        const collection = await this.#database.getCollection('avaliacoes');
        const docs = await collection.aggregate([
            { $match: filter },
            ...this.#lookupProjetoPipeline(),
        ]).toArray();
        return docs.map(doc => this.#documentToObject(doc));
    }

    #createFilter(field, value) {
        if (field === 'id') return { _id: new ObjectId(value) };
        if (field === 'projetoId') return { projetoId: new ObjectId(value) };
        return { [field]: value };
    }

    #getProjetoId(avaliacao) {
        return typeof avaliacao.projeto === 'string'
            ? avaliacao.projeto
            : avaliacao.projeto.id;
    }

    #modelToDocument(avaliacao) {
        return {
            projetoId: new ObjectId(this.#getProjetoId(avaliacao)),
            avaliador: avaliacao.avaliador,
            avaliadorId: avaliacao.avaliadorId,
            data: avaliacao.data,
            criatividade: avaliacao.criatividade,
            relevancia: avaliacao.relevancia,
            viabilidade: avaliacao.viabilidade,
            apresentacao: avaliacao.apresentacao,
            conhecimentoTecnico: avaliacao.conhecimentoTecnico,
            funcionalidade: avaliacao.funcionalidade,
            sustentabilidade: avaliacao.sustentabilidade,
            trabalhoEquipe: avaliacao.trabalhoEquipe,
            originalidade: avaliacao.originalidade,
            potencialMercado: avaliacao.potencialMercado,
            comentarios: avaliacao.comentarios,
            notaFinal: avaliacao.notaFinal,
            status: avaliacao.status,
            avaliacaoAlunos: avaliacao.avaliacaoAlunos,
            comentarioInterno: avaliacao.comentarioInterno,
        };
    }

    #lookupProjetoPipeline() {
        return [
            {
                $lookup: {
                    from: 'projetos',
                    localField: 'projetoId',
                    foreignField: '_id',
                    as: 'projeto',
                },
            },
            { $unwind: { path: '$projeto', preserveNullAndEmptyArrays: true } },
            { $sort: { data: -1 } },
        ];
    }

    #documentToObject(doc) {
        return {
            id: doc._id.toString(),
            projeto: doc.projeto ? {
                id: doc.projeto._id.toString(),
                tema: doc.projeto.tema,
                curso: doc.projeto.curso,
                titulo: doc.projeto.tema || doc.projeto.titulo,
                descricao: doc.projeto.descricao,
            } : null,
            avaliador: doc.avaliador,
            avaliadorId: doc.avaliadorId || null,
            data: doc.data,
            criatividade: doc.criatividade,
            relevancia: doc.relevancia,
            viabilidade: doc.viabilidade,
            apresentacao: doc.apresentacao,
            conhecimentoTecnico: doc.conhecimentoTecnico,
            funcionalidade: doc.funcionalidade,
            sustentabilidade: doc.sustentabilidade,
            trabalhoEquipe: doc.trabalhoEquipe,
            originalidade: doc.originalidade,
            potencialMercado: doc.potencialMercado,
            comentarios: doc.comentarios || [],
            notaFinal: doc.notaFinal,
            status: doc.status,
            avaliacaoAlunos: doc.avaliacaoAlunos || [],
            comentarioInterno: doc.comentarioInterno || '',
            dataAtualizacao: doc.dataAtualizacao,
        };
    }
};
