const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { ObjectId } = require('mongodb');
const AvaliacaoController = require('../src/api/controllers/AvaliacaoController');
const AvaliacaoService = require('../src/api/services/AvaliacaoService');
const visitorRanking = require('../src/api/services/VisitorRanking');
const importarAlunos = require('../src/api/database/ImportarAlunosIncorporados');
const createRouter = require('../src/api/routes/VisitanteRouter');
const codigos = require('../src/api/routes/CodigosVisitantes');
const horario = require('../src/api/routes/HorarioAvaliacaoVisitantes');

test('professores com o mesmo nome não acessam a avaliação um do outro', async () => {
  const avaliacao = { id: '1', avaliador: 'Professor Souza', avaliadorId: '507f1f77bcf86cd799439011' };
  const controller = new AvaliacaoController({ findById: async () => avaliacao });
  const result = await new Promise(resolve => {
    const response = { status(code) { this.code = code; return this; }, json() { resolve(this.code); } };
    controller.show({ params: { idAvaliacao: '1' }, usuario: { role: 'AVALIADOR', nome: 'Professor Souza', idProfessor: '507f1f77bcf86cd799439012' } }, response, error => resolve(error.httpCode));
  });
  assert.equal(result, 403);
});

test('edição de avaliação não muda o projeto e a média real define a classificação', async () => {
  const id1 = '507f1f77bcf86cd799439011';
  const id2 = '507f1f77bcf86cd799439012';
  let updates = 0;
  const service = new AvaliacaoService({
    findById: async () => ({ projeto: { id: id1 }, avaliador: 'Professora', avaliadorId: id1 }),
    update: async () => { updates++; },
    findAll: async () => [
      { projeto: { id: id1, tema: 'Maior média real', curso: 'Química' }, notaFinal: 4.804, status: 'Classificado' },
      { projeto: { id: id2, tema: 'Menor média real', curso: 'Informática' }, notaFinal: 4.801, status: 'Classificado' },
      { projeto: { id: id2, tema: 'Menor média real', curso: 'Informática' }, notaFinal: 4.801, status: 'Classificado' },
    ],
  }, {});
  await assert.rejects(service.updateAvaliacao('1', { avaliacao: { projetoId: id2 } }), /trocar o projeto/);
  assert.equal(updates, 0);
  const ranking = await service.rankingPublico();
  assert.equal(ranking.ranking[0].tema, 'Maior média real');
  assert.equal(ranking.rankingPorCurso.Informática[0].posicao, 2);
  const visitor = await visitorRanking({ aggregate: () => ({ toArray: async () => [
    { _id: id1, media: 4.804, avaliacoes: 1 }, { _id: id2, media: 4.801, avaliacoes: 2 },
  ] }) }, { find: () => ({ toArray: async () => [
    { _id: new ObjectId(id1), tema: 'Maior média real', curso: 'Química' },
    { _id: new ObjectId(id2), tema: 'Menor média real', curso: 'Informática' },
  ] }) });
  assert.equal(visitor.ranking[0].tema, 'Maior média real');
  assert.equal(visitor.rankingPorCurso.Informática[0].posicao, 2);
});

test('importação automática cria acesso somente para matrícula inequívoca e vincula o projeto', async () => {
  const projects = new Map();
  const accounts = new Map();
  const projectDoc = { _id: new ObjectId(), importKey: 'project-1', alunosAutorizados: [] };
  projects.set('project-1', projectDoc);
  const db = { getCollection: async name => name === 'alunos' ? {
    findOne: async q => accounts.get(q.matricula) || null,
    updateOne: async (q, u) => { accounts.set(q.matricula, { _id: new ObjectId(), ...u.$setOnInsert }); return { upsertedCount: 1 }; },
  } : {
    findOne: async q => projects.get(q.importKey) || null,
    updateOne: async (q, u) => { projectDoc.alunosAutorizados = u.$set.alunosAutorizados; },
  } };
  const rows = [
    { importKey: 'project-1', curso: 'Informática', representante: { nome: 'Ana', matricula: '90000001', turma: '2A' }, integrantes: [{ nome: 'Sem matrícula', turma: '2A' }] },
    { importKey: 'project-2', curso: 'Informática', representante: { nome: 'Outra', matricula: '90000002', turma: '2B' }, integrantes: [] },
    { importKey: 'project-3', curso: 'Química', representante: { nome: 'Outra pessoa', matricula: '90000002', turma: '3Q' }, integrantes: [] },
  ];
  const first = await importarAlunos(db, rows, { writeReport: false });
  assert.equal(first.contasCriadas, 1);
  assert.equal(first.vinculosCriados, 1);
  assert.equal(accounts.has('90000002'), false);
  assert.equal(projectDoc.alunosAutorizados[0], accounts.get('90000001')._id.toString());
  assert(first.pendencias.some(p => p.tipo === 'matricula_em_mais_de_um_registro'));
  const second = await importarAlunos(db, rows, { writeReport: false });
  assert.equal(second.contasCriadas, 0);
  assert.equal(second.vinculosCriados, 0);
});

test('horário editável rejeita períodos sobrepostos', () => {
  assert.throws(() => horario.validar({ data: '2026-10-02', periodos: [
    { inicio: '07:00', fim: '12:00' }, { inicio: '11:00', fim: '14:00' },
  ] }), /sobrepor/);
  assert.equal(horario(new Date('2026-10-03T15:00:00Z'), { data: '2026-10-03', periodos: [{ inicio: '11:00', fim: '13:00' }], exigirCodigo: true }).aberta, true);
});

test('código individual identifica o mesmo visitante após limpar o cookie', async () => {
  const projectId = '507f1f77bcf86cd799439011';
  const code = codigos.gerar();
  const key = codigos.hash(code);
  const rows = [];
  const db = { getCollection: async name => name === 'codigosVisitantes' ? {
    findOne: async q => q.hash === key ? { hash: key } : null,
  } : name === 'projetos' ? {
    findOne: async () => ({ _id: projectId }),
  } : {
    createIndex: async () => {},
    findOne: async q => rows.find(r => r.projetoId === q.projetoId && r.visitante === q.visitante),
    aggregate: () => ({ toArray: async () => rows.length ? [{ total: rows.length, media: rows[0].nota }] : [] }),
    updateOne: async (q, update) => { const row = rows.find(r => r.projetoId === q.projetoId && r.visitante === q.visitante); if (row) Object.assign(row, update.$set); else rows.push({ ...q, ...update.$set }); },
  } };
  const app = express(); app.use(express.json());
  app.use('/votes', await createRouter(db, { schedule: () => ({ aberta: true, exigirCodigo: true, mensagem: '' }) }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/votes/${projectId}`;
  try {
    const vote = (codigoVisitante, cookie) => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify({ nota: 5, codigoVisitante }) });
    assert.equal((await vote('INVÁLIDO')).status, 400);
    const first = await vote(code);
    assert.equal(first.status, 200);
    const cookie = first.headers.get('set-cookie').split(';')[0];
    assert.equal(rows.length, 1);
    const again = await vote(code);
    assert.equal(again.status, 200);
    assert.equal(rows.length, 1);
    const summary = await fetch(url, { headers: { cookie } });
    assert.equal((await summary.json()).data.codigoRegistrado, true);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
