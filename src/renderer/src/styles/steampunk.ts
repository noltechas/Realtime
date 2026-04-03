// Steampunk / Victorian Industrial Design System
// 19th-century industrial machinery meets Victorian elegance — brass gears,
// copper pipes, steam wisps, riveted metal, weathered parchment, pressure gauges,
// clockwork mechanisms, gaslight glow, and ornate scrollwork.

import type { Theme } from './theme'

// ── Palette ──────────────────────────────────────────────────────────────────
const IRON_DARK    = '#14110F'   // aged cast iron
const IRON_PANEL   = '#1C1816'
const IRON_CARD    = '#252018'
const BRASS        = '#C8973E'   // polished brass — primary accent
const COPPER       = '#E07040'   // vivid copper — NOW PLAYING bg
const VERDIGRIS    = '#5A9E8F'   // oxidized patina green
const PARCHMENT    = '#E8DCC8'   // warm aged paper text
const TEXT_MID     = '#A89878'   // muted warm text

const brassGlow    = (spread = 8, a = 0.35) => `0 0 ${spread}px rgba(200,151,62,${a})`
const copperGlow   = (spread = 8, a = 0.3)  => `0 0 ${spread}px rgba(224,112,64,${a})`
const verdiGlow    = (spread = 6, a = 0.25) => `0 0 ${spread}px rgba(90,158,143,${a})`

const FONT_HEADING = "'Cinzel Decorative', 'Cinzel', serif"
const FONT_DISPLAY = "'Spectral', 'Georgia', serif"
const FONT_BODY    = "'Spectral', 'Georgia', serif"

// ── Singer colors — industrial palette ───────────────────────────────────────
const SINGER_COLORS = [
  { color: '#C8973E', colorGlow: 'rgba(200,151,62,0.4)'   },   // brass gold
  { color: '#E07040', colorGlow: 'rgba(224,112,64,0.4)'   },   // copper red
  { color: '#5A9E8F', colorGlow: 'rgba(90,158,143,0.4)'   },   // verdigris green
  { color: '#D4CEC0', colorGlow: 'rgba(212,206,192,0.4)'  },   // steam white
  { color: '#D48A30', colorGlow: 'rgba(212,138,48,0.4)'   },   // boiler orange
  { color: '#4A7A9E', colorGlow: 'rgba(74,122,158,0.4)'   },   // iron blue
  { color: '#50B8A0', colorGlow: 'rgba(80,184,160,0.4)'   },   // patina teal
  { color: '#A0A0A8', colorGlow: 'rgba(160,160,168,0.4)'  },   // rivet silver
  { color: '#8B5A3A', colorGlow: 'rgba(139,90,58,0.4)'    },   // mahogany brown
  { color: '#E8B84C', colorGlow: 'rgba(232,184,76,0.4)'   },   // gaslight amber
  { color: '#4060A0', colorGlow: 'rgba(64,96,160,0.4)'    },   // cobalt blue
  { color: '#B84030', colorGlow: 'rgba(184,64,48,0.4)'    },   // rust red
  { color: '#7A5098', colorGlow: 'rgba(122,80,152,0.4)'   },   // forge violet
]

// Weathered parchment crosshatch texture SVG
const PARCHMENT_SVG = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><line x1='0' y1='0' x2='60' y2='60' stroke='rgba(200,151,62,0.03)' stroke-width='0.5'/><line x1='20' y1='0' x2='60' y2='40' stroke='rgba(200,151,62,0.025)' stroke-width='0.4'/><line x1='40' y1='0' x2='60' y2='20' stroke='rgba(200,151,62,0.02)' stroke-width='0.3'/><line x1='0' y1='20' x2='40' y2='60' stroke='rgba(200,151,62,0.025)' stroke-width='0.4'/><line x1='0' y1='40' x2='20' y2='60' stroke='rgba(200,151,62,0.02)' stroke-width='0.3'/></svg>`)

// Victorian scrollwork corner flourish SVG
const SCROLLWORK_SVG = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><path d='M5 5 Q5 30 20 20 Q35 10 25 25 Q15 40 30 30 Q45 20 35 35' fill='none' stroke='rgba(200,151,62,0.06)' stroke-width='0.8' stroke-linecap='round'/><path d='M115 115 Q115 90 100 100 Q85 110 95 95 Q105 80 90 90 Q75 100 85 85' fill='none' stroke='rgba(200,151,62,0.06)' stroke-width='0.8' stroke-linecap='round'/></svg>`)

