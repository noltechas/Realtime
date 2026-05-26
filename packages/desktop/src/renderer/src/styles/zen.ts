// Zen / Japanese Garden Design System
// Serene, meditative, nature-inspired — washi paper, sumi-e ink wash,
// cherry blossoms, kintsugi golden repair, bamboo, enso circles, shoji screens.

import type { Theme } from './theme'

// ── Palette ──────────────────────────────────────────────────────────────────
const STONE_DARK   = '#1a1814'   // aged wood / earth tone
const STONE_PANEL  = '#231f1a'
const STONE_CARD   = '#2e2820'
const VERMILLION   = '#D4442A'   // torii gate red
const KINTSUGI     = '#D4B85A'   // golden repair — warm vivid gold
const MOSS_GREEN   = '#7BA05B'   // garden moss
const WASHI_LIGHT  = '#F0E6D3'   // aged paper — primary text
const TEXT_MID     = '#B8A898'   // muted warm text
const SAKURA_PINK  = '#E8A0BF'   // cherry blossom

const goldGlow     = (spread = 8, a = 0.35) => `0 0 ${spread}px rgba(201,168,76,${a})`
const vermGlow     = (spread = 8, a = 0.3)  => `0 0 ${spread}px rgba(212,68,42,${a})`
const mossGlow     = (spread = 6, a = 0.25) => `0 0 ${spread}px rgba(123,160,91,${a})`

const FONT_DISPLAY = "'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif"
const FONT_BODY    = "'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif"
const FONT_HEADING = "'Cormorant Garamond', 'Georgia', serif"

// ── Singer colors — nature-inspired palette ──────────────────────────────────
const SINGER_COLORS = [
  { color: '#D4442A', colorGlow: 'rgba(212,68,42,0.4)'   },   // vermillion
  { color: '#7BA05B', colorGlow: 'rgba(123,160,91,0.4)'   },   // bamboo green
  { color: '#9B72CF', colorGlow: 'rgba(155,114,207,0.4)'  },   // wisteria purple
  { color: '#E8A0BF', colorGlow: 'rgba(232,160,191,0.4)'  },   // plum blossom pink
  { color: '#E8943A', colorGlow: 'rgba(232,148,58,0.4)'   },   // koi orange
  { color: '#4A90B8', colorGlow: 'rgba(74,144,184,0.4)'   },   // ocean blue
  { color: '#A8C256', colorGlow: 'rgba(168,194,86,0.4)'   },   // moss
  { color: '#F2C4D3', colorGlow: 'rgba(242,196,211,0.4)'  },   // sakura
  { color: '#C9A84C', colorGlow: 'rgba(201,168,76,0.4)'   },   // gold
  { color: '#8B6B4A', colorGlow: 'rgba(139,107,74,0.4)'   },   // cedar brown
  { color: '#7B68AE', colorGlow: 'rgba(123,104,174,0.4)'  },   // iris violet
  { color: '#6BB5D9', colorGlow: 'rgba(107,181,217,0.4)'  },   // sky blue
  { color: '#C73E3E', colorGlow: 'rgba(199,62,62,0.4)'    },   // maple red
]

// Raked sand SVG pattern (concentric arcs for karesansui texture)
const SAND_PATTERN_SVG = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='60' viewBox='0 0 120 60'><path d='M0 30 Q30 10 60 30 Q90 50 120 30' fill='none' stroke='rgba(201,168,76,0.07)' stroke-width='0.8'/><path d='M0 45 Q30 25 60 45 Q90 65 120 45' fill='none' stroke='rgba(201,168,76,0.05)' stroke-width='0.6'/><path d='M0 15 Q30 -5 60 15 Q90 35 120 15' fill='none' stroke='rgba(201,168,76,0.05)' stroke-width='0.6'/></svg>`)

// Shoji grid overlay pattern (thin wooden frame lines)
const SHOJI_GRID_SVG = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><line x1='40' y1='0' x2='40' y2='80' stroke='rgba(201,168,76,0.04)' stroke-width='0.5'/><line x1='0' y1='40' x2='80' y2='40' stroke='rgba(201,168,76,0.04)' stroke-width='0.5'/><rect x='0' y='0' width='80' height='80' fill='none' stroke='rgba(201,168,76,0.03)' stroke-width='0.5'/></svg>`)

