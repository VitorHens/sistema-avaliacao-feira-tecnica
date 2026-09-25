const ErrorResponse = require('./ErrorResponse');

/** Endereço visível pelo visitante; nunca confia em X-Forwarded-Host. */
function projectPublicUrl(baseUrl, projetoId) {
    let base;
    try { base = new URL(String(baseUrl || '')); }
    catch { throw new ErrorResponse(503, 'Configure PUBLIC_BASE_URL com o endereço da feira acessível pelos celulares.'); }
    const host = base.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
        throw new ErrorResponse(503, 'PUBLIC_BASE_URL deve ser uma URL HTTP ou HTTPS, sem senha, consulta ou fragmento.');
    }
    if (host === 'localhost' || host.endsWith('.localhost') || /^127\./.test(host) || ['0.0.0.0','::','::1'].includes(host) || /^::ffff:(7f[0-9a-f]{2}:|127\.)/i.test(host)) {
        throw new ErrorResponse(503, 'O celular não acessa localhost. Configure PUBLIC_BASE_URL com o domínio da feira ou o IP do servidor na rede Wi-Fi antes de gerar o QR Code.');
    }
    if (!projetoId) throw new ErrorResponse(400, 'Projeto sem identificador.');
    base.pathname = base.pathname.replace(/\/+$/, '') + '/';
    const url = new URL('projeto.html', base);
    url.searchParams.set('id', String(projetoId));
    return url.href;
}
module.exports = { projectPublicUrl };
