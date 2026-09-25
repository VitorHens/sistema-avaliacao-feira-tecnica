module.exports = class Projeto {
    #id;
    #tema;
    #curso;
    #representante;
    #integrantes = [];
    #equipamento;
    #outrosRecursos = null;
    #observacoes = null;
    #dataCadastro = new Date();
    #alunoId = null;
    #descricao = null;
    #objetivo = null;
    #problema = null;
    #solucao = null;
    #diferencial = null;
    #tecnologias = [];
    #imagens = [];
    #links = {};
    #localizacao = null;
    #statusProjeto = "PLANEJAMENTO";

    get id() { return this.#id; }
    set id(v) { if (!v) throw new Error("id é obrigatório."); this.#id = v.toString(); }

    get tema() { return this.#tema; }
    set tema(v) {
        if (typeof v !== "string" || v.trim().length < 3) throw new Error("tema deve ter pelo menos 3 caracteres.");
        this.#tema = v.trim();
    }
    get titulo() { return this.#tema; }
    set titulo(v) { this.tema = v; }

    get curso() { return this.#curso; }
    set curso(v) {
        const norm = String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
        const mapa = {
            ADMINISTRACAO: "ADMINISTRAÇÃO",
            "ANALISES CLINICAS": "ANÁLISES CLÍNICAS",
            ELETRONICA: "ELETRÔNICA",
            INFORMATICA: "INFORMÁTICA",
            PUBLICIDADE: "PUBLICIDADE",
            QUIMICA: "QUÍMICA"
        };
        if (!mapa[norm]) throw new Error("curso informado é inválido.");
        this.#curso = mapa[norm];
    }

    get representante() { return this.#representante; }
    set representante(v) { this.#representante = this.#validarParticipante(v, true, "representante"); }

    get integrantes() { return this.#integrantes; }
    set integrantes(v) {
        if (!Array.isArray(v)) throw new Error("integrantes deve ser um array.");
        if (v.length > 9) throw new Error("O projeto pode ter no máximo 10 estudantes.");
        this.#integrantes = v.map((x, i) => this.#validarParticipante(x, false, `integrante ${i + 2}`));
        this.validarMatriculasUnicas();
    }

    get equipamento() { return this.#equipamento; }
    set equipamento(v) {
        const valor = String(v || "").trim().toUpperCase();
        const permitidos = ["EQUIPE TRAZ SEU COMPUTADOR", "COMPUTADOR DA ESCOLA"];
        if (!permitidos.includes(valor)) throw new Error("equipamento informado é inválido.");
        this.#equipamento = valor;
    }

    get outrosRecursos() { return this.#outrosRecursos; }
    set outrosRecursos(v) { this.#outrosRecursos = this.#textoOpcional(v, 1200); }
    get observacoes() { return this.#observacoes; }
    set observacoes(v) { this.#observacoes = this.#textoOpcional(v, 2000); }
    get dataCadastro() { return this.#dataCadastro; }

    get alunoId() { return this.#alunoId; }
    set alunoId(v) { this.#alunoId = v ? String(v) : null; }
    get descricao() { return this.#descricao; }
    set descricao(v) { this.#descricao = this.#textoOpcional(v, 3000); }
    get objetivo() { return this.#objetivo; }
    set objetivo(v) { this.#objetivo = this.#textoOpcional(v, 2000); }
    get problema() { return this.#problema; }
    set problema(v) { this.#problema = this.#textoOpcional(v, 2000); }
    get solucao() { return this.#solucao; }
    set solucao(v) { this.#solucao = this.#textoOpcional(v, 2500); }
    get diferencial() { return this.#diferencial; }
    set diferencial(v) { this.#diferencial = this.#textoOpcional(v, 2000); }

    get tecnologias() { return this.#tecnologias; }
    set tecnologias(v) {
        if (v == null || v === "") { this.#tecnologias = []; return; }
        const lista = Array.isArray(v) ? v : String(v).split(",");
        this.#tecnologias = [...new Set(lista.map(x => String(x).trim()).filter(Boolean))].slice(0, 20);
    }

    get imagens() { return this.#imagens; }
    set imagens(v) {
        if (v == null) { this.#imagens = []; return; }
        if (!Array.isArray(v)) throw new Error("imagens deve ser um array.");
        this.#imagens = v.filter(x => {
            if (typeof x !== "string" || !x.trim()) return false;
            const valor = x.trim();
            if (valor.startsWith("data:image/")) return valor.length <= 1_200_000;
            try {
                const url = new URL(valor);
                return ["http:", "https:"].includes(url.protocol);
            } catch { return false; }
        }).slice(0, 5);
    }

    get links() { return this.#links; }
    set links(v) {
        const obj = v && typeof v === "object" ? v : {};
        this.#links = {
            github: this.#urlOpcional(obj.github),
            video: this.#urlOpcional(obj.video),
            site: this.#urlOpcional(obj.site)
        };
    }

    get localizacao() { return this.#localizacao; }
    set localizacao(v) { this.#localizacao = this.#textoOpcional(v, 300); }

    get statusProjeto() { return this.#statusProjeto; }
    set statusProjeto(v) {
        const valor = String(v || "PLANEJAMENTO").trim().toUpperCase();
        const permitidos = ["PLANEJAMENTO", "EM DESENVOLVIMENTO", "PRONTO PARA A FEIRA", "FINALIZADO"];
        if (!permitidos.includes(valor)) throw new Error("status do projeto é inválido.");
        this.#statusProjeto = valor;
    }

    validarMatriculasUnicas() {
        if (!this.#representante) return;
        const matriculas = [this.#representante.matricula, ...this.#integrantes.map(i => i.matricula)];
        if (new Set(matriculas).size !== matriculas.length) throw new Error("O mesmo estudante não pode aparecer mais de uma vez no projeto.");
    }

    #validarParticipante(v, emailObrigatorio, descricao) {
        if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(`${descricao} deve ser um objeto.`);
        if (typeof v.nome !== "string" || v.nome.trim().length < 3) throw new Error(`O nome do ${descricao} é inválido.`);
        if (typeof v.matricula !== "string" || !v.matricula.trim()) throw new Error(`A matrícula do ${descricao} é obrigatória.`);
        if (typeof v.turma !== "string" || !v.turma.trim()) throw new Error(`A turma do ${descricao} é obrigatória.`);
        let email = v.email ? String(v.email).trim().toLowerCase() : null;
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`O e-mail do ${descricao} é inválido.`);
        if (emailObrigatorio && !email) throw new Error(`O e-mail do ${descricao} é obrigatório.`);
        return { nome: v.nome.trim(), matricula: v.matricula.trim(), turma: v.turma.trim().toUpperCase(), email };
    }

    #textoOpcional(v, max) {
        if (v == null || v === "") return null;
        if (typeof v !== "string") throw new Error("campo textual inválido.");
        return v.trim().slice(0, max) || null;
    }

    #urlOpcional(v) {
        if (!v) return "";
        const valor = String(v).trim();
        try {
            const url = new URL(valor);
            if (!["http:", "https:"].includes(url.protocol)) throw new Error();
            return valor;
        } catch {
            throw new Error(`Link inválido: ${valor}`);
        }
    }

};
