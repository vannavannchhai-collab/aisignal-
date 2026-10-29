'use strict';
const express = require('express');
const QRCode = require('qrcode');
const router = express.Router();
const { asyncWrap } = require('../middleware/errorHandler');
const rateLimit = require('../middleware/rateLimit');
const { bypass, bulkBypass } = require('../services/bypassService');
const { validateUrl } = require('../utils/security');
const { cleanUrl } = require('../utils/cleaner');
const { analyzeSafety } = require('../utils/safety');
const { SUPPORTED } = require('../utils/supported');
const stats = require('../utils/stats');
const cache = require('../utils/cache');

router.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok', uptimeSeconds: Math.round(process.uptime()), version: '1.0.0', now: new Date().toISOString() } }));

router.post('/bypass', rateLimit, asyncWrap(async (req, res) => {
  const { url, noCache } = req.body || {};
  const data = await bypass(url, { noCache: !!noCache });
  res.json({ success: true, data });
}));

router.get('/bypass', rateLimit, asyncWrap(async (req, res) => {
  const data = await bypass(req.query.url);
  res.json({ success: true, data });
}));

router.post('/bulk', rateLimit, asyncWrap(async (req, res) => {
  const urls = Array.isArray(req.body.urls) ? req.body.urls.filter(Boolean) : [];
  if (!urls.length) { const e = new Error('Provide urls array / សូមបញ្ចូលបញ្ជី URL'); e.status = 400; e.code = 'EMPTY_LIST'; throw e; }
  if (urls.length > 20) { const e = new Error('Max 20 URLs per bulk request'); e.status = 400; e.code = 'TOO_MANY'; throw e; }
  const results = await bulkBypass(urls);
  res.json({ success: true, data: { count: results.length, results } });
}));

router.post('/clean', asyncWrap(async (req, res) => {
  const url = await validateUrl((req.body || {}).url);
  const info = cleanUrl(url);
  res.json({ success: true, data: { originalUrl: url, cleanedUrl: info.cleaned, removedParams: info.removed, keptParams: info.kept, removedCount: info.removedCount } });
}));

router.post('/safety', asyncWrap(async (req, res) => {
  const url = await validateUrl((req.body || {}).url);
  res.json({ success: true, data: { url, safety: analyzeSafety(url, 0), clean: cleanUrl(url) } });
}));

router.post('/trace', rateLimit, asyncWrap(async (req, res) => {
  const data = await bypass((req.body || {}).url);
  res.json({ success: true, data: { originalUrl: data.originalUrl, finalUrl: data.finalUrl, redirectChain: data.redirectChain, redirectCount: data.redirectCount, statusCode: data.statusCode, fetched: data.fetched, fetchError: data.fetchError } });
}));

router.get('/qr', asyncWrap(async (req, res) => {
  const text = (req.query.text || '').toString().slice(0, 2048);
  if (!text) { const e = new Error('text is required'); e.status = 400; throw e; }
  const dataUrl = await QRCode.toDataURL(text, { width: 320, margin: 2, color: { dark: '#0b0b1a', light: '#ffffff' } });
  res.json({ success: true, data: { text, dataUrl } });
}));

router.get('/supported', (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase();
  const cat = (req.query.category || '').toString().toLowerCase();
  let list = SUPPORTED;
  if (q) list = list.filter(s => s.domain.includes(q));
  if (cat) list = list.filter(s => s.category === cat);
  res.json({ success: true, data: { total: SUPPORTED.length, filtered: list.length, items: list } });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: { ...stats.snapshot(), cache: cache.stats(), supportedDomains: SUPPORTED.length } });
});

module.exports = router;
