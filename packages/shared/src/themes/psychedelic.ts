import type { ThemeTokens } from './tokens'

// Psychedelic — "LIQUID LIGHT", backed by real footage.
//
// The background is a genuine 1960s-style liquid light show: oil, water and
// aniline dyes on an overhead projector, filmed. Nothing about the colour is
// simulated, which is the whole point — two attempts at generating it procedurally
// (a lobed-plate vocabulary, then a domain-warped shader) both read as computer
// graphics rather than as photographed liquid.
//
// THAT CHANGES WHAT THE CHROME HAS TO BE. The video is saturated, high-contrast,
// polychrome and moving. Any UI that also brings colour and organic shape competes
// with it and loses — that was the failure of the earlier passes, which put wobbly
// dye-coloured outlines on every panel. So:
//
//   1. THE FOOTAGE OWNS THE COLOUR. Chrome is near-monochrome: frosted glass,
//      white type, white hairlines. One hot accent (magenta) marks state and
//      nothing else is saturated.
//   2. GLASS, NOT FILL. Panels are blurred, low-alpha dark glass so the liquid
//      reads through them while type keeps guaranteed contrast. This is the
//      standard solution for interfaces over video, and it is what makes it look
//      premium rather than pasted on.
//   3. CALM GEOMETRY. Consistent generous radii, no organic silhouettes. The
//      background is doing the moving; the interface holds still.
export const PSYCHEDELIC_TOKENS: ThemeTokens = {
  name: 'psychedelic',
  displayName: 'Psychedelic',
  nextThemeName: 'zen',

  // `black` / `white` are semantic: on this dark theme `black` is the light
  // foreground.
  black: '#FFFFFF',
  white: '#08060C',
  cream: 'rgba(20,16,28,0.62)',      // glass panel base
  creamDark: 'rgba(28,22,40,0.72)',  // raised glass
  hotRed: '#FF4D6A',
  vividYellow: '#FFF2E8',            // NOW PLAYING banner bg — warm white, dark text reads
  softViolet: '#B78CFF',
  mintGreen: '#5AF0D0',
  muted: '#C6BFD4',
  faint: 'rgba(255,255,255,0.16)',

  accentA: '#FF2E88',                // the single hot accent — active state only
  accentB: '#FFF2E8',                // warm white, bright enough for dark text
  accentC: '#5AF0D0',                // secondary state

  // The video covers this; it only shows for the instant before playback starts.
  appBg: '#08060C',
  titlebarBg: '#08060C',
  titlebarText: '#C6BFD4',

  navBg: 'rgba(8,6,12,0.55)',
  navBorderBottom: '1px solid rgba(255,255,255,0.14)',
  navLink: '#C6BFD4',
  navLinkActive: '#FFFFFF',
  navLinkActiveBg: 'rgba(255,255,255,0.12)',
  navLinkHoverBg: 'rgba(255,255,255,0.07)',

  // Glass edges catch light, so borders are white at low alpha rather than tinted.
  border: '1px solid rgba(255,255,255,0.18)',
  borderThin: '1px solid rgba(255,255,255,0.12)',
  borderLight: '1px solid rgba(255,255,255,0.07)',
  // Depth comes from a real shadow: glass has to sit ABOVE the footage, and a
  // coloured glow would just add to the colour the video is already supplying.
  shadow: '0 4px 18px rgba(0,0,0,0.45)',
  shadowLift: '0 12px 34px rgba(0,0,0,0.55)',
  shadowPressed: '0 2px 6px rgba(0,0,0,0.5)',
  shadowColor: (color: string) => `0 0 16px ${color}`,

  radius: 20,
  radiusSmall: 13,

  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  spinnerBorder: 'rgba(255,255,255,0.18)',
  spinnerBorderTop: '#FFFFFF',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: true,
  cornerStyle: 'rounded',
  cardShape: 'box',
  // 'offset', not a glow: the legacy helpers read this to pick a shadow style,
  // and a neon glow would only add to the colour the footage already supplies.
  shadowStyle: 'offset',
  cardBorderWidth: 1,
  displayUppercase: false,
  displayLetterSpacing: 0,
  accentGlowColor: '#FF2E88',
  statusBarStyle: 'light',

  tabBarBg: 'rgba(10,8,16,0.5)',
  tabBarBlurTint: 'dark',
  tabBarOverlay: 'rgba(8,6,12,0.42)',
  tabBarBorder: 'rgba(255,255,255,0.16)',
  tabBarPill: '#FFFFFF',             // white glass pill behind the active tab
  tabBarPillFg: '#0B0812',           // ink-dark glyph on it
  tabBarFg: 'rgba(255,255,255,0.62)',

  dimBorder: 'rgba(255,255,255,0.16)',
  pressedOverlay: 'rgba(255,255,255,0.12)',
}
