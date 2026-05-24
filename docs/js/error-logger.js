// On-device error overlay. The window 'error' and 'unhandledrejection'
// listeners are registered in an inline <script> at the top of <body> in
// index.html, so they're already active before any module evaluates.
// This file just provides the visual UI (red banner + 🐞 button + clipboard
// dump) and marks lifecycle stages so we can tell how far the page got.

const LS_KEY = 'karaoke_error_log';
const LM_KEY = 'karaoke_lifecycle';

function readLog() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch (e) { return []; }
}

function writeLog(entries) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(-20))); }
  catch (e) {}
}

function readLifecycle() {
  try { return JSON.parse(localStorage.getItem(LM_KEY) || '[]'); }
  catch (e) { return []; }
}

function ensureBugButton() {
  if (document.getElementById('err-bug-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'err-bug-btn';
  btn.title = 'View error log';
  btn.style.cssText = [
    'position:fixed','top:4px','right:4px','z-index:2147483646',
    'min-width:28px','height:28px','padding:0 6px','border-radius:14px',
    'border:1px solid rgba(255,255,255,0.3)','background:rgba(0,0,0,0.55)',
    'color:#fff','font:700 11px/28px monospace','text-align:center',
    'cursor:pointer','-webkit-tap-highlight-color:transparent'
  ].join(';');
  btn.addEventListener('click', showFullLog);
  document.body.appendChild(btn);
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
  document.body.appendChild(div);
  refreshBadge();
}

function showFullLog() {
  const log = readLog();
  const lc = readLifecycle();
  const lcStages = lc.map((e) => `${new Date(e.t).toISOString().slice(11,23)} ${e.stage}`).join('\n');
  const errText = log.length === 0
    ? '(no errors)'
    : log.map((e, i) =>
        `#${i + 1} [${e.time}]\n${e.message}\nat ${e.source || '?'}:${e.line || '?'}:${e.col || '?'}\n${e.stack || ''}`
      ).join('\n\n---\n\n');
  const text = `=== LIFECYCLE (last ${lc.length} stages) ===\n${lcStages || '(none)'}\n\n=== ERRORS (${log.length}) ===\n${errText}`;
  if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
  if (confirm(`Copied to clipboard:\n• Lifecycle stages: ${lc.length}\n• Errors: ${log.length}\n\nOK to clear, Cancel to keep.`)) {
    writeLog([]);
    try { localStorage.removeItem(LM_KEY); } catch (e) {}
    refreshBadge();
  }
}

// Wire up the UI as soon as <body> exists.
if (document.body) ensureBugButton();
else document.addEventListener('DOMContentLoaded', ensureBugButton);

// Surface the most recent persisted error on app start so the user sees it
// without having to tap the 🐞 (especially after a Safari reload-loop).
const existing = readLog();
if (existing.length > 0) {
  // Defer slightly so the banner stacks above any other startup UI
  setTimeout(() => {
    if (document.body) showBanner(existing[existing.length - 1]);
  }, 50);
}

// Helper for app code to log manually if useful.
window.__logErr = (msg, extra) => {
  if (typeof window.__pushErr === 'function') {
    window.__pushErr({
      time: new Date().toISOString(),
      message: '[manual] ' + msg,
      source: '', line: 0, col: 0,
      stack: extra ? String(extra) : ''
    });
  }
};

// Mark that all modules finished evaluating.
if (typeof window.__mark === 'function') window.__mark('modules-loaded');
