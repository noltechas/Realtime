// Tropical / Tiki Beach Design System
// Sun-drenched island getaway: warm sand + lagoon turquoise, hibiscus pink,
// sunset coral and sunshine yellow. Bamboo-pole frames, flickering tiki-torch
// flames, swaying palm fronds, drifting clouds and a shimmering lagoon. A LIGHT
// theme (deep-palm ink text on warm sand) in its own organic, hand-built family
// — soft natural sun-shadows, never the hard neo-brutal offset.
//
// Fonts: display = Pacifico (the surf/beach brush-script logo face), body =
// Quicksand (rounded, friendly). Both are Google fonts loaded via the @import
// in globals.css (always present — NOT re-injected per song), so any
// stage/idle chrome references theme.fontDisplay / theme.fontBody or the
// --font-display / --font-body vars, never a hardcoded family.

import type { Theme } from './theme'

// ── Palette ──────────────────────────────────────────────────────────────────
const INK = '#123A33' // deep palm/teal — primary text
const PALM_DK = '#0E2E29' // darkest palm — titlebar / nav
const SAND = '#FFF4DE' // warm beach sand
const SAND_DK = '#F6E6C2' // shaded sand
const PANEL = '#FFFFFF' // panel fill
const LAGOON = '#10B7B0' // lagoon turquoise (primary accent)
const SKY = '#36C5F0' // sky blue
const SUNSET = '#FF6B3D' // sunset coral
const HIBISCUS = '#FF3D81' // hibiscus pink
const SUN = '#FFC83D' // sunshine yellow
const PALM = '#1FB573' // palm green
const BAMBOO = '#CDA85A' // bamboo tan
const BAMBOO_LT = '#E2C684' // sun-bleached bamboo

const FONT_DISPLAY = "'Florida Vibes', 'Brush Script MT', cursive"
const FONT_BODY = "'The Last Trunks', 'Quicksand', system-ui, sans-serif"

const softShadow = (y = 8, blur = 22, a = 0.18) =>
  `0 ${y}px ${blur}px rgba(14,46,41,${a})`

