'use strict';
const config = require('../config');
const { validateUrl } = require('../utils/security');
const { cleanUrl } = require('../utils/cleaner');
const { analyzeSafety } = require('../utils/safety');
const { findSupported } = require('../utils/supported');
const { extractMetadata, extractCandidates } = require('./metadataService');
const cache = require('../utils/cache');
const stats = require('../utils/stats');

async function fetchOnce(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': config.USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/json,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9,km;q=0.8',
      },
    });
    return res;
  } finally { clearTimeout(timer); }
}

async function readBodyLimited(res) {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (!/text\/html|application\/xhtml|text\/plain|application\/json/.test(ct)) {
    try { await res.body?.cancel(); } catch {}
    return { text: '', contentType: ct };
  }
  try {
    const buf = await res.arrayBuffer();
    const sliced = buf.byteLength > config.MAX_BODY_BYTES ? buf.slice(0, config.MAX_BODY_BYTES) : buf;
    return { text: new TextDecoder('utf-8', { fatal: false }).decode(sliced), contentType: ct };
  } catch { return { text: '', contentType: ct }; }
}

/** Follow HTTP redirects manually, validating every hop (SSRF-safe). */
async function followRedirects(startUrl) {
  const chain = [];
  let current = startUrl;
  for (let i = 0; i <= config.MAX_REDIRECTS; i++) {
    current = await validateUrl(current);
    const res = await fetchOnce(current, config.FETCH_TIMEOUT);
    const location = res.headers.get('location');
    const isRedirect = [301, 302, 303, 307, 308].includes(res.status) && location;
    let next = null;
    if (isRedirect) { try { next = new URL(location, current).href; } catch {} }
    chain.push({ url: current, status: res.status, location: next, server: res.headers.get('server') || '' });
    if (isRedirect && next) {
      try { await res.body?.cancel(); } catch {}
      current = next;
      continue;
    }
    const { text, contentType } = await readBodyLimited(res);
    return { finalUrl: current, chain, status: res.status, contentType, body: text };
  }
  const e = new Error('Too many redirects / Redirect ច្រើនពេក'); e.code = 'TOO_MANY_REDIRECTS'; e.status = 422; throw e;
}

/**
 * Main bypass:
 * 1) validate + clean  2) follow HTTP redirects  3) follow meta-refresh / JS redirect if present
 * 4) extract candidate links from interstitial pages  5) metadata + safety + cleaning report
 * Note: pages that require a CAPTCHA / login / human timer cannot (and should not) be auto-completed;
 * we return the best publicly-available destination candidates instead.
 */
async function bypass(rawUrl, opts = {}) {
  const t0 = Date.now();
  const original = await validateUrl(rawUrl);
  const cacheKey = 'bypass:' + original;
  if (!opts.noCache) {
    const hit = cache.get(cacheKey);
    if (hit) { stats.record({ originalUrl: original, finalUrl: hit.finalUrl, success: true, ms: Date.now()-t0, cached: true }); return { ...hit, cached: true, timingMs: Date.now()-t0 }; }
  }
  const host = new URL(original).hostname;
  const supported = findSupported(host);

  // Special unwrappers that need no network (e.g. Google/Facebook redirect wrappers, href.li)
  const unwrapped = tryUnwrap(original);

  let result, fetchError = null;
  try {
    result = await followRedirects(unwrapped || original);
    // meta-refresh / strong JS redirect follow (max 2 extra stages)
    for (let stage = 0; stage < 2 && result.body; stage++) {
      const cands = extractCandidates(result.body, result.finalUrl);
      const strong = cands.find(c => (c.source === 'meta-refresh' || c.source === 'js-redirect') && c.url !== result.finalUrl);
      if (!strong) break;
      const nextResult = await followRedirects(strong.url);
      result.chain.push(...nextResult.chain);
      result = { ...nextResult, chain: result.chain };
    }
  } catch (e) {
    fetchError = e;
    result = { finalUrl: unwrapped || original, chain: [{ url: original, status: 0, location: null }], status: 0, contentType: '', body: '' };
  }

  const candidates = result.body ? extractCandidates(result.body, result.finalUrl) : [];
  const metadata = extractMetadata(result.body, result.finalUrl);
  const cleanedInfo = cleanUrl(result.finalUrl);
  const safety = analyzeSafety(cleanedInfo.cleaned, result.chain.length - 1);
  const ms = Date.now() - t0;

  const data = {
    originalUrl: original,
    unwrappedUrl: unwrapped && unwrapped !== original ? unwrapped : null,
    finalUrl: cleanedInfo.cleaned,
    finalUrlRaw: result.finalUrl,
    bypassed: result.finalUrl !== original,
    fetched: !fetchError,
    fetchError: fetchError ? { code: fetchError.code || (fetchError.cause && fetchError.cause.code) || 'FETCH_FAILED', message: [fetchError.message || String(fetchError), fetchError.cause && (fetchError.cause.code || fetchError.cause.message)].filter(Boolean).join(' — ').slice(0, 300) } : null,
    statusCode: result.status,
    contentType: result.contentType || '',
    isShortener: !!supported,
    supported: supported ? { domain: supported.domain, category: supported.category, method: supported.method } : null,
    redirectChain: result.chain,
    redirectCount: Math.max(0, result.chain.length - 1),
    removedParams: cleanedInfo.removed,
    keptParamsCount: cleanedInfo.kept.length,
    metadata,
    safety,
    extractedLinks: candidates,
    note: supported && supported.method === 'best-effort'
      ? 'This ad-shortener may require a human step (timer/CAPTCHA). We followed all public redirects and extracted public destination candidates — open the top candidate if the final URL is still an interstitial page.'
      : null,
    cached: false,
    timingMs: ms,
  };
  if (!fetchError) cache.set(cacheKey, data);
  stats.record({ originalUrl: original, finalUrl: data.finalUrl, success: !fetchError, ms, cached: false });
  return data;
}

function tryUnwrap(urlStr) {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    // facebook / google / duckduckgo / href.li wrappers carry the real URL in a query param
    const keys = ['u', 'url', 'q', 'target', 'to', 'redirect', 'redir', 'r', 'out', 'destination'];
    if (['l.facebook.com','lm.facebook.com','href.li'].includes(host) || (host.includes('google.') && u.pathname === '/url') || (host.includes('duckduckgo.com') && u.pathname.startsWith('/l/'))) {
      for (const k of keys) {
        const v = u.searchParams.get(k);
        if (v && /^https?:\/\//i.test(v)) return v;
      }
      if (host === 'href.li' && u.search) { const v = decodeURIComponent(u.search.slice(1)); if (/^https?:\/\//i.test(v)) return v; }
    }
    return null;
  } catch { return null; }
}

async function bulkBypass(urls) {
  const list = (urls || []).slice(0, 20);
  const results = [];
  // small concurrency (3) to be polite to target servers
  for (let i = 0; i < list.length; i += 3) {
    const batch = list.slice(i, i + 3);
    const settled = await Promise.allSettled(batch.map(u => bypass(u)));
    settled.forEach((s, idx) => {
      if (s.status === 'fulfilled') results.push({ input: batch[idx], success: true, data: s.value });
      else results.push({ input: batch[idx], success: false, error: { code: s.reason.code || 'FAILED', message: String(s.reason.message || s.reason).slice(0,300) } });
    });
  }
  return results;
}

module.exports = { bypass, bulkBypass, followRedirects };
