'use strict';
/* ⚡ AISIGNAL BYPASS PRO — Frontend App */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lastResult = null, bulkResults = [], supportedCache = [], stepTimer = null;

/* ---------- API helper (relative URLs only — works behind preview proxy) ---------- */
async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json', ...(opts.headers||{}) }, ...opts });
  const json = await res.json().catch(() => ({ success:false, error:{ message:'Invalid server response' } }));
  if (!res.ok || !json.success) throw new Error((json.error && json.error.message) || ('HTTP ' + res.status));
  return json.data;
}
function toast(msg, ms = 2600) {
  const el = $('#toast'); el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hidden'), ms);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  toast(window.t('copied'));
}

/* ---------- SPA navigation ---------- */
function showPage(name) {
  $$('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
  $$('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.nav === name));
  $('#mainNav').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (name === 'supported') loadSupported();
  if (name === 'stats') loadStats();
  if (name === 'history') renderHistory();
}
document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) { e.preventDefault(); showPage(nav.dataset.nav); }
});
$('#hamburger').addEventListener('click', () => $('#mainNav').classList.toggle('open'));
$$('.lang-btn').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang)));

/* ---------- i18n-driven blocks ---------- */
function renderFeatures() {
  const grid = $('#featuresGrid'); if (!grid) return;
  grid.innerHTML = window.t('features').map(f => `<div class="feature-card"><span class="fi">${f[0]}</span><h3>${esc(f[1])}</h3><p>${esc(f[2])}</p></div>`).join('');
}
function renderFAQ() {
  const list = $('#faqList'); if (!list) return;
  list.innerHTML = window.t('faq').map(f => `<details class="faq-item"><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join('');
}

/* ---------- History (localStorage) ---------- */
const HIST_KEY = 'aisignal_history_v1';
function getHistory() { try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch { return []; } }
function saveHistoryItem(d, fav = false) {
  const list = getHistory().filter(x => x.originalUrl !== d.originalUrl);
  list.unshift({ originalUrl: d.originalUrl, finalUrl: d.finalUrl, at: new Date().toISOString(), score: d.safety?.score, fav });
  localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(0, 200)));
}
function renderHistory() {
  const box = $('#historyList'); if (!box) return;
  const q = ($('#historySearch')?.value || '').toLowerCase();
  const favOnly = $('#favOnly')?.checked;
  const list = getHistory().filter(x => (!favOnly || x.fav) && (!q || x.originalUrl.toLowerCase().includes(q) || x.finalUrl.toLowerCase().includes(q)));
  if (!list.length) { box.innerHTML = `<p style="color:var(--muted)">${esc(window.t('history_empty'))}</p>`; return; }
  box.innerHTML = list.map((x, i) => `<div class="history-item"><button class="icon-btn ${x.fav?'starred':''}" data-hfav="${i}" title="Favorite">★</button>
    <div class="grow"><a href="${esc(x.finalUrl)}" target="_blank" rel="noopener noreferrer nofollow">${esc(x.finalUrl)}</a>
    <small>↳ ${esc(x.originalUrl)} • ${new Date(x.at).toLocaleString()} ${x.score!=null?`• 🛡️ ${x.score}/100`:''}</small></div>
    <button class="icon-btn" data-hcopy="${esc(x.finalUrl)}">📋</button><button class="icon-btn" data-hdel="${esc(x.originalUrl)}">🗑️</button></div>`).join('');
  box.querySelectorAll('[data-hcopy]').forEach(b => b.onclick = () => copyText(b.dataset.hcopy));
  box.querySelectorAll('[data-hdel]').forEach(b => b.onclick = () => { localStorage.setItem(HIST_KEY, JSON.stringify(getHistory().filter(x => x.originalUrl !== b.dataset.hdel))); renderHistory(); });
  box.querySelectorAll('[data-hfav]').forEach(b => b.onclick = () => { const all = getHistory(); const item = list[+b.dataset.hfav]; const found = all.find(x => x.originalUrl === item.originalUrl); if (found) found.fav = !found.fav; localStorage.setItem(HIST_KEY, JSON.stringify(all)); renderHistory(); });
}
$('#historySearch')?.addEventListener('input', renderHistory);
$('#favOnly')?.addEventListener('change', renderHistory);
$('#clearHistoryBtn')?.addEventListener('click', () => { localStorage.removeItem(HIST_KEY); renderHistory(); toast('🗑️ History cleared'); });

/* ---------- Main bypass ---------- */
function setSteps(on) {
  const box = $('#loadingSteps');
  box.classList.toggle('hidden', !on);
  clearInterval(stepTimer);
  if (!on) return;
  let i = 1;
  const paint = () => {
    $$('.step').forEach(s => { const n = +s.dataset.step; s.classList.toggle('on', n === i); s.classList.toggle('done', n < i); });
    $('#progressBar').style.width = Math.min(92, i * 18) + '%';
    i = Math.min(5, i + 1);
  };
  paint(); stepTimer = setInterval(paint, 1100);
}
function finishSteps() { clearInterval(stepTimer); $$('.step').forEach(s => { s.classList.remove('on'); s.classList.add('done'); }); $('#progressBar').style.width = '100%'; setTimeout(() => $('#loadingSteps').classList.add('hidden'), 500); }

async function doBypass() {
  const url = $('#urlInput').value.trim();
  const errBox = $('#errorBox');
  errBox.classList.add('hidden'); $('#resultBox').classList.add('hidden'); $('#qrBox').classList.add('hidden');
  if (!url) { errBox.textContent = window.t('error_empty'); errBox.classList.remove('hidden'); $('#urlInput').focus(); return; }
  const btn = $('#bypassBtn'); btn.disabled = true; btn.textContent = window.t('bypassing');
  setSteps(true);
  try {
    const data = await api('/api/bypass', { method: 'POST', body: JSON.stringify({ url }) });
    lastResult = data; finishSteps(); renderResult(data); saveHistoryItem(data);
    // If user disabled clean-display: still show raw final as a hint (we already show cleaned as final; note removed list)
    refreshMiniStats();
  } catch (e) {
    clearInterval(stepTimer); $('#loadingSteps').classList.add('hidden');
    errBox.textContent = window.t('error_failed') + ' — ' + e.message; errBox.classList.remove('hidden');
  } finally { btn.disabled = false; btn.textContent = window.t('bypass_now'); }
}

function safetyColor(score) { return score >= 80 ? '#00ff9d' : score >= 55 ? '#ffd500' : '#ff2d78'; }
function renderResult(d) {
  $('#resultBox').classList.remove('hidden');
  $('#finalUrl').value = d.finalUrl;
  $('#openBtn').href = d.finalUrl;
  $('#mOriginal').textContent = (() => { try { return new URL(d.originalUrl).hostname; } catch { return d.originalUrl; } })() + (d.supported ? ` (${d.supported.category})` : '');
  $('#mRedirects').textContent = d.redirectCount;
  $('#mTrackers').textContent = d.removedParams.length + (d.removedParams.length ? ' — ' + d.removedParams.map(p => p.key).slice(0,5).join(', ') : '');
  $('#mStatus').textContent = d.fetched ? ('HTTP ' + d.statusCode + (d.cached ? ' • ⚡cache' : '')) : ('⚠️ ' + (d.fetchError?.code || 'offline'));
  $('#mTime').textContent = d.timingMs + ' ms';

  // safety (hidden card stays, but honour toggle)
  const showSafety = $('#optSafety').checked;
  const card = document.querySelector('.safety-card'); card.style.display = showSafety ? '' : 'none';
  if (showSafety && d.safety) {
    const s = d.safety;
    const arc = document.querySelector('.gauge-arc');
    arc.style.setProperty('--p', s.score); arc.style.setProperty('--gc', safetyColor(s.score));
    $('#safetyScore').textContent = s.score;
    const lvl = $('#safetyLevel');
    lvl.textContent = (s.level === 'safe' ? '🟢 ' + window.t('safe') : s.level === 'caution' ? '🟡 ' + window.t('caution') : '🔴 ' + window.t('danger'));
    lvl.style.color = safetyColor(s.score);
    $('#safetyReasons').innerHTML = s.reasons.map(r => `<li>${r.points < 0 ? '⚠️' : '✓'} ${esc(window.LANG === 'km' ? r.km : r.en)}${r.points ? ` (${r.points})` : ''}</li>`).join('');
  }
  const note = $('#noteBox');
  if (d.note || !d.fetched) {
    note.innerHTML = [d.note, !d.fetched ? ('🌐 ' + (window.LANG==='km' ? 'Server មិនអាចទៅយកគេហទំព័រនេះបាននៅពេលនេះទេ (អាចជាបណ្តាញ ឬគេហទំព័រទប់ស្កាត់ bot)។ យើងបានសម្អាត Tracking និងពិនិត្យសុវត្ថិភាព Link ជូនអ្នករួចហើយ៖ ' : 'The server could not fetch this site right now (network or bot-blocking). We still cleaned the URL and ran the safety analysis: ') + esc(d.fetchError?.message || '')) : ''].filter(Boolean).join('<br>');
    note.classList.remove('hidden');
  } else note.classList.add('hidden');

  // preview
  const showPv = $('#optPreview').checked && d.metadata && (d.metadata.title || d.metadata.description || d.metadata.image);
  $('#previewBox').classList.toggle('hidden', !showPv);
  if (showPv) {
    const img = $('#pvImage'); img.src = d.metadata.image || d.metadata.favicon || ''; img.style.display = img.src ? '' : 'none';
    $('#pvTitle').textContent = d.metadata.title || d.metadata.domain || '';
    $('#pvDesc').textContent = d.metadata.description || (d.metadata.textSnippet || '').slice(0, 220);
    $('#pvDomain').textContent = '🌐 ' + (d.metadata.siteName || d.metadata.domain || '');
  }
  // chain
  $('#chainList').innerHTML = (d.redirectChain || []).map(c => {
    const cls = 's' + String(c.status)[0];
    return `<li><span class="status-code ${cls}">${c.status || '—'}</span> ${esc(c.url)}${c.location ? `<br><small style="color:var(--muted)">↪ ${esc(c.location)}</small>` : ''}</li>`;
  }).join('') || '<li>—</li>';
  // extracted candidates
  const ex = d.extractedLinks || [];
  $('#extractedWrap').style.display = ex.length ? '' : 'none';
  $('#extractedList').innerHTML = ex.map(x => `<li><span class="score-pill">${x.score}</span> <small>(${esc(x.source)})</small> <a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(x.url)}</a> <button class="icon-btn" onclick="copyText('${esc(x.url).replace(/'/g,"\\'")}')">📋</button></li>`).join('');
  $('#resultBox').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

