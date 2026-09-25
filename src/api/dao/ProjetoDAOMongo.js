const { ObjectId } = require("mongodb");

module.exports = class ProjetoDAOMongo {
    #database;

    constructor(databaseInstance) {
        this.#database = databaseInstance;
    }

    async create(projeto) {
        const collection = await this.#database.getCollection("projetos");
        const result = await collection.insertOne(this.#modelToDocument(projeto));
        if (!result.insertedId) throw new Error("Falha ao inserir projeto.");
        return result.insertedId.toString();
    }

    async update(projeto) {
        const collection = await this.#database.getCollection("projetos");
        const document = this.#modelToDocument(projeto);
        delete document.dataCadastro;
        document.dataAtualizacao = new Date();

        const result = await collection.updateOne(
            { _id: new ObjectId(projeto.id) },
            { $set: document }
        );
        return result.matchedCount > 0;
    }

    async delete(projeto) {
        const collection = await this.#database.getCollection("projetos");
        const result = await collection.deleteOne({ _id: new ObjectId(projeto.id) });
        return result.deletedCount > 0;
    }

    async findAll() {
        const collection = await this.#database.getCollection("projetos");
        const documents = await collection.find().sort({ dataCadastro: -1 }).toArray();
        return documents.map(document => this.#documentToObject(document));
    }

    async findById(id) {
        if (!ObjectId.isValid(id)) return null;
        const collection = await this.#database.getCollection("projetos");
        const document = await collection.findOne({ _id: new ObjectId(id) });
        return document ? this.#documentToObject(document) : null;
    }

    async findByAlunoId(alunoId, matricula = null) {
        const collection = await this.#database.getCollection("projetos");
        const conditions = [{ alunoId: String(alunoId) }];

        if (matricula) {
            conditions.push({ "representante.matricula": String(matricula) });
            conditions.push({ "integrantes.matricula": String(matricula) });
        }

        const document = await collection.findOne({ $or: [
            { alunosAutorizados: String(alunoId) },
            { alunosAutorizados: { $exists: false }, $or: conditions },
        ] });
        return document ? this.#documentToObject(document) : null;
    }

    async findByMatricula(matricula) {
        const collection = await this.#database.getCollection("projetos");
        const documents = await collection.find({
            $or: [
                { "representante.matricula": matricula },
                { "integrantes.matricula": matricula },
            ],
        }).toArray();

        return documents.map(document => this.#documentToObject(document));
    }

    async updatePresentation(id, values) {
        const collection = await this.#database.getCollection('projetos');
        const result = await collection.updateOne({_id:new ObjectId(id)},{$set:{...values,dataAtualizacao:new Date()}});
        return result.matchedCount > 0;
    }

    #modelToDocument(projeto) {
        return {
            tema: projeto.tema,
            curso: projeto.curso,
            representante: projeto.representante,
            integrantes: projeto.integrantes,
            equipamento: projeto.equipamento,
            outrosRecursos: projeto.outrosRecursos,
            observacoes: projeto.observacoes,
            alunoId: projeto.alunoId,
            descricao: projeto.descricao,
            objetivo: projeto.objetivo,
            problema: projeto.problema,
            solucao: projeto.solucao,
            diferencial: projeto.diferencial,
            tecnologias: projeto.tecnologias,
            imagens: projeto.imagens,
            links: projeto.links,
            localizacao: projeto.localizacao,
            statusProjeto: projeto.statusProjeto,
            dataCadastro: projeto.dataCadastro || new Date(),
        };
    }

    #documentToObject(document) {
        return {
            id: document._id.toString(),
            tema: document.tema,
            curso: document.curso,
            representante: document.representante,
            integrantes: document.integrantes || [],
            equipamento: document.equipamento,
            outrosRecursos: document.outrosRecursos || null,
            observacoes: document.observacoes || null,
            alunoId: document.alunoId || null,
            ...(Array.isArray(document.alunosAutorizados) ? {alunosAutorizados:document.alunosAutorizados} : {}),
            dataCadastro: document.dataCadastro,
            dataAtualizacao: document.dataAtualizacao || null,
            descricao: document.descricao || null,
            objetivo: document.objetivo || null,
            problema: document.problema || null,
            solucao: document.solucao || null,
            diferencial: document.diferencial || null,
            tecnologias: document.tecnologias || [],
            imagens: document.imagens || [],
            links: document.links || {},
            localizacao: document.localizacao || null,
            statusProjeto: document.statusProjeto || "PLANEJAMENTO",
        };
    }
};
