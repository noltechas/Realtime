// Stable hidden file input that survives every render(). The original
// per-screen inputs (#profile-avatar-input, #avatar-input) sit inside #app
// and get destroyed when render() does `app.innerHTML = …`. If a render
// fires while the iOS picker is open, the picker dispatches `change` to
// the now-detached input — so the file never reaches us. Routing every
// avatar/photo flow through a single input parked in <body> fixes that.

import { S } from './state.js?v=20260524b';
import { resizeImage } from './utils.js?v=20260524b';
import { render } from './render/main.js?v=20260524b';

let _pendingCallback = null;
let _input = null;

function ensureInput() {
  if (_input && _input.isConnected) return _input;
  _input = document.getElementById('global-photo-input');
  if (!_input) {
    _input = document.createElement('input');
    _input.type = 'file';
    _input.accept = 'image/*';
    _input.id = 'global-photo-input';
    // No pointer-events:none — iOS Safari can refuse to surface a file
    // picker for an input that's been declared non-interactive.
    _input.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
    document.body.appendChild(_input);
  }
  if (!_input._wired) {
    _input._wired = true;
    _input.addEventListener('change', () => {
      if (window.__logErr) window.__logErr('global photo-upload: change fired, files=' + (_input.files ? _input.files.length : 'null'));
      if (!_input.files || !_input.files[0]) {
        _pendingCallback = null;
        return;
      }
      const file = _input.files[0];
      if (window.__logErr) window.__logErr('global photo-upload: file picked ' + file.name + ' (' + file.type + ', ' + file.size + ' bytes)');
      const cb = _pendingCallback;
      _pendingCallback = null;
      if (!cb) {
        if (window.__logErr) window.__logErr('global photo-upload: file picked but no pending callback — ignoring');
        return;
      }
      resizeImage(file, 128, 0.8, (url) => {
        if (window.__logErr) window.__logErr('global photo-upload: resize done, url=' + (url ? 'data:image (' + url.length + ' chars)' : 'NULL'));
        try { cb(url); } catch (e) {
          if (window.__logErr) window.__logErr('global photo-upload: callback threw ' + (e && e.message || e));
        }
        // Clear AFTER reading. Some iOS Safari builds invalidate the file
        // blob the moment you clear input.value, which can race the
        // FileReader read in resizeImage.
        try { _input.value = ''; } catch (e) {}
      });
    });
  }
  return _input;
}

// Mount the input as soon as <body> exists so any later render() in #app
// can't take this element out from under an open picker.
if (document.body) ensureInput();
else document.addEventListener('DOMContentLoaded', ensureInput);

// Call this from a click handler. Stores the callback, opens the picker.
// When the user picks a file, `callback(dataUrl)` runs after the image is
// resized to 128px square JPEG.
export function pickProfilePhoto(callback) {
  _pendingCallback = callback;
  const input = ensureInput();
  if (window.__logErr) window.__logErr('global photo-upload: triggering picker (callback set)');
  try { input.click(); }
  catch (e) {
    if (window.__logErr) window.__logErr('global photo-upload: input.click() threw ' + (e && e.message || e));
    _pendingCallback = null;
  }
}
