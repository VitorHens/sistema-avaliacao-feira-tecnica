const Projeto = require('./Projeto');

const STATUS_PERMITIDOS = ['Em análise', 'Aprovado', 'Reprovado', 'Classificado'];

module.exports = class Avaliacao {
    #id;
    #projeto;
    #avaliador;
    #avaliadorId;
    #data = new Date();
    #criatividade;
    #relevancia;
    #viabilidade;
    #apresentacao;
    #conhecimentoTecnico;
    #funcionalidade;
    #sustentabilidade;
    #trabalhoEquipe;
    #originalidade;
    #potencialMercado;
    #comentarios = [];
    #notaFinal = null;
    #status = 'Em análise';
    #avaliacaoAlunos = [];
    #comentarioInterno = '';

    get id() { return this.#id; }
    set id(value) {
        if (!value) throw new Error('id é obrigatório.');
        this.#id = value.toString();
    }

    get projeto() { return this.#projeto; }
    set projeto(value) {
        if (!(value instanceof Projeto) && typeof value !== 'string') {
            throw new Error('projeto deve ser uma instância de Projeto ou um ID');
        }
        this.#projeto = value;
    }

    get avaliador() { return this.#avaliador; }
    set avaliador(value) {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('avaliador deve ser uma string não vazia.');
        }
        this.#avaliador = value.trim();
    }

    get avaliadorId() { return this.#avaliadorId; }
    set avaliadorId(value) {
        if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) {
            throw new Error('avaliadorId deve ser um ID válido.');
        }
        this.#avaliadorId = value.toLowerCase();
    }

    get data() { return this.#data; }

    get criatividade() { return this.#criatividade; }
    set criatividade(value) { this.#definirNota('criatividade', value); }

    get relevancia() { return this.#relevancia; }
    set relevancia(value) { this.#definirNota('relevancia', value); }

    get viabilidade() { return this.#viabilidade; }
    set viabilidade(value) { this.#definirNota('viabilidade', value); }

    get apresentacao() { return this.#apresentacao; }
    set apresentacao(value) { this.#definirNota('apresentacao', value); }

    get conhecimentoTecnico() { return this.#conhecimentoTecnico; }
    set conhecimentoTecnico(value) { this.#definirNota('conhecimentoTecnico', value); }

    get funcionalidade() { return this.#funcionalidade; }
    set funcionalidade(value) { this.#definirNota('funcionalidade', value); }

    get sustentabilidade() { return this.#sustentabilidade; }
    set sustentabilidade(value) { this.#definirNota('sustentabilidade', value); }

    get trabalhoEquipe() { return this.#trabalhoEquipe; }
    set trabalhoEquipe(value) { this.#definirNota('trabalhoEquipe', value); }

    get originalidade() { return this.#originalidade; }
    set originalidade(value) { this.#definirNota('originalidade', value); }

    get potencialMercado() { return this.#potencialMercado; }
    set potencialMercado(value) { this.#definirNota('potencialMercado', value); }

    get comentarios() { return this.#comentarios; }
    addComentario(texto) {
        if (typeof texto !== 'string' || !texto.trim()) {
            throw new Error('Comentário deve ser uma string não vazia');
        }
        this.#comentarios.push({
            texto: texto.trim(),
            data: new Date(),
            avaliador: this.#avaliador,
        });
    }

    get notaFinal() { return this.#notaFinal; }

    get status() { return this.#status; }
    set status(value) {
        if (!STATUS_PERMITIDOS.includes(value)) {
            throw new Error(`status deve ser um dos: ${STATUS_PERMITIDOS.join(', ')}`);
        }
        this.#status = value;
    }

    get avaliacaoAlunos() { return this.#avaliacaoAlunos; }
    set avaliacaoAlunos(value) {
        this.#avaliacaoAlunos = Array.isArray(value) ? value : [];
    }

    get comentarioInterno() { return this.#comentarioInterno; }
    set comentarioInterno(value) {
        this.#comentarioInterno = typeof value === 'string' ? value.trim() : '';
    }

    #definirNota(campo, value) {
        if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 10) {
            throw new Error(`${campo} deve ser um número entre 0 e 10.`);
        }

        switch (campo) {
            case 'criatividade': this.#criatividade = value; break;
            case 'relevancia': this.#relevancia = value; break;
            case 'viabilidade': this.#viabilidade = value; break;
            case 'apresentacao': this.#apresentacao = value; break;
            case 'conhecimentoTecnico': this.#conhecimentoTecnico = value; break;
            case 'funcionalidade': this.#funcionalidade = value; break;
            case 'sustentabilidade': this.#sustentabilidade = value; break;
            case 'trabalhoEquipe': this.#trabalhoEquipe = value; break;
            case 'originalidade': this.#originalidade = value; break;
            case 'potencialMercado': this.#potencialMercado = value; break;
            default: throw new Error(`Critério desconhecido: ${campo}`);
        }
        this.#calcularNotaFinal();
    }

    #calcularNotaFinal() {
        const notas = [
            this.#criatividade,
            this.#relevancia,
            this.#viabilidade,
            this.#apresentacao,
            this.#conhecimentoTecnico,
            this.#funcionalidade,
            this.#sustentabilidade,
            this.#trabalhoEquipe,
            this.#originalidade,
            this.#potencialMercado,
        ].filter(Number.isFinite);

        this.#notaFinal = notas.length
            ? notas.reduce((total, nota) => total + nota, 0) / notas.length
            : null;
    }
};
