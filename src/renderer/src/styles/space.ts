// Cosmic / Deep Space Design System
// Sci-fi space aesthetic — twinkling starfields, nebula gas clouds, shooting stars,
// constellation patterns, warp-speed visuals, gravitational lens effects, aurora nav.

import type { Theme } from './theme'

// ── Palette ──────────────────────────────────────────────────────────────────
const VOID         = '#08080F'   // deep space with subtle blue tint
const VOID_PANEL   = '#0E0E1A'
const VOID_CARD    = '#151528'
const NEBULA_MAG   = '#E040FB'   // nebula magenta — primary
const SOLAR_AMBER  = '#40E0D0'   // plasma cyan — NOW PLAYING bg (vivid + space-themed)
const PLASMA_CYAN  = '#40E0D0'   // plasma cyan — tertiary
const TEXT_LIGHT   = '#E8E6F0'   // cool white text
const TEXT_MID     = '#9896A8'   // muted cool gray

const magGlow   = (spread = 8, a = 0.35) => `0 0 ${spread}px rgba(224,64,251,${a})`
const cyanGlow  = (spread = 8, a = 0.3)  => `0 0 ${spread}px rgba(64,224,208,${a})`
const amberGlow = (spread = 6, a = 0.25) => `0 0 ${spread}px rgba(255,183,64,${a})`

const FONT_HEADING = "'Orbitron', 'Exo 2', sans-serif"
const FONT_DISPLAY = "'Exo 2', 'Orbitron', sans-serif"
const FONT_BODY    = "'Exo 2', 'Orbitron', sans-serif"

// ── Singer colors — cosmic palette ───────────────────────────────────────────
const SINGER_COLORS = [
  { color: '#E040FB', colorGlow: 'rgba(224,64,251,0.4)'   },   // nebula magenta
  { color: '#40E0D0', colorGlow: 'rgba(64,224,208,0.4)'   },   // plasma cyan
  { color: '#FFB740', colorGlow: 'rgba(255,183,64,0.4)'   },   // solar amber
  { color: '#4090FF', colorGlow: 'rgba(64,144,255,0.4)'   },   // pulsar blue
  { color: '#FF4060', colorGlow: 'rgba(255,64,96,0.4)'    },   // supernova red
  { color: '#40FB80', colorGlow: 'rgba(64,251,128,0.4)'   },   // aurora green
  { color: '#A040FB', colorGlow: 'rgba(160,64,251,0.4)'   },   // quasar violet
  { color: '#FF8040', colorGlow: 'rgba(255,128,64,0.4)'   },   // comet orange
  { color: '#E0E0F0', colorGlow: 'rgba(224,224,240,0.4)'  },   // starlight white
  { color: '#FB40A0', colorGlow: 'rgba(251,64,160,0.4)'   },   // cosmic pink
  { color: '#40A0FF', colorGlow: 'rgba(64,160,255,0.4)'   },   // ion blue
  { color: '#A0FB40', colorGlow: 'rgba(160,251,64,0.4)'   },   // gamma lime
  { color: '#FFD040', colorGlow: 'rgba(255,208,64,0.4)'   },   // dwarf gold
]

// Constellation pattern SVG (connected dots and lines)
const CONSTELLATION_SVG = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><circle cx='30' cy='40' r='1.2' fill='rgba(224,224,240,0.12)'/><circle cx='80' cy='25' r='1' fill='rgba(224,224,240,0.08)'/><circle cx='140' cy='60' r='1.3' fill='rgba(224,224,240,0.10)'/><circle cx='170' cy='130' r='1' fill='rgba(224,224,240,0.09)'/><circle cx='60' cy='150' r='1.2' fill='rgba(224,224,240,0.11)'/><circle cx='120' cy='170' r='1' fill='rgba(224,224,240,0.07)'/><line x1='30' y1='40' x2='80' y2='25' stroke='rgba(224,224,240,0.04)' stroke-width='0.5'/><line x1='80' y1='25' x2='140' y2='60' stroke='rgba(224,224,240,0.04)' stroke-width='0.5'/><line x1='140' y1='60' x2='170' y2='130' stroke='rgba(224,224,240,0.04)' stroke-width='0.5'/><line x1='60' y1='150' x2='120' y2='170' stroke='rgba(224,224,240,0.04)' stroke-width='0.5'/><line x1='30' y1='40' x2='60' y2='150' stroke='rgba(224,224,240,0.03)' stroke-width='0.5'/></svg>`)

// ── Global CSS injected when space theme is active ───────────────────────────
const GLOBAL_CSS = `
/* ── Custom fonts ────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Exo+2:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

[data-theme="space"] * {
  font-family: ${FONT_BODY};
}
[data-theme="space"] h1,
[data-theme="space"] h2,
[data-theme="space"] h3 {
  font-family: ${FONT_HEADING};
}

/* ── 1. Twinkling Starfield ─────────────────────────────────────────────── */
@keyframes spaceTwinkle {
  0%, 100% { opacity: 0.3; }
  50%      { opacity: 1; }
}

