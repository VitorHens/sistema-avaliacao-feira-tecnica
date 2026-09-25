const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");

module.exports = class ProfessorDAOMongo {
    #database;

    constructor(databaseInstance) {
        this.#database = databaseInstance;
    }

    async create(professor) {
        const collection = await this.#database.getCollection("professores");
        const result = await collection.insertOne({
            nome: professor.nome,
            ...(professor.email ? { email: professor.email } : {}),
            ...(professor.identificador ? { identificador: professor.identificador } : {}),
            senha: await bcrypt.hash(professor.senha, 12),
            role: professor.role,
            senhaInicialUnivap: professor.role === "AVALIADOR" && professor.senha === "univap",
            senhaPolitica: professor.role === "AVALIADOR" ? "univap-v1" : null,
            dataCadastro: new Date(),
        });
        if (!result.insertedId) throw new Error("Falha ao inserir professor.");
        return result.insertedId.toString();
    }

    async update(professor) {
        const collection = await this.#database.getCollection("professores");
        const fields = {
            nome: professor.nome,
            email: professor.email || null,
            identificador: professor.identificador || null,
            role: professor.role,
            dataAtualizacao: new Date(),
        };
        if (professor.senha) {
            fields.senha = await bcrypt.hash(professor.senha, 12);
            fields.senhaInicialUnivap = professor.role === "AVALIADOR" && professor.senha === "univap";
            fields.senhaPolitica = professor.role === "AVALIADOR" ? "univap-v1" : null;
        }

        const result = await collection.updateOne(
            { _id: new ObjectId(professor.id) },
            { $set: fields }
        );
        return result.matchedCount > 0;
    }

    async delete(professor) {
        const collection = await this.#database.getCollection("professores");
        const result = await collection.deleteOne({ _id: new ObjectId(professor.id) });
        return result.deletedCount > 0;
    }

    async findAll() {
        const collection = await this.#database.getCollection("professores");
        const documents = await collection
            .find({}, { projection: { senha: 0 } })
            .sort({ nome: 1 })
            .toArray();
        return documents.map(document => this.#documentToObject(document));
    }

    async findById(idProfessor) {
        if (!ObjectId.isValid(idProfessor)) return null;
        const collection = await this.#database.getCollection("professores");
        const document = await collection.findOne(
            { _id: new ObjectId(idProfessor) },
            { projection: { senha: 0 } }
        );
        return document ? this.#documentToObject(document) : null;
    }

    async findByField(field, value) {
        const allowed = ["id", "identificador", "nome", "email", "role"];
        if (!allowed.includes(field)) throw new Error(`Campo inválido para busca: ${field}`);
        if (field === "id" && !ObjectId.isValid(value)) return [];

        const collection = await this.#database.getCollection("professores");
        const filter = field === "id" ? { _id: new ObjectId(value) } : { [field]: value };
        const documents = await collection
            .find(filter, { projection: { senha: 0 } })
            .toArray();
        return documents.map(document => this.#documentToObject(document));
    }

    async login(identificacao, senha) {
        const collection = await this.#database.getCollection("professores");
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identificacao);
        const document = isEmail
            ? await collection.findOne({ email: identificacao.toLowerCase() })
            : await collection.findOne({ identificador: identificacao });
        if (document && (isEmail ? document.role !== "ADMINISTRADOR" : document.role !== "AVALIADOR")) return null;
        if (document?.contaTeste && (process.env.ENABLE_TEST_PROFESSOR !== "true" || process.env.NODE_ENV === "production")) return null;
        if (!document || !(await bcrypt.compare(senha, document.senha))) return null;
        return this.#documentToObject(document);
    }

    async changePassword(id, currentPassword, newPassword) {
        if (!/^[a-f\d]{24}$/i.test(id)) return false;
        const collection = await this.#database.getCollection("professores");
        const _id = new ObjectId(id);
        const document = await collection.findOne({ _id });
        if (!document?.senha || !await bcrypt.compare(currentPassword, document.senha)) return false;
        const hash = await bcrypt.hash(newPassword, 12);
        const result = await collection.updateOne(
            { _id, senha: document.senha },
            { $set: { senha: hash, senhaInicialUnivap: false, senhaPolitica: "pessoal-v1", dataAtualizacao: new Date() } }
        );
        return result.matchedCount === 1;
    }

    #documentToObject(document) {
        return {
            id: document._id.toString(),
            identificador: document.identificador || null,
            nome: document.nome,
            email: document.email || null,
            role: document.role,
            deveTrocarSenha: document.senhaInicialUnivap === true,
            dataCadastro: document.dataCadastro,
            dataAtualizacao: document.dataAtualizacao || null,
        };
    }
};