// ── Global CSS injected when zen theme is active ─────────────────────────────
const GLOBAL_CSS = `
/* ── Custom fonts ────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');

[data-theme="zen"] * {
  font-family: ${FONT_BODY};
}
[data-theme="zen"] h1,
[data-theme="zen"] h2,
[data-theme="zen"] h3 {
  font-family: ${FONT_HEADING};
}

/* ── 1. Ink Wash Background (sumi-e watercolor bleed) ────────────────────── */
[data-theme="zen"] .main::before {
  content: '';
  position: fixed;
  inset: -20%;
  pointer-events: none;
  z-index: 1;
  opacity: 0.04;
  background:
    radial-gradient(ellipse 60% 50% at 25% 30%, rgba(201,168,76,0.5) 0%, transparent 70%),
    radial-gradient(ellipse 50% 60% at 70% 60%, rgba(139,107,74,0.4) 0%, transparent 70%),
    radial-gradient(ellipse 45% 55% at 50% 80%, rgba(212,68,42,0.3) 0%, transparent 60%);
  animation: zenInkDrift 30s ease-in-out infinite;
  filter: blur(40px);
}

@keyframes zenInkDrift {
  0%   { transform: translate(0, 0) scale(1.2) rotate(0deg); }
  33%  { transform: translate(30px, -20px) scale(1.35) rotate(3deg); }
  66%  { transform: translate(-20px, 15px) scale(1.25) rotate(-2deg); }
  100% { transform: translate(0, 0) scale(1.2) rotate(0deg); }
}

/* ── 2. Cherry Blossom Particle System ───────────────────────────────────── */
[data-theme="zen"] .main::after {
  content: '';
  position: fixed;
  bottom: -10px;
  left: 0;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  background: transparent;
  box-shadow:
    60px   0px 2px 0px rgba(232,160,191,0.2),
    180px  -30px 3px 0px rgba(242,196,211,0.18),
    320px  -80px 2px 1px rgba(232,160,191,0.15),
    480px  -15px 3px 0px rgba(242,196,211,0.17),
    620px  -60px 2px 1px rgba(232,160,191,0.19),
    100px  -180px 3px 0px rgba(242,196,211,0.13),
    380px  -280px 2px 0px rgba(232,160,191,0.15),
    700px  -220px 3px 1px rgba(201,168,76,0.15),
    240px  -420px 2px 0px rgba(232,160,191,0.17),
    540px  -480px 3px 0px rgba(242,196,211,0.14),
    800px  -120px 2px 0px rgba(232,160,191,0.12),
    150px  -350px 2px 1px rgba(242,196,211,0.11),
    450px  -150px 3px 0px rgba(232,160,191,0.16),
    750px  -400px 2px 0px rgba(242,196,211,0.13);
  animation: zenPetalFall 22s linear infinite;
}

@keyframes zenPetalFall {
  0%   { transform: translateY(0) translateX(0) rotate(0deg); }
  25%  { transform: translateY(25vh) translateX(15px) rotate(5deg); }
  50%  { transform: translateY(50vh) translateX(-10px) rotate(-3deg); }
  75%  { transform: translateY(75vh) translateX(20px) rotate(4deg); }
  100% { transform: translateY(100vh) translateX(0) rotate(0deg); }
}

/* ── 6. Breathing Animation (synchronized meditative pulse) ─────────────── */
@keyframes zenBreathe {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.002); }
}

/* ── 4. Kintsugi Borders + 3. Sand Garden Texture + 13. Shoji Grid ──────── */
[data-theme="zen"] .card {
  animation: zenBreathe 8s ease-in-out infinite;
  background-image:
    url("data:image/svg+xml,${SHOJI_GRID_SVG}"),
    url("data:image/svg+xml,${SAND_PATTERN_SVG}");
  background-repeat: repeat;
  border-image: linear-gradient(
    135deg,
    transparent 0%,
    rgba(201,168,76,0.4) 8%,
    transparent 12%,
    transparent 25%,
    rgba(201,168,76,0.35) 30%,
    transparent 35%,
    transparent 50%,
    rgba(201,168,76,0.45) 55%,
    transparent 60%,
    transparent 72%,
    rgba(201,168,76,0.3) 78%,
    transparent 82%,
    transparent 92%,
    rgba(201,168,76,0.4) 96%,
    transparent 100%
  ) 1;
  border-width: 1px;
  border-style: solid;
}

/* ── 5. Water Ripple Hover Effect ────────────────────────────────────────── */
@keyframes zenRipple {
  0%   { background-size: 0% 0%; opacity: 1; }
  50%  { opacity: 0.6; }
  100% { background-size: 400% 400%; opacity: 0; }
}

[data-theme="zen"] button:hover {
  background-image:
    radial-gradient(circle at center, rgba(201,168,76,0.12) 0%, transparent 25%),
    radial-gradient(circle at center, rgba(201,168,76,0.06) 0%, transparent 50%),
    radial-gradient(circle at center, rgba(201,168,76,0.03) 0%, transparent 75%);
  background-repeat: no-repeat;
  background-position: center;
  animation: zenRipple 0.8s ease-out forwards;
}

/* ── 7. Incense Smoke Wisps ─────────────────────────────────────────────── */
@keyframes zenSmoke {
  0%   { transform: translateY(0) scaleX(1) skewX(0deg); opacity: 0; }
  10%  { opacity: 0.06; }
  40%  { transform: translateY(-30vh) scaleX(1.3) skewX(8deg); opacity: 0.04; }
  70%  { transform: translateY(-60vh) scaleX(0.7) skewX(-5deg); opacity: 0.02; }
  100% { transform: translateY(-90vh) scaleX(1.1) skewX(3deg); opacity: 0; }
}

/* ── 11. Active nav — warm vermillion glow ──────────────────────────────── */
[data-theme="zen"] .topnav a[aria-current="page"] {
  text-shadow: 0 0 10px rgba(212,68,42,0.5), 0 0 20px rgba(212,68,42,0.2);
}

[data-theme="zen"] .topnav {
  position: relative;
  z-index: 10;
  box-shadow: 0 1px 0 rgba(201,168,76,0.15), 0 2px 12px rgba(201,168,76,0.04);
  animation: zenBreathe 8s ease-in-out infinite;
}

/* ── 8. Scrollbar — warm wood tones ─────────────────────────────────────── */
[data-theme="zen"] ::-webkit-scrollbar-thumb {
  background: rgba(201,168,76,0.2);
  border-radius: 6px;
}
[data-theme="zen"] ::-webkit-scrollbar-thumb:hover {
  background: rgba(201,168,76,0.4);
}
[data-theme="zen"] ::-webkit-scrollbar-track {
  background: rgba(201,168,76,0.03);
}

/* ── 9. Input / select focus rings — kintsugi gold glow ─────────────────── */
[data-theme="zen"] input:focus,
[data-theme="zen"] select:focus,
[data-theme="zen"] textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(201,168,76,0.35), 0 0 16px rgba(201,168,76,0.15) !important;
  border-color: ${KINTSUGI} !important;
}

/* ── 10. Heading glow — subtle candlelight ──────────────────────────────── */
[data-theme="zen"] h1 {
  text-shadow: 0 0 20px rgba(201,168,76,0.2), 0 0 40px rgba(212,68,42,0.08);
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
export const ZEN: Theme = {
  name: 'zen',
  nextThemeName: 'space',
  displayName: 'Zen',
  globalCss: GLOBAL_CSS,

  // ── Raw colors (warm light text on dark earth-tone backgrounds) ────────────
  black:       WASHI_LIGHT,      // primary text — warm light on dark bg
  white:       STONE_DARK,       // inverted for "light" blocks
  cream:       STONE_PANEL,
  creamDark:   STONE_CARD,
  hotRed:      VERMILLION,
  vividYellow: KINTSUGI,
  softViolet:  '#9B72CF',        // wisteria
  mintGreen:   MOSS_GREEN,
  muted:       TEXT_MID,         // warm muted text
  faint:       'rgba(201,168,76,0.22)',

  accentA: VERMILLION,
  accentB: KINTSUGI,
  accentC: MOSS_GREEN,

  // ── Shell ──────────────────────────────────────────────────────────────────
  appBg:         STONE_DARK,
  titlebarBg:    STONE_DARK,
  titlebarText:  TEXT_MID,

  navBg:           'rgba(26,24,20,0.95)',
  navBorderBottom: '1px solid rgba(201,168,76,0.12)',
  navLink:         TEXT_MID,
  navLinkActive:   VERMILLION,
  navLinkActiveBg: 'rgba(212,68,42,0.08)',
  navLinkHoverBg:  'rgba(201,168,76,0.05)',

  // ── Borders & Shadows ──────────────────────────────────────────────────────
  border:       '1px solid rgba(201,168,76,0.15)',
  borderThin:   '1px solid rgba(201,168,76,0.10)',
  borderLight:  '1px solid rgba(201,168,76,0.06)',
  shadow:        `${goldGlow(10, 0.1)}, ${vermGlow(6, 0.06)}`,
  shadowLift:    `${goldGlow(18, 0.2)}, ${vermGlow(12, 0.12)}`,
  shadowPressed: `${goldGlow(4, 0.08)}`,
  shadowColor:   (color: string) => `0 0 14px ${color}, 0 0 28px ${color}`,

  // ── Radius — soft, organic ────────────────────────────────────────────────
  radius:      10,
  radiusSmall: 6,

  // ── Typography ─────────────────────────────────────────────────────────────
  fontDisplay: FONT_DISPLAY,
  fontBody:    FONT_BODY,

  // ── Spinner ────────────────────────────────────────────────────────────────
  spinnerBorder:    'rgba(201,168,76,0.15)',
  spinnerBorderTop: KINTSUGI,

  // ── Component styles ───────────────────────────────────────────────────────
  page: {
    background:  'transparent',
    color:       WASHI_LIGHT,
    minHeight:   '100%',
    padding:     '32px 40px 64px',
    maxWidth:    960,
    margin:      '0 auto',
    fontFamily:  FONT_BODY,
    position:    'relative',
    zIndex:      2,
  },

  card: {
    background:     `rgba(46,40,32,0.75)`,
    border:         '1px solid rgba(201,168,76,0.12)',
    borderRadius:   10,
    backdropFilter: 'blur(8px)',
  },

  cardHover: {
    border:     '1px solid rgba(201,168,76,0.28)',
    boxShadow:  `${goldGlow(16, 0.2)}, ${vermGlow(10, 0.1)}`,
  },

  input: {
    background:   'rgba(201,168,76,0.04)',
    border:       '1px solid rgba(201,168,76,0.15)',
    borderRadius: 6,
    color:        WASHI_LIGHT,
    fontFamily:   FONT_BODY,
    outline:      'none',
    caretColor:   KINTSUGI,
  },

  select: {
    background:   'rgba(201,168,76,0.04)',
    border:       '1px solid rgba(201,168,76,0.12)',
    borderRadius: 6,
    color:        WASHI_LIGHT,
    fontFamily:   FONT_BODY,
    outline:      'none',
    cursor:       'pointer',
    appearance:   'none' as const,
  },

  btnPrimary: {
    background:     'rgba(212,68,42,0.12)',
    color:          WASHI_LIGHT,
    border:         `1px solid rgba(212,68,42,0.4)`,
    boxShadow:      `${vermGlow(10, 0.25)}, inset 0 0 20px rgba(212,68,42,0.05)`,
    borderRadius:   6,
    fontFamily:     FONT_DISPLAY,
    fontWeight:     700,
    cursor:         'pointer',
    transition:     'all 0.2s ease',
    letterSpacing:  '1px',
    textShadow:     '0 0 8px rgba(212,68,42,0.4)',
  },

  btnSecondary: {
    background:    'rgba(201,168,76,0.1)',
    color:         '#E8D8A8',
    border:        '1px solid rgba(201,168,76,0.35)',
    boxShadow:     `${goldGlow(8, 0.2)}`,
    borderRadius:  6,
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    cursor:        'pointer',
    transition:    'all 0.2s ease',
  },

  btnOutline: {
    background:    'transparent',
    color:         MOSS_GREEN,
    border:        '1px solid rgba(123,160,91,0.35)',
    boxShadow:     `${mossGlow(6, 0.15)}`,
    borderRadius:  6,
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    cursor:        'pointer',
    transition:    'all 0.2s ease',
  },

  iconBtn: {
    width:           40,
    height:          40,
    borderRadius:    10,
    border:          '1px solid rgba(201,168,76,0.15)',
    background:      'rgba(201,168,76,0.04)',
    color:           TEXT_MID,
    cursor:          'pointer',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    transition:      'all 0.2s ease',
    boxShadow:       'none',
  },

  iconBtnHover: {
    background: 'rgba(201,168,76,0.1)',
    color:      KINTSUGI,
    boxShadow:  goldGlow(10, 0.25),
  },

  stickerLabel: {
    position:      'absolute',
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    fontSize:      10,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    padding:       '3px 10px',
    border:        '1px solid rgba(201,168,76,0.2)',
    boxShadow:     goldGlow(4, 0.2),
    color:         KINTSUGI,
    background:    'rgba(201,168,76,0.08)',
    borderRadius:  6,
  },

  singerColors: SINGER_COLORS,
}
