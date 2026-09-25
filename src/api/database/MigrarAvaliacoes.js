const logger = require('../utils/Logger');

// Dados antigos guardavam somente o nome. Atribuímos o ID apenas quando o nome
// corresponde a uma única conta e não existe outra nota dessa conta no projeto.
module.exports = async function migrarAvaliacoes(database) {
  const avaliacoes = await database.getCollection('avaliacoes');
  const antigas = await avaliacoes.find({ avaliadorId: { $exists: false } }).toArray();
  if (!antigas.length) return { migradas: 0, pendentes: 0 };

  const professores = await database.getCollection('professores');
  const porNome = new Map();
  for (const professor of await professores.find({}).toArray()) {
    const lista = porNome.get(professor.nome) || [];
    lista.push(professor._id.toString());
    porNome.set(professor.nome, lista);
  }

  let migradas = 0;
  let pendentes = 0;
  for (const antiga of antigas) {
    const ids = porNome.get(antiga.avaliador) || [];
    if (ids.length !== 1 || !antiga.projetoId) { pendentes++; continue; }
    const duplicada = await avaliacoes.findOne({
      _id: { $ne: antiga._id }, projetoId: antiga.projetoId, avaliadorId: ids[0],
    });
    if (duplicada) { pendentes++; continue; }
    await avaliacoes.updateOne({ _id: antiga._id, avaliadorId: { $exists: false } }, { $set: { avaliadorId: ids[0] } });
    migradas++;
  }
  if (pendentes) logger.warn(`${pendentes} avaliações antigas não puderam ser vinculadas automaticamente; confira professores com nomes repetidos ou avaliações duplicadas.`);
  return { migradas, pendentes };
};
