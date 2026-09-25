// Preparação local: dados e hashes ficam fora de src/public.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { parseCSV } = require('../src/public/js/csv');
const clean = value => String(value || '').trim().replace(/\s+/g, ' ');
const absent = value => !clean(value) || /^(\.+|nulo|não tem|nao tem|nenhum|nenhuma|-+)$/i.test(clean(value));
const emailOK = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function prepare(source, output, privateOutput) {
  if (fs.existsSync(output) || fs.existsSync(privateOutput)) throw new Error('Destino já existe. Não sobrescreva senhas emitidas; escolha novos caminhos.');
  const rows = parseCSV(fs.readFileSync(source, 'utf8'));
  const issues = [], occurrences = new Map(), emailOwners = new Map();
  const projects = rows.map((r, i) => {
    const sourceRow = i + 2, people = [];
    for (let n = 1; n <= 10; n++) {
      const first = n === 1;
      const nome = clean(r[first ? 'nome completo aluno 1 (representante da equipe)' : `nome completo aluno ${n}`]);
      const rawId = clean(r[first ? 'matrícula do aluno 1 - representante da equipe' : `matrícula aluno ${n}`]);
      if (absent(nome) && absent(rawId)) continue;
      const matricula = /^\d{3,15}$/.test(rawId) ? rawId : '';
      const turma = clean(r[first ? 'turma aluno 1 (representante da equipe)' : `turma aluno ${n}`]).toUpperCase();
      const rawEmail = first ? clean(r['e-mail do aluno representante da equipe']).toLowerCase() : '';
      const email = emailOK(rawEmail) ? rawEmail : '';
      const person = { nome, matricula, turma, ...(email ? {email} : {}) };
      people.push(person);
      const pending = [];
      if (!matricula) pending.push('Matrícula ausente ou inválida');
      if (absent(nome) || nome.length < 3) pending.push('Nome ausente ou inválido');
      if (!turma) pending.push('Turma ausente');
      if (first && !email) issues.push({registro:sourceRow,aluno:n,nome,motivo:'E-mail ausente ou inválido; acesso somente por matrícula',valor:rawEmail});
      if (pending.length) issues.push({registro:sourceRow,aluno:n,nome,motivo:pending.join('; '),valor:rawId});
      if (matricula) {
        const item = { person, sourceRow, member:n, curso:clean(r.curso), eligible:pending.length===0 };
        occurrences.set(matricula, [...(occurrences.get(matricula)||[]), item]);
        if (email) emailOwners.set(email, new Set([...(emailOwners.get(email)||[]),matricula]));
      }
    }
    return {
      importKey:`cadastro-feira-2026:registro:${sourceRow}`,
      sourceRow,
      tema:clean(r['tema do projeto da feira']), curso:clean(r.curso),
      representante:people[0], integrantes:people.slice(1),
      equipamento:clean(r['equipamento que usará']) || 'EQUIPE TRAZ SEU COMPUTADOR',
      outrosRecursos:clean(r['o que a equipe precisa além de mesas (bancadas) e cadeiras? (não aplicada aos 3ºs anos)']) || null,
      observacoes:clean(r['observações']) || null,
      statusProjeto:'PLANEJAMENTO', imagens:[], tecnologias:[], links:{},
    };
  });
  const accounts = [], credentials = [];
  let done = 0;
  // Matrículas em mais de um registro ficam pendentes, sem escolher um dono arbitrário.
  for (const [matricula, items] of occurrences) {
    if (items.length > 1) {
      for (const item of items) issues.push({registro:item.sourceRow,aluno:item.member,nome:item.person.nome,motivo:'Matrícula repetida: acesso pendente de conferência',valor:matricula,registros:items.map(x=>x.sourceRow)});
      continue;
    }
    const item=items[0]; if (!item.eligible) continue;
    const {person}=item;
    const account={...person,curso:item.curso,role:'ALUNO',importKey:`cadastro-feira-2026:aluno:${matricula}`,projetoImportKey:`cadastro-feira-2026:registro:${item.sourceRow}`};
    if (person.email && emailOwners.get(person.email).size>1) {
      delete account.email;
      issues.push({registro:item.sourceRow,aluno:item.member,nome:person.nome,motivo:'E-mail repetido; acesso somente por matrícula',valor:person.email});
    }
    const password=person.turma;
    account.senha=await bcrypt.hash(password,10);
    account.senhaVersao='turma-2026-v1';
    accounts.push(account);
    credentials.push({nome:person.nome,matricula,email:account.email||'',turma:person.turma,registro:item.sourceRow,senha:password});
    if(++done%100===0) console.log(`${done} acessos preparados`);
  }
  const summary={registros:rows.length,projetos:projects.length,contas:accounts.length,ocorrenciasPendentes:issues.length};
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify({version:1,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),summary,projects,accounts},null,2));
  fs.mkdirSync(path.dirname(privateOutput),{recursive:true});
  const table = (headers, rows) => '<table><thead><tr>'+headers.map(h=>`<th>${escape(h)}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>`<td>${escape(v)}</td>`).join('')+'</tr>').join('')+'</tbody></table>';
  fs.writeFileSync(privateOutput,`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Acessos privados — Feira 2026</title><style>body{font:14px Arial;margin:32px;color:#101f32}table{border-collapse:collapse;width:100%;margin-bottom:40px}td,th{padding:10px;border:1px solid #ccd4df;text-align:left}th{background:#edf1f5}td{overflow-wrap:anywhere}h1{font-size:26px}</style><h1>Acessos privados — Feira Técnica 2026</h1><p>Login: matrícula ou e-mail confirmado. A senha inicial é exatamente a turma do aluno, em letras maiúsculas, como exibida abaixo (ex.: 2J). A senha é do sistema da feira, não do Gmail.</p><p>${projects.length} registros de projetos · ${accounts.length} contas preparadas. Cada registro corresponde à ordem das respostas do CSV, contando o cabeçalho como 1.</p><p>Contas importadas anteriormente por esta carga recebem a nova senha uma vez na próxima inicialização; contas de outra origem não são alteradas.</p>${table(['Nome','Matrícula','E-mail para login','Turma','Registro','Senha inicial'],credentials.map(c=>[c.nome,c.matricula,c.email||'Não informado — use matrícula',c.turma,c.registro,c.senha]))}<h2>Pendências para conferência</h2><p>Nenhuma matrícula ou e-mail foi inventado. Registros com matrícula repetida não receberam nova conta. Os projetos foram preservados.</p>${table(['Registro','Aluno','Nome','Motivo','Valor informado','Registros relacionados'],issues.map(i=>[i.registro,i.aluno,i.nome,i.motivo,i.valor,(i.registros||[]).join(', ')]))}</html>`);
  fs.writeFileSync(path.join(path.dirname(output),'pendencias.json'),JSON.stringify(issues,null,2));
  console.log(JSON.stringify(summary));
}
if(require.main===module) prepare(...process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={prepare};
