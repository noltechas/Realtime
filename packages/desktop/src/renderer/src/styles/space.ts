// Space — "FLIGHT DECK" design system
//
// A spacecraft instrument panel, not a neon poster. Three ideas carry the theme,
// and they are identical to the mobile app's (packages/mobile/src/theme/themes/
// space/atoms/_ship.tsx) so the two platforms read as one product:
//
//   1. CHAMFERED PLATES. Every surface is a milled plate whose top-left and
//      bottom-right corners are cut at 45°. On mobile that is an SVG silhouette;
//      here it is `clip-path`, with the hairline produced by clipping the border
//      colour and insetting the fill onto a pseudo-element (see `.card` below).
//      The cut is ASYMMETRIC so panels have a reading direction.
//   2. ONE LIVE LIGHT PER ELEMENT. Structure is desaturated steel; the only
//      saturated pixels are lamps — ice cyan for nominal, caution amber for
//      attention, drive violet for the engine.
//   3. RESTRAINT OVER MOTION. The previous version floated every card on a 6s
//      loop, cycled their glow magenta→cyan on an 8s loop, scaled buttons on
//      hover, and drifted a 50px-blurred nebula across a fixed full-screen
//      layer. All of it is gone: a machined panel is legible because it sits
//      above its shadow, and a blur filter that size is the most expensive thing
//      on the page.
//
// Colours come from the shared SPACE_TOKENS so the stage, app, mobile and
// companion site cannot drift apart again.

import type { Theme } from './theme'

// ── Palette ──────────────────────────────────────────────────────────────────
const VOID = '#04060B' // deepest hull shadow / app background
const HULL = '#0B1119' // panel base
const HULL_HI = '#131C27' // raised panel / card surface
const HULL_WELL = '#070C13' // recessed wells (inputs, art bays)
const STEEL = '#2A3644' // machined edge
const STEEL_HI = '#5A6B7D' // polished chamfer highlight

const ICE = '#5BE9FF' // live / nominal systems lamp
const ICE_DEEP = '#2BA9C4'
const AMBER = '#FFB43D' // caution / attention
const VIOLET = '#8B5CFF' // drive plasma
const CRITICAL = '#FF5A4A'
const NOMINAL = '#52FFB8'

const TEXT_LIGHT = '#DCE6F2' // instrument white
const TEXT_MID = '#7B8A9C' // secondary
const TEXT_FAINT = '#4E5C6D' // engraved / tertiary

const EDGE = 'rgba(91,233,255,0.22)'
const MILLED = 'rgba(169,189,208,0.30)'

// Depth first, glow second — the inverse of the old theme's priorities.
const depth = (y = 2, spread = 10, a = 0.55) => `0 ${y}px ${spread}px rgba(0,0,0,${a})`
const iceGlow = (spread = 10, a = 0.18) => `0 0 ${spread}px rgba(91,233,255,${a})`

// Chakra Petch — an angular technical face whose chamfered terminals echo the
// panel geometry — for display and control legends. Share Tech Mono carries every
// telemetry numeral. Exo 2 for prose, where Chakra Petch stops being readable.
// Deliberately NOT Orbitron: the single most over-used sci-fi typeface.
const FONT_HEADING = "'Chakra Petch', 'Exo 2', sans-serif"
const FONT_DISPLAY = "'Chakra Petch', 'Exo 2', sans-serif"
const FONT_BODY = "'Exo 2', 'Chakra Petch', sans-serif"
const FONT_MONO = "'Share Tech Mono', ui-monospace, monospace"

// The chamfer, as a clip-path. `cut` is the 45° corner size in px.
// The fill is inset 1px onto ::before so the parent's background reads as a
// crisp 1px hairline that follows the diagonals — a plain CSS `border` gets
// sliced off at the cuts by clip-path.
const plateClip = (cut: string) =>
  `polygon(${cut} 0, 100% 0, 100% calc(100% - ${cut}), calc(100% - ${cut}) 100%, 0 100%, 0 ${cut})`