// SVG gear shape for background (12-tooth gear)
const GEAR_SVG = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='30' fill='none' stroke='rgba(200,151,62,0.08)' stroke-width='1.5'/><circle cx='50' cy='50' r='12' fill='none' stroke='rgba(200,151,62,0.06)' stroke-width='1'/><line x1='50' y1='18' x2='50' y2='8' stroke='rgba(200,151,62,0.07)' stroke-width='6' stroke-linecap='round'/><line x1='50' y1='82' x2='50' y2='92' stroke='rgba(200,151,62,0.07)' stroke-width='6' stroke-linecap='round'/><line x1='18' y1='50' x2='8' y2='50' stroke='rgba(200,151,62,0.07)' stroke-width='6' stroke-linecap='round'/><line x1='82' y1='50' x2='92' y2='50' stroke='rgba(200,151,62,0.07)' stroke-width='6' stroke-linecap='round'/><line x1='27' y1='27' x2='20' y2='20' stroke='rgba(200,151,62,0.06)' stroke-width='5' stroke-linecap='round'/><line x1='73' y1='73' x2='80' y2='80' stroke='rgba(200,151,62,0.06)' stroke-width='5' stroke-linecap='round'/><line x1='73' y1='27' x2='80' y2='20' stroke='rgba(200,151,62,0.06)' stroke-width='5' stroke-linecap='round'/><line x1='27' y1='73' x2='20' y2='80' stroke='rgba(200,151,62,0.06)' stroke-width='5' stroke-linecap='round'/></svg>`)

// ── Global CSS injected when steampunk theme is active ───────────────────────
const GLOBAL_CSS = `
/* ── Custom fonts ────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;500;600;700&family=Spectral:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

[data-theme="steampunk"] * {
  font-family: ${FONT_BODY};
}
[data-theme="steampunk"] h1,
[data-theme="steampunk"] h2,
[data-theme="steampunk"] h3 {
  font-family: ${FONT_HEADING};
}

/* ── 1. Interlocking Gear System ─────────────────────────────────────────── */
@keyframes steamGearSpin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes steamGearSpinReverse {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(-360deg); }
}

[data-theme="steampunk"] .main::before {
  content: '';
  position: fixed;
  top: -80px;
  right: -80px;
  width: 250px;
  height: 250px;
  pointer-events: none;
  z-index: 0;
  opacity: 0.06;
  background-image: url("data:image/svg+xml,${GEAR_SVG}");
  background-size: contain;
  background-repeat: no-repeat;
  animation: steamGearSpin 30s linear infinite;
}

/* ── 2. Steam Wisp Particles ─────────────────────────────────────────────── */
@keyframes steamPuff {
  0%   { transform: translateY(0) scaleX(1) translateX(0); opacity: 0; }
  8%   { opacity: 0.15; }
  35%  { transform: translateY(-20vh) scaleX(1.4) translateX(10px); opacity: 0.1; }
  65%  { transform: translateY(-45vh) scaleX(1.8) translateX(-8px); opacity: 0.05; }
  100% { transform: translateY(-70vh) scaleX(2.2) translateX(15px); opacity: 0; }
}

