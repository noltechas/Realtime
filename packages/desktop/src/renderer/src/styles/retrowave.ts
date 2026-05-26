// Retrowave / Synthwave Design System
// 80s neon sunset aesthetic — Outrun / Drive inspired. Chrome text, perspective grid,
// palm silhouettes, VHS tracking artifacts, warm pink + blue + orange sunset palette.

import type { Theme } from './theme'

// ── Palette ──────────────────────────────────────────────────────────────────
const MIDNIGHT       = '#0a0614'   // warm purple-black sky
const MIDNIGHT_PANEL = '#110a1e'   // slightly lighter panels
const MIDNIGHT_CARD  = '#18102a'   // card surface — purple-tinted dark
const HOT_PINK       = '#FF2D95'   // primary neon
const ELECTRIC_BLUE  = '#00BFFF'   // secondary neon
const SUNSET_ORANGE  = '#FF6B2B'   // sunset accent
const SUNSET_GOLD    = '#FFD700'   // sunset gold — NOW PLAYING bg
const TEXT_LIGHT     = '#F0E6FF'   // cool white with lavender tint
const TEXT_MID       = '#9B8CBF'   // muted lavender

const pinkGlow  = (spread = 8, a = 0.35) => `0 0 ${spread}px rgba(255,45,149,${a})`
const blueGlow  = (spread = 8, a = 0.3)  => `0 0 ${spread}px rgba(0,191,255,${a})`

const FONT_HEADING = "'Audiowide', 'Orbitron', sans-serif"
const FONT_DISPLAY = "'Audiowide', 'Rajdhani', sans-serif"
const FONT_BODY    = "'Rajdhani', 'Exo 2', sans-serif"

// ── Singer colors — warm sunset + neon palette ──────────────────────────────
const SINGER_COLORS = [
  { color: '#FF2D95', colorGlow: 'rgba(255,45,149,0.4)'  },   // hot pink
  { color: '#00BFFF', colorGlow: 'rgba(0,191,255,0.4)'   },   // electric blue
  { color: '#FF6B2B', colorGlow: 'rgba(255,107,43,0.4)'  },   // sunset orange
  { color: '#FFD700', colorGlow: 'rgba(255,215,0,0.4)'   },   // sunset gold
  { color: '#B44AFF', colorGlow: 'rgba(180,74,255,0.4)'  },   // neon purple
  { color: '#FF4466', colorGlow: 'rgba(255,68,102,0.4)'  },   // coral red
  { color: '#00E5CC', colorGlow: 'rgba(0,229,204,0.4)'   },   // mint teal
  { color: '#FF8C00', colorGlow: 'rgba(255,140,0,0.4)'   },   // dark orange
  { color: '#E040FB', colorGlow: 'rgba(224,64,251,0.4)'  },   // magenta
  { color: '#40C4FF', colorGlow: 'rgba(64,196,255,0.4)'  },   // light blue
  { color: '#FF6090', colorGlow: 'rgba(255,96,144,0.4)'  },   // flamingo pink
  { color: '#FFAB40', colorGlow: 'rgba(255,171,64,0.4)'  },   // amber
  { color: '#7C4DFF', colorGlow: 'rgba(124,77,255,0.4)'  },   // deep violet
]

