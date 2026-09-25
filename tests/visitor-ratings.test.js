const test=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const createRouter=require('../src/api/routes/VisitanteRouter');
const horarioAvaliacaoVisitantes=require('../src/api/routes/HorarioAvaliacaoVisitantes');
const id='507f1f77bcf86cd799439011';

test('votação pública abre somente nos dois períodos de 2/10/2026 em São Paulo',()=>{
 const aberta=iso=>horarioAvaliacaoVisitantes(new Date(iso)).aberta;
 for(const iso of ['2026-10-02T09:59:59Z','2026-10-02T15:01:00Z','2026-10-02T19:59:59Z','2026-10-03T01:31:00Z','2026-10-03T10:00:00Z'])assert.equal(aberta(iso),false,iso);
 for(const iso of ['2026-10-02T10:00:00Z','2026-10-02T15:00:59Z','2026-10-02T20:00:00Z','2026-10-03T01:30:59Z'])assert.equal(aberta(iso),true,iso);
});
test('avaliações públicas isoladas, validação, cookie e atualização sem duplicação',async()=>{
 const rows=[];const collections=[];
 const votes={createIndex:async(keys,options)=>assert.equal(options.unique,true),findOne:async f=>rows.find(r=>r.projetoId===f.projetoId&&r.visitante===f.visitante),updateOne:async(f,u)=>{const r=rows.find(r=>r.projetoId===f.projetoId&&r.visitante===f.visitante);if(r)Object.assign(r,u.$set);else rows.push({...f,...u.$set});},aggregate:p=>({toArray:async()=>{const selected=rows.filter(r=>p[0].$match.projetoId?r.projetoId===p[0].$match.projetoId:r.nota>=1&&r.nota<=5);return selected.length?[p[0].$match.projetoId?{total:selected.length,media:selected.reduce((s,r)=>s+r.nota,0)/selected.length}:{_id:id,avaliacoes:selected.length,media:selected.reduce((s,r)=>s+r.nota,0)/selected.length}]:[];}})};
 const database={getCollection:async name=>{collections.push(name);if(name==='avaliacoesVisitantes')return votes;if(name==='projetos')return {findOne:async f=>f._id.toString()===id?{_id:id}:null,find:()=>({toArray:async()=>[{_id:{toString:()=>id},tema:'Projeto teste',curso:'INFORMÁTICA',representante:{nome:'Equipe teste',turma:'2A'}}]})};throw Error('Coleção da banca não pode ser acessada');}};
 let currentTime=new Date('2026-10-02T11:00:00Z');
 const app=express();app.use(express.json());app.use('/votes',await createRouter(database,{now:()=>currentTime}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/votes/`;
 try{
  let response=await fetch(base+id);const cookie=response.headers.get('set-cookie').split(';')[0];assert.match(response.headers.get('set-cookie'),/HttpOnly/);const initial=(await response.json()).data;assert.equal(initial.total,0);assert.equal(initial.horario.aberta,true);
  const put=(nota,extra={})=>fetch(base+id,{method:'PUT',headers:{cookie,'Content-Type':'application/json',...extra},body:JSON.stringify({nota,notaFinal:10,avaliador:'fake'})});
  response=await put(5);assert.equal(response.status,200);assert.deepEqual((await response.json()).data,{total:1,media:5,minhaNota:5});
  response=await put(3);assert.deepEqual((await response.json()).data,{total:1,media:3,minhaNota:3});assert.equal(rows.length,1);assert.equal(rows[0].notaFinal,undefined);
  for(const bad of [0,6,2.5,'5',null])assert.equal((await put(bad)).status,400);
  assert.equal((await put(4,{Origin:'https://other.example'})).status,403);
  assert.equal((await fetch(base+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:'{"nota":4}'})).status,400);
  assert.equal((await fetch(base+'invalid')).status,400);assert.equal((await fetch(base+'507f1f77bcf86cd799439099')).status,404);
  response=await fetch(base+id);const cookie2=response.headers.get('set-cookie').split(';')[0];response=await fetch(base+id,{method:'PUT',headers:{cookie:cookie2,'Content-Type':'application/json'},body:'{"nota":5}'});assert.deepEqual((await response.json()).data,{total:2,media:4,minhaNota:5});
  currentTime=new Date('2026-10-02T15:01:00Z');
  response=await put(4);assert.equal(response.status,403);assert.equal((await response.json()).data.horario.aberta,false);assert.equal(rows.length,2);
  response=await fetch(base+id);assert.equal((await response.json()).data.horario.aberta,false);
  response=await fetch(base+'ranking');assert.equal(response.status,200);const publicRanking=(await response.json()).data.ranking;assert.equal(publicRanking.length,1);assert.equal(publicRanking[0].media,4);assert.equal(publicRanking[0].avaliacoes,2);
  assert.deepEqual(collections,['avaliacoesVisitantes','projetos']);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
