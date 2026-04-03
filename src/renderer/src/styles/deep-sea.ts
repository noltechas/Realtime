// Deep Sea / Bioluminescent Design System
// Abyssal ocean depths with glowing creatures — dark inky blues, pulsing
// bioluminescent accents, floating bubble particles, caustic light ripples.

import type { Theme } from './theme'

// ── Palette ──────────────────────────────────────────────────────────────────
const ABYSS       = '#040918'
const ABYSS_PANEL = '#071228'
const ABYSS_CARD  = '#0c1d42'
const BIO_TEAL    = '#00ffc8'   // primary bioluminescent
const ELEC_VIOLET = '#b44dff'   // secondary — jellyfish
const DEEP_CORAL  = '#ff6b8a'   // tertiary — anemone
const AMBER_GLOW  = '#ffc857'   // warning / highlight
const TEXT_LIGHT  = '#e0fff8'   // high-contrast light text on dark bg
const TEXT_MID    = '#8ecfc2'   // muted text — still readable on abyss

const tealGlow   = (spread = 8, a = 0.4) => `0 0 ${spread}px rgba(0,255,200,${a})`
const violetGlow = (spread = 8, a = 0.3) => `0 0 ${spread}px rgba(180,77,255,${a})`
const coralGlow  = (spread = 6, a = 0.25) => `0 0 ${spread}px rgba(255,107,138,${a})`

const FONT_DISPLAY = "'Quicksand', 'Nunito', sans-serif"
const FONT_BODY    = "'Nunito', 'Quicksand', sans-serif"

// ── Singer colors — ocean creature palette ───────────────────────────────────
const SINGER_COLORS = [
  { color: '#00ffc8', colorGlow: 'rgba(0,255,200,0.4)'   },   // bioluminescent teal
  { color: '#b44dff', colorGlow: 'rgba(180,77,255,0.4)'   },   // jellyfish violet
  { color: '#ff6b8a', colorGlow: 'rgba(255,107,138,0.4)'  },   // coral pink
  { color: '#ffc857', colorGlow: 'rgba(255,200,87,0.4)'   },   // anglerfish amber
  { color: '#00b4d8', colorGlow: 'rgba(0,180,216,0.4)'    },   // deep ocean blue
  { color: '#ff9e5e', colorGlow: 'rgba(255,158,94,0.4)'   },   // sea slug orange
  { color: '#7df9ff', colorGlow: 'rgba(125,249,255,0.4)'  },   // electric ice
  { color: '#e040fb', colorGlow: 'rgba(224,64,251,0.4)'   },   // neon anemone
  { color: '#69f0ae', colorGlow: 'rgba(105,240,174,0.4)'  },   // kelp green
  { color: '#ff80ab', colorGlow: 'rgba(255,128,171,0.4)'  },   // rose coral
  { color: '#40c4ff', colorGlow: 'rgba(64,196,255,0.4)'   },   // luminous blue
  { color: '#ffab40', colorGlow: 'rgba(255,171,64,0.4)'   },   // sunset anemone
  { color: '#b9f6ca', colorGlow: 'rgba(185,246,202,0.4)'  },   // sea foam
]

