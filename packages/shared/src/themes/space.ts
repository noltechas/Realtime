import type { ThemeTokens } from './tokens'

// Space — "FLIGHT DECK". A spacecraft instrument panel, not a neon poster:
// milled titanium structure, black-glass readouts, and exactly three lamp
// colours. Every surface in this theme is a machined plate whose corners are cut
// at 45°, and state is communicated by a single lit bar rather than by hue
// changes across the whole element.
//
// Palette logic, taken from real cockpit lighting:
//   • ice cyan `#5BE9FF`      → the live / nominal systems lamp (accentA)
//   • caution amber `#FFB43D` → the "attention here" lamp (accentB — must stay
//     bright, the NOW PLAYING banner puts dark text on it)
//   • drive violet `#8B5CFF`  → the engine / plasma tertiary (accentC)
// Everything structural is desaturated steel so those three lamps are the only
// saturated pixels on screen. That restraint is what makes it read as machined
// hardware instead of a sci-fi sticker pack.
//
// This replaced a hot-magenta + plasma-cyan palette. Magenta is deliberately
// gone from the theme entirely — it reads as 2010s neon, not as a spacecraft.
export const SPACE_TOKENS: ThemeTokens = {
  name: 'space',
  displayName: 'Space',
  nextThemeName: 'steampunk',

  // Raw colours — cool instrument white on deep hull shadow. `black` / `white`
  // are semantic: on this dark theme `black` is the light foreground.
  black:       '#DCE6F2',     // primary text — cool instrument white
  white:       '#04060B',     // inverted for "light" blocks — deepest hull shadow
  cream:       '#0B1119',     // panel base
  creamDark:   '#131C27',     // raised panel / card surface
  hotRed:      '#FF5A4A',     // master caution
  vividYellow: '#FFB43D',     // caution amber
  softViolet:  '#8B5CFF',     // drive plasma
  mintGreen:   '#52FFB8',     // go / confirmed
  muted:       '#7B8A9C',     // cool steel gray
  faint:       'rgba(91,233,255,0.16)',

  accentA: '#5BE9FF',          // ice cyan — live systems (primary)
  accentB: '#FFB43D',          // caution amber — bright, takes dark text
  accentC: '#8B5CFF',          // drive violet — tertiary

  // Shell
  appBg:         '#04060B',
  titlebarBg:    '#04060B',
  titlebarText:  '#7B8A9C',

  navBg:           'rgba(4,6,11,0.94)',
  navBorderBottom: '1px solid rgba(91,233,255,0.14)',
  navLink:         '#7B8A9C',
  navLinkActive:   '#5BE9FF',
  navLinkActiveBg: 'rgba(91,233,255,0.09)',
  navLinkHoverBg:  'rgba(91,233,255,0.05)',

  border:       '1px solid rgba(91,233,255,0.18)',
  borderThin:   '1px solid rgba(91,233,255,0.11)',
  borderLight:  '1px solid rgba(91,233,255,0.07)',
  // Depth first, glow second. The old values led with a magenta halo; a milled
  // panel is legible because it sits above its shadow, not because it glows.
  shadow:        '0 2px 10px rgba(0,0,0,0.55), 0 0 8px rgba(91,233,255,0.07)',
  shadowLift:    '0 8px 26px rgba(0,0,0,0.6), 0 0 16px rgba(91,233,255,0.16)',
  shadowPressed: '0 1px 3px rgba(0,0,0,0.6)',
  shadowColor:   (color: string) => `0 0 14px ${color}, 0 0 28px ${color}`,

  // Machined plates have barely-there corners; the chamfer does the shaping.
  radius:      4,
  radiusSmall: 3,

  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  spinnerBorder:    'rgba(91,233,255,0.16)',
  spinnerBorderTop: '#5BE9FF',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: true,
  cornerStyle: 'sharp',              // chamfered plates, not rounded cards
  cardShape: 'box',
  shadowStyle: 'glow',
  cardBorderWidth: 1,
  displayUppercase: true,            // Chakra Petch reads strongest in caps
  displayLetterSpacing: 2,
  accentGlowColor: '#5BE9FF',        // ice halo
  statusBarStyle: 'light',

  tabBarBg: '#070C14',
  tabBarBlurTint: 'dark',
  tabBarOverlay: 'rgba(4,6,11,0.66)',
  tabBarBorder: 'rgba(91,233,255,0.24)',
  tabBarPill: '#5BE9FF',             // lit ice plate behind the active tab
  tabBarPillFg: '#04060B',           // hull-dark glyph on the lit plate
  tabBarFg: '#66788C',               // one shared colour for every inactive tab

  dimBorder: 'rgba(91,233,255,0.20)',
  pressedOverlay: 'rgba(91,233,255,0.10)',
}