@keyframes spaceTwinkle2 {
  0%, 100% { opacity: 0.5; }
  30%      { opacity: 0.15; }
  70%      { opacity: 1; }
}

[data-theme="space"] .main::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  background: transparent;
  box-shadow:
    40px   80px  0 0 rgba(232,230,240,0.6),
    120px  30px  0 0 rgba(232,230,240,0.4),
    200px  150px 0 0 rgba(224,64,251,0.5),
    310px  60px  0 0 rgba(232,230,240,0.3),
    420px  200px 0 0 rgba(232,230,240,0.5),
    530px  40px  0 0 rgba(64,224,208,0.4),
    640px  170px 0 0 rgba(232,230,240,0.35),
    750px  90px  0 0 rgba(232,230,240,0.5),
    80px   300px 0 0 rgba(232,230,240,0.45),
    250px  350px 0 0 rgba(224,64,251,0.35),
    400px  280px 0 0 rgba(232,230,240,0.3),
    550px  320px 0 0 rgba(232,230,240,0.55),
    700px  380px 0 0 rgba(64,224,208,0.3),
    150px  450px 0 0 rgba(232,230,240,0.4),
    350px  500px 0 0 rgba(232,230,240,0.5),
    500px  420px 0 0 rgba(224,64,251,0.3),
    650px  480px 0 0 rgba(232,230,240,0.35),
    100px  550px 0 0 rgba(232,230,240,0.45),
    300px  600px 0 0 rgba(64,224,208,0.35),
    480px  570px 0 0 rgba(232,230,240,0.3),
    600px  520px 0 0 rgba(232,230,240,0.5),
    770px  250px 0 0 rgba(232,230,240,0.4),
    820px  450px 0 0 rgba(224,64,251,0.25),
    50px   650px 0 0 rgba(232,230,240,0.35);
  animation: spaceTwinkle 4s ease-in-out infinite;
}

/* ── 2. Nebula Cloud Drift ──────────────────────────────────────────────── */
[data-theme="space"] .main::before {
  content: '';
  position: fixed;
  inset: -20%;
  pointer-events: none;
  z-index: 1;
  opacity: 0.04;
  background:
    radial-gradient(ellipse 55% 45% at 20% 35%, rgba(224,64,251,0.6) 0%, transparent 70%),
    radial-gradient(ellipse 45% 55% at 75% 55%, rgba(64,224,208,0.5) 0%, transparent 70%),
    radial-gradient(ellipse 50% 40% at 50% 75%, rgba(100,60,200,0.4) 0%, transparent 60%);
  animation: spaceNebulaDrift 35s ease-in-out infinite;
  filter: blur(50px);
}

@keyframes spaceNebulaDrift {
  0%   { transform: translate(0, 0) scale(1.3) rotate(0deg); }
  33%  { transform: translate(25px, -15px) scale(1.4) rotate(2deg); }
  66%  { transform: translate(-15px, 20px) scale(1.35) rotate(-1.5deg); }
  100% { transform: translate(0, 0) scale(1.3) rotate(0deg); }
}

/* ── 3. Shooting Star Trail ─────────────────────────────────────────────── */
@keyframes spaceShootingStar {
  0%, 96%   { opacity: 0; transform: translate(0, 0); }
  97%       { opacity: 1; transform: translate(0, 0); }
  100%      { opacity: 0; transform: translate(200px, 120px); }
}

/* ── 6. Aurora Borealis Nav ─────────────────────────────────────────────── */
@keyframes spaceAurora {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

[data-theme="space"] .topnav {
  border-bottom: none !important;
  box-shadow:
    0 1px 0 rgba(224,64,251,0.15),
    0 2px 12px rgba(224,64,251,0.04);
}

[data-theme="space"] .topnav::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    rgba(224,64,251,0.6),
    rgba(64,224,208,0.6),
    rgba(64,251,128,0.5),
    rgba(64,224,208,0.6),
    rgba(224,64,251,0.6)
  );
  background-size: 200% 100%;
  animation: spaceAurora 8s linear infinite;
  opacity: 0.5;
}