[data-theme="steampunk"] .main::after {
  content: '';
  position: fixed;
  bottom: 20px;
  left: 0;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  background: transparent;
  box-shadow:
    80px   0px 4px 1px rgba(200,151,62,0.12),
    220px  -20px 5px 2px rgba(212,206,192,0.10),
    400px  -10px 3px 1px rgba(200,151,62,0.08),
    580px  -30px 4px 2px rgba(212,206,192,0.10),
    720px  -5px 5px 1px rgba(200,151,62,0.06),
    150px  -80px 3px 1px rgba(212,206,192,0.08),
    350px  -60px 4px 2px rgba(200,151,62,0.07),
    500px  -100px 5px 1px rgba(212,206,192,0.06),
    650px  -40px 3px 1px rgba(200,151,62,0.09),
    300px  -120px 4px 2px rgba(212,206,192,0.05);
  animation: steamPuff 16s ease-out infinite;
}

/* ── 9. Gaslight Heading Glow with flicker ───────────────────────────────── */
@keyframes steamFlicker {
  0%, 100%  { opacity: 1; }
  5%        { opacity: 0.85; }
  10%       { opacity: 1; }
  47%       { opacity: 1; }
  50%       { opacity: 0.9; }
  53%       { opacity: 1; }
  80%       { opacity: 1; }
  83%       { opacity: 0.92; }
  87%       { opacity: 1; }
}

[data-theme="steampunk"] h1 {
  text-shadow: 0 0 15px rgba(200,151,62,0.3), 0 0 35px rgba(200,151,62,0.1), 0 0 60px rgba(224,112,64,0.05);
  animation: steamFlicker 4s ease-in-out infinite;
}

/* ── 11. Pendulum Breathing ──────────────────────────────────────────────── */
@keyframes steamPendulum {
  0%, 100% { transform: rotate(0deg); }
  25%      { transform: rotate(0.3deg); }
  75%      { transform: rotate(-0.3deg); }
}

/* ── 3. Riveted Borders + 4. Parchment + 12. Scrollwork + 11. Pendulum ─── */
[data-theme="steampunk"] .card {
  animation: steamPendulum 5s ease-in-out infinite;
  background-image:
    url("data:image/svg+xml,${SCROLLWORK_SVG}"),
    url("data:image/svg+xml,${PARCHMENT_SVG}");
  background-repeat: no-repeat, repeat;
  background-size: 100% 100%, 60px 60px;
  border-image: repeating-linear-gradient(
    90deg,
    transparent 0px,
    transparent 18px,
    rgba(200,151,62,0.35) 18px,
    rgba(200,151,62,0.35) 22px,
    transparent 22px,
    transparent 40px
  ) 1;
  border-width: 2px;
  border-style: solid;
}

/* ── 5. Clockwork Hover Effect ───────────────────────────────────────────── */
@keyframes steamClockwork {
  0%   { box-shadow: 0 0 0 rgba(200,151,62,0); border-color: rgba(200,151,62,0.15); }
  50%  { box-shadow: 0 0 12px rgba(200,151,62,0.2), inset 0 0 8px rgba(200,151,62,0.05); border-color: rgba(200,151,62,0.4); }
  100% { box-shadow: 0 0 18px rgba(200,151,62,0.25), inset 0 0 12px rgba(200,151,62,0.08); border-color: rgba(200,151,62,0.5); }
}

[data-theme="steampunk"] button:hover {
  animation: steamClockwork 0.4s ease-out forwards;
}

/* ── 6. Pressure Gauge Nav + 13. Pipe Border ─────────────────────────────── */
[data-theme="steampunk"] .topnav {
  position: relative;
  z-index: 10;
  border-bottom: none !important;
  box-shadow: 0 2px 0 rgba(200,151,62,0.2), 0 3px 12px rgba(200,151,62,0.06);
}

[data-theme="steampunk"] .topnav::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: repeating-linear-gradient(
    90deg,
    rgba(200,151,62,0.4) 0px,
    rgba(200,151,62,0.4) 4px,
    rgba(200,151,62,0.15) 4px,
    rgba(200,151,62,0.15) 6px,
    transparent 6px,
    transparent 28px,
    rgba(200,151,62,0.15) 28px,
    rgba(200,151,62,0.15) 30px,
    rgba(200,151,62,0.4) 30px,
    rgba(200,151,62,0.4) 34px,
    transparent 34px,
    transparent 40px
  );
}

