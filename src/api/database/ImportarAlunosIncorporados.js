const bcrypt = require('bcrypt');
const fs = require('node:fs');
const path = require('node:path');
const { carregarProjetosPrivados } = require('./PrivateDataset');

const limpar = valor => String(valor || '').trim();
const comparar = valor => limpar(valor).replace(/\s+/g, ' ').toLocaleUpperCase('pt-BR');

// Apenas matrículas inequívocas ganham acesso automático. O relatório fica em
// data/ (fora do pacote público) para a organização resolver as pendências.
module.exports = async function importarAlunosIncorporados(database, projects, options = {}) {
  projects ||= carregarProjetosPrivados().projects;
  const alunos = await database.getCollection('alunos');
  const projetos = await database.getCollection('projetos');
  const porMatricula = new Map();
  const report = { contasCriadas: 0, contasExistentes: 0, vinculosCriados: 0, pendencias: [] };

  for (const project of projects) {
    for (const person of [project.representante, ...(project.integrantes || [])]) {
      if (!person) continue;
      const matricula = limpar(person.matricula);
      const turma = comparar(person.turma);
      if (!/^\d{4,15}$/.test(matricula) || !turma) {
        report.pendencias.push({ tipo: 'matricula_ou_turma_ausente', projeto: project.importKey, nome: limpar(person.nome) });
        continue;
      }
      const entries = porMatricula.get(matricula) || [];
      entries.push({ project, person, turma });
      porMatricula.set(matricula, entries);
    }
  }

  const hashes = new Map();
  for (const [matricula, entries] of porMatricula) {
    if (entries.length !== 1) {
      report.pendencias.push({ tipo: 'matricula_em_mais_de_um_registro', matricula, projetos: entries.map(item => item.project.importKey) });
      continue;
    }
    const { project, person, turma } = entries[0];
    const projeto = await projetos.findOne({ importKey: project.importKey });
    if (!projeto) {
      report.pendencias.push({ tipo: 'projeto_nao_encontrado', matricula, projeto: project.importKey });
      continue;
    }
    let aluno = await alunos.findOne({ matricula });
    const nome = limpar(person.nome);
    if (aluno) {
      if (comparar(aluno.nome) !== comparar(nome) || comparar(aluno.turma) !== turma) {
        report.pendencias.push({ tipo: 'conta_existente_divergente', matricula, projeto: project.importKey });
        continue;
      }
      report.contasExistentes++;
    } else {
      const email = limpar(person.email).toLowerCase();
      if (email && await alunos.findOne({ email })) {
        report.pendencias.push({ tipo: 'email_ja_utilizado', matricula, projeto: project.importKey });
        continue;
      }
      if (!hashes.has(turma)) hashes.set(turma, await bcrypt.hash(turma, 12));
      const novo = { nome, matricula, turma, curso: project.curso,
        senha: hashes.get(turma), senhaVersao: 'turma-2026-v1',
        role: 'ALUNO', origemCadastro: 'csv-incorporado-2026', dataCadastro: new Date() };
      if (email) novo.email = email;
      const result = await alunos.updateOne({ matricula }, { $setOnInsert: novo }, { upsert: true });
      aluno = await alunos.findOne({ matricula });
      if (result.upsertedCount) report.contasCriadas++;
      else report.contasExistentes++;
    }
    const ids = projeto.alunosAutorizados || [];
    const alunoId = aluno._id.toString();
    if (!ids.includes(alunoId)) {
      await projetos.updateOne({ _id: projeto._id }, { $set: { alunosAutorizados: [...ids, alunoId] } });
      report.vinculosCriados++;
    }
  }

  if (options.writeReport !== false) {
    const file = path.resolve(__dirname, '../../../data/pendencias-importacao.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ geradoEm: new Date().toISOString(), ...report }, null, 2), { mode: 0o600 });
  }
  return report;
};
