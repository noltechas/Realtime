// Hand-Drawn / Sketch Design System
// Organic wobbly borders, handwritten typography, paper textures.

import type { Theme } from './theme'

const BLACK = '#2d2d2d'
const WHITE = '#ffffff'
const PAPER = '#fdfbf7'
const MUTED = '#e5e0d8'
const RED   = '#ff4d4d'
const BLUE  = '#2d5da1'
const YELLOW= '#fff9c4'

const WOBBLY = '255px 15px 225px 15px / 15px 225px 15px 255px'
const WOBBLY_MD = '25px 225px 15px 255px / 255px 15px 225px 15px'

const SINGER_COLORS = [
  { color: RED, colorGlow: 'rgba(255, 77, 77, 0.2)' },
  { color: BLUE, colorGlow: 'rgba(45, 93, 161, 0.2)' },
  { color: YELLOW, colorGlow: 'rgba(255, 249, 196, 0.3)' },
  { color: '#4caf50', colorGlow: 'rgba(76, 175, 80, 0.2)' },
  { color: '#ff9800', colorGlow: 'rgba(255, 152, 0, 0.2)' },
  { color: '#9c27b0', colorGlow: 'rgba(156, 39, 176, 0.2)' },
  { color: '#00bcd4', colorGlow: 'rgba(0, 188, 212, 0.2)' },
  { color: '#795548', colorGlow: 'rgba(121, 85, 72, 0.2)' },
]

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Kalam:wght@700&family=Patrick+Hand&display=swap');

/* ── Hand-Drawn Overrides ──────────────────────────────────────────────── */
[data-theme="sketch"] {
  --font-display: 'Kalam', cursive;
  --font-body: 'Patrick Hand', cursive;
}

[data-theme="sketch"] * {
  transition: transform 0.1s, box-shadow 0.1s, background-color 0.1s, color 0.1s;
}

/* Base button hovers since theme interface does not support inline hover for buttons directly */
[data-theme="sketch"] button:hover {
  background-color: ` + RED + ` !important;
  color: ` + WHITE + ` !important;
  box-shadow: 2px 2px 0px 0px ` + BLACK + ` !important;
  transform: translate(2px, 2px);
}

[data-theme="sketch"] button:active {
  box-shadow: 0px 0px 0px 0px transparent !important;
  transform: translate(4px, 4px);
}

[data-theme="sketch"] input:focus,
[data-theme="sketch"] select:focus {
  border-color: ` + BLUE + ` !important;
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(45, 93, 161, 0.2) !important;
}

[data-theme="sketch"] .topnav a:hover {
  text-decoration: underline;
  text-decoration-style: wavy;
}

[data-theme="sketch"] .topnav a[aria-current="page"] {
  color: ` + RED + ` !important;
  text-decoration: underline;
  text-decoration-style: wavy;
}

/* Subtle bounce for decorations */
@keyframes sketchBounce {
  0%, 100% { transform: translateY(0) rotate(1deg); }
  50% { transform: translateY(-5px) rotate(-1deg); }
}
`

export const SKETCH: Theme = {
  name: 'sketch',
  nextThemeName: 'neo-brutal',
  displayName: 'Hand-Drawn',
  globalCss: GLOBAL_CSS,

  black: BLACK,
  white: WHITE,
  cream: PAPER,
  creamDark: MUTED,
  hotRed: RED,
  vividYellow: YELLOW,
  softViolet: BLUE,
  mintGreen: '#4caf50',
  muted: MUTED,
  faint: 'rgba(45,45,45,0.4)',

  accentA: RED,
  accentB: BLUE,
  accentC: YELLOW,

  appBg: PAPER,
  titlebarBg: WHITE,
  titlebarText: BLACK,

  navBg: WHITE,
  navBorderBottom: '3px solid ' + BLACK,
  navLink: BLACK,
  navLinkActive: RED,
  navLinkActiveBg: 'transparent',
  navLinkHoverBg: 'transparent',

  border: '3px solid ' + BLACK,
  borderThin: '2px solid ' + BLACK,
  borderLight: '2px dashed rgba(45,45,45,0.3)',
  shadow: '4px 4px 0px 0px ' + BLACK,
  shadowLift: '2px 2px 0px 0px ' + BLACK,
  shadowPressed: 'none',
  shadowColor: (color: string) => '4px 4px 0px 0px ' + color,

  radius: 12,
  radiusSmall: 8,

  fontDisplay: "'Kalam', cursive",
  fontBody: "'Patrick Hand', cursive",

  spinnerBorder: 'rgba(45,45,45,0.15)',
  spinnerBorderTop: RED,

  page: {
    background: PAPER,
    backgroundImage: 'radial-gradient(' + MUTED + ' 1px, transparent 1px)',
    backgroundSize: '24px 24px',
    color: BLACK,
    minHeight: '100%',
    padding: '32px 40px 64px',
    maxWidth: 960,
    margin: '0 auto',
    fontFamily: "'Patrick Hand', cursive",
  },

  card: {
    background: WHITE,
    border: '2px solid ' + BLACK,
    borderRadius: WOBBLY_MD,
    boxShadow: '3px 3px 0px 0px rgba(45, 45, 45, 0.1)',
  },

  cardHover: {
    transform: 'rotate(1deg)',
    boxShadow: '4px 4px 0px 0px ' + BLACK,
  },

  input: {
    background: WHITE,
    border: '2px solid ' + BLACK,
    borderRadius: WOBBLY,
    color: BLACK,
    fontFamily: "'Patrick Hand', cursive",
    outline: 'none',
  },

  select: {
    background: WHITE,
    border: '2px solid ' + BLACK,
    borderRadius: WOBBLY,
    color: BLACK,
    fontFamily: "'Patrick Hand', cursive",
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
  },

  btnPrimary: {
    background: WHITE,
    color: BLACK,
    border: '3px solid ' + BLACK,
    boxShadow: '4px 4px 0px 0px ' + BLACK,
    borderRadius: WOBBLY,
    fontFamily: "'Patrick Hand', cursive",
    fontWeight: 400,
    cursor: 'pointer',
  },

  btnSecondary: {
    background: MUTED,
    color: BLACK,
    border: '3px solid ' + BLACK,
    boxShadow: '4px 4px 0px 0px ' + BLACK,
    borderRadius: WOBBLY,
    fontFamily: "'Patrick Hand', cursive",
    fontWeight: 400,
    cursor: 'pointer',
  },

  btnOutline: {
    background: 'transparent',
    color: BLACK,
    border: '2px dashed ' + BLACK,
    borderRadius: WOBBLY,
    fontFamily: "'Patrick Hand', cursive",
    fontWeight: 400,
    cursor: 'pointer',
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: WOBBLY,
    border: '2px solid ' + BLACK,
    background: WHITE,
    color: BLACK,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '4px 4px 0px 0px ' + BLACK,
  },

  iconBtnHover: {
    backgroundColor: RED,
    color: WHITE,
    transform: 'translate(2px, 2px)',
    boxShadow: '2px 2px 0px 0px ' + BLACK,
  },

  stickerLabel: {
    position: 'absolute',
    fontFamily: "'Patrick Hand', cursive",
    fontSize: 14,
    padding: '4px 12px',
    border: '2px solid ' + BLACK,
    boxShadow: '2px 2px 0px 0px ' + BLACK,
    backgroundColor: YELLOW,
    color: BLACK,
    borderRadius: WOBBLY,
    transform: 'rotate(-2deg)',
  },

  singerColors: SINGER_COLORS,
}