$('#bypassBtn').addEventListener('click', doBypass);
$('#urlInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') doBypass(); });
$('#clearBtn').addEventListener('click', () => { $('#urlInput').value = ''; $('#resultBox').classList.add('hidden'); $('#errorBox').classList.add('hidden'); $('#urlInput').focus(); });
$('#pasteBtn').addEventListener('click', async () => { try { $('#urlInput').value = await navigator.clipboard.readText(); toast('📋 Pasted!'); } catch { toast('⚠️ Browser blocked clipboard read — press Ctrl+V'); $('#urlInput').focus(); } });
$('#copyBtn').addEventListener('click', () => copyText($('#finalUrl').value));
$('#favBtn').addEventListener('click', () => { if (lastResult) { saveHistoryItem(lastResult, true); toast('⭐ Saved to favorites!'); } });
$('#qrBtn').addEventListener('click', async () => {
  if (!lastResult) return;
  const data = await api('/api/qr?text=' + encodeURIComponent(lastResult.finalUrl));
  $('#qrImg').src = data.dataUrl; $('#qrBox').classList.toggle('hidden');
});
$$('.example-chip').forEach(c => c.addEventListener('click', () => { $('#urlInput').value = c.textContent.trim(); doBypass(); }));

/* ---------- Bulk ---------- */
function download(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 800);
}
$('#bulkBtn').addEventListener('click', async () => {
  const urls = $('#bulkInput').value.split(/\n/).map(s => s.trim()).filter(Boolean).slice(0, 20);
  if (!urls.length) { toast(window.t('error_empty')); return; }
  const btn = $('#bulkBtn'); btn.disabled = true; btn.textContent = window.t('bypassing');
  $('#bulkResults').innerHTML = '<p>⏳ ...</p>';
  try {
    const data = await api('/api/bulk', { method: 'POST', body: JSON.stringify({ urls }) });
    bulkResults = data.results;
    $('#bulkResults').innerHTML = bulkResults.map(r => r.success
      ? `<div class="bulk-row">✅ <b>${esc(r.input)}</b><br>↪ <a href="${esc(r.data.finalUrl)}" target="_blank" rel="noopener noreferrer nofollow">${esc(r.data.finalUrl)}</a> <small>(${r.data.redirectCount} redirects • 🛡️ ${r.data.safety.score}/100 • ${r.data.timingMs}ms)</small></div>`
      : `<div class="bulk-row">❌ <b>${esc(r.input)}</b><br><small>${esc(r.error.message)}</small></div>`).join('');
    bulkResults.forEach(r => { if (r.success) saveHistoryItem(r.data); });
    refreshMiniStats();
  } catch (e) { $('#bulkResults').innerHTML = `<div class="error-box">❌ ${esc(e.message)}</div>`; }
  finally { btn.disabled = false; btn.textContent = window.t('bulk_btn'); }
});
$('#copyAllBtn').addEventListener('click', () => copyText(bulkResults.filter(r => r.success).map(r => r.data.finalUrl).join('\n')));
$('#exportTxtBtn').addEventListener('click', () => download('bypassed-links.txt', bulkResults.filter(r => r.success).map(r => r.data.finalUrl).join('\n'), 'text/plain'));
$('#exportCsvBtn').addEventListener('click', () => download('bypassed-links.csv', 'original,final,redirects,safety\n' + bulkResults.map(r => r.success ? `"${r.input}","${r.data.finalUrl}",${r.data.redirectCount},${r.data.safety.score}` : `"${r.input}","ERROR",,`).join('\n'), 'text/csv'));

