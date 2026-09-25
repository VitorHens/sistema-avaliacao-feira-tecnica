const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { ObjectId } = require('mongodb');
const logger = require('../utils/Logger');
const PROFESSOR_TESTE_ID = '68d5d3c0a0b1c2d3e4f5a601';
const PROFESSOR_TESTE_LOGIN_ID = '900000000001';
const ADMIN_TESTE_ID = '68d5d3c0a0b1c2d3e4f5a602';

module.exports = async function seedDatabase(database, options = {}) {
    if (process.env.ENABLE_TEST_PROFESSOR === 'true' && process.env.NODE_ENV === 'production') {
        throw new Error('As contas de teste não podem ser ativadas em produção.');
    }
    const professores = await database.getCollection('professores');
    const professorIndexes = await professores.listIndexes().toArray().catch(error => {
        if (error.code === 26) return [];
        throw error;
    });
    const oldEmailIndex = professorIndexes.find(index => index.name === 'email_1');
    if (oldEmailIndex && !oldEmailIndex.partialFilterExpression) await professores.dropIndex('email_1');
    await professores.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
    await professores.createIndex({ identificador: 1 }, { unique: true, partialFilterExpression: { identificador: { $type: 'string' } } });

    // Contas de demonstração antigas só são removidas se ainda usam a senha pública original.
    for (const [email, senha] of [['admin@feira.com', 'Admin@2026'], ['avaliador@feira.com', 'Avaliador@2026']]) {
        const antiga = await professores.findOne({ email });
        if (antiga?.senha && await bcrypt.compare(senha, antiga.senha)) {
            await professores.deleteOne({ _id: antiga._id, senha: antiga.senha });
            logger.warn(`Conta de demonstração insegura removida: ${email}`);
        }
    }

    const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    if (Boolean(adminEmail) !== Boolean(adminPassword)) throw new Error('Configure BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD juntos.');
    if (adminEmail && adminPassword) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) || adminPassword.length < 12 || Buffer.byteLength(adminPassword, 'utf8') > 72) {
            throw new Error('O administrador inicial precisa de e-mail válido e senha entre 12 e 72 bytes.');
        }
        await criarProfessorSeNecessario(professores, {
            nome: 'Administrador da Feira', email: adminEmail,
            senha: adminPassword, role: 'ADMINISTRADOR',
        });
    }
    const acessosCriados = [];
    const administradores = await professores.find({ role: 'ADMINISTRADOR' }).toArray();
    if (!administradores.some(admin => !admin.contaTeste)) {
        const senha = gerarSenhaInicial();
        const email = 'admin-inicial@feira.local';
        if (!await criarProfessorSeNecessario(professores, { nome: 'Administrador da Feira', email, senha, role: 'ADMINISTRADOR' })) {
            throw new Error(`O e-mail ${email} já está em uso por outra conta.`);
        }
        acessosCriados.push({ perfil: 'Administrador', email, senha });
    }
    // Migração única: professores já cadastrados recebem a senha inicial da escola.
    // A marca impede que uma alteração posterior de senha seja desfeita no reinício.
    const avaliadores = await professores.find({ role: 'AVALIADOR' }).toArray();
    let professorInicialMigrado = null;
    for (const avaliador of avaliadores) {
        if (!/^\d{1,64}$/.test(avaliador.identificador || '')) {
            await professores.updateOne(
                { _id: avaliador._id, role: 'AVALIADOR' },
                { $set: { identificador: idNumericoProvisorio(avaliador._id) } }
            );
        }
        if (avaliador.senhaPolitica === 'univap-v1' || avaliador.senhaPolitica === 'pessoal-v1') continue;
        await professores.updateOne(
            { _id: avaliador._id, role: 'AVALIADOR' },
            { $set: { senha: await bcrypt.hash('univap', 12), senhaPolitica: 'univap-v1', senhaInicialUnivap: true } }
        );
        if (avaliador.email === 'professor-inicial@feira.local') professorInicialMigrado = avaliador;
    }
    if (professorInicialMigrado) salvarAcessosIniciais([{
        perfil: 'Professor / avaliador', id: idNumericoProvisorio(professorInicialMigrado._id),
        email: professorInicialMigrado.email, senha: 'univap',
    }]);
    if (process.env.ENABLE_TEST_PROFESSOR === 'true') {
        await criarContaTeste(professores, {
            id: PROFESSOR_TESTE_ID, identificador: PROFESSOR_TESTE_LOGIN_ID,
            nome: 'Professor Teste', email: 'professor-teste@feira.local',
            senha: 'univap', role: 'AVALIADOR',
        });
        await criarContaTeste(professores, {
            id: ADMIN_TESTE_ID, nome: 'Administrador Teste',
            email: 'admin-teste@feira.local', senha: 'Univap@2026!', role: 'ADMINISTRADOR',
        });
    }
    if (acessosCriados.length) salvarAcessosIniciais(acessosCriados);

    const alunos = await database.getCollection('alunos');
    const alunoDemoAntigo = await alunos.findOne({ email: 'aluno@feira.com' });
    if (alunoDemoAntigo?.senha && await bcrypt.compare('Aluno@2026', alunoDemoAntigo.senha)) {
        await alunos.deleteOne({ _id: alunoDemoAntigo._id, senha: alunoDemoAntigo.senha });
        logger.warn('Conta antiga de aluno com senha pública removida.');
    }
    // Integrantes sem e-mail usam matrícula, sem endereços fictícios.
    const indexes = await alunos.listIndexes().toArray().catch(error => {
        if(error.code === 26) return [];
        throw error;
    });
    const emailIndex = indexes.find(index => index.name === 'email_1');
    if(emailIndex && !emailIndex.partialFilterExpression) await alunos.dropIndex('email_1');
    await alunos.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
    await alunos.createIndex({ matricula: 1 }, { unique: true });
    const cadastros = require('./ImportarCadastros');
    const cargaPrivada = await cadastros.carregarCadastros(database);
    const importarProjetos = options.importarProjetos || cadastros.importarProjetosIncorporados;
    const projetosIncorporados = await importarProjetos(database);
    logger.info(`Projetos da carga privada: ${projetosIncorporados.criados} novos, ${projetosIncorporados.atualizados} atualizados.`);
    const acessosIncorporados = await (options.importarAlunos || require('./ImportarAlunosIncorporados'))(database);
    logger.info(`Alunos da carga privada: ${acessosIncorporados.contasCriadas} acessos novos, ${acessosIncorporados.vinculosCriados} vínculos, ${acessosIncorporados.pendencias.length} pendências.`);
    if (cargaPrivada || projetosIncorporados.criados || projetosIncorporados.atualizados || projetosIncorporados.existentes) return;
    if (process.env.ENABLE_TEST_PROFESSOR !== 'true') return;
    const alunoDemo = await criarAlunoDemoSeNecessario(alunos);

    const projetos = await database.getCollection('projetos');
    if ((await projetos.countDocuments()) === 0 && alunoDemo) {
        await projetos.insertOne(criarProjetoDemo(alunoDemo));
    }
};

