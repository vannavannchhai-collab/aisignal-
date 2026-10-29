'use strict';
const cheerio = require('cheerio');

function extractMetadata(html, finalUrl) {
  if (!html) return baseMeta(finalUrl);
  try {
    const $ = cheerio.load(html);
    const pick = (sel, attr) => { const el = $(sel).first(); return attr ? (el.attr(attr) || '') : (el.text() || ''); };
    const title = pick('meta[property="og:title"]', 'content') || pick('meta[name="twitter:title"]', 'content') || pick('title') || '';
    const description = pick('meta[property="og:description"]', 'content') || pick('meta[name="description"]', 'content') || pick('meta[name="twitter:description"]', 'content') || '';
    let image = pick('meta[property="og:image"]', 'content') || pick('meta[name="twitter:image"]', 'content') || '';
    let favicon = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || $('link[rel="apple-touch-icon"]').attr('href') || '/favicon.ico';
    const siteName = pick('meta[property="og:site_name"]', 'content') || safeHost(finalUrl);
    const canonical = $('link[rel="canonical"]').attr('href') || '';
    try { if (image) image = new URL(image, finalUrl).href; } catch {}
    try { if (favicon) favicon = new URL(favicon, finalUrl).href; } catch {}
    // text snippet
    $('script,style,noscript,header,footer,nav').remove();
    const textSnippet = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 600);
    return { title: title.trim().slice(0,300), description: description.trim().slice(0,600), image, favicon, siteName, canonical, domain: safeHost(finalUrl), textSnippet };
  } catch { return baseMeta(finalUrl); }
}
function safeHost(u){ try{return new URL(u).hostname;}catch{return '';} }
function baseMeta(finalUrl){
  const domain = safeHost(finalUrl);
  return { title:'', description:'', image:'', favicon: domain ? `https://${domain}/favicon.ico` : '', siteName: domain, canonical:'', domain, textSnippet:'' };
}

/** Extract candidate destination links from interstitial HTML */
function extractCandidates(html, baseUrl) {
  const out = [];
  if (!html) return out;
  const push = (url, source, score) => {
    try {
      const abs = new URL(url, baseUrl).href;
      if (abs === baseUrl) return;
      if (!/^https?:\/\//i.test(abs)) return;
      if (!out.find(x => x.url === abs)) out.push({ url: abs, source, score });
    } catch {}
  };
  // meta refresh
  const meta = html.match(/<meta[^>]+http-equiv=["']?refresh["']?[^>]+>/i);
  if (meta) { const m = meta[0].match(/url=([^"'>\s]+)/i); if (m) push(m[1].replace(/&amp;/g,'&'), 'meta-refresh', 100); }
  // JS redirects
  for (const re of [/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/g, /location\.replace\(["']([^"']+)["']\)/g, /window\.open\(["']([^"']+)["']/g]) {
    let m; while ((m = re.exec(html))) push(m[1], 'js-redirect', 90);
  }
  // anchors with persuasive text
  try {
    const $ = cheerio.load(html);
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href'); const text = ($(el).text() || '').toLowerCase().trim();
      const idcls = (($(el).attr('id')||'') + ' ' + ($(el).attr('class')||'')).toLowerCase();
      let score = 10;
      if (/skip|continue|get link|go to|destination|proceed|download|open link|direct/.test(text)) score = 85;
      if (/skip|continue|getlink|download|primary|btn/.test(idcls)) score = Math.max(score, 70);
      try { const h = new URL(href, baseUrl).hostname; if (h && h !== new URL(baseUrl).hostname) score += 15; } catch {}
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) push(href, score >= 70 ? 'skip-button' : 'anchor', score);
    });
    $('form[action]').each((_, el) => push($(el).attr('action'), 'form-action', 50));
  } catch {}
  return out.sort((a,b)=>b.score-a.score).slice(0,12);
}
module.exports = { extractMetadata, extractCandidates };