/* ---------- Tools ---------- */
const pretty = (o) => JSON.stringify(o, null, 2);
$$('.tool-run').forEach(btn => btn.addEventListener('click', async () => {
  const tool = btn.dataset.tool;
  try {
    if (tool === 'clean') { const v = $('#cleanInput').value.trim(); if (!v) return toast(window.t('error_empty')); $('#cleanOut').textContent = pretty(await api('/api/clean', { method:'POST', body: JSON.stringify({ url: v }) })); }
    if (tool === 'safety') { const v = $('#safetyInput').value.trim(); if (!v) return toast(window.t('error_empty')); const d = await api('/api/safety', { method:'POST', body: JSON.stringify({ url: v }) }); $('#safetyOut').textContent = `🛡️ Score: ${d.safety.score}/100 (${d.safety.level})\n` + d.safety.reasons.map(r => `${r.points<0?'⚠️':'✓'} ${window.LANG==='km'?r.km:r.en} (${r.points})`).join('\n'); }
    if (tool === 'trace') { const v = $('#traceInput').value.trim(); if (!v) return toast(window.t('error_empty')); $('#traceOut').textContent = '⏳...' ; $('#traceOut').textContent = pretty(await api('/api/trace', { method:'POST', body: JSON.stringify({ url: v }) })); }
    if (tool === 'qr') { const v = $('#qrInput').value.trim(); if (!v) return toast(window.t('error_empty')); const d = await api('/api/qr?text=' + encodeURIComponent(v)); $('#qrOut').innerHTML = `<img src="${d.dataUrl}" alt="QR"><br><small>${esc(v)}</small>`; }
  } catch (e) { toast('❌ ' + e.message, 3600); }
}));
$('#apiTryBtn').addEventListener('click', async () => {
  const v = $('#apiTryInput').value.trim(); if (!v) return toast(window.t('error_empty'));
  $('#apiTryOut').textContent = '⏳ POST /api/bypass ...';
  try { $('#apiTryOut').textContent = pretty(await api('/api/bypass', { method:'POST', body: JSON.stringify({ url: v }) })); }
  catch (e) { $('#apiTryOut').textContent = '❌ ' + e.message; }
});

