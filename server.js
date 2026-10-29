'use strict';
const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./src/config');
const api = require('./src/routes/api');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '256kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api', api);
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h', extensions: ['html'] }));

// SPA fallback for non-API GETs
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use('/api', (req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'API endpoint not found' } }));
app.use(errorHandler);

app.listen(config.PORT, config.HOST, () => {
  console.log(`⚡ AISIGNAL BYPASS PRO running at http://${config.HOST}:${config.PORT}`);
});
