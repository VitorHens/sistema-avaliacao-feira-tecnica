const test=require('node:test');
const assert=require('node:assert/strict');
const bcrypt=require('bcrypt');
const {ObjectId}=require('mongodb');
const {importarCadastros}=require('../src/api/database/ImportarCadastros');
const AlunoDAO=require('../src/api/dao/AlunoDAOMongo');
const ProjetoDAO=require('../src/api/dao/ProjetoDAOMongo');
const ProjetoService=require('../src/api/services/ProjetoService');
// Amostra fictícia: testes nunca dependem da planilha privada dos alunos.
const data={
  accounts:[
    {importKey:'aluno-ficticio-1',projetoImportKey:'projeto-ficticio-1',nome:'Aluno Fictício',matricula:'90000001',turma:'2A',email:'aluno@example.test',senha:bcrypt.hashSync('2A',10),senhaVersao:'turma-2026-v1'},
    {importKey:'aluno-ficticio-2',projetoImportKey:'projeto-ficticio-2',nome:'Outra Pessoa',matricula:'90000002',turma:'2B',senha:bcrypt.hashSync('2B',10),senhaVersao:'turma-2026-v1'},
  ],
  projects:[
    {importKey:'projeto-ficticio-1',tema:'Projeto fictício 1',representante:{nome:'Aluno Fictício',matricula:'90000001',turma:'2A'}},
    {importKey:'projeto-ficticio-2',tema:'Projeto fictício 2',representante:{nome:'Outra Pessoa',matricula:'90000002',turma:'2B'}},
  ],
};

function matches(doc,query){return Object.entries(query).every(([key,value])=>{
  if(key==='$or')return value.some(q=>matches(doc,q));
  const actual=key.split('.').reduce((o,k)=>o?.[k],doc);
  if(value && typeof value==='object' && '$exists' in value)return (actual!==undefined)===value.$exists;
  return Array.isArray(actual)?actual.includes(value):String(actual)===String(value);
});}
function database(){const collections={};return {collections,getCollection:async name=>collections[name] ||= {
  docs:[],createIndex:async()=>{},
  async findOne(q){return this.docs.find(d=>matches(d,q))||null;},
  async updateOne(q,update,options={}){let doc=await this.findOne(q);let inserted=0;if(!doc&&options.upsert){doc={_id:new ObjectId(),...update.$setOnInsert};this.docs.push(doc);inserted=1;}if(doc)Object.assign(doc,update.$set||{});return {matchedCount:doc?1:0,upsertedCount:inserted};},
  async insertOne(doc){const d={_id:new ObjectId(),...doc};this.docs.push(d);return {insertedId:d._id};}
}};}

test('carga privada é repetível e preserva senhas e apresentações editadas',async()=>{
  const db=database();const first=await importarCadastros(db,data);
  assert.equal(first.projetosCriados,2);assert.equal(first.contasCriadas,2);
  const aluno=db.collections.alunos.docs[0],project=db.collections.projetos.docs.find(p=>p.importKey===aluno.projetoImportKey);
  assert(project.alunosAutorizados.includes(aluno._id.toString()));
  aluno.senha='senha_alterada';project.descricao='Apresentação editada';
  const second=await importarCadastros(db,data);
  assert.equal(second.projetosCriados,0);assert.equal(second.contasCriadas,0);
  assert.equal(aluno.senha,'senha_alterada');assert.equal(project.descricao,'Apresentação editada');
  assert.equal(new Set(data.accounts.map(a=>a.matricula)).size,2);
  assert(data.accounts.every(a=>/^\$2[aby]\$10\$/.test(a.senha)));
  assert(data.accounts.every(a=>a.senhaVersao==='turma-2026-v1'));
  assert(await bcrypt.compare(aluno.turma,data.accounts[0].senha));
  assert(data.accounts.some(a=>!a.email));
});

test('conta desta carga recebe a senha da turma uma vez, sem substituir alterações futuras',async()=>{
  const db=database(),account=data.accounts[0],alunos=await db.getCollection('alunos');
  await alunos.insertOne({matricula:account.matricula,importKey:account.importKey,senha:'hash-anterior'});
  await importarCadastros(db,{accounts:[account],projects:[]});
  assert.equal(alunos.docs[0].senha,account.senha);
  assert.equal(alunos.docs[0].senhaVersao,'turma-2026-v1');
  alunos.docs[0].senha='alterada-pelo-aluno';
  await importarCadastros(db,{accounts:[account],projects:[]});
  assert.equal(alunos.docs[0].senha,'alterada-pelo-aluno');
});

test('conflito com conta existente não troca senha nem concede acesso',async()=>{
  const db=database(),account=data.accounts[0],project=data.projects.find(p=>p.importKey===account.projetoImportKey);
  const alunos=await db.getCollection('alunos');await alunos.insertOne({matricula:account.matricula,nome:'Outra pessoa',senha:'inalterada'});
  const result=await importarCadastros(db,{accounts:[account],projects:[project]});
  assert.equal(result.conflitos.length,1);assert.equal(alunos.docs[0].senha,'inalterada');
  assert.deepEqual(db.collections.projetos.docs[0].alunosAutorizados,[]);
});