/* ---------- Supported ---------- */
let supCat = '';
async function loadSupported() {
  if (supportedCache.length) return paintSupported();
  try { const d = await api('/api/supported'); supportedCache = d.items; paintSupported(); } catch {}
}
function paintSupported() {
  const q = ($('#supportedSearch').value || '').toLowerCase();
  const list = supportedCache.filter(s => (!supCat || s.category === supCat) && (!q || s.domain.includes(q)));
  $('#supportedCount').textContent = `${list.length} / ${supportedCache.length} domains`;
  $('#supportedGrid').innerHTML = list.map(s => `<span class="domain-chip">✅ <b>${esc(s.domain)}</b> <small>${esc(s.category)}</small></span>`).join('');
}
$('#supportedSearch')?.addEventListener('input', paintSupported);
$$('.filter-chip').forEach(c => c.addEventListener('click', () => { supCat = c.dataset.cat; $$('.filter-chip').forEach(x => x.classList.toggle('active', x === c)); paintSupported(); }));

/* ---------- Stats ---------- */
async function refreshMiniStats() {
  try { const s = await api('/api/stats'); $('#miniTotal').textContent = s.total; } catch {}
}
async function loadStats() {
  try {
    const s = await api('/api/stats');
    $('#stTotal').textContent = s.total; $('#stSuccess').textContent = s.successRate + '%';
    $('#stAvg').textContent = s.avgTimeMs + ' ms'; $('#stDomains').textContent = s.supportedDomains;
    $('#recentList').innerHTML = (s.recent || []).map(r => `<li>${r.success ? '✅' : '❌'} <b>${esc(r.originalHost)}</b>${r.finalHost && r.finalHost !== r.originalHost ? ` → ${esc(r.finalHost)}` : ''} <small>• ${r.ms}ms • ${new Date(r.at).toLocaleTimeString()}</small></li>`).join('') || '<li>—</li>';
    drawChart(s.topDomains || []);
  } catch {}
}
function drawChart(top) {
  const cv = $('#topChart'); if (!cv) return;
  const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  if (!top.length) { ctx.fillStyle = '#a5a5d6'; ctx.font = '16px sans-serif'; ctx.fillText('No data yet — bypass some links first! 🚀', 24, 40); return; }
  const max = Math.max(...top.map(d => d.count), 1);
  const colors = ['#ff2d78','#ffd500','#00ff9d','#00d4ff','#a855f7'];
  const bw = Math.min(78, (W - 80) / top.length - 16);
  top.forEach((d, i) => {
    const x = 45 + i * ((W - 70) / top.length), h = (d.count / max) * (H - 110), y = H - 62 - h;
    ctx.fillStyle = colors[i % colors.length]; ctx.shadowColor = colors[i % colors.length]; ctx.shadowBlur = 14;
    ctx.fillRect(x, y, bw, h); ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(d.count, x + bw/2, y - 7);
    ctx.fillStyle = '#a5a5d6'; ctx.font = '10.5px sans-serif';
    const label = d.domain.length > 15 ? d.domain.slice(0, 14) + '…' : d.domain;
    ctx.save(); ctx.translate(x + bw/2, H - 50); ctx.rotate(0.35); ctx.fillText(label, 0, 8); ctx.restore();
  });
}