async function criarContaTeste(collection, dados) {
    const id = new ObjectId(dados.id);
    const existente = await collection.findOne({ _id: id });
    if (existente && !existente.contaTeste) throw new Error(`O ID reservado para ${dados.nome} já está em uso.`);
    const mesmoEmail = await collection.findOne({ email: dados.email });
    if (mesmoEmail && String(mesmoEmail._id) !== String(id)) throw new Error(`O e-mail reservado para ${dados.nome} já está em uso.`);
    if (dados.identificador) {
        const mesmoIdentificador = await collection.findOne({ identificador: dados.identificador });
        if (mesmoIdentificador && String(mesmoIdentificador._id) !== String(id)) {
            throw new Error(`O ID de acesso reservado para ${dados.nome} já está em uso.`);
        }
    }
    const conta = {
        nome: dados.nome, email: dados.email, role: dados.role,
        ...(dados.identificador ? { identificador: dados.identificador } : {}),
        senha: await bcrypt.hash(dados.senha, 12),
        senhaPolitica: dados.role === 'AVALIADOR' ? 'univap-v1' : null,
        senhaInicialUnivap: dados.role === 'AVALIADOR', contaTeste: true,
    };
    if (existente) {
        await collection.updateOne({ _id: id, contaTeste: true }, { $set: conta });
    } else {
        await collection.insertOne({ _id: id, ...conta, dataCadastro: new Date() });
    }
}

