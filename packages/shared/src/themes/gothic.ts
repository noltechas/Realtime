import type { ThemeTokens } from './tokens'

// Gothic: "NOCTURNE". A cathedral at midnight, during a storm.
//
// The theme is built from four physical materials and exactly one warm light:
//
//   • CARVED STONE   cold violet-black limestone, chiselled, soot-dark. Every
//                    structural surface. Never brown: brown stone would read as
//                    the steampunk theme's walnut and brass.
//   • WROUGHT IRON   black, matte, with a pewter catch-light on its top edge.
//                    Frames, rails, rules and the tab bar's fence.
//   • STAINED GLASS  jewel tones lit from BEHIND. Singer colours are never paint
//                    in this theme, they are glass, so they only ever appear as
//                    light passing through something.
//   • CANDLE FLAME   the only warm light in the building. Gold is never a metal
//                    here (no brass, no gilt plates); it is always flame, so it
//                    flickers, it glows, and it lights what is next to it.
//
// Moonlight (a cold silver-blue) is the ambient fill coming through the windows,
// and the storm outside supplies lightning: a shared strike clock that every
// window, pane and backdrop on every platform answers at the same moment.
//
// Structural vocabulary, shared by desktop, stage and mobile:
//   • the LANCET (an equilateral pointed arch) heads every portrait surface, so a
//     song card is a window and its album art is the glass;
//   • the CUSP (a concave quarter-round notch) cuts the corners of every plaque,
//     so rows, chips and buttons read as carved tablets, not rounded rectangles;
//   • ROMAN NUMERALS for every ordinal (queue positions, the count-in tolls).
//
// Type: UnifrakturMaguntia (a true Fraktur blackletter) for display moments,
// always in title case, because blackletter set in capitals is illegible.
// Grenze Gotisch, a hybrid blackletter built for reading, carries titles and
// lyrics. Cormorant Garamond carries prose.
export const GOTHIC_TOKENS: ThemeTokens = {
  name: 'gothic',
  displayName: 'Gothic',
  nextThemeName: 'barbie', // gothic → barbie → liquid glass, which loops back to neo-brutal

  // Raw colours. `black` and `white` are SEMANTIC on this dark theme: `black`
  // is the readable foreground (bone), `white` the deepest surface (crypt).
  black: '#E8DFCC', // bone, primary text
  white: '#0B0A0F', // crypt, the "light block" stand-in
  cream: '#14121A', // stone panel base
  creamDark: '#1D1A25', // raised stone
  hotRed: '#E0364C', // fresh blood, danger
  vividYellow: '#E3B04B', // candle flame, opaque on purpose (see CLAUDE.md)
  softViolet: '#8E6CD9', // amethyst glass
  mintGreen: '#86D6AE', // spectral green, the colour of a ghost light
  muted: '#968C9E', // pewter, violet-grey
  faint: 'rgba(232,223,204,0.12)',

  accentA: '#E3B04B', // candle gold, vivid and carries dark type
  accentB: '#F6D27E', // pale flame, bright enough for the NOW PLAYING banner
  accentC: '#C3203A', // blood crimson, tertiary

  // Shell
  appBg: '#07060A',
  titlebarBg: '#07060A',
  titlebarText: '#968C9E',

  navBg: 'rgba(7,6,10,0.95)',
  navBorderBottom: '1px solid rgba(175,195,234,0.12)',
  navLink: '#968C9E',
  navLinkActive: '#E3B04B',
  navLinkActiveBg: 'rgba(227,176,75,0.10)',
  navLinkHoverBg: 'rgba(175,195,234,0.06)',

  // Hairlines are moonlight on stone, not gold. Gold is reserved for flame.
  border: '1px solid rgba(175,195,234,0.20)',
  borderThin: '1px solid rgba(175,195,234,0.13)',
  borderLight: '1px solid rgba(175,195,234,0.08)',
  // Depth first, then a candle-warm under-glow, as if lit from a candle below.
  shadow: '0 3px 12px rgba(0,0,0,0.65), 0 6px 18px -10px rgba(227,176,75,0.22)',
  shadowLift: '0 10px 30px rgba(0,0,0,0.7), 0 10px 28px -12px rgba(227,176,75,0.34)',
  shadowPressed: '0 1px 3px rgba(0,0,0,0.7)',
  shadowColor: (color: string) => `0 0 14px ${color}, 0 0 30px ${color}`,

  // Corners are cusped by the atoms themselves; tokens stay nearly square so
  // nothing that falls back to a plain rounded box looks soft.
  radius: 3,
  radiusSmall: 2,

  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  spinnerBorder: 'rgba(227,176,75,0.18)',
  spinnerBorderTop: '#E3B04B',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: true,
  cornerStyle: 'sharp',
  cardShape: 'box',
  shadowStyle: 'glow', // candle under-glow
  cardBorderWidth: 1,
  // Blackletter is never set in capitals. Screens that honour this flag keep
  // Fraktur headings in title case.
  displayUppercase: false,
  displayLetterSpacing: 0,
  accentGlowColor: '#E3B04B',
  statusBarStyle: 'light',

  tabBarBg: '#09080C',
  tabBarBlurTint: 'dark',
  tabBarOverlay: 'rgba(7,6,10,0.72)',
  tabBarBorder: 'rgba(175,195,234,0.16)',
  tabBarPill: '#E3B04B', // the lantern's light behind the active tab
  tabBarPillFg: '#140E06',
  tabBarFg: '#6E6677', // one shared iron-grey for every inactive tab

  dimBorder: 'rgba(175,195,234,0.16)',
  pressedOverlay: 'rgba(227,176,75,0.10)',
}
