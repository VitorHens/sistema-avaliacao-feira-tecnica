const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseCSV } = require('../src/public/js/csv');

const source = process.argv[2];
if (!source) throw new Error('Informe o caminho do CSV.');
const clean = value => String(value || '').trim().replace(/\s+/g, ' ');
const rows = parseCSV(fs.readFileSync(source, 'utf8'));
const projects = rows.map((row, index) => {
  const people = [];
  for (let n = 1; n <= 10; n++) {
    const first = n === 1;
    const nome = clean(row[first ? 'nome completo aluno 1 (representante da equipe)' : `nome completo aluno ${n}`]);
    const matricula = clean(row[first ? 'matrícula do aluno 1 - representante da equipe' : `matrícula aluno ${n}`]);
    if (!nome && !matricula) continue;
    const pessoa = { nome, matricula: /^\d{3,15}$/.test(matricula) ? matricula : '', turma: clean(row[first ? 'turma aluno 1 (representante da equipe)' : `turma aluno ${n}`]).toUpperCase() };
    if (first) {
      const email = clean(row['e-mail do aluno representante da equipe']).toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) pessoa.email = email;
    }
    people.push(pessoa);
  }
  return {
    importKey: `cadastro-feira-2026:registro:${index + 2}`,
    sourceRow: index + 2,
    tema: clean(row['tema do projeto da feira']),
    curso: clean(row.curso),
    representante: people[0] || null,
    integrantes: people.slice(1),
    equipamento: clean(row['equipamento que usará']) || 'EQUIPE TRAZ SEU COMPUTADOR',
    outrosRecursos: clean(row['o que a equipe precisa além de mesas (bancadas) e cadeiras? (não aplicada aos 3ºs anos)']) || null,
    observacoes: clean(row['observações']) || null,
    statusProjeto: 'PLANEJAMENTO', imagens: [], tecnologias: [], links: {},
  };
});
const output = path.resolve(__dirname, '../data/projetos-feira-2026.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify({
  sourceSha256: crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),
  projects,
}, null, 2));
console.log(`${projects.length} projetos preparados no arquivo privado ${output}`);
