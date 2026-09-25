const { createHash, createHmac, randomBytes, timingSafeEqual } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const secretFile = path.resolve(__dirname, '../../../data/.visitor-secret');
let secret;
function chave() {
  if (secret) return secret;
  if (process.env.VISITOR_TICKET_SECRET) {
    if (Buffer.byteLength(process.env.VISITOR_TICKET_SECRET, 'utf8') < 32) throw new Error('VISITOR_TICKET_SECRET precisa ter pelo menos 32 caracteres.');
    secret = Buffer.from(process.env.VISITOR_TICKET_SECRET, 'utf8');
    return secret;
  }
  fs.mkdirSync(path.dirname(secretFile), { recursive: true });
  try { fs.writeFileSync(secretFile, randomBytes(48), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  secret = fs.readFileSync(secretFile);
  if (secret.length < 32) throw new Error('Chave dos visitantes inválida.');
  return secret;
}

function normalizar(code) { return String(code || '').trim().toUpperCase().replace(/[\s-]/g, ''); }
function hash(code) { return createHash('sha256').update(normalizar(code)).digest('hex'); }
function gerar() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(12);
  const code = Array.from(bytes, byte => chars[byte % chars.length]).join('');
  return `FT26-${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`;
}
function cookieFor(hashValue) {
  return `ticket.${hashValue}.${createHmac('sha256', chave()).update(hashValue).digest('hex')}`;
}
function readCookie(value) {
  const parts = String(value || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'ticket' || !parts.slice(1).every(p => /^[a-f0-9]{64}$/.test(p))) return null;
  const expected = createHmac('sha256', chave()).update(parts[1]).digest();
  return timingSafeEqual(expected, Buffer.from(parts[2], 'hex')) ? parts[1] : null;
}

module.exports = { normalizar, hash, gerar, cookieFor, readCookie };
