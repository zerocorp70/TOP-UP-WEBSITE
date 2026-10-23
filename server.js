const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Decode URL and remove query strings
  let safeUrl = decodeURI(req.url.split('?')[0]);

  // Route root '/' or '/index.html' directly to 'FFX.html'
  if (safeUrl === '/' || safeUrl === '' || safeUrl === '/index.html') {
    safeUrl = '/FFX.html';
  }

  // Prevent directory traversal
  const filePath = path.normalize(path.join(ROOT_DIR, safeUrl));
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const reqExt = path.extname(filePath).toLowerCase();
      // Automatic fallback between .jpg, .png, .jpeg, .webp if user swaps image format
      const imgExts = ['.png', '.jpg', '.jpeg', '.webp'];
      if (imgExts.includes(reqExt)) {
        const baseNoExt = filePath.slice(0, -reqExt.length);
        for (const altExt of imgExts) {
          if (altExt === reqExt) continue;
          const altPath = baseNoExt + altExt;
          if (fs.existsSync(altPath) && fs.statSync(altPath).isFile()) {
            serveFile(altPath, res);
            return;
          }
        }
      }
      if (reqExt && reqExt !== '.html') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }
      // Fallback: If route not found, serve FFX.html
      const fallbackPath = path.join(ROOT_DIR, 'FFX.html');
      fs.stat(fallbackPath, (fbErr, fbStats) => {
        if (!fbErr && fbStats.isFile()) {
          serveFile(fallbackPath, res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
        }
      });
      return;
    }

    serveFile(filePath, res);
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (ext === '.js' || ext === '.html') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
    }
  });
  stream.pipe(res);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