function idNumericoProvisorio(id) {
    const value = id.toString();
    return /^\d+$/.test(value) ? value : BigInt(`0x${value}`).toString();
}

async function criarProfessorSeNecessario(collection, dados) {
    if (await collection.findOne({ email: dados.email })) return null;
    const result = await collection.insertOne({
        nome: dados.nome,
        email: dados.email,
        senha: await bcrypt.hash(dados.senha, 12),
        role: dados.role,
        ...(dados.role === 'AVALIADOR' ? { senhaPolitica: 'univap-v1', senhaInicialUnivap: true } : {}),
        dataCadastro: new Date(),
    });
    return result.insertedId;
}

function gerarSenhaInicial() {
    return `Feira@${crypto.randomBytes(18).toString('base64url')}`;
}

function salvarAcessosIniciais(acessos) {
    const arquivo = process.env.NODE_ENV === 'test' && process.env.INITIAL_ACCESS_FILE
        ? process.env.INITIAL_ACCESS_FILE
        : path.resolve(__dirname, '../../../data/acessos-iniciais.json');
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    let anteriores = [];
    if (fs.existsSync(arquivo)) anteriores = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    const atuais = anteriores.filter(item => !acessos.some(novo => novo.perfil === item.perfil));
    fs.writeFileSync(arquivo, JSON.stringify([...atuais, ...acessos], null, 2), { mode: 0o600 });
    logger.warn(`Acessos iniciais criados. Consulte ${arquivo}. Troque a senha do administrador após o primeiro login.`);
}

async function criarAlunoDemoSeNecessario(collection) {
    let aluno = await collection.findOne({ email: 'aluno-teste@feira.local' });
    if (aluno) return aluno;

    const resultado = await collection.insertOne({
        nome: 'Aluno Teste',
        email: 'aluno-teste@feira.local',
        senha: await bcrypt.hash('Aluno@2026!', 12),
        matricula: '900000000002',
        turma: '2INFO',
        curso: 'INFORMÁTICA',
        role: 'ALUNO',
        contaTeste: true,
        dataCadastro: new Date(),
    });
    return collection.findOne({ _id: resultado.insertedId });
}

function criarProjetoDemo(aluno) {
    return {
        tema: 'Conecta Escola',
        curso: 'INFORMÁTICA',
        representante: {
            nome: aluno.nome,
            matricula: aluno.matricula,
            turma: aluno.turma,
            email: aluno.email,
        },
        integrantes: [],
        equipamento: 'EQUIPE TRAZ SEU COMPUTADOR',
        outrosRecursos: null,
        observacoes: null,
        alunoId: aluno._id.toString(),
        descricao: 'Uma plataforma para aproximar alunos, projetos e visitantes durante a Feira Técnica.',
        objetivo: 'Tornar a descoberta dos projetos mais simples, organizada e acessível.',
        problema: 'Visitantes frequentemente têm dificuldade para encontrar projetos, entender as propostas e localizar os estandes.',
        solucao: 'Uma experiência web com catálogo, QR Code, páginas públicas e informações organizadas de cada equipe.',
        diferencial: 'Cada projeto ganha uma página própria e pode ser atualizado pelos alunos responsáveis.',
        tecnologias: ['HTML', 'CSS', 'JavaScript', 'Node.js', 'MongoDB'],
        imagens: [],
        links: { github: '', video: '', site: '' },
        localizacao: 'Bloco Técnico · Stand 01',
        statusProjeto: 'EM DESENVOLVIMENTO',
        dataCadastro: new Date(),
    };
}