// ── Global CSS injected when the tropical theme is active ─────────────────────
const GLOBAL_CSS = `
[data-theme="tropical"] {
  --font-display: ${FONT_DISPLAY};
  --font-body: ${FONT_BODY};
}
[data-theme="tropical"] * { font-family: ${FONT_BODY}; }
[data-theme="tropical"] h1,
[data-theme="tropical"] h2,
[data-theme="tropical"] h3 { font-family: ${FONT_DISPLAY}; letter-spacing: 0.4px; }

/* Stage lyrics use the SECONDARY (The Last Trunks) face — pinned explicitly so
   it wins over the base .k-line var(--font-display) rule regardless of order. */
[data-theme="tropical"] .k-line,
[data-theme="tropical"] .k-line .k-syl { font-family: ${FONT_BODY} !important; }

/* ── The beach: a warm sand→sky page with a soft sun glow and a faint band of
   palm-frond silhouettes along the bottom horizon. Fixed so it sits still while
   content scrolls over it. ──────────────────────────────────────────────── */
[data-theme="tropical"] body {
  background-color: ${SAND} !important;
  background-image:
    radial-gradient(120% 80% at 80% -10%, rgba(54,197,240,0.30) 0%, transparent 55%),
    radial-gradient(70% 50% at 18% -5%, rgba(255,200,61,0.34) 0%, transparent 60%),
    radial-gradient(140% 90% at 50% 120%, rgba(16,183,176,0.18) 0%, transparent 60%),
    linear-gradient(180deg, #DFF4F2 0%, ${SAND} 42%, ${SAND} 100%) !important;
  background-attachment: fixed !important;
}

/* Drifting caustic shimmer — a slow band of light, like sun on shallow water. */
[data-theme="tropical"] .main::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.10;
  background:
    repeating-linear-gradient(
      115deg,
      transparent 0px,
      rgba(255,255,255,0.65) 2px,
      transparent 6px,
      transparent 26px
    );
  mix-blend-mode: screen;
  filter: blur(2px);
  animation: tropShimmer 14s linear infinite;
}

@keyframes tropShimmer {
  0%   { background-position: 0 0; }
  100% { background-position: 420px 0; }
}

/* ── Top nav — a bamboo crossbar. Deep-palm bar capped with a tan bamboo strip
   whose dark node-rings repeat across it. ──────────────────────────────────── */
[data-theme="tropical"] .topnav {
  border-bottom: none !important;
  box-shadow:
    inset 0 -7px 0 0 ${BAMBOO},
    inset 0 -9px 0 0 rgba(0,0,0,0.18),
    0 6px 18px rgba(14,46,41,0.18);
  background-image:
    repeating-linear-gradient(90deg,
      transparent 0px, transparent 40px,
      rgba(0,0,0,0.16) 40px, rgba(0,0,0,0.16) 43px,
      rgba(255,255,255,0.10) 43px, rgba(255,255,255,0.10) 46px,
      transparent 46px, transparent 86px) !important;
  background-position: 0 100% !important;
  background-size: 86px 7px !important;
  background-repeat: repeat-x !important;
}
[data-theme="tropical"] .topnav a { letter-spacing: 0.3px; font-size: 1.1em; }
[data-theme="tropical"] .topnav a:hover { color: ${SUN} !important; }
[data-theme="tropical"] .topnav a[aria-current="page"] {
  color: ${SUN} !important;
  text-shadow: 0 0 14px rgba(255,200,61,0.6);
}

/* Headings get a soft sun-warm glow */
[data-theme="tropical"] h1 {
  color: ${PALM_DK};
  text-shadow: 0 2px 0 rgba(255,255,255,0.6), 0 0 26px rgba(255,107,61,0.18);
}

/* Buttons lift gently like they're floating, with a soft warm shadow */
[data-theme="tropical"] button {
  transition: transform 0.18s var(--ease-bounce, ease), box-shadow 0.18s ease;
  /* Florida Vibes runs small — bump display chrome up a notch on this theme. */
  font-size: 1.12em;
}
[data-theme="tropical"] h1 { font-size: 1.18em; }
[data-theme="tropical"] h2, [data-theme="tropical"] h3 { font-size: 1.12em; }
[data-theme="tropical"] button:hover {
  transform: translateY(-2px);
  box-shadow: ${softShadow(12, 26, 0.26)} !important;
}
[data-theme="tropical"] button:active { transform: translateY(0); }

/* Inputs bloom a turquoise lagoon ring on focus */
[data-theme="tropical"] input:focus,
[data-theme="tropical"] select:focus,
[data-theme="tropical"] textarea:focus {
  outline: none !important;
  border-color: ${LAGOON} !important;
  box-shadow: 0 0 0 3px rgba(16,183,176,0.28), ${softShadow(6, 16, 0.12)} !important;
}

/* Scrollbar — lagoon thumb on a sandy track */
[data-theme="tropical"] ::-webkit-scrollbar-thumb {
  background: ${LAGOON};
  border-radius: 999px;
  border: 3px solid ${SAND};
}
[data-theme="tropical"] ::-webkit-scrollbar-thumb:hover { background: #0BA39C; }
[data-theme="tropical"] ::-webkit-scrollbar-track { background: ${SAND_DK}; }

/* ── Stage chrome: the song chip + singer tags hang from the top of the screen
   as little carved wooden planks on rope cords. ──────────────────────────── */
[data-theme="tropical"] .k-song-chip,
[data-theme="tropical"] .k-singer-tag {
  background:
    repeating-linear-gradient(180deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 13px),
    linear-gradient(180deg, #8A5A2F, #6E4423) !important;
  border: 3px solid #C99A54 !important;
  border-radius: 10px !important;
  box-shadow: 0 9px 22px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.2) !important;
  color: #FFF6E3 !important;
  transform: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
[data-theme="tropical"] .k-song-chip { top: 36px !important; }
[data-theme="tropical"] .k-singers { top: 36px !important; }
[data-theme="tropical"] .k-song-chip__text h3,
[data-theme="tropical"] .k-song-chip__text p,
[data-theme="tropical"] .k-singer-tag span { color: #FFF6E3 !important; }
/* Florida Vibes runs small — bump the plank chrome text up a notch. */
[data-theme="tropical"] .k-song-chip__text h3 { font-size: 19px !important; }
[data-theme="tropical"] .k-singer-tag span { font-size: 18px !important; }

/* rope cords running from the top edge down to each hanging plank */
[data-theme="tropical"] .k-song-chip::before,
[data-theme="tropical"] .k-song-chip::after,
[data-theme="tropical"] .k-singers::before,
[data-theme="tropical"] .k-singers::after {
  content: '';
  position: absolute;
  top: -36px;
  width: 3px;
  height: 36px;
  background: #5C3A1E;
  z-index: -1;
}
[data-theme="tropical"] .k-song-chip::before { left: 22px; }
[data-theme="tropical"] .k-song-chip::after  { right: 22px; }
[data-theme="tropical"] .k-singers::before   { left: 22px; }
[data-theme="tropical"] .k-singers::after    { right: 22px; }

/* ── Idle-screen animations (referenced by KaraokePage's tropical idle JSX) ── */
@keyframes tropFlame {
  0%, 100% { transform: scaleY(1) scaleX(1) rotate(-1deg) translateY(0); opacity: 0.96; }
  25%      { transform: scaleY(1.14) scaleX(0.92) rotate(2deg) translateY(-3px); opacity: 1; }
  50%      { transform: scaleY(0.92) scaleX(1.08) rotate(-2deg) translateY(1px); opacity: 0.9; }
  75%      { transform: scaleY(1.1) scaleX(0.95) rotate(1deg) translateY(-2px); opacity: 1; }
}
@keyframes tropFlameCore {
  0%, 100% { transform: scaleY(1) translateY(0); opacity: 0.95; }
  50%      { transform: scaleY(1.18) translateY(-2px); opacity: 1; }
}
@keyframes tropEmber {
  0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
  15%  { opacity: 0.9; }
  100% { transform: translateY(-120px) translateX(var(--ember-x, 10px)) scale(0.3); opacity: 0; }
}
@keyframes tropSway {
  0%, 100% { transform: rotate(var(--sway-from, -3deg)); }
  50%      { transform: rotate(var(--sway-to, 4deg)); }
}
@keyframes tropPalmTrunk {
  0%, 100% { transform: rotate(-1.2deg); }
  50%      { transform: rotate(1.2deg); }
}
@keyframes tropBob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
}
@keyframes tropCloud {
  0%   { transform: translateX(0); }
  100% { transform: translateX(60px); }
}
@keyframes tropSun {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 30px rgba(255,200,61,0.55)); }
  50%      { transform: scale(1.04); filter: drop-shadow(0 0 46px rgba(255,200,61,0.8)); }
}
@keyframes tropWave {
  0%   { background-position: 0 0; }
  100% { background-position: 120px 0; }
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
export const TROPICAL: Theme = {
  name: 'tropical',
  nextThemeName: 'neo-brutal', // new tail of the ring → loops back to the start
  displayName: 'Tropical',
  globalCss: GLOBAL_CSS,

  // ── Raw colors ─────────────────────────────────────────────────────────────
  black: INK,
  white: PANEL,
  cream: SAND,
  creamDark: SAND_DK,
  hotRed: SUNSET,
  vividYellow: SUN,
  softViolet: '#7A5CFF',
  mintGreen: PALM,
  muted: '#5E7D72',
  faint: '#9DB5AB',

  accentA: LAGOON,
  accentB: SUN,
  accentC: HIBISCUS,

  // ── Shell ──────────────────────────────────────────────────────────────────
  appBg: SAND,
  titlebarBg: PALM_DK,
  titlebarText: SAND,

  navBg: PALM_DK,
  navBorderBottom: `3px solid ${BAMBOO}`,
  navLink: SAND,
  navLinkActive: SUN,
  navLinkActiveBg: 'transparent',
  navLinkHoverBg: 'rgba(255,255,255,0.08)',

  // ── Borders & Shadows ──────────────────────────────────────────────────────
  border: `2.5px solid ${BAMBOO}`,
  borderThin: `2px solid ${BAMBOO}`,
  borderLight: '1.5px solid rgba(14,46,41,0.16)',
  shadow: softShadow(8, 22, 0.18),
  shadowLift: softShadow(14, 34, 0.26),
  shadowPressed: softShadow(3, 10, 0.16),
  shadowColor: (color: string) => `0 10px 26px ${color}`,

  // ── Radius — rounded, organic ──────────────────────────────────────────────
  radius: 18,
  radiusSmall: 12,

  // ── Typography ─────────────────────────────────────────────────────────────
  fontDisplay: FONT_DISPLAY,
  fontBody: FONT_BODY,

  // ── Spinner ────────────────────────────────────────────────────────────────
  spinnerBorder: 'rgba(16,183,176,0.22)',
  spinnerBorderTop: LAGOON,

  // ── Component styles ───────────────────────────────────────────────────────
  page: {
    background: 'transparent',
    color: INK,
    minHeight: '100%',
    padding: '32px 40px 64px',
    maxWidth: 960,
    margin: '0 auto',
    fontFamily: FONT_BODY,
    position: 'relative',
    zIndex: 2,
  },

  card: {
    background: PANEL,
    border: `2.5px solid ${BAMBOO_LT}`,
    borderRadius: 18,
    boxShadow: softShadow(8, 22, 0.16),
  },

  cardHover: {
    border: `2.5px solid ${LAGOON}`,
    boxShadow: softShadow(14, 32, 0.24),
    transform: 'translateY(-2px)',
  },

  input: {
    background: PANEL,
    border: `2px solid ${BAMBOO_LT}`,
    borderRadius: 12,
    color: INK,
    fontFamily: FONT_BODY,
    fontWeight: 600,
    outline: 'none',
    caretColor: LAGOON,
  },

  select: {
    background: PANEL,
    border: `2px solid ${BAMBOO_LT}`,
    borderRadius: 12,
    color: INK,
    fontFamily: FONT_BODY,
    fontWeight: 600,
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none' as const,
  },

  btnPrimary: {
    background: `linear-gradient(135deg, ${LAGOON}, #0B9E97)`,
    color: '#FFFFFF',
    border: 'none',
    boxShadow: `${softShadow(8, 18, 0.22)}, inset 0 1px 0 rgba(255,255,255,0.35)`,
    borderRadius: 14,
    fontFamily: FONT_DISPLAY,
    fontWeight: 400,
    letterSpacing: '0.5px',
    cursor: 'pointer',
  },

  btnSecondary: {
    background: `linear-gradient(135deg, ${SUNSET}, #FF4F6E)`,
    color: '#FFFFFF',
    border: 'none',
    boxShadow: `${softShadow(8, 18, 0.22)}, inset 0 1px 0 rgba(255,255,255,0.35)`,
    borderRadius: 14,
    fontFamily: FONT_DISPLAY,
    fontWeight: 400,
    letterSpacing: '0.5px',
    cursor: 'pointer',
  },

  btnOutline: {
    background: PANEL,
    color: INK,
    border: `2.5px solid ${BAMBOO}`,
    borderRadius: 14,
    fontFamily: FONT_DISPLAY,
    fontWeight: 400,
    letterSpacing: '0.5px',
    cursor: 'pointer',
  },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: `2px solid ${BAMBOO}`,
    background: PANEL,
    color: INK,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: softShadow(4, 12, 0.14),
    transition: 'all 0.2s ease',
  },

  iconBtnHover: {
    background: SUN,
    color: PALM_DK,
    transform: 'translateY(-2px)',
    boxShadow: softShadow(8, 18, 0.22),
  },

  stickerLabel: {
    position: 'absolute',
    fontFamily: FONT_DISPLAY,
    fontWeight: 400,
    fontSize: 12,
    letterSpacing: '0.5px',
    padding: '4px 12px',
    color: PALM_DK,
    background: SUN,
    border: `2px solid ${PALM_DK}`,
    borderRadius: 999,
    boxShadow: softShadow(4, 10, 0.2),
    transform: 'rotate(-3deg)',
  },
}
