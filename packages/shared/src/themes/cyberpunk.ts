import type { ThemeTokens } from './tokens'

// Cyberpunk / Glitch — high-tech dystopia, neon green on void black, hard
// edges, monospace, neon glow shadows. Mirrors the desktop CYBERPUNK theme
// in packages/desktop/src/renderer/src/styles/cyberpunk.ts.
//
// NOTE on semantic color mapping for cross-platform parity:
//   `black` maps to the *foreground* (light green/white) so existing call
//   sites that use `tokens.black` for text stay readable on dark backgrounds.
//   `white` maps to the dark VOID for inverted blocks (queue rows, banner
//   backgrounds) so existing call sites that use `tokens.white` for "card"
//   backgrounds still get the right contrast against the page bg.

const VOID         = '#060610'
const VOID_PANEL   = '#0a0a1a'
const VOID_CARD    = '#0d0d20'
const NEON_GREEN   = '#00ff88'
const NEON_CYAN    = '#00e5ff'
const NEON_MAGENTA = '#ff00aa'
const NEON_AMBER   = '#ffcc00'
const NEON_RED     = '#ff0055'
const WHITE_TINTED = '#d0ffe8'

const SINGER_COLORS = [
  { color: '#00ff88', colorGlow: 'rgba(0,255,136,0.4)'   },
  { color: '#ff00aa', colorGlow: 'rgba(255,0,170,0.4)'   },
  { color: '#00e5ff', colorGlow: 'rgba(0,229,255,0.4)'   },
  { color: '#ffcc00', colorGlow: 'rgba(255,204,0,0.4)'   },
  { color: '#ff3366', colorGlow: 'rgba(255,51,102,0.4)'  },
  { color: '#aa00ff', colorGlow: 'rgba(170,0,255,0.4)'   },
  { color: '#ff6600', colorGlow: 'rgba(255,102,0,0.4)'   },
  { color: '#00ffcc', colorGlow: 'rgba(0,255,204,0.4)'   },
  { color: '#ff0055', colorGlow: 'rgba(255,0,85,0.4)'    },
  { color: '#66ff00', colorGlow: 'rgba(102,255,0,0.4)'   },
  { color: '#ff44cc', colorGlow: 'rgba(255,68,204,0.4)'  },
  { color: '#00ccff', colorGlow: 'rgba(0,204,255,0.4)'   },
  { color: '#ffaa00', colorGlow: 'rgba(255,170,0,0.4)'   },
]

export const CYBERPUNK_TOKENS: ThemeTokens = {
  name: 'cyberpunk',
  displayName: 'Cyberpunk',
  nextThemeName: 'sketch',

  // black=foreground (light), white=background (dark) — semantic swap so the
  // mobile screens that read `tokens.black` for text and `tokens.white` for
  // card surfaces both keep their contrast meaning.
  black:       WHITE_TINTED,
  white:       VOID_CARD,
  cream:       VOID_PANEL,
  creamDark:   VOID_CARD,
  hotRed:      NEON_RED,
  vividYellow: NEON_AMBER,
  softViolet:  NEON_CYAN,
  mintGreen:   NEON_GREEN,
  muted:       'rgba(0,255,136,0.6)',
  faint:       'rgba(0,255,136,0.3)',

  accentA: NEON_GREEN,
  accentB: NEON_MAGENTA,
  accentC: NEON_CYAN,

  appBg:        VOID,
  titlebarBg:   VOID,
  titlebarText: 'rgba(0,255,136,0.65)',

  navBg:           'rgba(6,6,16,0.96)',
  navBorderBottom: '1px solid rgba(0,255,136,0.18)',
  navLink:         'rgba(0,255,136,0.55)',
  navLinkActive:   NEON_GREEN,
  navLinkActiveBg: 'rgba(0,255,136,0.07)',
  navLinkHoverBg:  'rgba(0,255,136,0.05)',

  border:        '1px solid rgba(0,255,136,0.18)',
  borderThin:    '1px solid rgba(0,255,136,0.12)',
  borderLight:   '1px solid rgba(0,255,136,0.07)',
  shadow:        '0 0 10px rgba(0,255,136,0.18)',
  shadowLift:    '0 0 18px rgba(0,255,136,0.28)',
  shadowPressed: '0 0 4px rgba(0,255,136,0.12)',
  shadowColor:   (color: string) => `0 0 12px ${color}, 0 0 24px ${color}`,

  radius:      0,
  radiusSmall: 0,

  fontDisplay: "'Share Tech Mono', 'Fira Code', 'Courier New', monospace",
  fontBody:    "'Share Tech Mono', 'Fira Code', 'Courier New', monospace",

  spinnerBorder:    'rgba(0,255,136,0.15)',
  spinnerBorderTop: NEON_GREEN,

  singerColors: SINGER_COLORS,

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: true,
  cornerStyle: 'sharp',
  cardShape: 'box',
  shadowStyle: 'glow',
  cardBorderWidth: 1,
  displayUppercase: true,
  displayLetterSpacing: 1.5,
  accentGlowColor: NEON_GREEN,
  statusBarStyle: 'light',

  tabBarBg: VOID_PANEL,
  tabBarBlurTint: 'dark',
  tabBarOverlay: 'rgba(10,10,26,0.78)',
  tabBarBorder: 'rgba(0,255,136,0.28)',
  tabBarPill: NEON_GREEN,
  tabBarPillFg: VOID,
  tabBarFg: 'rgba(0,255,136,0.6)',

  dimBorder: 'rgba(0,255,136,0.22)',
  pressedOverlay: 'rgba(0,255,136,0.1)',
}
