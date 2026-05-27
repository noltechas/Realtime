import type { ThemeTokens } from './tokens'

// Retrowave / Synthwave — 1984-on-a-VHS-tape aesthetic. Hot magenta + electric
// cyan + sunset orange neon on a deep purple-black sky. Hero motifs that every
// retrowave atom touches: a wireframe perspective grid receding to a vanishing
// point on the horizon, a slatted neon sun (horizontal cut-lines bisecting an
// orange→pink→purple sunset disc), chrome bevels on plates, scanline overlays
// (faint horizontal stripes evoking a CRT), drifting palm-tree silhouettes,
// pyramid mountains in deep purple, sparse twinkling stars in the sky band,
// chromatic-aberration text fringes (cyan + magenta offset glow), and italic
// chunky display caps.
//
// `black`/`white` are SEMANTIC tokens on this dark theme: `black` is the
// readable light text color, `white` the dark surface stand-in (mirrors how
// cyberpunk / space / steampunk treat these).
export const RETROWAVE_TOKENS: ThemeTokens = {
  name: 'retrowave',
  displayName: 'Retrowave',
  nextThemeName: 'neo-brutal', // mobile ring loops back

  // Raw colors — laser neon on deep purple-black sky
  black:       '#F4E8FF',     // primary text — soft lavender white
  white:       '#0A0420',     // inverted for "light" blocks (dark sky)
  cream:       '#1A0A3A',     // dim panel — deep indigo
  creamDark:   '#1A0A3A',     // same — dark surface stand-in
  hotRed:      '#FF003C',     // laser red
  vividYellow: '#FFB13B',     // sunset orange
  softViolet:  '#B967FF',     // electric violet
  mintGreen:   '#00FF9F',     // chartreuse neon
  muted:       '#9A82CF',     // dusty lavender — secondary text
  faint:       'rgba(255,45,149,0.25)',

  accentA: '#FF2D95',          // hot pink magenta — primary
  accentB: '#00F0FF',          // electric cyan — secondary
  accentC: '#B967FF',          // electric violet — tertiary

  // Shell
  appBg:         '#0A0420',     // deep purple-black sky
  titlebarBg:    '#0A0420',
  titlebarText:  '#9A82CF',

  navBg:           'rgba(10,4,32,0.95)',
  navBorderBottom: '1px solid rgba(255,45,149,0.45)',
  navLink:         '#9A82CF',
  navLinkActive:   '#FF2D95',
  navLinkActiveBg: 'rgba(255,45,149,0.10)',
  navLinkHoverBg:  'rgba(255,45,149,0.06)',

  border:       '1px solid rgba(255,45,149,0.6)',
  borderThin:   '1px solid rgba(255,45,149,0.35)',
  borderLight:  '1px solid rgba(255,45,149,0.18)',
  shadow:        '0 0 8px rgba(255,45,149,0.55), 0 0 16px rgba(0,240,255,0.25)',
  shadowLift:    '0 0 14px rgba(255,45,149,0.7), 0 0 28px rgba(0,240,255,0.4)',
  shadowPressed: '0 0 4px rgba(255,45,149,0.4)',
  shadowColor:   (color: string) => `0 0 12px ${color}, 0 0 24px ${color}`,

  radius:      0,
  radiusSmall: 0,

  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  spinnerBorder:    'rgba(255,45,149,0.18)',
  spinnerBorderTop: '#FF2D95',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: true,
  cornerStyle: 'sharp',               // angular geometric — 80s vector grid
  cardShape: 'box',
  shadowStyle: 'glow',                // neon halo around every plate
  cardBorderWidth: 1,
  displayUppercase: true,
  displayLetterSpacing: 2.4,
  accentGlowColor: '#FF2D95',         // hot-pink halo
  statusBarStyle: 'light',

  tabBarBg: '#0A0420',
  tabBarBlurTint: 'dark',
  tabBarOverlay: 'rgba(10,4,32,0.7)',
  tabBarBorder: 'rgba(255,45,149,0.55)',
  tabBarPill: '#FF2D95',
  tabBarPillFg: '#0A0420',
  tabBarFg: '#9A82CF',

  dimBorder: 'rgba(255,45,149,0.30)',
  pressedOverlay: 'rgba(255,45,149,0.10)',
}
