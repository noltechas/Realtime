// On-device error overlay. Mounted only when '?debug' is present in the URL.
// The window 'error' and 'unhandledrejection' listeners are registered by
// the inline <script> in index.html so errors are always logged silently to
// localStorage. This module just provides the visible UI for debugging.

const LS_KEY = 'karaoke_error_log';
// Update both places when bumping cache-bust. Surfaced in the bug button
// label and the state dump so we can confirm at a glance which version of
// the JS the phone is actually running.
const VERSION = '20260524e';
// The 🐞 button is always shown until we close out diagnosing the
// remaining mobile-only bugs. To hide it later, gate this on a URL param.
const DEBUG = true;

function readLog() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch (e) { return []; }
}

function writeLog(entries) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(-20))); }
  catch (e) {}
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
  // Always show the last char of VERSION so the user can confirm their
  // phone actually loaded the latest deploy. E.g. "🐞d" on v…d.
  const vTag = VERSION.slice(-1);
  if (n > 0) {
    btn.style.background = '#c2185b';
    btn.style.boxShadow = '0 0 10px rgba(244,67,108,0.55)';
    btn.textContent = (n > 9 ? '9+' : String(n)) + '·' + vTag;
  } else {
    btn.style.background = 'rgba(0,0,0,0.55)';
    btn.style.boxShadow = 'none';
    btn.textContent = '🐞' + vTag;
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

async function showFullLog() {
  const log = readLog();
  // Pull live state from the running app so we can diagnose theme/session
  // issues — the most common "this isn't working right" cause is state
  // not matching expectations.
  const now = new Date();
  let stateDump = '(state unavailable)';
  try {
    const sMod = await import('./state.js');
    const S = sMod.S;
    stateDump = JSON.stringify({
      now: now.toISOString(),
      cacheBust: VERSION,
      screen: S.screen,
      theme_name: S.theme_name,
      nowPlayingStageTheme: S.nowPlayingStageTheme,
      nowPlaying: S.nowPlaying ? { name: S.nowPlaying.name, trackId: S.nowPlaying.trackId } : null,
      bodyDataTheme: document.body.getAttribute('data-theme'),
      themeStyleSize: document.getElementById('theme-global')?.textContent?.length || 0,
      sessionCode: S.sessionCode,
      guestName: S.guestName,
      catalogSize: (S.catalog || []).length,
      queueSize: (S.queue || []).length,
      songsVisibleCount: S.songsVisibleCount
    }, null, 2);
  } catch (e) {}
  // Annotate each error with how long ago it was logged. Anything > 60s old
  // is almost certainly a stale entry from before your latest test.
  const errText = log.length === 0
    ? '(no errors logged)'
    : log.map((e, i) => {
        const t = new Date(e.time);
        const ageSec = Math.round((now.getTime() - t.getTime()) / 1000);
        const ageTag = isNaN(ageSec) ? '' : ` (${ageSec}s ago${ageSec > 60 ? ' — STALE?' : ''})`;
        return `#${i + 1} [${e.time}]${ageTag}\n${e.message}\nat ${e.source || '?'}:${e.line || '?'}:${e.col || '?'}\n${e.stack || ''}`;
      }).join('\n\n---\n\n');
  const text = `=== STATE ===\n${stateDump}\n\n=== ERRORS (${log.length}) ===\n${errText}`;
  if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
  if (confirm(`State + errors (${log.length}) copied to clipboard.\n\nOK to clear errors, Cancel to keep.`)) {
    writeLog([]);
    refreshBadge();
  }
}

// Manual logging helper (always available — no-op if __pushErr missing).
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

// Only mount the visible UI when '?debug' is in the URL.
if (DEBUG) {
  if (document.body) ensureBugButton();
  else document.addEventListener('DOMContentLoaded', ensureBugButton);
  const existing = readLog();
  if (existing.length > 0) {
    setTimeout(() => {
      if (document.body) showBanner(existing[existing.length - 1]);
    }, 50);
  }
}
