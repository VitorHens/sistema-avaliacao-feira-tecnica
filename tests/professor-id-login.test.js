const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const ProfessorDAOMongo = require('../src/api/dao/ProfessorDAOMongo');
const ProfessorService = require('../src/api/services/ProfessorService');

test('avaliador entra pelo ID, não pelo e-mail; administrador continua pelo e-mail', async () => {
    const teacher = { _id: new ObjectId(), identificador: '001234', nome: 'Professor Exemplo', email: 'professor@example.test', role: 'AVALIADOR', senha: await bcrypt.hash('univap', 4) };
    const admin = { _id: new ObjectId(), nome: 'Administrador Exemplo', email: 'admin@example.test', role: 'ADMINISTRADOR', senha: await bcrypt.hash('Senha-Forte-2026!', 4) };
    const docs = [teacher, admin];
    const collection = { findOne: async filter => docs.find(doc => Object.entries(filter).every(([key, value]) => String(doc[key]) === String(value))) || null };
    const dao = new ProfessorDAOMongo({ getCollection: async () => collection });
    const service = new ProfessorService(dao);
    const teacherLogin = await service.loginProfessor({ identificacao: teacher.identificador, senha: 'univap' });
    assert.equal(teacherLogin.professor.id, teacher._id.toString());
    assert.equal(teacherLogin.professor.identificador, '001234');
    assert.equal(await dao.login(teacher._id.toString(), 'univap'), null);
    assert.equal(await dao.login(teacher.email, 'univap'), null);
    assert.equal(await dao.login(teacher.identificador, 'errada'), null);
    await assert.rejects(() => service.loginProfessor({ identificacao: 'PROF123', senha: 'univap' }), /apenas números/);
    assert.equal((await service.loginProfessor({ identificacao: admin.email, senha: 'Senha-Forte-2026!' })).professor.role, 'ADMINISTRADOR');
});

test('cadastro de avaliador usa senha inicial da escola, mesmo se outra for enviada', async () => {
    let created;
    const dao = {
        findByField: async () => [],
        create: async professor => { created = professor; return new ObjectId().toString(); },
    };
    const service = new ProfessorService(dao);
    await service.createProfessor({ identificador: '001234', nome: 'Professor Exemplo', role: 'AVALIADOR', senha: 'OutraSenha@123' });
    assert.equal(created.senha, 'univap');
    assert.equal(created.identificador, '001234');
    assert.equal(created.email,null);
    await assert.rejects(() => service.createProfessor({ identificador: 'P-02', nome: 'Professor Exemplo', role: 'AVALIADOR' }), error => error.error?.message.includes('apenas números'));
});