/* ---------- Particles background ---------- */
(function particles() {
  const cv = $('#particles'), ctx = cv.getContext('2d');
  let pts = [], W, H;
  function resize() { W = cv.width = innerWidth; H = cv.height = innerHeight; pts = Array.from({ length: Math.min(70, W / 22) }, () => ({ x: Math.random()*W, y: Math.random()*H, vx: (Math.random()-.5)*.55, vy: (Math.random()-.5)*.55, r: Math.random()*1.9+.5, h: Math.random()*360 })); }
  resize(); addEventListener('resize', resize);
  (function tick() {
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy; p.h = (p.h + .5) % 360;
      if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fillStyle = `hsla(${p.h},100%,68%,.85)`; ctx.fill();
    }
    for (let i = 0; i < pts.length; i++) for (let j = i+1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], dx = a.x-b.x, dy = a.y-b.y, d = Math.hypot(dx, dy);
      if (d < 125) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `hsla(${(a.h+b.h)/2},100%,70%,${(1-d/125)*.20})`; ctx.stroke(); }
    }
    requestAnimationFrame(tick);
  })();
})();

/* ---------- Init ---------- */
applyLang(window.LANG || 'km');
renderFeatures(); renderFAQ(); renderHistory(); refreshMiniStats();
// Deep link: ?url=... auto-bypass (great for bookmarklet / sharing)
const deepUrl = new URLSearchParams(location.search).get('url');
if (deepUrl) { $('#urlInput').value = deepUrl; doBypass(); }
