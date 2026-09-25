const { test } = require('node:test');
const assert = require('node:assert/strict');
const ProjetoService = require('../src/api/services/ProjetoService');
const ProjetoRouter = require('../src/api/routes/ProjetoRouter');
const ProjetoController = require('../src/api/controllers/ProjetoController');
const ProjetoMiddleware = require('../src/api/middleware/ProjetoMiddleware');
const express = require('express');

function fixture() {
    let registro = {
        id: '507f1f77bcf86cd799439011', tema: 'Horta escolar', curso: 'INFORMÁTICA',
        representante: { nome: 'Ana Teste', matricula: '100', turma: '2INFO', email: 'ana@example.com' },
        integrantes: [{ nome: 'Bruno Teste', matricula: '101', turma: '2INFO', email: null }],
        equipamento: 'COMPUTADOR DA ESCOLA', outrosRecursos: 'Tomada', observacoes: 'Cadastro oficial',
        localizacao: 'Sala 10', alunoId: 'aluno-1', descricao: 'Texto original', imagens: [], links: {}
    };
    const dao = {
        findById: async id => id === registro.id ? registro : null,
        findByMatricula: async m => ['100', '101'].includes(m) ? [registro] : [],
        findByAlunoId: async () => registro,
        update: async model => {
            for (const key of ['tema','curso','representante','integrantes','equipamento','outrosRecursos','observacoes','localizacao','descricao','statusProjeto','imagens','links','tecnologias']) registro[key] = model[key];
        }
    };
    return { service: new ProjetoService(dao), get: () => structuredClone(registro) };
}

test('aluno atualiza a apresentação sem alterar os dados oficiais', async () => {
    const f = fixture(), before = f.get();
    const result = await f.service.updateProjeto(before.id, { projeto: {
        tema: 'Tema adulterado', curso: 'QUÍMICA', localizacao: 'Outro local',
        representante: { nome: 'Outra pessoa' }, integrantes: [], equipamento: 'EQUIPE TRAZ SEU COMPUTADOR',
        outrosRecursos: 'Outro', observacoes: 'Outro', descricao: 'Apresentação atualizada'
    } }, { role: 'ALUNO', idAluno: 'aluno-1', matricula: '100' });
    for (const key of ['tema','curso','localizacao','representante','integrantes','equipamento','outrosRecursos','observacoes']) {
        assert.deepEqual(result[key], before[key]);
    }
    assert.equal(result.descricao, 'Apresentação atualizada');
});

test('aluno não pode atualizar projeto de outra equipe', async () => {
    const f = fixture();
    await assert.rejects(f.service.updateProjeto(f.get().id, { projeto: { descricao: 'Outro' } }, {
        role: 'ALUNO', idAluno: 'outro', matricula: '999'
    }), error => error.httpCode === 403);
});

test('administrador ainda pode corrigir tema e localização oficiais', async () => {
    const f = fixture();
    const result = await f.service.updateProjeto(f.get().id, { projeto: {
        tema: 'Horta inteligente', localizacao: 'Sala 20'
    } }, { role: 'ADMINISTRADOR' });
    assert.equal(result.tema, 'Horta inteligente');
    assert.equal(result.localizacao, 'Sala 20');
});

test('QR da matrícula e QR do aluno apontam para o mesmo projeto', async () => {
    const f = fixture();
    const own = await f.service.gerarQrCodeMeuProjeto({ idAluno: 'aluno-1' }, 'http://escola.local:3000');
    const found = await f.service.gerarQrCodePorMatricula(' 101 ', 'http://escola.local:3000');
    assert.equal(own.urlPublica, found.urlPublica);
    assert.equal(found.projetoId, f.get().id);
    assert.match(found.qrCode, /^data:image\/png;base64,/);
});

test('QR exige endereço acessível e preserva o prefixo da instalação', async () => {
    const f = fixture();
    await assert.rejects(f.service.gerarQrCodeMeuProjeto({ idAluno: 'aluno-1' }, 'http://localhost:3000'), error => error.httpCode === 503);
    const generated = await f.service.gerarQrCodeMeuProjeto({ idAluno: 'aluno-1' }, 'https://escola.example/feira');
    assert.equal(generated.urlPublica, `https://escola.example/feira/projeto.html?id=${f.get().id}`);
});

test('matrícula vazia e desconhecida retornam erros claros', async () => {
    const f = fixture();
    await assert.rejects(f.service.gerarQrCodePorMatricula(' '), e => e.httpCode === 400);
    await assert.rejects(f.service.gerarQrCodePorMatricula('999'), e => e.httpCode === 404);
});

test('rota de busca de matrícula exige administrador', async t => {
    const f = fixture(), app = express();
    const oldPublicBaseUrl = process.env.PUBLIC_BASE_URL;
    process.env.PUBLIC_BASE_URL = 'https://escola.example/feira';
    t.after(() => {
        if (oldPublicBaseUrl === undefined) delete process.env.PUBLIC_BASE_URL;
        else process.env.PUBLIC_BASE_URL = oldPublicBaseUrl;
    });
    // Autenticação simulada apenas neste teste; o roteador e o controller são reais.
    const jwt = {
        validateToken(req, res, next) {
            if (!req.headers['x-test-role']) return res.sendStatus(401);
            req.usuario = { role: req.headers['x-test-role'] }; next();
        },
        permitirRoles: (...roles) => (req, res, next) => roles.includes(req.usuario.role) ? next() : res.sendStatus(403)
    };
    app.use('/api/v1/projetos', new ProjetoRouter(jwt, new ProjetoMiddleware(), new ProjetoController(f.service)).createRoutes());
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/api/v1/projetos/buscar-matricula?matricula=100`;
    assert.equal((await fetch(url)).status, 401);
    for (const role of ['ALUNO','AVALIADOR']) assert.equal((await fetch(url, { headers: { 'x-test-role': role } })).status, 403);
    const response = await fetch(url, { headers: { 'x-test-role': 'ADMINISTRADOR' } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.projetoId, f.get().id);
});
