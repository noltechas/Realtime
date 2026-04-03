// Psychedelic / Lava Lamp Design System
// 1960s acid-trip meets lava lamp — morphing color blobs, rainbow hue-rotation,
// breathing elements, trippy gradient backgrounds, groovy typography.

import type { Theme } from './theme'

// ── Palette ──────────────────────────────────────────────────────────────────
const DEEP_PURPLE  = '#1a0a2e'
const PURPLE_PANEL = '#241040'
const PURPLE_CARD  = '#2a1450'
const HOT_PINK     = '#ff2d95'   // primary
const ELEC_LIME    = '#b6ff2d'   // secondary
const TANGERINE    = '#ff8c2d'   // tertiary
const LAVENDER_WHT = '#f5ecff'   // high-contrast light text
const TEXT_MID     = '#c8a8e8'   // muted text — readable on purple bg

const pinkGlow  = (spread = 8, a = 0.35) => `0 0 ${spread}px rgba(255,45,149,${a})`
const limeGlow  = (spread = 8, a = 0.3)  => `0 0 ${spread}px rgba(182,255,45,${a})`
const tanGlow   = (spread = 6, a = 0.25) => `0 0 ${spread}px rgba(255,140,45,${a})`

const FONT_DISPLAY = "'Chicle', 'Spicy Rice', cursive"
const FONT_BODY    = "'Spicy Rice', 'Comfortaa', cursive"

// ── Singer colors — psychedelic palette ──────────────────────────────────────
const SINGER_COLORS = [
  { color: '#ff2d95', colorGlow: 'rgba(255,45,149,0.4)'   },   // hot pink
  { color: '#b6ff2d', colorGlow: 'rgba(182,255,45,0.4)'   },   // electric lime
  { color: '#ff8c2d', colorGlow: 'rgba(255,140,45,0.4)'   },   // tangerine
  { color: '#2dd9ff', colorGlow: 'rgba(45,217,255,0.4)'   },   // electric sky
  { color: '#ff2dff', colorGlow: 'rgba(255,45,255,0.4)'   },   // magenta
  { color: '#ffff2d', colorGlow: 'rgba(255,255,45,0.4)'   },   // acid yellow
  { color: '#2dff95', colorGlow: 'rgba(45,255,149,0.4)'   },   // mint burst
  { color: '#ff6b2d', colorGlow: 'rgba(255,107,45,0.4)'   },   // flame orange
  { color: '#952dff', colorGlow: 'rgba(149,45,255,0.4)'   },   // grape
  { color: '#2dffff', colorGlow: 'rgba(45,255,255,0.4)'   },   // aqua
  { color: '#ff2d2d', colorGlow: 'rgba(255,45,45,0.4)'    },   // cherry
  { color: '#95ff2d', colorGlow: 'rgba(149,255,45,0.4)'   },   // chartreuse
  { color: '#ff2dcc', colorGlow: 'rgba(255,45,204,0.4)'   },   // fuchsia
]

