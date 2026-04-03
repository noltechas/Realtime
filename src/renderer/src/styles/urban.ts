// Urban / Cinematic Graffiti Design System
// Dark vignette lighting, aggressive brush typography, and uniquely slashed/clipped containers.

import type { Theme } from './theme'

const DARK_VOID = '#050505'
const DEEP_SHADOW = '#111111'
const ASH_GREY = '#B0B0B0'
const PURE_WHITE = '#FFFFFF'

// Aggressive Neon Spray Paint Accents
const TOXIC_GREEN = '#D4FF00'
const SPRAY_SILVER = '#E0E0E0'
const ALERT_RED = '#FF1E1E'
const ACID_CYAN = '#00F0FF'

const SINGER_COLORS = [
  { color: TOXIC_GREEN, colorGlow: 'rgba(212, 255, 0, 0.4)' },
  { color: SPRAY_SILVER, colorGlow: 'rgba(224, 224, 224, 0.3)' },
  { color: ALERT_RED, colorGlow: 'rgba(255, 30, 30, 0.4)' },
  { color: ACID_CYAN, colorGlow: 'rgba(0, 240, 255, 0.4)' },
  { color: '#FF00E6', colorGlow: 'rgba(255, 0, 230, 0.4)' }, // Magenta
  { color: '#FFA600', colorGlow: 'rgba(255, 166, 0, 0.4)' }, // Hazard Orange
  { color: '#9000FF', colorGlow: 'rgba(144, 0, 255, 0.4)' }, // Toxic Purple
  { color: PURE_WHITE, colorGlow: 'rgba(255, 255, 255, 0.2)' }
]

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;700&family=Permanent+Marker&display=swap');

/* ── Urban Global CSS ────────────────────────────────────────────────── */
[data-theme="urban"] {
  --font-display: 'Permanent Marker', cursive;
  --font-body: 'Oswald', sans-serif;
}

[data-theme="urban"] * {
  transition: clip-path 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
              transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
              background-color 0.2s, 
              color 0.2s,
              box-shadow 0.2s;
}

/* Cinematic Spotlight Vignette */
[data-theme="urban"] body {
  background: radial-gradient(circle at 50% 30%, #1c1c1c 0%, #030303 80%) !important;
  background-attachment: fixed !important;
}

/* Grunge Texture Overlay */
[data-theme="urban"] body::after {
  content: "";
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  pointer-events: none;
  z-index: 1000;
  opacity: 0.15;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
}

/* ── Wild Interactive Behaviors ─────────────────────────────────────── */

[data-theme="urban"] button {
  position: relative;
  overflow: hidden;
}

[data-theme="urban"] button:hover {
  background-color: ` + TOXIC_GREEN + ` !important;
  color: ` + DARK_VOID + ` !important;
  /* Slant the clip-path even harder on hover */
  clip-path: polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%) !important;
  transform: scale(1.05) translateZ(0);
}

[data-theme="urban"] button:active {
  transform: scale(0.95);
  clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%) !important;
}

/* Hard floating glow on focus */
[data-theme="urban"] input:focus,
[data-theme="urban"] select:focus {
  border-color: transparent !important;
  outline: none !important;
  box-shadow: 0 0 15px ` + TOXIC_GREEN + `, 0 0 5px ` + TOXIC_GREEN + ` inset !important;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%) !important; /* snap to square focus */
}

[data-theme="urban"] .topnav a {
  font-family: var(--font-display);
  font-size: 1.2rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ` + ASH_GREY + `;
}

[data-theme="urban"] .topnav a:hover {
  color: ` + PURE_WHITE + ` !important;
  text-shadow: 0 0 8px ` + PURE_WHITE + `;
}

[data-theme="urban"] .topnav a[aria-current="page"] {
  color: ` + TOXIC_GREEN + ` !important;
  text-shadow: 0 0 10px rgba(212, 255, 0, 0.6);
}

/* Specifically style the h1 to look like graffiti */
[data-theme="urban"] h1 {
  text-transform: uppercase;
  letter-spacing: 3px;
  font-weight: normal;  /* brush fonts look worse when forced bold */
  transform: rotate(-2deg);
}

/* Urban Lyric Highlight (Crisp Text + Rough Background) */
[data-theme="urban"] .k-line--urban-active {
  position: relative;
  display: inline;
  padding: 0.1em 0.4em;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  z-index: 1;
}

