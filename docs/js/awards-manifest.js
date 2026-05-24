// Lazy-loader for awards-icons/manifest.js (~905KB).
//
// The manifest defines two globals:
//   window.AWARDS_ICONS         — 854KB icon catalog (only needed for the picker)
//   window.AWARDS_FEATURED_SVGS — 51KB inlined SVGs for ~30 featured icons
//
// Loading this eagerly on every page was a major iOS Safari memory pressure
// source (the songs render was being killed by the OS). We now inject the
// <script> only when the user actually opens the Awards tab.
//
// Existing award icons still render before the manifest finishes loading —
// awardsIconBody() falls back to fetching the icon via CDN (mask-image) when
// AWARDS_FEATURED_SVGS isn't available.

let _promise = null;

export function ensureAwardsManifest() {
  if (window.AWARDS_ICONS && window.AWARDS_FEATURED_SVGS) {
    return Promise.resolve();
  }
  if (_promise) return _promise;
  _promise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'awards-icons/manifest.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = (e) => {
      _promise = null; // allow retry
      reject(e);
    };
    document.head.appendChild(s);
  });
  return _promise;
}

export function awardsManifestLoaded() {
  return !!(window.AWARDS_ICONS && window.AWARDS_FEATURED_SVGS);
}