// ── Global CSS injected when psychedelic theme is active ─────────────────────
const GLOBAL_CSS = `
/* ── Custom fonts ────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Chicle&family=Spicy+Rice&display=swap');

[data-theme="psychedelic"] * {
  font-family: ${FONT_BODY};
}
[data-theme="psychedelic"] h1,
[data-theme="psychedelic"] h2,
[data-theme="psychedelic"] h3 {
  font-family: ${FONT_DISPLAY};
}

/* ── Lava lamp blobs (behind content) ────────────────────────────────────── */
[data-theme="psychedelic"] .main {
  position: relative;
}

[data-theme="psychedelic"] .main::before {
  content: '';
  position: fixed;
  inset: -20%;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(ellipse 300px 300px at 20% 30%, rgba(255,45,149,0.15) 0%, transparent 70%),
    radial-gradient(ellipse 250px 350px at 75% 60%, rgba(182,255,45,0.12) 0%, transparent 70%),
    radial-gradient(ellipse 350px 250px at 50% 80%, rgba(255,140,45,0.12) 0%, transparent 70%),
    radial-gradient(ellipse 200px 300px at 85% 20%, rgba(149,45,255,0.10) 0%, transparent 70%);
  animation: psyBlobMorph 20s ease-in-out infinite alternate;
  filter: blur(60px);
}

@keyframes psyBlobMorph {
  0%   { transform: scale(1) rotate(0deg) translate(0, 0); }
  25%  { transform: scale(1.1) rotate(3deg) translate(30px, -20px); }
  50%  { transform: scale(0.95) rotate(-2deg) translate(-20px, 30px); }
  75%  { transform: scale(1.15) rotate(4deg) translate(15px, 15px); }
  100% { transform: scale(1) rotate(-3deg) translate(-10px, -25px); }
}

/* ── Second blob layer (different timing) ────────────────────────────────── */
[data-theme="psychedelic"] .main::after {
  content: '';
  position: fixed;
  inset: -10%;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(ellipse 280px 280px at 60% 25%, rgba(45,217,255,0.10) 0%, transparent 70%),
    radial-gradient(ellipse 320px 200px at 30% 70%, rgba(255,45,255,0.10) 0%, transparent 70%),
    radial-gradient(ellipse 200px 280px at 80% 80%, rgba(255,255,45,0.08) 0%, transparent 70%);
  animation: psyBlobMorph2 28s ease-in-out infinite alternate;
  filter: blur(50px);
}

@keyframes psyBlobMorph2 {
  0%   { transform: scale(1) rotate(0deg) translate(0, 0); }
  33%  { transform: scale(1.08) rotate(-4deg) translate(-25px, 20px); }
  66%  { transform: scale(0.92) rotate(3deg) translate(20px, -15px); }
  100% { transform: scale(1.05) rotate(-2deg) translate(10px, 25px); }
}

/* ── Hue-rotation cycling on accent elements ─────────────────────────────── */
@keyframes psyHueShift {
  0%   { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}

[data-theme="psychedelic"] .topnav a[aria-current="page"] {
  animation: psyHueShift 8s linear infinite;
  text-shadow: 0 0 12px rgba(255,45,149,0.6), 0 0 24px rgba(182,255,45,0.3);
}

/* ── Breathing / pulsing cards ───────────────────────────────────────────── */
@keyframes psyBreathe {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.003); }
}

/* ── Groovy heading wobble ───────────────────────────────────────────────── */
@keyframes psyWobble {
  0%, 100% { transform: skewX(0deg); }
  25%      { transform: skewX(-0.5deg); }
  75%      { transform: skewX(0.5deg); }
}

[data-theme="psychedelic"] h1 {
  animation: psyWobble 6s ease-in-out infinite;
  text-shadow: 0 0 20px rgba(255,45,149,0.3), 0 0 40px rgba(182,255,45,0.15);
}

/* ── Rainbow glow on nav border ──────────────────────────────────────────── */
[data-theme="psychedelic"] .topnav {
  box-shadow: 0 1px 0 rgba(255,45,149,0.2), 0 2px 12px rgba(182,255,45,0.06);
}

/* ── Trippy scrollbar ────────────────────────────────────────────────────── */
[data-theme="psychedelic"] ::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(255,45,149,0.3), rgba(182,255,45,0.3), rgba(255,140,45,0.3));
  border-radius: 10px;
}
[data-theme="psychedelic"] ::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(255,45,149,0.5), rgba(182,255,45,0.5), rgba(255,140,45,0.5));
}
[data-theme="psychedelic"] ::-webkit-scrollbar-track {
  background: rgba(255,45,149,0.03);
}

/* ── Input / select focus rings — rainbow ────────────────────────────────── */
[data-theme="psychedelic"] input:focus,
[data-theme="psychedelic"] select:focus,
[data-theme="psychedelic"] textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255,45,149,0.4), 0 0 14px rgba(182,255,45,0.2), 0 0 20px rgba(255,140,45,0.1) !important;
  border-color: ${HOT_PINK} !important;
}

/* ── Button hover — multicolor glow ──────────────────────────────────────── */
[data-theme="psychedelic"] button:hover {
  text-shadow: 0 0 8px rgba(255,45,149,0.5), 0 0 16px rgba(182,255,45,0.3);
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
export const PSYCHEDELIC: Theme = {
  name: 'psychedelic',
  nextThemeName: 'neo-brutal',
  displayName: 'Psychedelic',
  globalCss: GLOBAL_CSS,

  // ── Raw colors (high contrast: light lavender text on deep purple) ─────────
  black:       LAVENDER_WHT,     // primary text — very light on purple bg
  white:       DEEP_PURPLE,      // inverted for "light" blocks
  cream:       PURPLE_PANEL,
  creamDark:   PURPLE_CARD,
  hotRed:      HOT_PINK,
  vividYellow: TANGERINE,
  softViolet:  '#952dff',
  mintGreen:   ELEC_LIME,
  muted:       TEXT_MID,         // readable mid-contrast text
  faint:       'rgba(200,168,232,0.35)',

  accentA: HOT_PINK,
  accentB: ELEC_LIME,
  accentC: TANGERINE,

  // ── Shell ──────────────────────────────────────────────────────────────────
  appBg:         DEEP_PURPLE,
  titlebarBg:    DEEP_PURPLE,
  titlebarText:  TEXT_MID,

  navBg:           'rgba(26,10,46,0.95)',
  navBorderBottom: '1px solid rgba(255,45,149,0.15)',
  navLink:         TEXT_MID,
  navLinkActive:   HOT_PINK,
  navLinkActiveBg: 'rgba(255,45,149,0.1)',
  navLinkHoverBg:  'rgba(255,45,149,0.06)',

  // ── Borders & Shadows ──────────────────────────────────────────────────────
  border:       '1px solid rgba(255,45,149,0.15)',
  borderThin:   '1px solid rgba(255,45,149,0.10)',
  borderLight:  '1px solid rgba(255,45,149,0.06)',
  shadow:        `${pinkGlow(8, 0.1)}, ${limeGlow(6, 0.06)}`,
  shadowLift:    `${pinkGlow(16, 0.2)}, ${limeGlow(12, 0.12)}, ${tanGlow(8, 0.08)}`,
  shadowPressed: `${pinkGlow(4, 0.08)}`,
  shadowColor:   (color: string) => `0 0 14px ${color}, 0 0 28px ${color}`,

  // ── Radius — very rounded, groovy ─────────────────────────────────────────
  radius:      16,
  radiusSmall: 10,

  // ── Typography ─────────────────────────────────────────────────────────────
  fontDisplay: FONT_DISPLAY,
  fontBody:    FONT_BODY,

  // ── Spinner ────────────────────────────────────────────────────────────────
  spinnerBorder:    'rgba(255,45,149,0.15)',
  spinnerBorderTop: HOT_PINK,

  // ── Component styles ───────────────────────────────────────────────────────
  page: {
    background:  'transparent',
    color:       LAVENDER_WHT,
    minHeight:   '100%',
    padding:     '32px 40px 64px',
    maxWidth:    960,
    margin:      '0 auto',
    fontFamily:  FONT_BODY,
    position:    'relative',
    zIndex:      2,
  },

  card: {
    background:     'rgba(42,20,80,0.7)',
    border:         '1px solid rgba(255,45,149,0.12)',
    borderRadius:   16,
    backdropFilter:  'blur(8px)',
    animation:      'psyBreathe 5s ease-in-out infinite',
  },

  cardHover: {
    border:    '1px solid rgba(255,45,149,0.3)',
    boxShadow: `${pinkGlow(14, 0.18)}, ${limeGlow(8, 0.1)}, ${tanGlow(6, 0.08)}`,
  },

  input: {
    background:   'rgba(255,45,149,0.04)',
    border:       '1px solid rgba(255,45,149,0.15)',
    borderRadius: 10,
    color:        LAVENDER_WHT,
    fontFamily:   FONT_BODY,
    outline:      'none',
    caretColor:   HOT_PINK,
  },

  select: {
    background:   'rgba(255,45,149,0.04)',
    border:       '1px solid rgba(255,45,149,0.12)',
    borderRadius: 10,
    color:        LAVENDER_WHT,
    fontFamily:   FONT_BODY,
    outline:      'none',
    cursor:       'pointer',
    appearance:   'none' as const,
  },

  btnPrimary: {
    background:     'rgba(255,45,149,0.15)',
    color:          LAVENDER_WHT,
    border:         '1px solid rgba(255,45,149,0.45)',
    boxShadow:      `${pinkGlow(10, 0.25)}, inset 0 0 20px rgba(255,45,149,0.05)`,
    borderRadius:   10,
    fontFamily:     FONT_DISPLAY,
    fontWeight:     700,
    cursor:         'pointer',
    transition:     'all 0.25s ease',
    letterSpacing:  '1px',
    textShadow:     '0 0 10px rgba(255,45,149,0.5)',
  },

  btnSecondary: {
    background:    'rgba(182,255,45,0.08)',
    color:         '#d8ff9e',
    border:        '1px solid rgba(182,255,45,0.35)',
    boxShadow:     `${limeGlow(8, 0.2)}`,
    borderRadius:  10,
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    cursor:        'pointer',
    transition:    'all 0.25s ease',
  },

  btnOutline: {
    background:    'transparent',
    color:         '#ffc08a',
    border:        '1px solid rgba(255,140,45,0.35)',
    boxShadow:     `${tanGlow(6, 0.15)}`,
    borderRadius:  10,
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    cursor:        'pointer',
    transition:    'all 0.25s ease',
  },

  iconBtn: {
    width:           40,
    height:          40,
    borderRadius:    12,
    border:          '1px solid rgba(255,45,149,0.15)',
    background:      'rgba(255,45,149,0.04)',
    color:           TEXT_MID,
    cursor:          'pointer',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    transition:      'all 0.25s ease',
    boxShadow:       'none',
  },

  iconBtnHover: {
    background: 'rgba(255,45,149,0.12)',
    color:      HOT_PINK,
    boxShadow:  `${pinkGlow(10, 0.25)}, ${limeGlow(6, 0.1)}`,
  },

  stickerLabel: {
    position:      'absolute',
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    fontSize:      10,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    padding:       '3px 12px',
    border:        '1px solid rgba(255,45,149,0.25)',
    boxShadow:     pinkGlow(4, 0.2),
    color:         HOT_PINK,
    background:    'rgba(255,45,149,0.08)',
    borderRadius:  8,
  },

  singerColors: SINGER_COLORS,
}
