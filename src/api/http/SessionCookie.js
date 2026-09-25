const SESSION_COOKIE_NAME = 'ft_session';
const COOKIE_BASE_OPTIONS = Object.freeze({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    path: '/',
});
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

function setSessionCookie(response, token) {
    response.cookie(SESSION_COOKIE_NAME, token, {
        ...COOKIE_BASE_OPTIONS,
        maxAge: SESSION_DURATION_MS,
    });
}

function clearSessionCookie(response) {
    response.clearCookie(SESSION_COOKIE_NAME, COOKIE_BASE_OPTIONS);
}

module.exports = {
    SESSION_COOKIE_NAME,
    setSessionCookie,
    clearSessionCookie,
};