test('professor e administrador de teste só autenticam no modo local', async () => {
    const oldFlag = process.env.ENABLE_TEST_PROFESSOR;
    const oldEnv = process.env.NODE_ENV;
    const professor = { _id: new ObjectId(), nome: 'Professor Teste', email: 'professor-teste@feira.local', role: 'AVALIADOR', contaTeste: true, senha: await bcrypt.hash('univap', 4) };
    professor.identificador = '900000000001';
    const admin = { _id: new ObjectId(), nome: 'Administrador Teste', email: 'admin-teste@feira.local', role: 'ADMINISTRADOR', contaTeste: true, senha: await bcrypt.hash('Univap@2026!', 4) };
    const documents = [professor, admin];
    const dao = new ProfessorDAOMongo({ getCollection: async () => ({
        findOne: async filter => documents.find(doc => Object.entries(filter).every(([key, value]) => String(doc[key]) === String(value))) || null,
    }) });
    try {
        delete process.env.ENABLE_TEST_PROFESSOR;
        assert.equal(await dao.login(professor.identificador, 'univap'), null);
        assert.equal(await dao.login(admin.email, 'Univap@2026!'), null);
        process.env.ENABLE_TEST_PROFESSOR = 'true';
        process.env.NODE_ENV = 'production';
        assert.equal(await dao.login(professor.identificador, 'univap'), null);
        assert.equal(await dao.login(admin.email, 'Univap@2026!'), null);
        process.env.NODE_ENV = 'test';
        assert.equal((await dao.login(professor.identificador, 'univap')).id, professor._id.toString());
        assert.equal((await dao.login(admin.email, 'Univap@2026!')).id, admin._id.toString());
        assert.equal(await dao.login(admin.email, 'univap'), null);
    } finally {
        if (oldFlag === undefined) delete process.env.ENABLE_TEST_PROFESSOR; else process.env.ENABLE_TEST_PROFESSOR = oldFlag;
        if (oldEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnv;
    }
});

test('promover avaliador a administrador exige nova senha forte', async () => {
    const id = new ObjectId().toString();
    const atual = { id, identificador: '001234', nome: 'Professor Exemplo', email: 'professor@example.test', role: 'AVALIADOR' };
    const dao = {
        findById: async () => atual,
        findByField: async () => [atual],
        update: async () => true,
    };
    const service = new ProfessorService(dao);
    await assert.rejects(() => service.updateProfessor(id, { role: 'ADMINISTRADOR' }), /senha forte/);
    await assert.rejects(() => service.updateProfessor(id, { role: 'ADMINISTRADOR', senha: 'univap' }), error => error.error?.message.includes('8 caracteres'));
});

test('professor troca a própria senha com a senha atual e a antiga deixa de funcionar', async () => {
    const express = require('express');
    const JwtMiddleware = require('../src/api/middleware/JwtMiddleware');
    const ProfessorRouter = require('../src/api/routes/ProfessorRouter');
    const ProfessorController = require('../src/api/controllers/ProfessorController');
    const ProfessorMiddleware = require('../src/api/middleware/ProfessorMiddleware');
    const documents = [
        { _id: new ObjectId(), identificador: '0001', nome: 'Professor Um', role: 'AVALIADOR', senha: await bcrypt.hash('univap', 4), senhaPolitica: 'univap-v1', senhaInicialUnivap: true },
        { _id: new ObjectId(), identificador: '0002', nome: 'Professor Dois', role: 'AVALIADOR', senha: await bcrypt.hash('univap', 4), senhaPolitica: 'univap-v1', senhaInicialUnivap: true },
    ];
    const collection = {
        findOne: async filter => documents.find(doc => Object.entries(filter).every(([key, value]) => String(doc[key]) === String(value))) || null,
        updateOne: async (filter, update) => {
            const doc = await collection.findOne(filter);
            if (!doc) return { matchedCount: 0 };
            Object.assign(doc, update.$set);
            return { matchedCount: 1 };
        },
    };
    const service = new ProfessorService(new ProfessorDAOMongo({ getCollection: async () => collection }));
    const app = express();
    app.use(express.json());
    app.use('/api/v1/professores', new ProfessorRouter(new JwtMiddleware(), new ProfessorMiddleware(), new ProfessorController(service)).createRoutes());
    app.use((error, request, response, next) => response.status(error.httpCode || 500).json({ success: false, message: error.message }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1/professores`;
    const headers = { 'Content-Type': 'application/json' };
    try {
        const login = await fetch(`${base}/login`, { method: 'POST', headers, body: JSON.stringify({ professor: { identificacao: '0001', senha: 'univap' } }) });
        assert.equal(login.status, 200);
        const result = await login.json();
        assert.equal(result.data.professor.deveTrocarSenha, true);
        const auth = { ...headers, Authorization: `Bearer ${result.data.token}` };
        const change = body => fetch(`${base}/me/senha`, { method: 'PUT', headers: auth, body: JSON.stringify(body) });
        assert.equal((await change({ senhaAtual: 'errada', novaSenha: 'Nova!12345' })).status, 400);
        assert.equal((await change({ senhaAtual: 'univap', novaSenha: 'fraca' })).status, 400);
        assert.equal((await change({ senhaAtual: 'univap', novaSenha: 'Nova!12345' })).status, 200);
        assert.equal(documents[0].senhaPolitica, 'pessoal-v1');
        assert.equal(documents[0].senhaInicialUnivap, false);
        assert(await bcrypt.compare('univap', documents[1].senha));
        assert.equal((await fetch(`${base}/login`, { method: 'POST', headers, body: JSON.stringify({ professor: { identificacao: '0001', senha: 'univap' } }) })).status, 401);
        const newLogin = await fetch(`${base}/login`, { method: 'POST', headers, body: JSON.stringify({ professor: { identificacao: '0001', senha: 'Nova!12345' } }) });
        assert.equal(newLogin.status, 200);
        assert.equal((await newLogin.json()).data.professor.deveTrocarSenha, false);
        assert.equal((await fetch(`${base}/me/senha`, { method: 'PUT', headers, body: JSON.stringify({ senhaAtual: 'univap', novaSenha: 'Outra!12345' }) })).status, 401);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});
