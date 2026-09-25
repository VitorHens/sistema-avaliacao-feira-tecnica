const test = require('node:test');
const assert = require('node:assert/strict');
const visitorRanking = require('../src/api/services/VisitorRanking');

test('ranking de visitantes usa apenas notas públicas e ordena média e quantidade', async () => {
  const ids = ['507f1f77bcf86cd799439011','507f1f77bcf86cd799439012','507f1f77bcf86cd799439013'];
  const stats = [
    {_id:ids[0],avaliacoes:2,media:4.5},
    {_id:ids[1],avaliacoes:3,media:4.5},
    {_id:ids[2],avaliacoes:1,media:5},
  ];
  const docs = ids.map((id,index) => ({_id:{toString:()=>id},tema:`Projeto ${index+1}`,curso:index===2?'QUÍMICA':'INFORMÁTICA',representante:{nome:`Equipe ${index+1}`,turma:'2A'}}));
  const votes = {aggregate:pipeline=>{assert.equal(pipeline[0].$match.nota.$gte,1);return {toArray:async()=>stats}}};
  const projects = {find:query=>{assert.equal(query._id.$in.length,3);return {toArray:async()=>docs}}};
  const result = await visitorRanking(votes,projects);
  assert.deepEqual(result.ranking.map(item=>item.projetoId),[ids[2],ids[1],ids[0]]);
  assert.deepEqual(result.ranking.map(item=>item.posicao),[1,2,3]);
  assert.deepEqual(result.rankingPorCurso['INFORMÁTICA'].map(item=>item.posicao),[2,3]);
  assert.equal(result.ranking[0].media,5);
  assert.equal(result.ranking[0].equipe[0].nome,'Equipe 3');
});
