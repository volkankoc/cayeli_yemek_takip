require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

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

// SPA fallback — /scan route'u scan.html'e yönlendir
app.get('/scan', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scan.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`yemekhane-web çalışıyor: http://localhost:${PORT}`);
  console.log(`API proxy hedefi: ${API_URL}`);
});
