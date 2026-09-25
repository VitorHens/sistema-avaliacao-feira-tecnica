const test = require('node:test');
const assert = require('node:assert/strict');
const { importarProjetosIncorporados } = require('../src/api/database/ImportarCadastros');
const dataset = require('./fixtures/projetos.exemplo.json');

test('carga privada cria projetos uma vez e preserva apresentação editada', async () => {
  const docs = new Map();
  const collection = {
    createIndex: async () => {},
    findOne: async query => docs.get(query.importKey) || null,
    updateOne: async (query, update) => {
      if (update.$setOnInsert) {
        docs.set(query.importKey, { _id: query.importKey, ...update.$setOnInsert });
        return { upsertedCount: 1 };
      }
      const existing = docs.get(query._id);
      Object.assign(existing, update.$set);
      return { matchedCount: 1 };
    },
  };
  const db = { getCollection: async () => collection };
  const first = await importarProjetosIncorporados(db, dataset);
  assert.equal(first.criados, dataset.projects.length);
  assert.equal(docs.size, dataset.projects.length);
  const key = dataset.projects[0].importKey;
  docs.get(key).descricao = 'Apresentação escrita pela equipe';
  docs.get(key).importSourceSha256 = 'versao-anterior';
  const second = await importarProjetosIncorporados(db, dataset);
  assert.equal(second.criados, 0);
  assert.equal(second.atualizados, 1);
  assert.equal(docs.get(key).descricao, 'Apresentação escrita pela equipe');
  assert.equal(docs.size, dataset.projects.length);
});

test('projeto antigo recebe chave da planilha sem perder apresentação', async () => {
  const originalProjects = dataset.projects;
  const project = originalProjects[0];
  const legacy = {
    _id: 'projeto-antigo', tema: project.tema,
    representante: {matricula:project.representante.matricula},
    descricao: 'Texto escrito pela equipe', imagens: ['foto-da-equipe.jpg'],
  };
  dataset.projects = [project];
  const collection = {
    createIndex: async () => {},
    findOne: async query => {
      if (query.importKey === project.importKey) return legacy.importKey ? legacy : null;
      if (query.tema === project.tema && query['representante.matricula'] === project.representante.matricula) return legacy;
      return null;
    },
    updateOne: async (query, update) => {
      assert.equal(query._id, legacy._id);
      Object.assign(legacy, update.$set);
      return {matchedCount:1};
    },
  };
  try {
    const report = await importarProjetosIncorporados({getCollection:async()=>collection}, dataset);
    assert.equal(report.criados, 0);
    assert.equal(legacy.importKey, project.importKey);
    assert.equal(legacy.descricao, 'Texto escrito pela equipe');
    assert.deepEqual(legacy.imagens, ['foto-da-equipe.jpg']);
  } finally {
    dataset.projects = originalProjects;
  }
});
