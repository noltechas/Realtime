import type { ThemeTokens } from './tokens'

// Sketch: "FOLLOW THE BOUNCING BALL". An animator's pencil test on a light
// table.
//
// The stage is a sheet of animation bond pinned on the pegbar, lit from
// underneath. A ball drawn in graphite bounces from syllable to syllable over
// the lyrics, the way the old sing-along cartoons did, with its onion skins
// and spacing chart drawn beside it. Lines still to come are blue-pencil
// roughs on lettering guidelines; each word is inked as the ball lands on it.
// On the phone the queue is the animator's exposure sheet, references are
// taped to the desk, and the pencils are real.
//
// Every mark is drawn rather than filtered: packages/mobile/scripts/generate-
// sketch-assets.py renders pencil strokes with pressure, wobble and paper
// tooth. (The earlier version's blob radii and wobble filter were what made
// it look generic.)
//
// Colours: graphite and india ink on warm animation bond; non-photo blue for
// roughs, carmine for corrections, the printed teal of the exposure sheet,
// and pencil-lacquer yellow. Type: Shantell Sans (an artist's marker hand) for
// lettering and reading; Just Another Hand for the animator's pencil notes.
// Copy never uses em dashes.

const PAPER = '#EFEBE2'       // animation bond on the light table
const PAPER_LO = '#E2DDD1'
const SHEET = '#FAF8F2'       // a fresh sheet on top
const INK = '#1C1B1F'         // india ink
const BLUE = '#5A9BD8'        // blue pencil (vivid enough to carry dark type)
const RED = '#CF4540'         // carmine correction pencil
const FORM = '#4F8A84'        // the exposure sheet's printed teal
const LACQUER = '#F2B51E'     // a yellow HB pencil

export const SKETCH_TOKENS: ThemeTokens = {
  name: 'sketch',
  displayName: 'Sketch',
  nextThemeName: 'neo-brutal',

  // Light theme: black is the ink, white is a fresh sheet.
  black:       INK,
  white:       SHEET,
  cream:       PAPER,
  creamDark:   PAPER_LO,
  hotRed:      RED,
  vividYellow: LACQUER,
  softViolet:  BLUE,
  mintGreen:   FORM,
  muted:       'rgba(28,27,31,0.62)',
  faint:       'rgba(28,27,31,0.36)',

  accentA: BLUE,
  accentB: LACQUER,
  accentC: RED,

  appBg:        PAPER,
  titlebarBg:   '#2E3331',
  titlebarText: SHEET,

  navBg:           PAPER,
  navBorderBottom: `1px solid rgba(28,27,31,0.25)`,
  navLink:         INK,
  navLinkActive:   INK,
  navLinkActiveBg: 'transparent',
  navLinkHoverBg:  'rgba(90,155,216,0.08)',

  border:        `2px solid ${INK}`,
  borderThin:    `1px solid rgba(28,27,31,0.55)`,
  borderLight:   `1px solid rgba(28,27,31,0.14)`,
  shadow:        '0 2px 6px rgba(40,34,24,0.18)',
  shadowLift:    '0 8px 18px rgba(40,34,24,0.22)',
  shadowPressed: '0 1px 2px rgba(40,34,24,0.2)',
  shadowColor:   (color: string) => `0 2px 8px ${color}`,

  radius:      4,
  radiusSmall: 2,

  fontDisplay: "'Shantell Sans', 'Chalkboard SE', 'Comic Neue', cursive",
  fontBody:    "'Shantell Sans', 'Chalkboard SE', 'Comic Neue', cursive",

  spinnerBorder:    'rgba(28,27,31,0.15)',
  spinnerBorderTop: BLUE,

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: false,
  // paper has square corners: chips, cards and the screens' own buttons
  cornerStyle: 'sharp',
  cardShape: 'box',
  shadowStyle: 'offset',
  cardBorderWidth: 1.5,
  displayUppercase: false,
  displayLetterSpacing: 0,
  accentGlowColor: INK,
  statusBarStyle: 'dark',

  tabBarBg: PAPER,
  tabBarBlurTint: 'light',
  tabBarOverlay: 'rgba(239,235,226,0.94)',
  tabBarBorder: 'rgba(28,27,31,0.3)',
  tabBarPill: BLUE,
  tabBarPillFg: INK,
  tabBarFg: '#6E6C70',

  dimBorder: 'rgba(28,27,31,0.22)',
  pressedOverlay: 'rgba(90,155,216,0.08)',
}
