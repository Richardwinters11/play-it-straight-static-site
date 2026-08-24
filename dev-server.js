#!/usr/bin/env node
// Local dev server for Play It Straight — serves files AND accepts edits.
// POST /save  { path: "about.html", html: "<!DOCTYPE html>…" }  writes the file.
// Only binds 127.0.0.1, so it's localhost-only.

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = __dirname;
const PORT = 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.pdf':  'application/pdf',
};

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent(reqPath.split('?')[0]);
  const target = path.normalize(path.join(root, decoded));
  if (!target.startsWith(root)) return null;
  return target;
}

const server = http.createServer((req, res) => {
  // --- Save endpoint ---
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5_000_000) { // 5MB cap
        res.writeHead(413); res.end('too large'); req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const { path: relPath, html } = JSON.parse(body);
        if (typeof relPath !== 'string' || typeof html !== 'string') {
          throw new Error('bad payload');
        }
        if (!/^[a-zA-Z0-9._-]+\.html$/.test(relPath)) {
          throw new Error('path must be a top-level .html file');
        }
        const full = safeJoin(ROOT, '/' + relPath);
        if (!full || !fs.existsSync(full)) throw new Error('file not found: ' + relPath);
        fs.writeFileSync(full, html, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: relPath, bytes: html.length }));
        console.log(`[save] ${relPath} (${html.length} bytes)`);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // --- Static file serving ---
  let reqPath = url.parse(req.url).pathname;
  if (reqPath === '/' || reqPath.endsWith('/')) reqPath += 'index.html';
  const filePath = safeJoin(ROOT, reqPath);
  if (!filePath) { res.writeHead(403); res.end('forbidden'); return; }

  function serve(p) {
    const ext = path.extname(p).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(p).pipe(res);
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) return serve(filePath);
    // Fallback: try appending .html for extensionless URLs like /about
    if (!path.extname(filePath)) {
      const htmlPath = filePath + '.html';
      fs.stat(htmlPath, (e2, s2) => {
        if (!e2 && s2.isFile()) return serve(htmlPath);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found: ' + reqPath);
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found: ' + reqPath);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`dev-server listening on http://localhost:${PORT}`);
  console.log(`edit mode enabled — click the pencil button in the top-right on any page.`);
});