// ── Global CSS injected when the space theme is active ───────────────────────
const GLOBAL_CSS = `
/* ── Fonts ───────────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Share+Tech+Mono&family=Exo+2:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');

[data-theme="space"] * {
  font-family: ${FONT_BODY};
}
[data-theme="space"] h1,
[data-theme="space"] h2,
[data-theme="space"] h3 {
  font-family: ${FONT_HEADING};
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
[data-theme="space"] h1 {
  text-shadow: 0 0 18px rgba(91,233,255,0.28);
}

/* ── Deep space, held still ──────────────────────────────────────────────── */
/* Two cheap fixed layers: a directional gradient warmed toward the planet in
   the lower left, and a static star field built from one element's box-shadow.
   Neither animates — the motion in this theme is the 3D stage scene, and a
   full-screen blurred layer competing with it is pure cost. */
[data-theme="space"] .main::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(ellipse 70% 50% at 12% 96%, rgba(38,64,92,0.55) 0%, transparent 68%),
    radial-gradient(ellipse 60% 45% at 88% 6%, rgba(91,233,255,0.05) 0%, transparent 70%),
    linear-gradient(165deg, ${VOID} 0%, #060B14 45%, #08111C 78%, #040810 100%);
}

[data-theme="space"] .main::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 1.5px;
  height: 1.5px;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  background: transparent;
  box-shadow:
    40px 80px 0 0 rgba(255,255,255,0.55), 120px 30px 0 0 rgba(255,255,255,0.34),
    200px 150px 0 0 rgba(91,233,255,0.42), 310px 60px 0 0 rgba(255,255,255,0.26),
    420px 200px 0 0 rgba(255,255,255,0.45), 530px 40px 0 0 rgba(255,180,61,0.32),
    640px 170px 0 0 rgba(255,255,255,0.3), 750px 90px 0 0 rgba(255,255,255,0.42),
    80px 300px 0 0 rgba(255,255,255,0.38), 250px 350px 0 0 rgba(91,233,255,0.3),
    400px 280px 0 0 rgba(255,255,255,0.26), 550px 320px 0 0 rgba(255,255,255,0.48),
    700px 380px 0 0 rgba(91,233,255,0.26), 150px 450px 0 0 rgba(255,255,255,0.34),
    350px 500px 0 0 rgba(255,255,255,0.42), 500px 420px 0 0 rgba(255,180,61,0.24),
    650px 480px 0 0 rgba(255,255,255,0.3), 100px 550px 0 0 rgba(255,255,255,0.38),
    300px 600px 0 0 rgba(91,233,255,0.28), 480px 570px 0 0 rgba(255,255,255,0.26),
    600px 520px 0 0 rgba(255,255,255,0.42), 770px 250px 0 0 rgba(255,255,255,0.34),
    820px 450px 0 0 rgba(91,233,255,0.22), 50px 650px 0 0 rgba(255,255,255,0.3),
    900px 120px 0 0 rgba(255,255,255,0.4), 1040px 300px 0 0 rgba(255,255,255,0.28),
    1180px 90px 0 0 rgba(91,233,255,0.3), 1320px 420px 0 0 rgba(255,255,255,0.36),
    1450px 200px 0 0 rgba(255,255,255,0.26), 1560px 560px 0 0 rgba(255,255,255,0.4);
}

/* ── Machined plates ─────────────────────────────────────────────────────── */
/* The parent's background IS the hairline; ::before carries the fill inset 1px.
   That is what keeps the 1px edge running along the 45° cuts, which a normal
   border cannot do under clip-path. */
[data-theme="space"] .card {
  --sp-cut: 14px;
  position: relative;
  isolation: isolate;
  background: ${EDGE} !important;
  border: none !important;
  border-radius: 0 !important;
  clip-path: ${plateClip('var(--sp-cut)')};
  background-image: none !important;
  animation: none !important;
  box-shadow: ${depth(3, 14, 0.5)};
}

[data-theme="space"] .card::before {
  content: '';
  position: absolute;
  inset: 1px;
  z-index: -1;
  background: linear-gradient(158deg, rgba(19,28,39,0.96) 0%, rgba(6,10,17,0.97) 100%);
  clip-path: ${plateClip('calc(var(--sp-cut) - 1.4px)')};
}

/* Milled top edge — the strongest cue that a panel is metal. Stops short of the
   chamfer so it reads as a machined face rather than a drawn border. */
[data-theme="space"] .card::after {
  content: '';
  position: absolute;
  top: 1px;
  left: calc(var(--sp-cut) + 2px);
  right: 3px;
  height: 1px;
  background: ${MILLED};
  pointer-events: none;
}

[data-theme="space"] .card:hover {
  background: rgba(91,233,255,0.38) !important;
  box-shadow: ${depth(6, 22, 0.55)}, ${iceGlow(16, 0.14)};
}

/* ── Controls ────────────────────────────────────────────────────────────── */
/* Buttons are keys with travel: they depress on press rather than scaling up on
   hover, which is what the old gravitational-lens animation did. */
[data-theme="space"] button {
  clip-path: ${plateClip('8px')};
  border-radius: 0 !important;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  transition: filter 0.16s ease, transform 0.08s ease, box-shadow 0.16s ease;
}
[data-theme="space"] button:hover {
  filter: brightness(1.14);
  transform: none;
  animation: none;
}
[data-theme="space"] button:active {
  transform: translateY(1px);
  filter: brightness(0.94);
}

[data-theme="space"] input,
[data-theme="space"] select,
[data-theme="space"] textarea {
  clip-path: ${plateClip('7px')};
  border-radius: 0 !important;
}
[data-theme="space"] input:focus,
[data-theme="space"] select:focus,
[data-theme="space"] textarea:focus {
  outline: none;
  box-shadow: inset 0 0 0 1px ${ICE}, ${iceGlow(14, 0.2)} !important;
  border-color: ${ICE} !important;
}

[data-theme="space"] input::placeholder,
[data-theme="space"] textarea::placeholder {
  color: ${TEXT_FAINT};
}

/* ── Nav rail ────────────────────────────────────────────────────────────── */
/* A machined rail with an engraved index ladder, replacing the old animated
   aurora gradient. "repeating-linear-gradient" costs nothing and never moves. */
[data-theme="space"] .topnav {
  border-bottom: none !important;
  box-shadow: 0 1px 0 rgba(91,233,255,0.18), ${depth(2, 12, 0.4)};
}

[data-theme="space"] .topnav::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 5px;
  background:
    linear-gradient(90deg, ${ICE} 0 78px, rgba(91,233,255,0.14) 78px 100%) top / 100% 1px no-repeat,
    repeating-linear-gradient(90deg, rgba(90,107,125,0.34) 0 1px, transparent 1px 13px) bottom / 100% 4px no-repeat;
  opacity: 0.9;
  pointer-events: none;
}

[data-theme="space"] .topnav a[aria-current="page"] {
  text-shadow: 0 0 10px rgba(91,233,255,0.55);
}

/* ── Scrollbar — a milled track ──────────────────────────────────────────── */
[data-theme="space"] ::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, ${STEEL_HI} 0%, ${STEEL} 100%);
  border-radius: 0;
}
[data-theme="space"] ::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, ${ICE_DEEP} 0%, ${STEEL} 100%);
}
[data-theme="space"] ::-webkit-scrollbar-track {
  background: rgba(91,233,255,0.03);
}

/* ── Telemetry numerals ──────────────────────────────────────────────────── */
/* Anything the user reads as an instrument value gets the mono face. */
[data-theme="space"] .k-mono,
[data-theme="space"] .sticker,
[data-theme="space"] time {
  font-family: ${FONT_MONO} !important;
  letter-spacing: 0.1em;
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
export const SPACE: Theme = {
  name: 'space',
  nextThemeName: 'steampunk',
  displayName: 'Space',
  globalCss: GLOBAL_CSS,

  // ── Raw colours — `black`/`white` are semantic, not literal ────────────────
  black: TEXT_LIGHT, // primary text — cool instrument white
  white: VOID, // inverted for "light" blocks
  cream: HULL,
  creamDark: HULL_HI,
  hotRed: CRITICAL,
  vividYellow: AMBER,
  softViolet: VIOLET,
  mintGreen: NOMINAL,
  muted: TEXT_MID,
  faint: 'rgba(91,233,255,0.16)',

  accentA: ICE, // live systems (primary)
  accentB: AMBER, // caution — bright, takes dark text (NOW PLAYING banner)
  accentC: VIOLET, // drive plasma (tertiary)

  // ── Shell ──────────────────────────────────────────────────────────────────
  appBg: VOID,
  titlebarBg: VOID,
  titlebarText: TEXT_MID,

  navBg: 'rgba(4,6,11,0.94)',
  navBorderBottom: '1px solid rgba(91,233,255,0.14)',
  navLink: TEXT_MID,
  navLinkActive: ICE,
  navLinkActiveBg: 'rgba(91,233,255,0.09)',
  navLinkHoverBg: 'rgba(91,233,255,0.05)',

  // ── Borders & shadows ──────────────────────────────────────────────────────
  border: `1px solid ${EDGE}`,
  borderThin: '1px solid rgba(91,233,255,0.11)',
  borderLight: '1px solid rgba(91,233,255,0.07)',
  shadow: `${depth(2, 10, 0.55)}, ${iceGlow(8, 0.07)}`,
  shadowLift: `${depth(8, 26, 0.6)}, ${iceGlow(16, 0.16)}`,
  shadowPressed: depth(1, 3, 0.6),
  shadowColor: (color: string) => `0 0 14px ${color}, 0 0 28px ${color}`,

  // ── Radius — the chamfer does the shaping, not the corner radius ───────────
  radius: 4,
  radiusSmall: 3,

  // ── Typography ─────────────────────────────────────────────────────────────
  fontDisplay: FONT_DISPLAY,
  fontBody: FONT_BODY,

  // ── Spinner ────────────────────────────────────────────────────────────────
  spinnerBorder: 'rgba(91,233,255,0.16)',
  spinnerBorderTop: ICE,

  // ── Component styles ───────────────────────────────────────────────────────
  page: {
    background: 'transparent',
    color: TEXT_LIGHT,
    minHeight: '100%',
    padding: '32px 40px 64px',
    maxWidth: 1040,
    margin: '0 auto',
    fontFamily: FONT_BODY,
    position: 'relative',
    zIndex: 2,
  },

  // The chamfer + hairline + fill are applied by globalCss `.card`; these values
  // are the fallback for inline consumers that don't carry the class.
  card: {
    background: 'rgba(19,28,39,0.94)',
    border: `1px solid ${EDGE}`,
    borderRadius: 0,
    backdropFilter: 'blur(8px)',
  },

  cardHover: {
    border: '1px solid rgba(91,233,255,0.4)',
    boxShadow: `${depth(6, 22, 0.55)}, ${iceGlow(16, 0.14)}`,
  },

  input: {
    background: HULL_WELL,
    border: '1px solid rgba(91,233,255,0.24)',
    borderRadius: 0,
    color: TEXT_LIGHT,
    fontFamily: FONT_BODY,
    outline: 'none',
    caretColor: ICE,
  },

  select: {
    background: HULL_WELL,
    border: '1px solid rgba(91,233,255,0.20)',
    borderRadius: 0,
    color: TEXT_LIGHT,
    fontFamily: FONT_BODY,
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none' as const,
  },

  // Primary is the one "armed" control: a lit ice face with a hull-dark legend,
  // matching the mobile theme and the `tabBarPill`/`tabBarPillFg` token pair.
  btnPrimary: {
    background: `linear-gradient(158deg, #8FF2FF 0%, ${ICE} 45%, ${ICE_DEEP} 100%)`,
    color: VOID,
    border: 'none',
    boxShadow: `${depth(2, 8, 0.45)}, inset 0 1px 0 rgba(255,255,255,0.5)`,
    borderRadius: 0,
    fontFamily: FONT_DISPLAY,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.16s ease',
    letterSpacing: '0.16em',
    textShadow: 'none',
  },

  btnSecondary: {
    background: 'rgba(19,28,39,0.95)',
    color: ICE,
    border: `1px solid rgba(91,233,255,0.42)`,
    boxShadow: depth(2, 8, 0.4),
    borderRadius: 0,
    fontFamily: FONT_DISPLAY,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.16s ease',
    letterSpacing: '0.16em',
  },

  btnOutline: {
    background: 'transparent',
    color: TEXT_LIGHT,
    border: `1px solid rgba(140,168,192,0.34)`,
    boxShadow: 'none',
    borderRadius: 0,
    fontFamily: FONT_DISPLAY,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.16s ease',
    letterSpacing: '0.16em',
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 0,
    border: '1px solid rgba(91,233,255,0.20)',
    background: HULL_WELL,
    color: TEXT_MID,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.16s ease',
    boxShadow: 'none',
  },

  iconBtnHover: {
    background: 'rgba(91,233,255,0.10)',
    color: ICE,
    boxShadow: iceGlow(10, 0.2),
  },

  stickerLabel: {
    position: 'absolute',
    fontFamily: FONT_MONO,
    fontWeight: 400,
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    padding: '3px 10px',
    border: '1px solid rgba(91,233,255,0.28)',
    boxShadow: depth(2, 8, 0.5),
    color: ICE,
    background: 'rgba(4,6,11,0.9)',
    borderRadius: 0,
    backdropFilter: 'blur(12px)',
  },
}
