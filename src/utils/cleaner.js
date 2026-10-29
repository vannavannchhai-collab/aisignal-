'use strict';
/**
 * URL Cleaner — removes tracking parameters, keeps essential ones.
 */
const GLOBAL_TRACKERS = [
  /^utm_/i, /^_ga$/i, /^_gl$/i, /^_gac/i, /^_fb/i, /^fbclid$/i, /^gclid$/i, /^dclid$/i,
  'msclkid','mc_cid','mc_eid','igshid','igsh','yclid','rb_clickid','twclid','ttclid',
  'li_fat_id','vero_id','wickedid','oly_enc_id','oly_anon_id','__s','s_cid','mkt_tok',
  '_hsenc','_hsmi','hsctatracking','_openstat','icid','itm_source','itm_medium','itm_campaign',
  'ncid','cmpid','mbid','spm','ref_src','ref_url','referrer','source','medium','campaign',
  'si','feature','kw','pcampaignid','gad_source','gbraid','wbraid','gs_l',
];

function isTracker(key, hostname) {
  const k = key.toLowerCase();
  // Site-specific keep-lists
  const host = (hostname || '').toLowerCase();
  if (host.includes('youtube.') || host === 'youtu.be') {
    // keep v, t, list, index ; si/feature are trackers
    if (['si', 'feature', 'pp', 'embeds_referring_euri'].includes(k)) return true;
  }
  for (const t of GLOBAL_TRACKERS) {
    if (typeof t === 'string') { if (k === t.toLowerCase()) return true; }
    else if (t.test(key)) return true;
  }
  if (k.startsWith('utm_')) return true;
  return false;
}

function cleanUrl(input) {
  let u;
  try { u = new URL(input); } catch { return { cleaned: input, removed: [], kept: [] }; }
  const removed = [];
  const kept = [];
  const params = new URLSearchParams(u.search);

  // Amazon: strip everything after /dp/XXXXXXXXXX and most params except none needed
  const host = u.hostname.toLowerCase();
  let pathCleaned = false;
  if (host.includes('Amazon.')) {
    const m = u.pathname.match(/(\/(?:dp|gp\/product)\/[A-Z0-9]{10})/i);
    if (m) { u.pathname = m[1]; pathCleaned = true; }
  }
  // Twitter/X share params
  for (const [key, value] of [...params.entries()]) {
    let tracker = isTracker(key, host);
    if ((host.includes('twitter.com') || host.includes('x.com')) && ['s', 't'].includes(key.toLowerCase())) tracker = true;
    if (host.includes('Amazon.') && pathCleaned) tracker = true;
    if (tracker) { removed.push({ key, value }); params.delete(key); }
    else kept.push({ key, value });
  }
  u.search = params.toString() ? '?' + params.toString() : '';
  // Strip tracking-only fragments
  if (u.hash && /^#:~:text=/.test(u.hash)) { /* keep text fragments, they are useful */ }
  return { cleaned: u.href, removed, kept, removedCount: removed.length };
}

module.exports = { cleanUrl, isTracker };