// ── Global CSS injected when retrowave theme is active ──────────────────────
const GLOBAL_CSS = `
/* ── Custom fonts ────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Audiowide&family=Rajdhani:wght@400;500;600;700&display=swap');

[data-theme="retrowave"] * {
  font-family: ${FONT_BODY};
}
[data-theme="retrowave"] h1,
[data-theme="retrowave"] h2,
[data-theme="retrowave"] h3 {
  font-family: ${FONT_HEADING};
}

/* ── 1. VHS Tracking Line — single thick distortion band drifting down ──── */
@keyframes rwVhsTrack {
  0%   { top: -6px; opacity: 0; }
  3%   { opacity: 1; }
  95%  { opacity: 1; }
  100% { top: 100vh; opacity: 0; }
}

[data-theme="retrowave"] .main::after {
  content: '';
  position: fixed;
  left: 0;
  right: 0;
  top: -6px;
  height: 3px;
  pointer-events: none;
  z-index: 0;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255,45,149,0.15) 15%,
    rgba(255,255,255,0.25) 40%,
    rgba(0,191,255,0.2) 60%,
    rgba(255,45,149,0.15) 85%,
    transparent 100%
  );
  box-shadow:
    0 0 8px rgba(255,45,149,0.15),
    0 0 20px rgba(0,191,255,0.08);
  animation: rwVhsTrack 8s linear infinite;
}

/* ── 2. Perspective Grid Overlay ───────────────────────────────────────── */
[data-theme="retrowave"] .main::before {
  content: '';
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 35%;
  pointer-events: none;
  z-index: 0;
  opacity: 0.06;
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 28px,
      rgba(255,45,149,0.5) 28px,
      rgba(255,45,149,0.5) 29px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 58px,
      rgba(0,191,255,0.4) 58px,
      rgba(0,191,255,0.4) 59px
    );
}

/* ── 3. Sunset Gradient Chrome Headings ─────────────────────────────────── */
[data-theme="retrowave"] h1 {
  background: linear-gradient(180deg, #FFD700 0%, #FF6B2B 40%, #FF2D95 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 12px rgba(255,45,149,0.3)) drop-shadow(0 0 4px rgba(255,107,43,0.2));
}

/* ── 4. Active nav — pink neon glow ─────────────────────────────────────── */
[data-theme="retrowave"] .topnav a[aria-current="page"] {
  text-shadow: 0 0 10px rgba(255,45,149,0.6), 0 0 20px rgba(255,45,149,0.25);
}

/* ── 5. Nav bottom border — sunset gradient ─────────────────────────────── */
@keyframes rwNavGlow {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

[data-theme="retrowave"] .topnav {
  border-bottom: none !important;
  box-shadow:
    0 1px 0 rgba(255,45,149,0.15),
    0 2px 12px rgba(255,45,149,0.04);
}

[data-theme="retrowave"] .topnav::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    rgba(255,215,0,0.6),
    rgba(255,107,43,0.6),
    rgba(255,45,149,0.6),
    rgba(0,191,255,0.5),
    rgba(255,45,149,0.6),
    rgba(255,107,43,0.6),
    rgba(255,215,0,0.6)
  );
  background-size: 200% 100%;
  animation: rwNavGlow 6s linear infinite;
  opacity: 0.5;
}

/* ── 6. Button hover — pink neon glow ───────────────────────────────────── */
[data-theme="retrowave"] button:hover {
  transform: scale(1.02);
  transition: all 0.2s ease;
}

/* ── 7. Scrollbar — sunset gradient ─────────────────────────────────────── */
[data-theme="retrowave"] ::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(255,215,0,0.3) 0%, rgba(255,45,149,0.3) 50%, rgba(0,191,255,0.2) 100%);
  border-radius: 6px;
}
[data-theme="retrowave"] ::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(255,215,0,0.5) 0%, rgba(255,45,149,0.5) 50%, rgba(0,191,255,0.35) 100%);
}
[data-theme="retrowave"] ::-webkit-scrollbar-track {
  background: rgba(255,45,149,0.02);
}

/* ── 8. Focus rings — pink + blue double ring ───────────────────────────── */
[data-theme="retrowave"] input:focus,
[data-theme="retrowave"] select:focus,
[data-theme="retrowave"] textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255,45,149,0.35), 0 0 16px rgba(0,191,255,0.15) !important;
  border-color: ${HOT_PINK} !important;
}

/* ── 9. Neon Sign Flicker on Cards — buzzing tube effect ────────────────── */
@keyframes rwNeonFlicker {
  0%, 100% {
    box-shadow: 0 0 8px rgba(255,45,149,0.06), inset 0 0 25px rgba(0,0,0,0.12);
    border-color: rgba(255,45,149,0.12);
  }
  4% {
    box-shadow: 0 0 14px rgba(255,45,149,0.18), inset 0 0 25px rgba(0,0,0,0.12);
    border-color: rgba(255,45,149,0.3);
  }
  6% {
    box-shadow: 0 0 5px rgba(255,45,149,0.04), inset 0 0 25px rgba(0,0,0,0.12);
    border-color: rgba(255,45,149,0.08);
  }
  8% {
    box-shadow: 0 0 12px rgba(255,45,149,0.14), inset 0 0 25px rgba(0,0,0,0.12);
    border-color: rgba(255,45,149,0.22);
  }
  50% {
    box-shadow: 0 0 10px rgba(0,191,255,0.08), inset 0 0 25px rgba(0,0,0,0.12);
    border-color: rgba(0,191,255,0.15);
  }
  52% {
    box-shadow: 0 0 16px rgba(0,191,255,0.2), inset 0 0 25px rgba(0,0,0,0.12);
    border-color: rgba(0,191,255,0.3);
  }
  54% {
    box-shadow: 0 0 6px rgba(0,191,255,0.05), inset 0 0 25px rgba(0,0,0,0.12);
    border-color: rgba(0,191,255,0.1);
  }
  56% {
    box-shadow: 0 0 10px rgba(0,191,255,0.08), inset 0 0 25px rgba(0,0,0,0.12);
    border-color: rgba(0,191,255,0.15);
  }
}

[data-theme="retrowave"] .card {
  animation: rwNeonFlicker 8s ease-in-out infinite;
  box-shadow: inset 0 0 25px rgba(0,0,0,0.12);
}

/* ── 10. Chrome Reflection Sweep on Headings ────────────────────────────── */
@keyframes rwChromeShine {
  0%   { left: -120%; }
  40%  { left: 120%; }
  100% { left: 120%; }
}

[data-theme="retrowave"] h1 {
  position: relative;
  overflow: hidden;
}

[data-theme="retrowave"] h1::after {
  content: '';
  position: absolute;
  top: 0;
  left: -120%;
  width: 60%;
  height: 100%;
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgba(255,255,255,0.12) 45%,
    rgba(255,255,255,0.25) 50%,
    rgba(255,255,255,0.12) 55%,
    transparent 70%
  );
  animation: rwChromeShine 6s ease-in-out infinite;
  pointer-events: none;
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
export const RETROWAVE: Theme = {
  name: 'retrowave',
  nextThemeName: 'neo-brutal',
  displayName: 'Retrowave',
  globalCss: GLOBAL_CSS,

  // ── Raw colors (warm light text on deep purple backgrounds) ────────────────
  black:       TEXT_LIGHT,        // primary text — lavender white on midnight
  white:       MIDNIGHT,          // inverted for "light" blocks
  cream:       MIDNIGHT_PANEL,
  creamDark:   MIDNIGHT_CARD,
  hotRed:      '#FF1A6B',         // neon red-pink
  vividYellow: SUNSET_GOLD,
  softViolet:  '#B44AFF',
  mintGreen:   ELECTRIC_BLUE,
  muted:       TEXT_MID,          // subdued lavender
  faint:       'rgba(255,45,149,0.2)',

  accentA: HOT_PINK,
  accentB: SUNSET_GOLD,
  accentC: ELECTRIC_BLUE,

  // ── Shell ──────────────────────────────────────────────────────────────────
  appBg:         MIDNIGHT,
  titlebarBg:    MIDNIGHT,
  titlebarText:  TEXT_MID,

  navBg:           'rgba(10,6,20,0.96)',
  navBorderBottom: '1px solid rgba(255,45,149,0.18)',
  navLink:         TEXT_MID,
  navLinkActive:   HOT_PINK,
  navLinkActiveBg: 'rgba(255,45,149,0.08)',
  navLinkHoverBg:  'rgba(255,45,149,0.05)',

  // ── Borders & Shadows ──────────────────────────────────────────────────────
  border:       '1px solid rgba(255,45,149,0.18)',
  borderThin:   '1px solid rgba(255,45,149,0.12)',
  borderLight:  '1px solid rgba(255,45,149,0.07)',
  shadow:        `${pinkGlow(10, 0.1)}, ${blueGlow(6, 0.06)}`,
  shadowLift:    `${pinkGlow(18, 0.2)}, ${blueGlow(12, 0.12)}`,
  shadowPressed: `${pinkGlow(4, 0.08)}`,
  shadowColor:   (color: string) => `0 0 14px ${color}, 0 0 28px ${color}`,

  // ── Radius — smooth, not sharp ────────────────────────────────────────────
  radius:      4,
  radiusSmall: 2,

  // ── Typography ─────────────────────────────────────────────────────────────
  fontDisplay: FONT_DISPLAY,
  fontBody:    FONT_BODY,

  // ── Spinner ────────────────────────────────────────────────────────────────
  spinnerBorder:    'rgba(255,45,149,0.15)',
  spinnerBorderTop: HOT_PINK,

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
    background:     'rgba(24,16,42,0.75)',
    border:         '1px solid rgba(255,45,149,0.12)',
    borderRadius:   4,
    backdropFilter: 'blur(8px)',
  },

  cardHover: {
    border:     '1px solid rgba(255,45,149,0.28)',
    boxShadow:  `${pinkGlow(16, 0.2)}, ${blueGlow(10, 0.1)}`,
  },

  input: {
    background:   'rgba(255,45,149,0.04)',
    border:       '1px solid rgba(255,45,149,0.15)',
    borderRadius: 4,
    color:        TEXT_LIGHT,
    fontFamily:   FONT_BODY,
    outline:      'none',
    caretColor:   HOT_PINK,
  },

  select: {
    background:   'rgba(255,45,149,0.04)',
    border:       '1px solid rgba(255,45,149,0.12)',
    borderRadius: 4,
    color:        TEXT_LIGHT,
    fontFamily:   FONT_BODY,
    outline:      'none',
    cursor:       'pointer',
    appearance:   'none' as const,
  },

  btnPrimary: {
    background:     'rgba(255,45,149,0.1)',
    color:          TEXT_LIGHT,
    border:         '1px solid rgba(255,45,149,0.4)',
    boxShadow:      `${pinkGlow(10, 0.25)}, inset 0 0 20px rgba(255,45,149,0.05)`,
    borderRadius:   4,
    fontFamily:     FONT_DISPLAY,
    fontWeight:     700,
    cursor:         'pointer',
    transition:     'all 0.2s ease',
    letterSpacing:  '1px',
    textShadow:     '0 0 8px rgba(255,45,149,0.4)',
  },

  btnSecondary: {
    background:    'rgba(0,191,255,0.1)',
    color:         '#90DFFF',
    border:        '1px solid rgba(0,191,255,0.35)',
    boxShadow:     `${blueGlow(8, 0.2)}`,
    borderRadius:  4,
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    cursor:        'pointer',
    transition:    'all 0.2s ease',
  },

  btnOutline: {
    background:    'transparent',
    color:         SUNSET_ORANGE,
    border:        '1px solid rgba(255,107,43,0.35)',
    boxShadow:     '0 0 6px rgba(255,107,43,0.15)',
    borderRadius:  4,
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    cursor:        'pointer',
    transition:    'all 0.2s ease',
  },

  iconBtn: {
    width:           40,
    height:          40,
    borderRadius:    4,
    border:          '1px solid rgba(255,45,149,0.15)',
    background:      'rgba(255,45,149,0.04)',
    color:           TEXT_MID,
    cursor:          'pointer',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    transition:      'all 0.2s ease',
    boxShadow:       'none',
  },

  iconBtnHover: {
    background: 'rgba(255,45,149,0.1)',
    color:      HOT_PINK,
    boxShadow:  pinkGlow(10, 0.25),
  },

  stickerLabel: {
    position:      'absolute',
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    fontSize:      10,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    padding:       '3px 10px',
    border:        '1px solid rgba(255,45,149,0.2)',
    boxShadow:     `${pinkGlow(6, 0.15)}, ${blueGlow(4, 0.08)}`,
    color:         HOT_PINK,
    background:    'rgba(10,6,20,0.85)',
    borderRadius:  4,
    backdropFilter: 'blur(12px)',
  },

  singerColors: SINGER_COLORS,
}
