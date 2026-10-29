'use strict';
const stats = {
  startedAt: new Date().toISOString(),
  total: 0, success: 0, failed: 0, cached: 0,
  totalTimeMs: 0,
  domains: new Map(),
  recent: [], // {originalHost, finalHost, success, at, ms}
};
function record({ originalUrl, finalUrl, success, ms, cached }) {
  stats.total++; stats.totalTimeMs += ms || 0;
  if (success) stats.success++; else stats.failed++;
  if (cached) stats.cached++;
  try {
    const h = new URL(originalUrl).hostname;
    stats.domains.set(h, (stats.domains.get(h) || 0) + 1);
    stats.recent.unshift({ originalHost: h, finalHost: finalUrl ? safeHost(finalUrl) : null, success: !!success, at: new Date().toISOString(), ms: ms || 0 });
    stats.recent = stats.recent.slice(0, 30);
  } catch {}
}
function safeHost(u) { try { return new URL(u).hostname; } catch { return null; } }
function snapshot() {
  const topDomains = [...stats.domains.entries()].map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  return {
    startedAt: stats.startedAt, total: stats.total, success: stats.success, failed: stats.failed, cached: stats.cached,
    successRate: stats.total ? Math.round((stats.success / stats.total) * 100) : 100,
    avgTimeMs: stats.total ? Math.round(stats.totalTimeMs / stats.total) : 0,
    topDomains, recent: stats.recent,
  };
}
module.exports = { record, snapshot };
