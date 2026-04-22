require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const pkg = require('../package.json');

function readWebDeployNotes() {
  const p = path.join(__dirname, '../deploy-notes.txt');
  try {
    const t = fs.readFileSync(p, 'utf8').trim();
    return t.length > 1500 ? `${t.slice(0, 1500)}…` : t;
  } catch {
    return '';
  }
}

const app = express();
const PORT = process.env.PORT || 3002;
const API_URL = process.env.API_URL || 'http://localhost:3000';

// API proxy — CORS sorununu çözer
app.use(
  '/proxy',
  createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
    pathRewrite: { '^/proxy': '' },
  })
);

// Statik dosyalar
app.use(express.static(path.join(__dirname, 'public')));

app.get('/version.json', (_req, res) => {
  res.json({
    name: pkg.name,
    version: pkg.version,
    description: pkg.description || '',
    releaseNotes: readWebDeployNotes(),
  });
});

// SPA fallback — /scan route'u scan.html'e yönlendir
app.get('/scan', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scan.html'));
});

app.get('/scan-display', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scan-display.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`yemekhane-web çalışıyor: http://localhost:${PORT}`);
  console.log(`API proxy hedefi: ${API_URL}`);
});