/* ── 10. Active nav — magenta glow ──────────────────────────────────────── */
[data-theme="space"] .topnav a[aria-current="page"] {
  text-shadow: 0 0 10px rgba(224,64,251,0.6), 0 0 20px rgba(224,64,251,0.25);
}

/* ── 5. Gravitational Lens Hover ────────────────────────────────────────── */
@keyframes spaceGravLens {
  0%   { box-shadow: 0 0 0 rgba(224,64,251,0); }
  100% { box-shadow: 0 0 20px rgba(224,64,251,0.15), 0 0 40px rgba(64,224,208,0.08); }
}

[data-theme="space"] button:hover {
  transform: scale(1.02);
  animation: spaceGravLens 0.3s ease-out forwards;
}

/* ── 11. Zero-G Floating ────────────────────────────────────────────────── */
@keyframes spaceFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-2px); }
}

/* ── 13. Card glow cycling magenta → cyan ───────────────────────────────── */
@keyframes spaceCardGlow {
  0%, 100% {
    box-shadow: 0 0 8px rgba(224,64,251,0.08), 0 0 20px rgba(224,64,251,0.04), inset 0 1px 0 rgba(224,64,251,0.06);
  }
  50% {
    box-shadow: 0 0 14px rgba(64,224,208,0.12), 0 0 30px rgba(64,224,208,0.06), inset 0 1px 0 rgba(64,224,208,0.08);
  }
}

/* ── 4. Constellation pattern + 11. Float + 12. Ring + 13. Glow on cards ─ */
[data-theme="space"] .card {
  animation: spaceFloat 6s ease-in-out infinite, spaceCardGlow 8s ease-in-out infinite;
  background-image: url("data:image/svg+xml,${CONSTELLATION_SVG}");
  background-repeat: repeat;
}

/* ── 7. Comet Tail Scrollbar ────────────────────────────────────────────── */
[data-theme="space"] ::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(224,64,251,0.3) 0%, rgba(224,64,251,0.05) 100%);
  border-radius: 6px;
}
[data-theme="space"] ::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(224,64,251,0.5) 0%, rgba(224,64,251,0.1) 100%);
}
[data-theme="space"] ::-webkit-scrollbar-track {
  background: rgba(224,64,251,0.02);
}

/* ── 8. Input / select focus rings — plasma cyan glow ───────────────────── */
[data-theme="space"] input:focus,
[data-theme="space"] select:focus,
[data-theme="space"] textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(64,224,208,0.35), 0 0 16px rgba(64,224,208,0.2) !important;
  border-color: ${PLASMA_CYAN} !important;
}

