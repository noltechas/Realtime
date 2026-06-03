// Comic Book Design System
// Bright modern pop-art: Ben-Day halftone dots, heavy black ink panel borders,
// hard offset "ink" shadows, primary pop colors (red / yellow / sky-blue),
// speech bubbles, action bursts and speed lines. A loud, dotty cousin of
// neo-brutal. Display type is BadaBoom BB (Blambot); body is Super Squad. Both
// are bundled @font-face faces (see GLOBAL_CSS) — NOT Google Fonts — so any
// stage/idle chrome must reference theme.fontDisplay / theme.fontBody (or the
// --font-display / --font-body vars), never a hardcoded 'Luckiest Guy'/'Nunito'.

import type { Theme } from './theme'
// NOTE: the BadaBoom BB + Super Squad @font-face declarations live in
// globals.css (the always-loaded base stylesheet), NOT here. This theme's
// globalCss is wiped + re-injected on every per-song stage-theme switch, so an
// @font-face here would re-load on each comic song and flash its fallback.

const INK = '#16161D'
const PAPER = '#FFF7E6'
const PANEL = '#FFFFFF'
const POP_RED = '#FF1F4B'
const POP_YELLOW = '#FFD400'
const POP_BLUE = '#2FA8FF'

const GLOBAL_CSS = `
/* ── Comic Book Global CSS ───────────────────────────────────────────────── */
/* (BadaBoom BB / Super Squad @font-face live in globals.css — see note above.) */
[data-theme="comic-book"] {
  --font-display: 'BadaBoom BB', 'Bangers', system-ui, cursive;
  --font-body: 'Super Squad', system-ui, sans-serif;
}

/* Newsprint paper + Ben-Day halftone dots (red + blue, offset grids) that
   drift slowly so the page feels printed and alive. */
[data-theme="comic-book"] body {
  background-color: ${PAPER} !important;
  background-image:
    radial-gradient(${POP_RED}1f 1.4px, transparent 1.6px),
    radial-gradient(${POP_BLUE}1c 1.4px, transparent 1.6px) !important;
  background-size: 14px 14px, 14px 14px !important;
  background-position: 0 0, 7px 7px !important;
  background-attachment: fixed !important;
  animation: comic-halftone-drift 6s linear infinite;
}

@keyframes comic-halftone-drift {
  from { background-position: 0 0, 7px 7px; }
  to   { background-position: 14px 14px, 21px 21px; }
}

/* Headings — inked comic-poster type. Luckiest Guy is a SINGLE-WEIGHT face, so
   pages that set font-weight:900 + negative letter-spacing faux-bold it and
   crush the glyphs into black blobs. Normalise weight + tracking + stroke here
   (but DON'T force color — inline heading colors like the idle hero's red must
   still win) and give page headings a yellow comic drop shadow. */
[data-theme="comic-book"] h1,
[data-theme="comic-book"] h2 {
  font-family: 'BadaBoom BB', cursive !important;
  font-weight: 400 !important;
  letter-spacing: 1px !important;
  text-shadow: 3px 3px 0 ${POP_YELLOW};
}

/* Nav links */
[data-theme="comic-book"] .topnav a {
  font-family: 'BadaBoom BB', cursive;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #FFFFFF;
}
[data-theme="comic-book"] .topnav a:hover {
  color: ${POP_YELLOW} !important;
}
[data-theme="comic-book"] .topnav a[aria-current="page"] {
  color: ${POP_YELLOW} !important;
  text-shadow: 2px 2px 0 ${POP_RED};
}

/* Buttons "POP" — they punch up-left and grow their ink shadow on hover,
   then slam down flush on press, like a comic impact panel. */
[data-theme="comic-book"] button {
  transition: transform 0.08s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.08s ease;
}
[data-theme="comic-book"] button:hover {
  transform: translate(-2px, -2px) rotate(-1deg);
  box-shadow: 6px 6px 0 ${INK} !important;
}
[data-theme="comic-book"] button:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 ${INK} !important;
}

/* Inputs snap to a yellow highlight halo on focus */
[data-theme="comic-book"] input:focus,
[data-theme="comic-book"] select:focus {
  outline: none !important;
  box-shadow: 4px 4px 0 ${INK}, 0 0 0 3px ${POP_YELLOW} !important;
}

/* ── Lyric highlight: active line is a white speech-bubble panel sitting on a
   radial speed-line burst, popping in with an impact jitter. ────────────── */
[data-theme="comic-book"] .k-line--comic-book-active {
  position: relative;
  display: inline-block;
  border: 4px solid ${INK};
  border-radius: 18px;
  color: ${INK};
  box-shadow: 6px 6px 0 ${INK};
  /* CRITICAL — the burst (::before, z-index:-1) must paint BEHIND this card's
     fill + ink border. Anything that gives this element a stacking context
     breaks that, and the base .k-line / .k-line--now do exactly that via
     will-change: transform, transform: scale(1), AND the constant transition/
     comic-pop animation (which re-creates the context on every line change —
     that's why the lines kept showing over the border). So we strip ALL of it:
     no transform, no will-change hint, no transition, no entrance animation.
     With no stacking context, the burst drops behind the whole card; the lyric
     GROUP's isolation:isolate keeps it above the stage video. */
  transform: none;
  will-change: auto;
  transition: none;
  animation: none;
}

/* The speed-line burst — sits BEHIND the bubble's fill (works because the
   bubble establishes no stacking context). */
[data-theme="comic-book"] .k-line--comic-book-active::before {
  content: "";
  position: absolute;
  /* A symmetric band of speed-lines that hugs just outside the bubble's edges
     and radiates outward — centred on the line's rectangle, sitting BEHIND its
     opaque fill (which hides the part of the ring over the card). Larger left/
     right inset than top/bottom so the ring tracks the WIDE rectangle instead
     of ballooning into a circle over the neighbouring lyric lines. */
  top: -34px;
  bottom: -34px;
  left: -90px;
  right: -90px;
  z-index: -1;
  background: repeating-conic-gradient(
    from 0deg,
    var(--burst-color, ${POP_YELLOW}) 0deg 5deg,
    transparent 5deg 10deg
  );
  -webkit-mask: radial-gradient(farthest-side, transparent 52%, #000 56%, #000 80%, transparent 100%);
          mask: radial-gradient(farthest-side, transparent 52%, #000 56%, #000 80%, transparent 100%);
  opacity: 0.8;
  pointer-events: none;
}

/* The speech-bubble tail — a 45°-rotated square that straddles the bubble's
   bottom edge. It's filled with the SAME singer colour as the bubble (which is
   set inline as the active line's background) so it reads as ONE shape with the
   card — its fill covers the bubble's bottom border at the overlap, and its ink
   right+bottom borders form the downward point. Pulled up flush (no gap). */
[data-theme="comic-book"] .k-line--comic-book-active::after {
  content: "";
  position: absolute;
  left: 34px;
  bottom: -14px;
  width: 22px;
  height: 22px;
  /* same singer colour + Ben-Day halftone as the bubble, so the tail reads as
     one printed shape with the card */
  background-color: var(--burst-color, ${PANEL});
  background-image: radial-gradient(rgba(22,22,29,0.16) 1.5px, transparent 1.8px);
  background-size: 8px 8px;
  border-right: 4px solid ${INK};
  border-bottom: 4px solid ${INK};
  border-bottom-right-radius: 4px;
  transform: rotate(45deg);
}

/* Second singer's line: same downward-pointing tail, just moved to the bottom-
   RIGHT so a duet's two speakers point to opposite sides. (Keep the SAME
   border-right + border-bottom as the left tail — swapping to border-left made
   the point rotate sideways instead of down.) */
[data-theme="comic-book"] .k-line--comic-book-active.k-line--comic-tail-right::after {
  left: auto;
  right: 34px;
}

@keyframes comic-pop {
  0%   { transform: scale(0.7) rotate(-4deg); }
  60%  { transform: scale(1.06) rotate(1.5deg); }
  100% { transform: none; }
}

/* Idle-screen onomatopoeia stickers wiggle + bob */
@keyframes comic-wiggle {
  0%, 100% { transform: rotate(var(--wig-a, -8deg)) scale(1); }
  50%      { transform: rotate(var(--wig-b, 6deg)) scale(1.08); }
}
@keyframes comic-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
}
@keyframes comic-idle-burst {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to   { transform: translate(-50%, -50%) rotate(360deg); }
}

/* Per-syllable: past words ink-flat, the current word is the "impact word" —
   filled in the singer's color, outlined in ink with a hard offset, and it
   pops bigger. Future words sit muted but legible. */
[data-theme="comic-book"] .k-line--comic-book-active .k-syl--past {
  color: ${INK};
  opacity: 0.55;
}
[data-theme="comic-book"] .k-line--comic-book-active .k-syl--future {
  color: ${INK};
  opacity: 0.85;
}
[data-theme="comic-book"] .k-line--comic-book-active .k-syl--now {
  color: var(--syl-singer, ${POP_RED});
  font-weight: 900;
  -webkit-text-stroke: 1.4px ${INK};
  text-shadow: 2px 2px 0 ${INK};
  display: inline-block;
  transform: scale(1.16) rotate(-2deg);
}

/* ── Ben-Day halftone over the solid-color stage chrome ──────────────────────
   The now-playing chip, singer pills and the QR/JOIN card all paint a flat
   spot color via inline styles. Layer a faint ink dot field over that color as
   a background-IMAGE (with !important so it beats the inline \`background\`
   shorthand's implicit \`background-image:none\` — the inline background-COLOR
   is untouched, so the dots simply print on top of each element's color). */
[data-theme="comic-book"] .k-song-chip,
[data-theme="comic-book"] .k-singer-tag,
[data-theme="comic-book"] .k-qr-card {
  background-image: radial-gradient(${INK}24 1.3px, transparent 1.6px) !important;
  background-size: 7px 7px !important;
  background-repeat: repeat !important;
  background-position: 0 0 !important;
}
`

