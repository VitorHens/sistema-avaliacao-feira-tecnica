// Limite simples por IP para reduzir tentativas automáticas de adivinhar senhas.
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ACCOUNT_ATTEMPTS = 8;
const MAX_IP_ATTEMPTS = 300;

module.exports = function loginRateLimit(request, response, next) {
    const now = Date.now();
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const identity = String(request.body?.aluno?.identificacao || request.body?.professor?.identificacao || request.body?.Professor?.identificacao || request.body?.professor?.email || request.body?.Professor?.email || request.body?.identificacao || request.body?.email || '').trim().toLowerCase().slice(0, 254);
    const keys = [`ip:${ip}`, `account:${ip}:${identity}`];
    const recent = keys.map(key => (attempts.get(key) || []).filter(time => now - time < WINDOW_MS));
    const blocked = recent.find((times, index) => times.length >= (index ? MAX_ACCOUNT_ATTEMPTS : MAX_IP_ATTEMPTS));
    if (blocked) {
        response.set('Retry-After', String(Math.ceil((WINDOW_MS - (now - blocked[0])) / 1000)));
        return response.status(429).json({ success: false, message: 'Muitas tentativas de acesso. Tente novamente em alguns minutos.' });
    }
    keys.forEach((key, index) => attempts.set(key, [...recent[index], now]));
    if (attempts.size > 10000) {
        for (const [ip, times] of attempts) {
            if (times.every(time => now - time >= WINDOW_MS)) attempts.delete(ip);
        }
    }
    next();
};
