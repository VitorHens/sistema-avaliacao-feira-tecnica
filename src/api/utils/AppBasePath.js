function getAppBasePath() {
    const configured = process.env.APP_BASE_PATH === undefined ? '/feira' : process.env.APP_BASE_PATH.trim();
    if (configured && !/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\/?$/.test(configured)) {
        throw new Error('APP_BASE_PATH deve ser um caminho como /feira.');
    }
    return configured.replace(/\/$/, '');
}

function stripBasePath(basePath) {
    return (request, _response, next) => {
        if (basePath && (request.url === basePath || request.url.startsWith(`${basePath}/`) || request.url.startsWith(`${basePath}?`))) {
            request.url = request.url.slice(basePath.length) || '/';
        }
        next();
    };
}

function publicBaseUrl(request) {
    const configured = process.env.PUBLIC_BASE_URL?.trim();
    if (configured) return configured;

    const hostHeader = request.get('host');
    const fallback = `${request.protocol}://${hostHeader}${getAppBasePath()}`;
    let host;
    try { host = new URL(`${request.protocol}://${hostHeader}`).hostname.toLowerCase(); }
    catch { return fallback; }

    // Em uma prévia local comum, o celular deve usar o IP da rede, não localhost.
    // Contas de teste ficam presas ao loopback; não as exponha à rede.
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_TEST_PROFESSOR === 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(host)) {
        return fallback;
    }
    const addresses = Object.values(os.networkInterfaces()).flat()
        .filter(item => item && item.family === 'IPv4' && !item.internal)
        .map(item => item.address)
        .filter(ip => /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(ip));
    const unique = [...new Set(addresses)];
    if (unique.length !== 1) return fallback;
    const port = new URL(`${request.protocol}://${hostHeader}`).port;
    return `${request.protocol}://${unique[0]}${port ? `:${port}` : ''}${getAppBasePath()}`;
}

module.exports = { getAppBasePath, stripBasePath, publicBaseUrl };
const os = require('node:os');
