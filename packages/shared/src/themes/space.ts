import type { ThemeTokens } from './tokens'

// Space: "GOLDEN RECORD". Earth's music, sent out into deep space.
//
// In 1977 the two Voyager probes left for interstellar space carrying a gold
// record of the sounds and music of Earth, its cover engraved with diagrams for
// whoever finds it. This theme is that record, and the deep space it sails
// through. Four materials, and nothing else:
//
//   • DEEP SPACE   a real sky: stars in their true colours (blue-white, white,
//                  yellow, orange-red), the dusty band of the Milky Way, faint
//                  nebulae in hydrogen rose and oxygen teal. Never a cartoon
//                  planet, never neon.
//   • GOLD         the record itself: satin anodized gold with fine concentric
//                  grooves that catch the light as one bright sweep.
//   • ETCHED LINE  every decorative mark is a hairline engraving in the record
//                  cover's own language: the pulsar map, binary tick marks, the
//                  stylus diagram. No glow blobs, no decorative gradients.
//   • STARLIGHT    light is a point source with diffraction spikes, as in a
//                  deep-field photograph. A singer's colour is the colour of
//                  their star.
//
// Type: Jost, a geometric face in the tradition of Futura (the face NASA
// engraved on the Apollo 11 plaque), set light and widely tracked; IBM Plex
// Mono for every coordinate, number and code.
export const SPACE_TOKENS: ThemeTokens = {
  name: 'space',
  displayName: 'Space',
  nextThemeName: 'steampunk',

  // `black` / `white` are SEMANTIC on this dark theme: `black` is the light
  // foreground (starlight), `white` the deepest surface (the void).
  black:       '#ECE6D8',     // starlight, primary text
  white:       '#020308',     // the void
  cream:       '#080A12',     // black glass panel
  creamDark:   '#10131D',     // raised black glass
  hotRed:      '#FF6B5B',     // a red giant, danger
  vividYellow: '#E9C46A',     // record gold, opaque on purpose (see CLAUDE.md)
  softViolet:  '#9C8CFF',     // a hot young star
  mintGreen:   '#5FD6C8',     // oxygen emission, the go colour
  muted:       '#8A8EA3',     // dust
  faint:       'rgba(233,196,106,0.14)',

  accentA: '#E9C46A',          // record gold, carries dark type
  accentB: '#F6DE9A',          // pale gold, bright for the NOW PLAYING banner
  accentC: '#5FD6C8',          // oxygen teal, tertiary

  // Shell
  appBg:         '#020308',
  titlebarBg:    '#020308',
  titlebarText:  '#8A8EA3',

  navBg:           'rgba(2,3,8,0.94)',
  navBorderBottom: '1px solid rgba(233,196,106,0.16)',
  navLink:         '#8A8EA3',
  navLinkActive:   '#E9C46A',
  navLinkActiveBg: 'rgba(233,196,106,0.08)',
  navLinkHoverBg:  'rgba(236,230,216,0.05)',

  // Hairlines are engraved gold, never a glowing rim.
  border:       '1px solid rgba(233,196,106,0.26)',
  borderThin:   '1px solid rgba(233,196,106,0.16)',
  borderLight:  '1px solid rgba(233,196,106,0.09)',
  shadow:        '0 2px 14px rgba(0,0,0,0.7)',
  shadowLift:    '0 10px 30px rgba(0,0,0,0.75), 0 0 0 1px rgba(233,196,106,0.18)',
  shadowPressed: '0 1px 3px rgba(0,0,0,0.7)',
  shadowColor:   (color: string) => `0 0 10px ${color}, 0 0 26px ${color}`,

  radius:      14,
  radiusSmall: 8,

  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  spinnerBorder:    'rgba(233,196,106,0.16)',
  spinnerBorderTop: '#E9C46A',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: true,
  cornerStyle: 'rounded',
  cardShape: 'box',
  shadowStyle: 'glow',
  cardBorderWidth: 1,
  displayUppercase: true,            // Jost, wide-tracked capitals
  displayLetterSpacing: 3,
  accentGlowColor: '#E9C46A',
  statusBarStyle: 'light',

  tabBarBg: '#05060C',
  tabBarBlurTint: 'dark',
  tabBarOverlay: 'rgba(2,3,8,0.72)',
  tabBarBorder: 'rgba(233,196,106,0.22)',
  tabBarPill: '#E9C46A',             // the gold record under the active tab
  tabBarPillFg: '#1A1206',           // a dark glyph engraved in it
  tabBarFg: '#6F7388',               // one shared dust grey for every inactive tab

  dimBorder: 'rgba(233,196,106,0.18)',
  pressedOverlay: 'rgba(233,196,106,0.10)',
}
