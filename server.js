const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT, 10) || 3000;
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    // Servir archivos de public/img/ directamente desde Node.js
    // Necesario porque Plesk/Passenger intercepta antes que el .htaccess de Apache
    if (pathname && pathname.startsWith('/img/')) {
      const filePath = path.join(__dirname, 'public', pathname);
      const ext = path.extname(filePath).toLowerCase();
      if (MIME_TYPES[ext] && fs.existsSync(filePath)) {
        res.setHeader('Content-Type', MIME_TYPES[ext]);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    handle(req, res, parsedUrl);
  }).listen(port, '0.0.0.0', () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
