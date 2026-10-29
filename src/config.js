'use strict';
module.exports = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  MAX_REDIRECTS: parseInt(process.env.MAX_REDIRECTS || '15', 10),
  FETCH_TIMEOUT: parseInt(process.env.FETCH_TIMEOUT || '9000', 10),
  MAX_BODY_BYTES: 2 * 1024 * 1024,
  CACHE_TTL_MS: parseInt(process.env.CACHE_TTL || '600', 10) * 1000,
  RATE_LIMIT: parseInt(process.env.RATE_LIMIT || '60', 10),
  USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 AISIGNAL-BypassPro/1.0',
};
