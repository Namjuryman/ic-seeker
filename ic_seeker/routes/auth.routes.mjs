export function createAuthRoutes({ auth, config, http, loginFailures }) {
  const { bad, json, readJson } = http;
  const { currentUser, clearSession, ipKey, setSession } = auth;

  async function handleAuth(req, res, url) {
    if (url.pathname === '/api/auth/status') {
      json(res, { authenticated: Boolean(currentUser(req)), authEnabled: config.authEnabled, appName: config.appName });
      return true;
    }
    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      if (!config.authEnabled) {
        json(res, { ok: true, user: 'local', appName: config.appName });
        return true;
      }
      const key = ipKey(req);
      const failures = loginFailures.get(key) || { count: 0, last: 0 };
      if (failures.count >= 8 && Date.now() - failures.last < 60_000) {
        bad(res, 'Too many login attempts. Try again later.', 429);
        return true;
      }
      const body = await readJson(req, 20_000);
      if (String(body.password || '') !== config.adminPassword) {
        loginFailures.set(key, { count: failures.count + 1, last: Date.now() });
        bad(res, 'Invalid password', 401);
        return true;
      }
      loginFailures.delete(key);
      setSession(res);
      json(res, { ok: true, user: 'admin', appName: config.appName });
      return true;
    }
    if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
      clearSession(res);
      json(res, { ok: true });
      return true;
    }
    return false;
  }

  return { handleAuth };
}
