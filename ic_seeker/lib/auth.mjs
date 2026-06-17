import crypto from 'node:crypto';

export function createAuth({ authEnabled, cookieName, cookieSecret, bad }) {
  function sign(value) {
    return crypto.createHmac('sha256', cookieSecret).update(value).digest('base64url');
  }

  function sessionToken() {
    const payload = `admin:${Math.floor(Date.now() / 1000)}`;
    return `${payload}.${sign(payload)}`;
  }

  function parseCookies(req) {
    const out = {};
    for (const part of String(req.headers.cookie || '').split(';')) {
      const [rawKey, ...rest] = part.trim().split('=');
      if (!rawKey) continue;
      out[rawKey] = decodeURIComponent(rest.join('=') || '');
    }
    return out;
  }

  function currentUser(req) {
    if (!authEnabled) return { name: 'local' };
    const token = parseCookies(req)[cookieName];
    if (!token || !token.includes('.')) return null;
    const [payload, mac] = token.split('.');
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(mac || '');
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    const [user, issued] = payload.split(':');
    const ageSeconds = Math.floor(Date.now() / 1000) - Number(issued || 0);
    if (user !== 'admin' || ageSeconds > 60 * 60 * 24 * 14) return null;
    return { name: 'admin' };
  }

  function setSession(res) {
    const token = encodeURIComponent(sessionToken());
    res.setHeader('set-cookie', `${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 14}`);
  }

  function clearSession(res) {
    res.setHeader('set-cookie', `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  }

  function requireAuth(req, res) {
    if (currentUser(req)) return true;
    bad(res, 'Authentication required', 401);
    return false;
  }

  function ipKey(req) {
    return req.socket.remoteAddress || 'local';
  }

  return { currentUser, setSession, clearSession, requireAuth, ipKey };
}
