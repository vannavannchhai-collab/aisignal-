'use strict';
const config = require('../config');
const hits = new Map(); // ip -> {count, resetAt}
module.exports = function rateLimit(req, res, next) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString().split(',')[0].trim();
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) { hits.set(ip, { count: 1, resetAt: now + 60000 }); return next(); }
  rec.count++;
  if (rec.count > config.RATE_LIMIT) {
    return res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests / អ្នកផ្ញើសំណើច្រើនពេក សូមរង់ចាំ ១នាទី' } });
  }
  next();
};
