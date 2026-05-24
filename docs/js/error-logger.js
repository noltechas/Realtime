// On-device error overlay + localStorage log.
// Loaded FIRST (before anything else) so it catches early module-load errors.
//
// Why: iOS Safari shows "A problem repeatedly occurred" on crashes but hides
// the actual JS error. Without DevTools you can't see what threw. This logger:
//   1. Listens for window 'error' and 'unhandledrejection' events
//   2. Shows the most recent error as a fixed red banner at the top
//   3. Persists the last 20 errors to localStorage so they survive crashes/reloads
//   4. Adds a small 🐞 button (top-right) that dumps the full log when tapped

const LS_KEY = 'karaoke_error_log';
const MAX = 20;

function readLog() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch (e) { return []; }
}

function writeLog(entries) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(-MAX))); }
  catch (e) {}
}

function append(entry) {
  const log = readLog();
  log.push(entry);
  writeLog(log);
  showBanner(entry);
}

function ensureBugButton() {
  if (document.getElementById('err-bug-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'err-bug-btn';
  btn.textContent = '🐞';
  btn.title = 'View error log';
  btn.style.cssText = [
    'position:fixed','top:4px','right:4px','z-index:2147483646',
    'width:28px','height:28px','padding:0','border-radius:50%',
    'border:1px solid rgba(255,255,255,0.3)','background:rgba(0,0,0,0.55)',
    'color:#fff','font-size:14px','line-height:28px','text-align:center',
    'cursor:pointer','-webkit-tap-highlight-color:transparent'
  ].join(';');
  btn.addEventListener('click', showFullLog);
  document.body.appendChild(btn);
  // Mark unread count via badge color
  refreshBadge();
}

function refreshBadge() {
  const btn = document.getElementById('err-bug-btn');
  if (!btn) return;
  const n = readLog().length;
  if (n > 0) {
    btn.style.background = '#c2185b';
    btn.style.boxShadow = '0 0 10px rgba(244,67,108,0.55)';
    btn.textContent = n > 9 ? '9+' : String(n);
  } else {
    btn.style.background = 'rgba(0,0,0,0.55)';
    btn.style.boxShadow = 'none';
    btn.textContent = '🐞';
  }
}

function showBanner(entry) {
  // Removes any existing banner first
  const old = document.getElementById('err-banner');
  if (old) old.remove();
  const div = document.createElement('div');
  div.id = 'err-banner';
  div.style.cssText = [
    'position:fixed','top:0','left:0','right:0','z-index:2147483647',
    'background:#c2185b','color:#fff','padding:10px 40px 10px 12px',
    'font:600 12px/1.4 monospace','white-space:pre-wrap','word-break:break-word',
    'box-shadow:0 4px 16px rgba(0,0,0,0.45)','max-height:40vh','overflow:auto'
  ].join(';');
  const where = entry.source ? `${entry.source}:${entry.line || '?'}:${entry.col || '?'}` : '(unknown)';
  div.textContent = `[ERR] ${entry.message}\nat ${where}`;
  const close = document.createElement('button');
  close.textContent = '×';
  close.style.cssText = 'position:absolute;top:4px;right:6px;background:none;border:none;color:#fff;font-size:22px;cursor:pointer;padding:0;width:28px;height:28px;line-height:1';
  close.addEventListener('click', () => div.remove());
  div.appendChild(close);
  if (document.body) document.body.appendChild(div);
  else document.addEventListener('DOMContentLoaded', () => document.body.appendChild(div));
  refreshBadge();
}

function showFullLog() {
  const log = readLog();
  if (log.length === 0) { alert('Error log is empty.'); return; }
  const text = log.map((e, i) =>
    `#${i + 1} [${e.time}]\n${e.message}\nat ${e.source || '?'}:${e.line || '?'}:${e.col || '?'}\n${e.stack || ''}`
  ).join('\n\n---\n\n');
  // Copy to clipboard so user can paste it back to us
  if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
  if (confirm(`Errors (${log.length}) copied to clipboard. Tap OK to clear log, Cancel to keep.`)) {
    writeLog([]);
    refreshBadge();
  }
}

window.addEventListener('error', (ev) => {
  append({
    time: new Date().toISOString(),
    message: (ev.error && ev.error.message) || ev.message || 'Unknown error',
    source: ev.filename || '',
    line: ev.lineno || 0,
    col: ev.colno || 0,
    stack: (ev.error && ev.error.stack) || ''
  });
});

window.addEventListener('unhandledrejection', (ev) => {
  const reason = ev.reason;
  append({
    time: new Date().toISOString(),
    message: (reason && reason.message) || String(reason) || 'Unhandled rejection',
    source: '',
    line: 0,
    col: 0,
    stack: (reason && reason.stack) || ''
  });
});

// Add the 🐞 button as soon as the body exists.
if (document.body) ensureBugButton();
else document.addEventListener('DOMContentLoaded', ensureBugButton);

// If errors are persisted from before, surface the most recent one immediately.
const existing = readLog();
if (existing.length > 0) {
  // Don't auto-show banner on every load — but if the user opens with ?debug,
  // pop the most recent one so they see what last crashed.
  if (new URLSearchParams(location.search).has('debug')) {
    showBanner(existing[existing.length - 1]);
  }
}

// Expose a small helper for manual logging from app code if useful.
window.__logErr = (msg, extra) => append({
  time: new Date().toISOString(),
  message: '[manual] ' + msg,
  source: '',
  line: 0,
  col: 0,
  stack: extra ? String(extra) : ''
});
