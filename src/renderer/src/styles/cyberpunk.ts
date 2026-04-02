// Cyberpunk / Glitch Design System
// High-tech dystopia: neon on void black, glitch animations, scanlines,
// chromatic aberration, sharp angular HUD aesthetic, terminal monospace fonts.

import type { Theme } from './theme'

// ── Palette ──────────────────────────────────────────────────────────────────
const VOID        = '#060610'
const VOID_PANEL  = '#0a0a1a'
const VOID_CARD   = '#0d0d20'
const NEON_GREEN  = '#00ff88'   // primary neon — acid green like the reference
const NEON_CYAN   = '#00e5ff'   // secondary
const NEON_MAGENTA= '#ff00aa'   // tertiary / danger
const NEON_AMBER  = '#ffcc00'   // warning / highlight
const WHITE       = '#d0ffe8'   // slightly tinted white

const greenGlow  = (spread = 8,  a = 0.45) => `0 0 ${spread}px rgba(0,255,136,${a})`
const cyanGlow   = (spread = 8,  a = 0.35) => `0 0 ${spread}px rgba(0,229,255,${a})`
const magentaGlow= (spread = 6,  a = 0.3)  => `0 0 ${spread}px rgba(255,0,170,${a})`

const FONT = "'Share Tech Mono', 'Fira Code', 'Courier New', monospace"

// ── Singer colors — vivid neons ───────────────────────────────────────────────
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