// ── Global CSS injected when deep-sea theme is active ────────────────────────
const GLOBAL_CSS = `
/* ── Custom fonts ────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&display=swap');

[data-theme="deep-sea"] * {
  font-family: ${FONT_BODY};
}
[data-theme="deep-sea"] h1,
[data-theme="deep-sea"] h2,
[data-theme="deep-sea"] h3 {
  font-family: ${FONT_DISPLAY};
}

/* ── Caustic light refraction overlay ────────────────────────────────────── */
[data-theme="deep-sea"] .main::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.035;
  background:
    repeating-conic-gradient(
      from 0deg at 50% 50%,
      rgba(0,255,200,0.4) 0deg,
      transparent 30deg,
      rgba(180,77,255,0.3) 60deg,
      transparent 90deg
    );
  background-size: 180px 180px;
  animation: dsCausticDrift 25s linear infinite;
  filter: blur(30px);
}

@keyframes dsCausticDrift {
  0%   { transform: rotate(0deg) scale(1.5); }
  50%  { transform: rotate(180deg) scale(1.8); }
  100% { transform: rotate(360deg) scale(1.5); }
}

/* ── Floating bubble particles ───────────────────────────────────────────── */
[data-theme="deep-sea"] .main::after {
  content: '';
  position: fixed;
  bottom: -20px;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  background: transparent;
  box-shadow:
    80px   0px 0 -3px rgba(0,255,200,0.15),
    200px -40px 0 -4px rgba(180,77,255,0.12),
    350px -100px 0 -2px rgba(0,255,200,0.10),
    500px -20px 0 -3px rgba(255,107,138,0.10),
    650px -80px 0 -4px rgba(0,255,200,0.12),
    120px -200px 0 -2px rgba(180,77,255,0.08),
    400px -300px 0 -3px rgba(0,255,200,0.10),
    700px -250px 0 -4px rgba(255,107,138,0.08),
    250px -450px 0 -2px rgba(0,255,200,0.12),
    550px -500px 0 -3px rgba(180,77,255,0.10);
  animation: dsBubbleRise 18s linear infinite;
}

@keyframes dsBubbleRise {
  0%   { transform: translateY(0) translateX(0); }
  25%  { transform: translateY(-25vh) translateX(8px); }
  50%  { transform: translateY(-50vh) translateX(-5px); }
  75%  { transform: translateY(-75vh) translateX(10px); }
  100% { transform: translateY(-100vh) translateX(0); }
}

/* ── Pulsing bioluminescent glow on cards ────────────────────────────────── */
@keyframes dsBioGlow {
  0%, 100% {
    box-shadow: 0 0 8px rgba(0,255,200,0.08), 0 0 20px rgba(0,255,200,0.04), inset 0 1px 0 rgba(0,255,200,0.06);
  }
  50% {
    box-shadow: 0 0 14px rgba(180,77,255,0.12), 0 0 30px rgba(180,77,255,0.06), inset 0 1px 0 rgba(180,77,255,0.08);
  }
}

/* ── Ripple hover effect on buttons ──────────────────────────────────────── */
@keyframes dsRipple {
  0%   { background-size: 0% 0%; }
  100% { background-size: 300% 300%; }
}

[data-theme="deep-sea"] button:hover {
  background-image: radial-gradient(circle at center, rgba(0,255,200,0.1) 0%, transparent 70%);
  background-repeat: no-repeat;
  background-position: center;
  animation: dsRipple 0.5s ease-out forwards;
}

/* ── Active nav link glow ────────────────────────────────────────────────── */
[data-theme="deep-sea"] .topnav a[aria-current="page"] {
  text-shadow: 0 0 10px rgba(0,255,200,0.6), 0 0 20px rgba(0,255,200,0.3);
}

[data-theme="deep-sea"] .topnav {
  box-shadow: 0 1px 0 rgba(0,255,200,0.15), 0 2px 16px rgba(0,255,200,0.05);
}

/* ── Scrollbar — deep ocean ──────────────────────────────────────────────── */
[data-theme="deep-sea"] ::-webkit-scrollbar-thumb {
  background: rgba(0,255,200,0.18);
  border-radius: 6px;
}
[data-theme="deep-sea"] ::-webkit-scrollbar-thumb:hover {
  background: rgba(0,255,200,0.35);
}
[data-theme="deep-sea"] ::-webkit-scrollbar-track {
  background: rgba(0,255,200,0.03);
}

/* ── Input / select focus rings — teal glow ──────────────────────────────── */
[data-theme="deep-sea"] input:focus,
[data-theme="deep-sea"] select:focus,
[data-theme="deep-sea"] textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0,255,200,0.35), 0 0 16px rgba(0,255,200,0.2) !important;
  border-color: ${BIO_TEAL} !important;
}

/* ── Heading glow ────────────────────────────────────────────────────────── */
[data-theme="deep-sea"] h1 {
  text-shadow: 0 0 20px rgba(0,255,200,0.25), 0 0 40px rgba(180,77,255,0.12);
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
export const DEEP_SEA: Theme = {
  name: 'deep-sea',
  nextThemeName: 'psychedelic',
  displayName: 'Deep Sea',
  globalCss: GLOBAL_CSS,

  // ── Raw colors (high contrast: light text on very dark backgrounds) ────────
  black:       TEXT_LIGHT,       // primary text — very light on abyss bg
  white:       ABYSS,            // inverted for "light" blocks
  cream:       ABYSS_PANEL,
  creamDark:   ABYSS_CARD,
  hotRed:      DEEP_CORAL,
  vividYellow: AMBER_GLOW,
  softViolet:  ELEC_VIOLET,
  mintGreen:   BIO_TEAL,
  muted:       TEXT_MID,         // readable mid-contrast text
  faint:       'rgba(0,255,200,0.22)',

  accentA: BIO_TEAL,
  accentB: ELEC_VIOLET,
  accentC: DEEP_CORAL,

  // ── Shell ──────────────────────────────────────────────────────────────────
  appBg:         ABYSS,
  titlebarBg:    ABYSS,
  titlebarText:  TEXT_MID,

  navBg:           'rgba(4,9,24,0.95)',
  navBorderBottom: '1px solid rgba(0,255,200,0.12)',
  navLink:         TEXT_MID,
  navLinkActive:   BIO_TEAL,
  navLinkActiveBg: 'rgba(0,255,200,0.08)',
  navLinkHoverBg:  'rgba(0,255,200,0.05)',

  // ── Borders & Shadows ──────────────────────────────────────────────────────
  border:       '1px solid rgba(0,255,200,0.15)',
  borderThin:   '1px solid rgba(0,255,200,0.10)',
  borderLight:  '1px solid rgba(0,255,200,0.06)',
  shadow:        `${tealGlow(10, 0.1)}, ${violetGlow(6, 0.06)}`,
  shadowLift:    `${tealGlow(18, 0.2)}, ${violetGlow(12, 0.12)}`,
  shadowPressed: `${tealGlow(4, 0.08)}`,
  shadowColor:   (color: string) => `0 0 14px ${color}, 0 0 28px ${color}`,

  // ── Radius — rounded, organic shapes ──────────────────────────────────────
  radius:      12,
  radiusSmall: 8,

  // ── Typography ─────────────────────────────────────────────────────────────
  fontDisplay: FONT_DISPLAY,
  fontBody:    FONT_BODY,

  // ── Spinner ────────────────────────────────────────────────────────────────
  spinnerBorder:    'rgba(0,255,200,0.15)',
  spinnerBorderTop: BIO_TEAL,

  // ── Component styles ───────────────────────────────────────────────────────
  page: {
    background:  'transparent',
    color:       TEXT_LIGHT,
    minHeight:   '100%',
    padding:     '32px 40px 64px',
    maxWidth:    960,
    margin:      '0 auto',
    fontFamily:  FONT_BODY,
    position:    'relative',
    zIndex:      2,
  },

  card: {
    background:   `rgba(12,29,66,0.75)`,
    border:       '1px solid rgba(0,255,200,0.12)',
    borderRadius: 12,
    backdropFilter: 'blur(8px)',
    animation:    'dsBioGlow 6s ease-in-out infinite',
  },

  cardHover: {
    border:     '1px solid rgba(0,255,200,0.28)',
    boxShadow:  `${tealGlow(16, 0.2)}, ${violetGlow(10, 0.1)}`,
  },

  input: {
    background:   'rgba(0,255,200,0.04)',
    border:       '1px solid rgba(0,255,200,0.15)',
    borderRadius: 8,
    color:        TEXT_LIGHT,
    fontFamily:   FONT_BODY,
    outline:      'none',
    caretColor:   BIO_TEAL,
  },

  select: {
    background:   'rgba(0,255,200,0.04)',
    border:       '1px solid rgba(0,255,200,0.12)',
    borderRadius: 8,
    color:        TEXT_LIGHT,
    fontFamily:   FONT_BODY,
    outline:      'none',
    cursor:       'pointer',
    appearance:   'none' as const,
  },

  btnPrimary: {
    background:     'rgba(0,255,200,0.12)',
    color:          TEXT_LIGHT,
    border:         `1px solid rgba(0,255,200,0.4)`,
    boxShadow:      `${tealGlow(10, 0.25)}, inset 0 0 20px rgba(0,255,200,0.05)`,
    borderRadius:   8,
    fontFamily:     FONT_DISPLAY,
    fontWeight:     700,
    cursor:         'pointer',
    transition:     'all 0.2s ease',
    letterSpacing:  '1px',
    textShadow:     '0 0 8px rgba(0,255,200,0.5)',
  },

  btnSecondary: {
    background:    'rgba(180,77,255,0.1)',
    color:         '#e0d0ff',
    border:        '1px solid rgba(180,77,255,0.35)',
    boxShadow:     `${violetGlow(8, 0.2)}`,
    borderRadius:  8,
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    cursor:        'pointer',
    transition:    'all 0.2s ease',
  },

  btnOutline: {
    background:    'transparent',
    color:         DEEP_CORAL,
    border:        '1px solid rgba(255,107,138,0.35)',
    boxShadow:     `${coralGlow(6, 0.15)}`,
    borderRadius:  8,
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    cursor:        'pointer',
    transition:    'all 0.2s ease',
  },

  iconBtn: {
    width:           40,
    height:          40,
    borderRadius:    10,
    border:          '1px solid rgba(0,255,200,0.15)',
    background:      'rgba(0,255,200,0.04)',
    color:           TEXT_MID,
    cursor:          'pointer',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    transition:      'all 0.2s ease',
    boxShadow:       'none',
  },

  iconBtnHover: {
    background: 'rgba(0,255,200,0.1)',
    color:      BIO_TEAL,
    boxShadow:  tealGlow(10, 0.25),
  },

  stickerLabel: {
    position:      'absolute',
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    fontSize:      10,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    padding:       '3px 10px',
    border:        '1px solid rgba(0,255,200,0.2)',
    boxShadow:     tealGlow(4, 0.2),
    color:         BIO_TEAL,
    background:    'rgba(0,255,200,0.08)',
    borderRadius:  6,
  },

  singerColors: SINGER_COLORS,
}
