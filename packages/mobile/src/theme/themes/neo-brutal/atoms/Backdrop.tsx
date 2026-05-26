// Neo-brutal has no decorative page backdrop — the appBg cream tone is the
// entire backdrop. Returning null lets the screen render straight onto the
// SafeAreaView. (Themes like sketch/cyberpunk/deep-sea ship their own
// Backdrop atoms with ruled lines, dot grids, or animated bubbles.)
export function Backdrop(): null {
  return null
}
