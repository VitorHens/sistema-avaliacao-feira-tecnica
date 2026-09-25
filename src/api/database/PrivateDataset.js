const fs = require('node:fs');
const path = require('node:path');

const arquivoPadrao = path.resolve(__dirname, '../../../data/projetos-feira-2026.json');

function caminhoArquivo() {
  const configurado = process.env.PROJECTS_DATA_FILE?.trim();
  return configurado ? path.resolve(configurado) : arquivoPadrao;
}

function carregarProjetosPrivados() {
  const arquivo = caminhoArquivo();
  if (!fs.existsSync(arquivo)) return { sourceSha256: null, projects: [] };

  const dataset = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  if (!Array.isArray(dataset.projects)) {
    throw new Error(`Carga privada inválida: ${arquivo} precisa conter a lista "projects".`);
  }
  return dataset;
}

module.exports = { caminhoArquivo, carregarProjetosPrivados };