[data-theme="urban"] .k-line--urban-active::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--highlight-color, ` + TOXIC_GREEN + `);
  filter: url(#urban-rough-filter);
  z-index: -1;
  pointer-events: none;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
`

export const URBAN: Theme = {
  name: 'urban',
  nextThemeName: 'deep-sea',
  displayName: 'Hip Hop',
  globalCss: GLOBAL_CSS,

  black: PURE_WHITE,
  white: DARK_VOID,
  cream: ASH_GREY,
  creamDark: DEEP_SHADOW,
  hotRed: ALERT_RED,
  vividYellow: 'rgba(212, 255, 0, 0.15)',
  softViolet: ACID_CYAN,
  mintGreen: TOXIC_GREEN,
  muted: ASH_GREY,
  faint: 'rgba(255,255,255,0.1)',

  accentA: TOXIC_GREEN,
  accentB: SPRAY_SILVER,
  accentC: ACID_CYAN,

  appBg: 'transparent', // controlled by global CSS background
  titlebarBg: 'rgba(5, 5, 5, 0.4)',
  titlebarText: ASH_GREY,

  navBg: 'rgba(10, 10, 10, 0.6)',
  navBorderBottom: '1px solid rgba(212, 255, 0, 0.1)',
  navLink: ASH_GREY,
  navLinkActive: TOXIC_GREEN,
  navLinkActiveBg: 'transparent',
  navLinkHoverBg: 'transparent',

  // Eliminated all thick borders. Replaced with mostly none or very thin light strokes.
  border: 'none',
  borderThin: '1px solid rgba(255, 255, 255, 0.1)',
  borderLight: '1px outset rgba(255, 255, 255, 0.05)',
  
  shadow: '0 10px 30px rgba(0, 0, 0, 0.8)',
  shadowLift: '0 15px 40px rgba(0, 0, 0, 0.95)',
  shadowPressed: '0 2px 10px rgba(0, 0, 0, 0.9)',
  shadowColor: (color: string) => `0 0 12px ${color}40`,

  radius: 0,
  radiusSmall: 0,

  fontDisplay: "'Permanent Marker', cursive",
  fontBody: "'Oswald', sans-serif",

  spinnerBorder: 'rgba(255, 255, 255, 0.1)',
  spinnerBorderTop: TOXIC_GREEN,

  page: {
    background: 'transparent',
    color: PURE_WHITE,
    minHeight: '100%',
    padding: '32px 40px 64px',
    maxWidth: 960,
    margin: '0 auto',
    fontFamily: "'Oswald', sans-serif",
  },

  // Cards look like jagged shards of dark glass 
  card: {
    background: 'rgba(15, 15, 15, 0.7)',
    backdropFilter: 'blur(10px)',
    border: 'none',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 0,
    boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
    clipPath: 'polygon(0 0, 100% 2%, 98% 100%, 2% 98%)',
  },

  cardHover: {
    background: TOXIC_GREEN,
    color: DARK_VOID,
    transform: 'translateY(-4px)',
    clipPath: 'polygon(2% 2%, 100% 0, 100% 100%, 0 98%)',
  },

  input: {
    background: 'rgba(0, 0, 0, 0.5)',
    border: 'none',
    borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: 0,
    color: PURE_WHITE,
    fontFamily: "'Oswald', sans-serif",
    padding: '12px',
    outline: 'none',
    clipPath: 'polygon(2% 0, 100% 0, 98% 100%, 0 100%)',
  },

  select: {
    background: 'rgba(0, 0, 0, 0.5)',
    border: 'none',
    borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: 0,
    color: PURE_WHITE,
    fontFamily: "'Oswald', sans-serif",
    padding: '12px',
    outline: 'none',
    cursor: 'pointer',
    clipPath: 'polygon(0 0, 98% 0, 100% 100%, 2% 100%)',
  },

  btnPrimary: {
    background: SPRAY_SILVER,
    color: DARK_VOID,
    border: 'none',
    borderRadius: 0,
    fontFamily: "'Oswald', sans-serif",
    fontWeight: 700,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    // Hard slanted geometry
    clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)', 
    boxShadow: 'none', // relying on background and clip for visual weight
  },

  btnSecondary: {
    background: 'rgba(30, 30, 30, 0.8)',
    color: PURE_WHITE,
    border: 'none',
    borderRadius: 0,
    fontFamily: "'Oswald', sans-serif",
    fontWeight: 300,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    clipPath: 'polygon(0% 0%, 96% 0%, 100% 100%, 4% 100%)', 
  },

  btnOutline: {
    background: 'transparent',
    color: TOXIC_GREEN,
    border: '1px solid ' + TOXIC_GREEN,
    borderRadius: 0,
    fontFamily: "'Oswald', sans-serif",
    fontWeight: 300,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    clipPath: 'polygon(2% 0%, 100% 0%, 98% 100%, 0% 100%)', 
  },

  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 0,
    border: 'none',
    background: 'rgba(255, 255, 255, 0.05)',
    color: PURE_WHITE,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    clipPath: 'polygon(20% 0%, 100% 20%, 80% 100%, 0% 80%)',
  },

  iconBtnHover: {
    backgroundColor: TOXIC_GREEN,
    color: DARK_VOID,
    clipPath: 'polygon(0% 20%, 80% 0%, 100% 80%, 20% 100%)',
  },

  stickerLabel: {
    position: 'absolute',
    fontFamily: "'Permanent Marker', cursive",
    fontSize: 16,
    letterSpacing: '2px',
    padding: '4px 12px',
    border: 'none',
    backgroundColor: 'transparent',
    color: TOXIC_GREEN,
    textShadow: '0px 0px 8px rgba(212, 255, 0, 0.6)',
    transform: 'rotate(-10deg) scale(1.2)',
  },

  singerColors: SINGER_COLORS,
}
