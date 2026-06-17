export function createRequestHandler({ authRoutes, apiRoutes, staticRoutes, auth, http }) {
  const { bad, parseUrl } = http;
  const { requireAuth } = auth;

  return async function handleRequest(req, res) {
    const url = parseUrl(req);
    try {
      if (await authRoutes.handleAuth(req, res, url)) return;

      if (url.pathname.startsWith('/api/') || url.pathname === '/download/csv') {
        if (!requireAuth(req, res)) return;
      }

      if (url.pathname.startsWith('/api/')) {
        const handled = await apiRoutes.handleApi(req, res, url);
        if (handled !== false) return;
      }

      if (await staticRoutes.handleDownload(req, res, url)) return;
      return await staticRoutes.serveStatic(req, res, url);
    } catch (err) {
      return bad(res, err.message || String(err), 500);
    }
  };
}
