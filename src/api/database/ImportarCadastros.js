const fs = require('node:fs');
const path = require('node:path');
const sourceFile = path.resolve(__dirname, '../../../data/cadastro-feira-2026.json');
const { carregarProjetosPrivados } = require('./PrivateDataset');

// Importação repetível: não substitui senhas nem a apresentação editada pelos alunos.
async function importarCadastros(database, dataset) {
  const alunos = await database.getCollection('alunos');
  const projetos = await database.getCollection('projetos');
  const permitted = new Map();
  const report = {projetosCriados:0,projetosExistentes:0,contasCriadas:0,contasExistentes:0,conflitos:[]};
  await projetos.createIndex({importKey:1},{unique:true,partialFilterExpression:{importKey:{$type:'string'}}});
  for (const account of dataset.accounts) {
    let found = await alunos.findOne({matricula:account.matricula});
    if (found) {
      // Reutiliza apenas contas já emitidas por esta carga; outras exigem conferência.
      if(found.importKey!==account.importKey) {
        report.conflitos.push({tipo:'matricula_existente',matricula:account.matricula,projeto:account.projetoImportKey});
        continue;
      }
      // A troca para a senha inicial por turma é aplicada uma única vez às contas desta carga.
      // Reimportações posteriores não alteram senhas que o aluno venha a trocar.
      if (account.senhaVersao && !found.senhaVersao) {
        await alunos.updateOne({_id:found._id},{$set:{senha:account.senha,senhaVersao:account.senhaVersao}});
      }
      report.contasExistentes++;
    } else {
      if(account.email && await alunos.findOne({email:account.email})) {
        report.conflitos.push({tipo:'email_existente',matricula:account.matricula,projeto:account.projetoImportKey});
        continue;
      }
      const result=await alunos.updateOne({matricula:account.matricula},{$setOnInsert:{...account,dataCadastro:new Date()}},{upsert:true});
      found=await alunos.findOne({matricula:account.matricula});
      if(found.importKey!==account.importKey) continue;
      if(result.upsertedCount) report.contasCriadas++; else report.contasExistentes++;
    }
    const ids=permitted.get(account.projetoImportKey)||[];
    ids.push(found._id.toString()); permitted.set(account.projetoImportKey,ids);
  }
  for(const project of dataset.projects) {
    let found=await projetos.findOne({importKey:project.importKey});
    if(!found) found=await projetos.findOne({tema:project.tema,'representante.matricula':project.representante?.matricula,importKey:{$exists:false}});
    if(found) {
      const autorizados = [...new Set([...(found.alunosAutorizados || []), ...(permitted.get(project.importKey) || [])])];
      if (autorizados.length !== (found.alunosAutorizados || []).length) {
        await projetos.updateOne({_id:found._id},{$set:{alunosAutorizados:autorizados}});
      }
      report.projetosExistentes++;
      continue;
    }
    const result=await projetos.updateOne({importKey:project.importKey},{$setOnInsert:{...project,alunosAutorizados:permitted.get(project.importKey)||[],dataCadastro:new Date()}},{upsert:true});
    if(result.upsertedCount)report.projetosCriados++;else report.projetosExistentes++;
  }
  return report;
}
async function carregarCadastros(database) {
  if(!fs.existsSync(sourceFile))return false;
  const dataset=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
  const report=await importarCadastros(database,dataset);
  fs.writeFileSync(path.join(path.dirname(sourceFile),'resultado-importacao.json'),JSON.stringify(report,null,2));
  console.log(`Cadastro da feira: ${report.projetosCriados} projetos novos, ${report.contasCriadas} contas novas, ${report.conflitos.length} conflitos. Relatório em data/resultado-importacao.json.`);
  return true;
}
async function importarProjetosIncorporados(database, dataset = carregarProjetosPrivados()) {
  const projetos = await database.getCollection('projetos');
  await projetos.createIndex({importKey:1},{unique:true,partialFilterExpression:{importKey:{$type:'string'}}});
  const report = {criados:0,atualizados:0,existentes:0};
  for (const project of dataset.projects) {
    const found = await projetos.findOne({importKey:project.importKey});
    if (found) {
      if (dataset.sourceSha256 && found.importSourceSha256 === dataset.sourceSha256) { report.existentes++; continue; }
      const {sourceRow, ...campos} = project;
      await projetos.updateOne({_id:found._id},{$set:{...campos,sourceRow,importSourceSha256:dataset.sourceSha256 || null}});
      report.atualizados++;
      continue;
    }
    const legacy = await projetos.findOne({tema:project.tema,'representante.matricula':project.representante?.matricula,importKey:{$exists:false}});
    if (legacy) {
      // O projeto antigo já existe, mas os alunos procuram a chave da planilha.
      // Vincule-o sem substituir a apresentação que a equipe editou.
      await projetos.updateOne(
        {_id:legacy._id,importKey:{$exists:false}},
        {$set:{importKey:project.importKey,importSourceSha256:dataset.sourceSha256 || null,sourceRow:project.sourceRow}}
      );
      report.existentes++;
      continue;
    }
    const result = await projetos.updateOne({importKey:project.importKey},{$setOnInsert:{...project,importSourceSha256:dataset.sourceSha256 || null,alunosAutorizados:[],dataCadastro:new Date()}},{upsert:true});
    if (result.upsertedCount) report.criados++; else report.existentes++;
  }
  return report;
}
module.exports={importarCadastros,carregarCadastros,importarProjetosIncorporados};
