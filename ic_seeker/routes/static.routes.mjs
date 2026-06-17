import fs from 'node:fs/promises';
import path from 'node:path';

export function createStaticRoutes({ config, http }) {
  const { bad } = http;

  async function handleDownload(req, res, url) {
    if (url.pathname !== '/download/csv') return false;
    const bytes = await fs.readFile(config.csvPath);
    res.writeHead(200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="ic_chipseeker.csv"'
    });
    res.end(bytes);
    return true;
  }

  async function serveStatic(req, res, url) {
    const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    const filePath = path.resolve(config.publicDir, `.${requested}`);
    if (!filePath.startsWith(config.publicDir)) return bad(res, 'Forbidden', 403);
    try {
      const bytes = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const type = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png'
      }[ext] || 'application/octet-stream';
      res.writeHead(200, { 'content-type': type });
      return res.end(bytes);
    } catch {
      return bad(res, 'Not found', 404);
    }
  }

  return { handleDownload, serveStatic };
}
