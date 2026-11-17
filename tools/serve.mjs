import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf'
};

http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    // Serve website files only, including when the development tools are in the repository root.
    if (!(relative.startsWith('assets/') || relative.startsWith('articles/') || /^[a-z]+\.html$/.test(relative)) ||
        relative.split('/').some(part => part.startsWith('.') || part.includes('\\'))) {
      response.writeHead(404).end('Not found');
      return;
    }
    const filename = await realpath(path.join(root, relative));
    if (!filename.startsWith(root)) {
      response.writeHead(404).end('Not found');
      return;
    }
    const data = await readFile(filename);
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filename)] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store'
    }).end(request.method === 'HEAD' ? undefined : data);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(4173, '127.0.0.1', () => console.log('Flariox: http://127.0.0.1:4173'));
