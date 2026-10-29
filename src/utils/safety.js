'use strict';
const net = require('net');
const { findSupported } = require('./supported');

const SUSPICIOUS_TLDS = new Set(['zip', 'mov', 'xyz', 'top', 'click', 'link', 'work', 'party', 'gq', 'tk', 'ml', 'cf', 'buzz', 'live']);
const PHISH_WORDS = ['login', 'verify', 'secure', 'account', 'update', 'confirm', 'wallet', 'claim', 'free', 'bonus', 'airdrop', 'password', 'banking', 'signin'];
const BRANDS = ['paypal', 'facebook', 'instagram', 'google', 'apple', 'microsoft', 'Amazon', 'netflix', 'binance', 'aba', 'acleda', 'wing'];

function analyzeSafety(urlStr, redirectCount = 0) {
  let score = 100;
  const reasons = [];
  let u;
  try { u = new URL(urlStr); } catch { return { score: 0, level: 'danger', reasons: [{ code: 'invalid', en: 'Invalid URL', km: 'URL មិនត្រឹមត្រូវ', points: -100 }] }; }

  const host = u.hostname.toLowerCase();
  const add = (pts, code, en, km) => { score += pts; reasons.push({ code, en, km, points: pts }); };

  if (u.protocol !== 'https:') add(-15, 'no_https', 'Not using HTTPS (not encrypted)', 'មិនប្រើ HTTPS (មិនមានការអ៊ិនគ្រីប)');
  else reasons.push({ code: 'https', en: 'Uses HTTPS', km: 'ប្រើ HTTPS មានសុវត្ថិភាព', points: 0 });

  if (net.isIP(host)) add(-20, 'ip_host', 'Host is a raw IP address', 'Host ជា IP Address ផ្ទាល់');
  if (host.startsWith('xn--') || host.includes('.xn--')) add(-12, 'punycode', 'Punycode domain (possible look-alike)', 'Domain Punycode (អាចជាក្លែងបន្លំ)');
  const labels = host.split('.');
  if (labels.length >= 4) add(-8, 'many_subdomains', 'Many subdomains', 'មាន subdomain ច្រើន');
  const tld = labels[labels.length - 1];
  if (SUSPICIOUS_TLDS.has(tld)) add(-8, 'suspicious_tld', `Less common TLD (.${tld}) — be careful`, `TLD (.${tld}) ត្រូវប្រយ័ត្ន`);
  if (urlStr.length > 200) add(-5, 'very_long', 'Very long URL', 'URL វែងខុសធម្មតា');
  if (urlStr.includes('@') && urlStr.indexOf('@') < urlStr.indexOf(host)) add(-15, 'at_trick', 'Contains @ trick before host', 'មាន @ មុន host (ល្បិចបោក)');
  if (/\d{1,3}(\.\d{1,3}){3}/.test(u.pathname + u.search)) add(-5, 'ip_in_path', 'IP address embedded in path', 'មាន IP ក្នុង path');
  if (redirectCount >= 5) add(-10, 'many_redirects', `Long redirect chain (${redirectCount})`, `Redirect ច្រើនពេក (${redirectCount})`);
  else if (redirectCount >= 3) add(-5, 'several_redirects', `Several redirects (${redirectCount})`, `Redirect ច្រើនគួរសម (${redirectCount})`);

  const lower = urlStr.toLowerCase();
  const hits = PHISH_WORDS.filter((w) => lower.includes(w));
  // Brand impersonation: brand word in host but host is not the brand's own domain
  for (const b of BRANDS) {
    if (host.includes(b) && !host.startsWith(b + '.') && host !== b + '.com' && !host.endsWith('.' + b + '.com')) {
      add(-18, 'brand_lookalike', `Domain looks like it imitates "${b}"`, `Domain មើលទៅដូចក្លែងបន្លំ "${b}"`);
      break;
    }
  }
  if (hits.length >= 2) add(-8, 'phish_words', `Sensitive keywords: ${hits.slice(0, 4).join(', ')}`, `មានពាក្យគ្រោះថ្នាក់: ${hits.slice(0, 4).join(', ')}`);

  const sup = findSupported(host);
  if (sup && sup.category === 'ad') add(-6, 'ad_shortener', 'Ad shortener (ads / popups likely)', 'Link ខ្លីមានផ្សាយពាណិជ្ជកម្ម');
  if (u.searchParams.toString().length > 300) add(-4, 'huge_query', 'Very large query string', 'Query string ធំខុសធម្មតា');

  score = Math.max(0, Math.min(100, score));
  const level = score >= 80 ? 'safe' : score >= 55 ? 'caution' : 'danger';
  return { score, level, reasons };
}
module.exports = { analyzeSafety };