/* ── 9. Heading glow — cool magenta/blue ────────────────────────────────── */
[data-theme="space"] h1 {
  text-shadow: 0 0 20px rgba(224,64,251,0.25), 0 0 40px rgba(64,224,208,0.1);
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
export const SPACE: Theme = {
  name: 'space',
  nextThemeName: 'steampunk',
  displayName: 'Space',
  globalCss: GLOBAL_CSS,

  // ── Raw colors (cool light text on deep space backgrounds) ─────────────────
  black:       TEXT_LIGHT,        // primary text — cool white on void
  white:       VOID,              // inverted for "light" blocks
  cream:       VOID_PANEL,
  creamDark:   VOID_CARD,
  hotRed:      '#FF4060',         // supernova red
  vividYellow: SOLAR_AMBER,
  softViolet:  NEBULA_MAG,
  mintGreen:   PLASMA_CYAN,
  muted:       TEXT_MID,          // cool muted text
  faint:       'rgba(224,64,251,0.22)',

  accentA: NEBULA_MAG,
  accentB: SOLAR_AMBER,
  accentC: PLASMA_CYAN,

  // ── Shell ──────────────────────────────────────────────────────────────────
  appBg:         VOID,
  titlebarBg:    VOID,
  titlebarText:  TEXT_MID,

  navBg:           'rgba(8,8,15,0.95)',
  navBorderBottom: '1px solid rgba(224,64,251,0.12)',
  navLink:         TEXT_MID,
  navLinkActive:   NEBULA_MAG,
  navLinkActiveBg: 'rgba(224,64,251,0.08)',
  navLinkHoverBg:  'rgba(224,64,251,0.05)',

  // ── Borders & Shadows ──────────────────────────────────────────────────────
  border:       '1px solid rgba(224,64,251,0.15)',
  borderThin:   '1px solid rgba(224,64,251,0.10)',
  borderLight:  '1px solid rgba(224,64,251,0.06)',
  shadow:        `${magGlow(10, 0.1)}, ${cyanGlow(6, 0.06)}`,
  shadowLift:    `${magGlow(18, 0.2)}, ${cyanGlow(12, 0.12)}`,
  shadowPressed: `${magGlow(4, 0.08)}`,
  shadowColor:   (color: string) => `0 0 14px ${color}, 0 0 28px ${color}`,

  // ── Radius — clean geometric ──────────────────────────────────────────────
  radius:      8,
  radiusSmall: 4,

  // ── Typography ─────────────────────────────────────────────────────────────
  fontDisplay: FONT_DISPLAY,
  fontBody:    FONT_BODY,

  // ── Spinner ────────────────────────────────────────────────────────────────
  spinnerBorder:    'rgba(224,64,251,0.15)',
  spinnerBorderTop: NEBULA_MAG,

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
    background:     `rgba(21,21,40,0.75)`,
    border:         '1px solid rgba(224,64,251,0.12)',
    borderRadius:   8,
    backdropFilter: 'blur(8px)',
  },

  cardHover: {
    border:     '1px solid rgba(224,64,251,0.28)',
    boxShadow:  `${magGlow(16, 0.2)}, ${cyanGlow(10, 0.1)}`,
  },

  input: {
    background:   'rgba(224,64,251,0.04)',
    border:       '1px solid rgba(224,64,251,0.15)',
    borderRadius: 4,
    color:        TEXT_LIGHT,
    fontFamily:   FONT_BODY,
    outline:      'none',
    caretColor:   PLASMA_CYAN,
  },

  select: {
    background:   'rgba(224,64,251,0.04)',
    border:       '1px solid rgba(224,64,251,0.12)',
    borderRadius: 4,
    color:        TEXT_LIGHT,
    fontFamily:   FONT_BODY,
    outline:      'none',
    cursor:       'pointer',
    appearance:   'none' as const,
  },

  btnPrimary: {
    background:     'rgba(224,64,251,0.12)',
    color:          TEXT_LIGHT,
    border:         `1px solid rgba(224,64,251,0.4)`,
    boxShadow:      `${magGlow(10, 0.25)}, inset 0 0 20px rgba(224,64,251,0.05)`,
    borderRadius:   4,
    fontFamily:     FONT_DISPLAY,
    fontWeight:     700,
    cursor:         'pointer',
    transition:     'all 0.2s ease',
    letterSpacing:  '1px',
    textShadow:     '0 0 8px rgba(224,64,251,0.4)',
  },

  btnSecondary: {
    background:    'rgba(64,224,208,0.1)',
    color:         '#A0F0E8',
    border:        '1px solid rgba(64,224,208,0.35)',
    boxShadow:     `${cyanGlow(8, 0.2)}`,
    borderRadius:  4,
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    cursor:        'pointer',
    transition:    'all 0.2s ease',
  },

  btnOutline: {
    background:    'transparent',
    color:         SOLAR_AMBER,
    border:        '1px solid rgba(255,183,64,0.35)',
    boxShadow:     `${amberGlow(6, 0.15)}`,
    borderRadius:  4,
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    cursor:        'pointer',
    transition:    'all 0.2s ease',
  },

  iconBtn: {
    width:           40,
    height:          40,
    borderRadius:    8,
    border:          '1px solid rgba(224,64,251,0.15)',
    background:      'rgba(224,64,251,0.04)',
    color:           TEXT_MID,
    cursor:          'pointer',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    transition:      'all 0.2s ease',
    boxShadow:       'none',
  },

  iconBtnHover: {
    background: 'rgba(224,64,251,0.1)',
    color:      NEBULA_MAG,
    boxShadow:  magGlow(10, 0.25),
  },

  stickerLabel: {
    position:      'absolute',
    fontFamily:    FONT_DISPLAY,
    fontWeight:    700,
    fontSize:      10,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    padding:       '3px 10px',
    border:        '1px solid rgba(64,224,208,0.2)',
    boxShadow:     `${cyanGlow(6, 0.15)}, ${magGlow(4, 0.08)}`,
    color:         PLASMA_CYAN,
    background:    'rgba(8,8,15,0.85)',
    borderRadius:  4,
    backdropFilter: 'blur(12px)',
  },

  singerColors: SINGER_COLORS,
}
