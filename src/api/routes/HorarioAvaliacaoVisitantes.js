const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve(__dirname, '../../../data/horario-visitantes.json');
const DEFAULT = Object.freeze({ data: '2026-10-02', exigirCodigo: false, periodos: [{ inicio: '07:00', fim: '12:00' }, { inicio: '17:00', fim: '22:30' }] });
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function validar(config) {
  if (!config || typeof config.data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(config.data) ||
      new Date(`${config.data}T12:00:00Z`).toISOString().slice(0, 10) !== config.data ||
      !Array.isArray(config.periodos) || config.periodos.length < 1 || config.periodos.length > 2) {
    throw new Error('Informe uma data válida e um ou dois períodos.');
  }
  const periodos = config.periodos.map(periodo => {
    const { inicio, fim } = periodo || {};
    if (typeof inicio !== 'string' || typeof fim !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(inicio) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(fim) || inicio >= fim) {
      throw new Error('Cada período precisa de início e fim válidos, com o fim após o início.');
    }
    return { inicio, fim };
  }).sort((a, b) => a.inicio.localeCompare(b.inicio));
  if (periodos.some((p, index) => index && p.inicio <= periodos[index - 1].fim)) {
    throw new Error('Os períodos de votação não podem se sobrepor.');
  }
  if (config.exigirCodigo !== undefined && typeof config.exigirCodigo !== 'boolean') throw new Error('A opção de código deve ser verdadeira ou falsa.');
  return { data: config.data, exigirCodigo: config.exigirCodigo === true, periodos };
}

function carregar() {
  return fs.existsSync(file) ? validar(JSON.parse(fs.readFileSync(file, 'utf8'))) : DEFAULT;
}

function salvar(config) {
  const valido = validar(config);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(valido, null, 2), { mode: 0o600 });
  fs.renameSync(temp, file);
  return valido;
}

function horarioAvaliacaoVisitantes(now = new Date(), config = carregar()) {
  const parts = Object.fromEntries(formatter.formatToParts(now).map(part => [part.type, part.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;
  const aberta = date === config.data && config.periodos.some(p => time >= p.inicio && time <= p.fim);
  const periodos = config.periodos.map(p => `${p.inicio.replace(/^0/, '')}–${p.fim.replace(/^0/, '')}`).join(' e ');
  const [ano, mes, dia] = config.data.split('-');
  const mensagem = `A avaliação do público estará disponível em ${Number(dia)}/${mes}/${ano}, das ${periodos} (horário de Brasília).`;
  return { aberta, mensagem, data: config.data, periodos: config.periodos, exigirCodigo: config.exigirCodigo === true };
}

module.exports = horarioAvaliacaoVisitantes;
module.exports.carregar = carregar;
module.exports.salvar = salvar;
module.exports.validar = validar;
