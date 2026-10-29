'use strict';
const config = require('../config');
class TTLCache {
  constructor(ttl) { this.ttl = ttl; this.map = new Map(); }
  get(key) {
    const hit = this.map.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expire) { this.map.delete(key); return null; }
    return hit.value;
  }
  set(key, value) {
    if (this.map.size > 2000) this.map.clear();
    this.map.set(key, { value, expire: Date.now() + this.ttl });
  }
  stats() { return { size: this.map.size, ttlSeconds: this.ttl / 1000 }; }
}
module.exports = new TTLCache(config.CACHE_TTL_MS);
