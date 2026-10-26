import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const port = Number(process.env.PORT || process.argv[2] || 4173);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Use a port between 0 and 65535.');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.geojson':'application/geo+json', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.txt':'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, {Allow:'GET, HEAD'}).end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filename = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!filename.startsWith(root) || pathname.includes('\0')) { res.writeHead(403).end('Forbidden'); return; }
    const info = await stat(filename);
    if (!info.isFile()) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, {'Content-Type':types[path.extname(filename)] || 'application/octet-stream', 'Content-Length':info.size, 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff'});
    if (req.method === 'HEAD') res.end(); else createReadStream(filename).pipe(res);
  } catch (error) { res.writeHead(error instanceof URIError ? 400 : 404).end('Not found'); }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Try: npm start -- 4174` : error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`James Peak atlas: http://127.0.0.1:${server.address().port}\nPress Ctrl+C to stop.`));
process.on('SIGINT', () => server.close(() => process.exit(0)));