/* ── 10. Active nav — gaslight warm glow ─────────────────────────────────── */
[data-theme="steampunk"] .topnav a[aria-current="page"] {
  text-shadow: 0 0 10px rgba(200,151,62,0.5), 0 0 25px rgba(200,151,62,0.2);
  animation: steamFlicker 4s ease-in-out infinite;
}

/* ── 7. Pipe Scrollbar — brass cylinder ──────────────────────────────────── */
[data-theme="steampunk"] ::-webkit-scrollbar-thumb {
  background: linear-gradient(90deg, rgba(160,120,40,0.3) 0%, rgba(200,151,62,0.5) 40%, rgba(220,180,80,0.6) 50%, rgba(200,151,62,0.5) 60%, rgba(160,120,40,0.3) 100%);
  border-radius: 6px;
}
[data-theme="steampunk"] ::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(90deg, rgba(160,120,40,0.5) 0%, rgba(200,151,62,0.7) 40%, rgba(220,180,80,0.8) 50%, rgba(200,151,62,0.7) 60%, rgba(160,120,40,0.5) 100%);
}
[data-theme="steampunk"] ::-webkit-scrollbar-track {
  background: rgba(200,151,62,0.04);
}

/* ── 8. Brass Focus Rings — double ring ──────────────────────────────────── */
[data-theme="steampunk"] input:focus,
[data-theme="steampunk"] select:focus,
[data-theme="steampunk"] textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(200,151,62,0.4), 0 0 0 4px rgba(224,112,64,0.15), 0 0 16px rgba(200,151,62,0.15) !important;
  border-color: ${BRASS} !important;
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
export const STEAMPUNK: Theme = {
  name: 'steampunk',
  nextThemeName: 'neo-brutal',
  displayName: 'Steampunk',
  globalCss: GLOBAL_CSS,

  // ── Raw colors (warm parchment text on dark iron backgrounds) ──────────────
  black:       PARCHMENT,         // primary text
  white:       IRON_DARK,         // inverted for "light" blocks
  cream:       IRON_PANEL,
  creamDark:   IRON_CARD,
  hotRed:      '#B84030',         // rust red
  vividYellow: BRASS,
  softViolet:  '#7A5098',         // forge violet
  mintGreen:   VERDIGRIS,
  muted:       TEXT_MID,
  faint:       'rgba(200,151,62,0.22)',

  accentA: BRASS,
  accentB: COPPER,
  accentC: VERDIGRIS,

  // ── Shell ──────────────────────────────────────────────────────────────────
  appBg:         IRON_DARK,
  titlebarBg:    IRON_DARK,
  titlebarText:  TEXT_MID,

  navBg:           'rgba(20,17,15,0.95)',
  navBorderBottom: '1px solid rgba(200,151,62,0.15)',
  navLink:         TEXT_MID,
  navLinkActive:   BRASS,
  navLinkActiveBg: 'rgba(200,151,62,0.08)',
  navLinkHoverBg:  'rgba(200,151,62,0.05)',

  // ── Borders & Shadows ──────────────────────────────────────────────────────
  border:       '1px solid rgba(200,151,62,0.15)',
  borderThin:   '1px solid rgba(200,151,62,0.10)',
  borderLight:  '1px solid rgba(200,151,62,0.06)',
  shadow:        `${brassGlow(10, 0.1)}, ${copperGlow(6, 0.06)}`,
  shadowLift:    `${brassGlow(18, 0.2)}, ${copperGlow(12, 0.12)}`,
  shadowPressed: `${brassGlow(4, 0.08)}`,
  shadowColor:   (color: string) => `0 0 14px ${color}, 0 0 28px ${color}`,

  // ── Radius — minimal, industrial ──────────────────────────────────────────
  radius:      6,
  radiusSmall: 3,

  // ── Typography ─────────────────────────────────────────────────────────────
  fontDisplay: FONT_DISPLAY,
  fontBody:    FONT_BODY,

  // ── Spinner ────────────────────────────────────────────────────────────────
  spinnerBorder:    'rgba(200,151,62,0.15)',
  spinnerBorderTop: BRASS,

  // ── Component styles ───────────────────────────────────────────────────────
  page: {
    background:  'transparent',
    color:       PARCHMENT,
    minHeight:   '100%',
    padding:     '32px 40px 64px',
    maxWidth:    960,
    margin:      '0 auto',
    fontFamily:  FONT_BODY,
    position:    'relative',
    zIndex:      2,
  },

  card: {
    background:     `rgba(37,32,24,0.8)`,
    border:         '1px solid rgba(200,151,62,0.12)',
    borderRadius:   6,
    backdropFilter: 'blur(8px)',
  },

  cardHover: {
    border:     '1px solid rgba(200,151,62,0.3)',
    boxShadow:  `${brassGlow(16, 0.2)}, ${copperGlow(10, 0.1)}`,
  },

  input: {
    background:   'rgba(200,151,62,0.04)',
    border:       '1px solid rgba(200,151,62,0.15)',
    borderRadius: 3,
    color:        PARCHMENT,
    fontFamily:   FONT_BODY,
    outline:      'none',
    caretColor:   BRASS,
  },

  select: {
    background:   'rgba(200,151,62,0.04)',
    border:       '1px solid rgba(200,151,62,0.12)',
    borderRadius: 3,
    color:        PARCHMENT,
    fontFamily:   FONT_BODY,
    outline:      'none',
    cursor:       'pointer',
    appearance:   'none' as const,
  },

  btnPrimary: {
    background:     'rgba(200,151,62,0.12)',
    color:          PARCHMENT,
    border:         `1px solid rgba(200,151,62,0.4)`,
    boxShadow:      `${brassGlow(10, 0.25)}, inset 0 0 20px rgba(200,151,62,0.05)`,
    borderRadius:   3,
    fontFamily:     FONT_DISPLAY,
    fontWeight:     700,
    cursor:         'pointer',
    transition:     'all 0.2s ease',
    letterSpacing:  '1px',
    textShadow:     '0 0 8px rgba(200,151,62,0.4)',
  },

  btnSecondary: {
    background:    'rgba(224,112,64,0.1)',
    color:         '#E8C0A0',
    border:        '1px solid rgba(224,112,64,0.35)',
    boxShadow:     `${copperGlow(8, 0.2)}`,
    borderRadius:  3,
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    cursor:        'pointer',
    transition:    'all 0.2s ease',
  },

  btnOutline: {
    background:    'transparent',
    color:         VERDIGRIS,
    border:        '1px solid rgba(90,158,143,0.35)',
    boxShadow:     `${verdiGlow(6, 0.15)}`,
    borderRadius:  3,
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    cursor:        'pointer',
    transition:    'all 0.2s ease',
  },

  iconBtn: {
    width:           40,
    height:          40,
    borderRadius:    6,
    border:          '1px solid rgba(200,151,62,0.15)',
    background:      'rgba(200,151,62,0.04)',
    color:           TEXT_MID,
    cursor:          'pointer',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    transition:      'all 0.2s ease',
    boxShadow:       'none',
  },

  iconBtnHover: {
    background: 'rgba(200,151,62,0.1)',
    color:      BRASS,
    boxShadow:  brassGlow(10, 0.25),
  },

  stickerLabel: {
    position:       'absolute',
    fontFamily:     FONT_DISPLAY,
    fontWeight:     700,
    fontSize:       10,
    letterSpacing:  '1.5px',
    textTransform:  'uppercase',
    padding:        '3px 10px',
    border:         '1px solid rgba(200,151,62,0.25)',
    boxShadow:      `${brassGlow(6, 0.15)}, ${copperGlow(4, 0.08)}`,
    color:          BRASS,
    background:     'rgba(20,17,15,0.85)',
    borderRadius:   3,
    backdropFilter: 'blur(12px)',
  },

  singerColors: SINGER_COLORS,
}
