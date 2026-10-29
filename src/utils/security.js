'use strict';
const dns = require('dns').promises;
const net = require('net');

/** Block SSRF to private / local addresses */
function isPrivateIPv4(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true; // cloud metadata link-local
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}
function isPrivateIP(ip) {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    return (
      low === '::1' ||
      low === '::' ||
      low.startsWith('fe80') ||
      low.startsWith('fc') ||
      low.startsWith('fd') ||
      low.startsWith('::ffff:127.') ||
      low.startsWith('::ffff:10.') ||
      low.startsWith('::ffff:192.168.')
    );
  }
  return false;
}

const BLOCKED_HOSTS = new Set(['localhost', 'metadata.google.internal', 'metadata', 'instance-data']);

function normalizeUrl(input) {
  if (!input || typeof input !== 'string') throw err('EMPTY_URL', 'URL is required / សូមបញ្ចូល URL');
  let s = input.trim();
  if (!s) throw err('EMPTY_URL', 'URL is required / សូមបញ្ចូល URL');
  if (s.length > 4096) throw err('URL_TOO_LONG', 'URL is too long (max 4096 chars)');
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) s = 'https://' + s;
  let u;
  try { u = new URL(s); } catch { throw err('INVALID_URL', 'Invalid URL / URL មិនត្រឹមត្រូវ'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw err('BLOCKED_PROTOCOL', 'Only http/https URLs are allowed');
  if (!u.hostname) throw err('INVALID_URL', 'Invalid hostname');
  return u;
}
function err(code, message) { const e = new Error(message); e.code = code; e.status = 400; return e; }

function validateUrlSync(input) {
  const u = normalizeUrl(input);
  const host = u.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw err('BLOCKED_HOST', 'Local/internal hosts are blocked for safety');
  }
  if (net.isIP(host) && isPrivateIP(host)) throw err('BLOCKED_HOST', 'Private IP addresses are blocked for safety');
  if (u.username || u.password) throw err('BLOCKED_HOST', 'URLs with embedded credentials are blocked');
  return u.href;
}

/** Async check: resolve DNS and block if it points to private IP. Non-fatal if DNS lookup itself fails (fetch will report). */
async function validateUrl(input) {
  const href = validateUrlSync(input);
  const u = new URL(href);
  const host = u.hostname;
  if (!net.isIP(host)) {
    try {
      const records = await dns.lookup(host, { all: true, verbatim: true });
      for (const r of records) {
        if (isPrivateIP(r.address)) throw err('BLOCKED_HOST', `Host resolves to a private IP (${host}) — blocked`);
      }
    } catch (e) {
      if (e.code === 'BLOCKED_HOST') throw e;
      // DNS failure: let fetch attempt / report its own error
    }
  }
  return href;
}

module.exports = { normalizeUrl, validateUrl, validateUrlSync, isPrivateIP };