test('login aceita matrícula ou e-mail normalizado e rejeita senha errada',async()=>{
  const db=database(),collection=await db.getCollection('alunos');
  await collection.insertOne({nome:'Aluno teste',matricula:'001234',email:'aluno@example.test',senha:await bcrypt.hash('Teste!12345',10)});
  const dao=new AlunoDAO(db);
  assert((await dao.login(' 001234 ','Teste!12345')).id);
  assert((await dao.login('ALUNO@EXAMPLE.TEST','Teste!12345')).id);
  assert.equal(await dao.login('001234','errada'),null);
  assert.equal((await dao.login('001234','Teste!12345')).senha,undefined);
  assert.equal(await dao.changePassword(collection.docs[0]._id.toString(),'errada','Nova!12345'),false);
  assert.equal(await dao.changePassword(collection.docs[0]._id.toString(),'Teste!12345','Nova!12345'),true);
  assert.equal(await dao.login('001234','Teste!12345'),null);
  assert((await dao.login('001234','Nova!12345')).id);
});

test('matrícula ambígua não permite acesso e apresentação pode ser editada com cadastro pendente',async()=>{
  const db=database(),col=await db.getCollection('projetos');
  const allowed=new ObjectId().toString(),other=new ObjectId().toString();
  const result=await col.insertOne({tema:'Projeto com pendência',curso:'QUÍMICA',representante:{nome:'Aluno',matricula:'1234',turma:'3Q'},integrantes:[{nome:'Colega',matricula:'',turma:''}],alunosAutorizados:[allowed]});
  const dao=new ProjetoDAO(db),service=new ProjetoService(dao);
  assert.equal(await dao.findByAlunoId(other,'1234'),null);
  const own=await dao.findByAlunoId(allowed,'1234');assert.equal(own.id,result.insertedId.toString());
  await assert.rejects(service.updateProjeto(own.id,{projeto:{descricao:'Invasão'}},{idAluno:other,matricula:'1234',role:'ALUNO'}),/próprio projeto/);
  const updated=await service.updateProjeto(own.id,{projeto:{descricao:'Texto novo',tema:'Não permitido',alunosAutorizados:[other]}},{idAluno:allowed,role:'ALUNO'});
  assert.equal(updated.descricao,'Texto novo');assert.equal(updated.tema,'Projeto com pendência');assert.deepEqual(updated.alunosAutorizados,[allowed]);
});

test('login HTTP emite sessão e abre somente o projeto autorizado',async()=>{
  const express=require('express');
  const Jwt=require('../src/api/middleware/JwtMiddleware');
  const AlunoRouter=require('../src/api/routes/AlunoRouter');
  const AlunoController=require('../src/api/controllers/AlunoController');
  const AlunoService=require('../src/api/services/AlunoService');
  const AlunoMiddleware=require('../src/api/middleware/AlunoMiddleware');
  const ProjetoController=require('../src/api/controllers/ProjetoController');
  const db=database(),col=await db.getCollection('alunos');
  const result=await col.insertOne({nome:'Aluno HTTP',matricula:'009999',email:'http@example.test',senha:await bcrypt.hash('Http!12345',10),turma:'3F',curso:'INFORMÁTICA'});
  const projetos=await db.getCollection('projetos');await projetos.insertOne({tema:'Projeto HTTP',alunosAutorizados:[result.insertedId.toString()],representante:{nome:'Aluno HTTP',matricula:'009999',turma:'3F'},integrantes:[]});
  const app=express(),jwt=new Jwt();app.use(express.json());
  app.use('/api/v1/alunos',new AlunoRouter(jwt,new AlunoMiddleware(),new AlunoController(new AlunoService(new AlunoDAO(db)))).createRoutes());
  app.get('/api/v1/projetos/meu',jwt.validateToken,jwt.permitirRoles('ALUNO'),new ProjetoController(new ProjetoService(new ProjetoDAO(db))).meu);
  app.use((e,req,res,next)=>res.status(e.httpCode||500).json({success:false}));
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {
    const response=await fetch(base+'/api/v1/alunos/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({aluno:{identificacao:'009999',senha:'Http!12345'}})});
    assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/HttpOnly/);
    const login=await response.json();assert.equal(login.data.aluno.senha,undefined);
    const own=await fetch(base+'/api/v1/projetos/meu',{headers:{Authorization:`Bearer ${login.data.token}`}});
    assert.equal(own.status,200);assert.equal((await own.json()).data.projeto.tema,'Projeto HTTP');
    const change=await fetch(base+'/api/v1/alunos/me/senha',{method:'PUT',headers:{Authorization:`Bearer ${login.data.token}`,'Content-Type':'application/json'},body:JSON.stringify({senhaAtual:'Http!12345',novaSenha:'Nova!12345'})});
    assert.equal(change.status,200);
    assert.equal((await col.findOne({matricula:'009999'})).senhaVersao,'pessoal-v1');
    assert.equal((await fetch(base+'/api/v1/alunos/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({aluno:{identificacao:'009999',senha:'Http!12345'}})})).status,401);
    assert.equal((await fetch(base+'/api/v1/alunos/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({aluno:{identificacao:'009999',senha:'Nova!12345'}})})).status,200);
    assert.equal((await fetch(base+'/api/v1/projetos/meu')).status,401);
  } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
});