// ── Global CSS injected when cyberpunk theme is active ────────────────────────
const GLOBAL_CSS = `
/* ── Force zero border-radius everywhere in cyberpunk theme ───────────────── */
[data-theme="cyberpunk"] *,
[data-theme="cyberpunk"] *::before,
[data-theme="cyberpunk"] *::after {
  border-radius: 0 !important;
}

/* ── Dot-grid background on the content area ──────────────────────────────── */
[data-theme="cyberpunk"] .main {
  background-image:
    radial-gradient(circle, rgba(0,255,136,0.12) 1px, transparent 1px);
  background-size: 28px 28px;
  background-position: 0 0;
}

/* ── Scanline overlay ─────────────────────────────────────────────────────── */
[data-theme="cyberpunk"] .main::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(0, 255, 136, 0.018) 3px,
    rgba(0, 255, 136, 0.018) 4px
  );
  animation: cpScanlineDrift 12s linear infinite;
}

@keyframes cpScanlineDrift {
  0%   { background-position: 0 0; }
  100% { background-position: 0 200px; }
}

/* ── Glitch keyframes ─────────────────────────────────────────────────────── */
@keyframes cpGlitch {
  0%, 92%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
  93%  { clip-path: inset(18% 0 62% 0); transform: translate(-3px,  1px); }
  94%  { clip-path: inset(55% 0 12% 0); transform: translate( 3px, -1px); }
  95%  { clip-path: inset(38% 0 38% 0); transform: translate(-1px,  2px); }
  96%  { clip-path: inset(76% 0  8% 0); transform: translate( 2px, -2px); }
  97%  { clip-path: inset( 8% 0 74% 0); transform: translate(0); }
}

@keyframes cpFlicker {
  0%, 93%, 100% { opacity: 1; }
  94% { opacity: 0.75; }
  95% { opacity: 1; }
  96% { opacity: 0.55; }
  97% { opacity: 1; }
}

/* ── Chromatic aberration on h1/h2 headings ──────────────────────────────── */
@keyframes cpChroma {
  0%, 88%, 100% {
    text-shadow:
      0 0 10px rgba(0,255,136,0.9),
      0 0 22px rgba(0,255,136,0.5),
      0 0 40px rgba(0,255,136,0.25);
  }
  90% {
    text-shadow:
      -3px 0 rgba(255,0,170,0.8),
       3px 0 rgba(0,229,255,0.8),
      0 0 10px rgba(0,255,136,0.9),
      0 0 30px rgba(0,255,136,0.4);
  }
  92% {
    text-shadow:
       3px 0 rgba(255,0,170,0.8),
      -3px 0 rgba(0,229,255,0.8),
      0 0 10px rgba(0,255,136,0.9),
      0 0 40px rgba(0,255,136,0.2);
  }
}

/* ── Active nav link neon glow ────────────────────────────────────────────── */
[data-theme="cyberpunk"] .topnav a[aria-current="page"] {
  text-shadow: 0 0 8px rgba(0,255,136,0.7), 0 0 16px rgba(0,255,136,0.35);
}

/* ── Topnav border bottom glow pulse ─────────────────────────────────────── */
[data-theme="cyberpunk"] .topnav {
  box-shadow: 0 1px 0 rgba(0,255,136,0.2), 0 2px 12px rgba(0,255,136,0.06);
}

/* ── Scrollbar ───────────────────────────────────────────────────────────── */
[data-theme="cyberpunk"] ::-webkit-scrollbar-thumb {
  background: rgba(0,255,136,0.2);
}
[data-theme="cyberpunk"] ::-webkit-scrollbar-thumb:hover {
  background: rgba(0,255,136,0.4);
}
[data-theme="cyberpunk"] ::-webkit-scrollbar-track {
  background: rgba(0,255,136,0.03);
}

/* ── Input / select focus rings ──────────────────────────────────────────── */
[data-theme="cyberpunk"] input:focus,
[data-theme="cyberpunk"] select:focus,
[data-theme="cyberpunk"] textarea:focus {
  outline: none;
  box-shadow: 0 0 0 1px #00ff88, 0 0 12px rgba(0,255,136,0.3) !important;
  border-color: #00ff88 !important;
}

/* ── Button hover state ──────────────────────────────────────────────────── */
[data-theme="cyberpunk"] button:hover {
  text-shadow: 0 0 6px rgba(0,255,136,0.5);
}

/* ── Corner-bracket decoration on cards (via outline) ────────────────────── */
[data-theme="cyberpunk"] .cp-card {
  position: relative;
}
[data-theme="cyberpunk"] .cp-card::before,
[data-theme="cyberpunk"] .cp-card::after {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  border-color: rgba(0,255,136,0.5);
  border-style: solid;
  pointer-events: none;
}
[data-theme="cyberpunk"] .cp-card::before {
  top: -1px; left: -1px;
  border-width: 2px 0 0 2px;
}
[data-theme="cyberpunk"] .cp-card::after {
  bottom: -1px; right: -1px;
  border-width: 0 2px 2px 0;
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
export const CYBERPUNK: Theme = {
  name: 'cyberpunk',
  nextThemeName: 'sketch',
  displayName: 'Cyberpunk',
  globalCss: GLOBAL_CSS,

  // ── Raw colors ─────────────────────────────────────────────────────────────
  // NOTE: In cyberpunk, 'black' maps to the *foreground* text color (light),
  // not the background — because all pages use theme.black as primary text.
  black:       WHITE,
  white:       VOID,   // flipped for high-contrast blocks (light banners / row backgrounds)
  cream:       VOID_PANEL,
  creamDark:   VOID_CARD,
  hotRed:      NEON_MAGENTA,
  vividYellow: NEON_AMBER,
  softViolet:  NEON_CYAN,
  mintGreen:   NEON_GREEN,
  muted:       'rgba(0,255,136,0.45)',
  faint:       'rgba(0,255,136,0.2)',

  accentA: NEON_GREEN,
  accentB: NEON_MAGENTA,
  accentC: NEON_CYAN,

  // ── Shell ──────────────────────────────────────────────────────────────────
  appBg:         VOID,
  titlebarBg:    VOID,
  titlebarText:  'rgba(0,255,136,0.65)',

  navBg:           'rgba(6,6,16,0.96)',
  navBorderBottom: `1px solid rgba(0,255,136,0.18)`,
  navLink:         'rgba(0,255,136,0.55)',
  navLinkActive:   NEON_GREEN,
  navLinkActiveBg: 'rgba(0,255,136,0.07)',
  navLinkHoverBg:  'rgba(0,255,136,0.05)',

  // ── Borders & Shadows ──────────────────────────────────────────────────────
  border:       '1px solid rgba(0,255,136,0.18)',
  borderThin:   '1px solid rgba(0,255,136,0.12)',
  borderLight:  '1px solid rgba(0,255,136,0.07)',
  shadow:        `${greenGlow(10, 0.12)}, ${cyanGlow(6, 0.08)}`,
  shadowLift:    `${greenGlow(18, 0.22)}, ${cyanGlow(10, 0.14)}`,
  shadowPressed: `${greenGlow(4, 0.08)}`,
  shadowColor:   (color: string) => `0 0 12px ${color}, 0 0 24px ${color}`,

  // ── Radius — zero: all hard edges in cyberpunk ────────────────────────────
  radius:      0,
  radiusSmall: 0,

  // ── Typography ─────────────────────────────────────────────────────────────
  fontDisplay: FONT,
  fontBody:    FONT,

  // ── Spinner ────────────────────────────────────────────────────────────────
  spinnerBorder:    'rgba(0,255,136,0.15)',
  spinnerBorderTop: NEON_GREEN,

  // ── Component styles ───────────────────────────────────────────────────────
  page: {
    background:  'transparent',
    color:       WHITE,
    minHeight:   '100%',
    padding:     '32px 40px 64px',
    maxWidth:    960,
    margin:      '0 auto',
    fontFamily:  FONT,
  },

  card: {
    background:   VOID_CARD,
    border:       '1px solid rgba(0,255,136,0.15)',
    borderRadius: 0,
    boxShadow:    `${greenGlow(8, 0.08)}, inset 0 1px 0 rgba(0,255,136,0.05)`,
  },

  cardHover: {
    boxShadow:  `${greenGlow(14, 0.18)}, ${magentaGlow(6, 0.08)}, inset 0 1px 0 rgba(0,255,136,0.08)`,
    border:     '1px solid rgba(0,255,136,0.3)',
  },

  input: {
    background:  'rgba(0,255,136,0.04)',
    border:      '1px solid rgba(0,255,136,0.18)',
    borderRadius: 0,
    color:       WHITE,
    fontFamily:  FONT,
    outline:     'none',
    caretColor:  NEON_GREEN,
  },

  select: {
    background:   'rgba(0,255,136,0.04)',
    border:       '1px solid rgba(0,255,136,0.15)',
    borderRadius: 0,
    color:        WHITE,
    fontFamily:   FONT,
    outline:      'none',
    cursor:       'pointer',
    appearance:   'none' as const,
  },

  btnPrimary: {
    background:      'transparent',
    color:           NEON_GREEN,
    border:          `1px solid ${NEON_GREEN}`,
    boxShadow:       `${greenGlow(8, 0.3)}, inset 0 0 20px rgba(0,255,136,0.06)`,
    borderRadius:    0,
    fontFamily:      FONT,
    fontWeight:      700,
    cursor:          'pointer',
    transition:      'all 0.15s',
    textTransform:   'uppercase' as const,
    letterSpacing:   '2px',
    textShadow:      `0 0 8px rgba(0,255,136,0.7)`,
  },

  btnSecondary: {
    background:    'transparent',
    color:         NEON_MAGENTA,
    border:        `1px solid rgba(255,0,170,0.4)`,
    boxShadow:     `${magentaGlow(6, 0.2)}`,
    borderRadius:  0,
    fontFamily:    FONT,
    fontWeight:    700,
    cursor:        'pointer',
    transition:    'all 0.15s',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.5px',
  },

  btnOutline: {
    background:    'transparent',
    color:         NEON_CYAN,
    border:        `1px solid rgba(0,229,255,0.35)`,
    borderRadius:  0,
    fontFamily:    FONT,
    fontWeight:    700,
    cursor:        'pointer',
    transition:    'all 0.15s',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.5px',
  },

  iconBtn: {
    width:           40,
    height:          40,
    borderRadius:    0,
    border:          '1px solid rgba(0,255,136,0.2)',
    background:      'rgba(0,255,136,0.04)',
    color:           'rgba(0,255,136,0.6)',
    cursor:          'pointer',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    transition:      'all 0.15s',
    boxShadow:       'none',
  },

  iconBtnHover: {
    background: 'rgba(0,255,136,0.1)',
    color:      NEON_GREEN,
    boxShadow:  greenGlow(8, 0.25),
  },

  stickerLabel: {
    position:      'absolute',
    fontFamily:    FONT,
    fontWeight:    700,
    fontSize:      10,
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    padding:       '3px 10px',
    border:        `1px solid rgba(0,255,136,0.25)`,
    boxShadow:     greenGlow(4, 0.2),
    color:         NEON_GREEN,
    background:    'rgba(0,255,136,0.07)',
    borderRadius:  0,
  },

  singerColors: SINGER_COLORS,
}
