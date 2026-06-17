import { methodology } from '../services/methodology.service.mjs';

export function createApiRoutes({ services, http }) {
  const { bad, json, readJson } = http;
  const { admin, paper, profile, search } = services;

  async function handleApi(req, res, url) {
    if (url.pathname === '/api/stats') return json(res, admin.stats());
    if (url.pathname === '/api/methodology') return json(res, methodology());
    if (url.pathname === '/api/professors') return json(res, profile.professors(url.searchParams));
    if (url.pathname.startsWith('/api/authors/')) return json(res, profile.authorProfile(decodeURIComponent(url.pathname.split('/').at(-1))));
    if (url.pathname === '/api/institutions') return json(res, profile.institutions(url.searchParams));
    if (url.pathname.startsWith('/api/institutions/')) return json(res, profile.institutionProfile(decodeURIComponent(url.pathname.split('/').at(-1))));
    if (url.pathname === '/api/pdf-inbox') return json(res, await admin.pdfInbox());
    if (url.pathname === '/api/search') return json(res, search.search(url.searchParams));
    if (url.pathname.startsWith('/api/papers/')) {
      const id = Number(url.pathname.split('/').at(-1));
      const row = paper.paper(id);
      return row ? json(res, row) : bad(res, 'Paper not found', 404);
    }
    if (url.pathname.startsWith('/api/private/papers/') && url.pathname.endsWith('/state') && req.method === 'PUT') {
      const id = Number(url.pathname.split('/').at(-2));
      const row = paper.upsertPaperState(id, await readJson(req));
      return row ? json(res, row) : bad(res, 'Paper not found', 404);
    }
    if (url.pathname === '/api/private/tags') return json(res, paper.allTags());
    if (url.pathname === '/api/import/manual' && req.method === 'POST') return json(res, paper.insertPaper(await readJson(req)));
    if (url.pathname === '/api/import/doi' && req.method === 'POST') {
      const body = await readJson(req, 50_000);
      return json(res, await paper.importDoi(body.doi));
    }
    if (url.pathname === '/api/admin/api-keys') return json(res, admin.apiKeys());
    if (url.pathname.startsWith('/api/admin/api-keys/') && req.method === 'PUT') {
      const provider = decodeURIComponent(url.pathname.split('/').at(-1));
      const body = await readJson(req, 200_000);
      return json(res, admin.setApiKey(provider, body.value || ''));
    }
    return false;
  }

  return { handleApi };
}
