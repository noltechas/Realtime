import type { ThemeTokens } from './tokens'

// Sketch / hand-drawn — cream paper with marker-blue accents, asymmetric
// blob borders, handwriting font, slight rotate on press. Mirrors the
// desktop SKETCH theme in packages/desktop/src/renderer/src/styles/sketch.ts.
//
// Key reads:
//   - `appBg` is cream paper (#fdfbf7).
//   - `black` maps to a soft graphite (#2d2d2d), not pure black — easier on
//     the eye and matches the marker-on-paper feel.
//   - `accentA` is the sketch blue (#2d5da1) used for primary actions, the
//     way someone might circle a word with a blue pen.
//   - `cardShape: 'blob'` — mobile reads this to assign asymmetric per-corner
//     radii (instead of a single borderRadius value) so cards look hand-drawn.

const PAPER       = '#fdfbf7'
const PAPER_DARK  = '#f5efe2'
const GRAPHITE    = '#2d2d2d'
const SKETCH_BLUE = '#2d5da1'
const PALE_YELLOW = '#fff9c4'
const SOFT_RED    = '#ff4d4d'
const PEN_GREEN   = '#4caf50'

export const SKETCH_TOKENS: ThemeTokens = {
  name: 'sketch',
  displayName: 'Sketch',
  nextThemeName: 'neo-brutal',

  black:       GRAPHITE,
  white:       '#FFFFFF',
  cream:       PAPER,
  creamDark:   PAPER_DARK,
  hotRed:      SOFT_RED,
  vividYellow: PALE_YELLOW,
  softViolet:  SKETCH_BLUE,
  mintGreen:   PEN_GREEN,
  muted:       'rgba(45,45,45,0.65)',
  faint:       'rgba(45,45,45,0.4)',

  accentA: SKETCH_BLUE,
  accentB: PALE_YELLOW,
  accentC: PEN_GREEN,

  appBg:        PAPER,
  titlebarBg:   GRAPHITE,
  titlebarText: '#FFFFFF',

  navBg:           PAPER,
  navBorderBottom: `3px solid ${GRAPHITE}`,
  navLink:         GRAPHITE,
  navLinkActive:   SKETCH_BLUE,
  navLinkActiveBg: 'transparent',
  navLinkHoverBg:  'rgba(45,93,161,0.06)',

  border:        `3px solid ${GRAPHITE}`,
  borderThin:    `2px solid ${GRAPHITE}`,
  borderLight:   `1px solid rgba(45,45,45,0.15)`,
  shadow:        `4px 4px 0px ${GRAPHITE}`,
  shadowLift:    `6px 6px 0px ${GRAPHITE}`,
  shadowPressed: `2px 2px 0px ${GRAPHITE}`,
  shadowColor:   (color: string) => `4px 4px 0px ${color}`,

  radius:      14,
  radiusSmall: 8,

  fontDisplay: "'Kalam', cursive",
  fontBody:    "'Patrick Hand', cursive",

  spinnerBorder:    'rgba(45,45,45,0.15)',
  spinnerBorderTop: SKETCH_BLUE,

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: false,
  cornerStyle: 'rounded',
  cardShape: 'blob',
  shadowStyle: 'offset',
  cardBorderWidth: 2.5,
  displayUppercase: false,
  displayLetterSpacing: 0,
  accentGlowColor: GRAPHITE,
  statusBarStyle: 'dark',

  tabBarBg: PAPER,
  tabBarBlurTint: 'light',
  tabBarOverlay: 'rgba(253,251,247,0.92)',
  tabBarBorder: GRAPHITE,
  tabBarPill: SKETCH_BLUE,
  tabBarPillFg: '#FFFFFF',
  tabBarFg: GRAPHITE,

  dimBorder: 'rgba(45,45,45,0.25)',
  pressedOverlay: 'rgba(45,45,45,0.05)',
}