export const COMIC_BOOK: Theme = {
  name: 'comic-book',
  nextThemeName: 'neo-brutal',
  displayName: 'Comic Book',

  // ── Raw colors ─────────────────────────────────────────────────────────────
  black: INK,
  white: PANEL,
  cream: PAPER,
  creamDark: '#FCEFC9',
  hotRed: POP_RED,
  vividYellow: POP_YELLOW,
  softViolet: '#7C4DFF',
  mintGreen: '#00C853',
  muted: '#5A5A66',
  faint: '#9A9AA6',

  accentA: POP_BLUE,
  accentB: POP_YELLOW,
  accentC: POP_RED,

  // ── Shell ──────────────────────────────────────────────────────────────────
  appBg: PAPER,
  titlebarBg: INK,
  titlebarText: '#FFFFFF',

  navBg: INK,
  navBorderBottom: '3px solid #16161D',
  navLink: '#FFFFFF',
  navLinkActive: POP_YELLOW,
  navLinkActiveBg: 'transparent',
  navLinkHoverBg: 'rgba(255,255,255,0.08)',

  // ── Borders & Shadows ──────────────────────────────────────────────────────
  border: '3px solid #16161D',
  borderThin: '2px solid #16161D',
  borderLight: '1.5px solid rgba(22,22,29,0.2)',
  shadow: '4px 4px 0px #16161D',
  shadowLift: '7px 7px 0px #16161D',
  shadowPressed: '2px 2px 0px #16161D',
  shadowColor: (color: string) => `4px 4px 0px ${color}`,

  // ── Radius ─────────────────────────────────────────────────────────────────
  radius: 6,
  radiusSmall: 4,

  // ── Typography ─────────────────────────────────────────────────────────────
  fontDisplay: "'BadaBoom BB', cursive",
  fontBody: "'Super Squad', sans-serif",

  // ── Spinner ────────────────────────────────────────────────────────────────
  spinnerBorder: 'rgba(22,22,29,0.15)',
  spinnerBorderTop: POP_RED,

  // ── Component styles ───────────────────────────────────────────────────────
  page: {
    background: 'transparent',
    color: INK,
    minHeight: '100%',
    padding: '32px 40px 64px',
    maxWidth: 960,
    margin: '0 auto',
    fontFamily: "'Super Squad', sans-serif",
  },

  card: {
    background: PANEL,
    border: '3px solid #16161D',
    borderRadius: 6,
    boxShadow: '4px 4px 0px #16161D',
  },

  cardHover: {
    boxShadow: '7px 7px 0px #16161D',
    transform: 'translate(-2px, -2px) rotate(-0.4deg)',
  },

  input: {
    background: '#FFFFFF',
    border: '3px solid #16161D',
    borderRadius: 6,
    color: INK,
    fontFamily: "'Super Squad', sans-serif",
    fontWeight: 700,
    boxShadow: '4px 4px 0px #16161D',
    outline: 'none',
  },

  select: {
    background: '#FFFFFF',
    border: '3px solid #16161D',
    borderRadius: 6,
    color: INK,
    fontFamily: "'Super Squad', sans-serif",
    fontWeight: 700,
    boxShadow: '4px 4px 0px #16161D',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
  },

  btnPrimary: {
    background: POP_RED,
    color: '#FFFFFF',
    border: '3px solid #16161D',
    boxShadow: '4px 4px 0px #16161D',
    borderRadius: 8,
    fontFamily: "'BadaBoom BB', cursive",
    fontWeight: 400,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },

  btnSecondary: {
    background: POP_BLUE,
    color: '#16161D',
    border: '3px solid #16161D',
    boxShadow: '4px 4px 0px #16161D',
    borderRadius: 8,
    fontFamily: "'BadaBoom BB', cursive",
    fontWeight: 400,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },

  btnOutline: {
    background: '#FFFFFF',
    color: INK,
    border: '3px solid #16161D',
    borderRadius: 8,
    fontFamily: "'BadaBoom BB', cursive",
    fontWeight: 400,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: '3px solid #16161D',
    background: POP_YELLOW,
    color: INK,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '3px 3px 0px #16161D',
  },

  iconBtnHover: {
    transform: 'translate(-2px, -2px)',
    boxShadow: '5px 5px 0px #16161D',
  },

  stickerLabel: {
    position: 'absolute',
    fontFamily: "'BadaBoom BB', cursive",
    fontWeight: 400,
    fontSize: 12,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    padding: '4px 12px',
    color: INK,
    background: POP_YELLOW,
    border: '3px solid #16161D',
    boxShadow: '3px 3px 0px #16161D',
    transform: 'rotate(-4deg)',
  },

  globalCss: GLOBAL_CSS,
}
