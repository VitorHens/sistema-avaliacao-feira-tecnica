const { ObjectId } = require('mongodb');

async function visitorRanking(votes, projects) {
  const stats = await votes.aggregate([
    { $match: { nota: { $gte: 1, $lte: 5 } } },
    { $group: { _id: '$projetoId', avaliacoes: { $sum: 1 }, media: { $avg: '$nota' } } },
  ]).toArray();
  const valid = stats.filter(item => /^[a-f\d]{24}$/i.test(String(item._id)));
  const ids = valid.map(item => new ObjectId(item._id));
  const docs = ids.length ? await projects.find({ _id: { $in: ids } }).toArray() : [];
  const byId = new Map(docs.map(doc => [doc._id.toString(), doc]));
  const compare = (a, b) => b.media - a.media || b.avaliacoes - a.avaliacoes || a.tema.localeCompare(b.tema, 'pt-BR');
  const ranking = valid.map(item => {
    const project = byId.get(String(item._id));
    if (!project) return null;
    return {
      projetoId: String(item._id),
      tema: project.tema || 'Projeto sem título',
      curso: project.curso || 'Sem curso',
      equipe: [project.representante, ...(project.integrantes || [])].filter(Boolean).map(person => ({nome:person.nome,turma:person.turma})),
      media: item.media,
      avaliacoes: item.avaliacoes,
    };
  }).filter(Boolean).sort(compare).map((item, index) => ({posicao:index + 1,...item,media:Number(item.media.toFixed(2))}));
  const rankingPorCurso = {};
  for (const item of ranking) {
    const items = rankingPorCurso[item.curso] || (rankingPorCurso[item.curso] = []);
    items.push(item);
  }
  return {ranking,rankingPorCurso};
}

module.exports = visitorRanking;
