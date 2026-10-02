import type { ThemeTokens } from './tokens'

// Liquid Glass: an interface made of glass, after Apple's Liquid Glass design.
//
// Everything that isn't content is glass floating over it: translucent panes
// that refract what's behind them at their rounded rims, catch the light on a
// hairline edge, take a tint when they matter, and move like liquid (springs,
// stretch, capsules that morph and merge). Under the glass the song's colours
// flow as a deep mesh-gradient wallpaper, or its art and video show through.
//
// On the stage the panes refract for real (an SVG displacement map through
// backdrop-filter). On iPhone they are the system's own Liquid Glass
// (expo-glass-effect, iOS 26) where the app binary has it, and a material
// blur with a lit rim everywhere else.
//
// Colours: night blue under the glass, with the system's vivid accents (cyan,
// yellow, pink). Type: the system face (San Francisco on Apple devices).
// Copy never uses em dashes.

const NIGHT = '#0B1240'

export const LIQUID_GLASS_TOKENS: ThemeTokens = {
  name: 'liquid-glass',
  displayName: 'Liquid Glass',
  nextThemeName: 'neo-brutal', // the tail of the ring, loops back to the start

  // Dark theme, so black/white are SEMANTIC: `black` is the white lettering,
  // `white` the dark glass surface.
  black:       '#FFFFFF',
  white:       '#1B1F3A',
  cream:       '#141833',
  creamDark:   NIGHT,
  hotRed:      '#FF453A',
  vividYellow: '#FFD60A',   // opaque and bright: carries dark type
  softViolet:  '#BF5AF2',
  mintGreen:   '#30D158',
  muted:       'rgba(255,255,255,0.68)',
  faint:       'rgba(255,255,255,0.34)',

  accentA: '#64D2FF',       // vivid cyan, carries dark type
  accentB: '#FFD60A',
  accentC: '#FF375F',

  appBg:        NIGHT,
  titlebarBg:   '#0E1330',
  titlebarText: '#FFFFFF',

  navBg:           'rgba(20,24,52,0.6)',
  navBorderBottom: '1px solid rgba(255,255,255,0.14)',
  navLink:         'rgba(255,255,255,0.7)',
  navLinkActive:   '#FFFFFF',
  navLinkActiveBg: 'rgba(255,255,255,0.16)',
  navLinkHoverBg:  'rgba(255,255,255,0.08)',

  border:        '1px solid rgba(255,255,255,0.3)',
  borderThin:    '1px solid rgba(255,255,255,0.2)',
  borderLight:   '1px solid rgba(255,255,255,0.1)',
  shadow:        '0 10px 30px rgba(0,0,0,0.28)',
  shadowLift:    '0 16px 40px rgba(0,0,0,0.34)',
  shadowPressed: '0 4px 12px rgba(0,0,0,0.24)',
  shadowColor:   (color: string) => `0 10px 30px ${color}`,

  radius:      24,
  radiusSmall: 14,

  fontDisplay: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Helvetica Neue', sans-serif",
  fontBody:    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Helvetica Neue', sans-serif",

  spinnerBorder:    'rgba(255,255,255,0.18)',
  spinnerBorderTop: '#FFFFFF',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: true,
  cornerStyle: 'rounded',
  cardShape: 'box',
  shadowStyle: 'glow',
  cardBorderWidth: 1,
  displayUppercase: false,
  displayLetterSpacing: 0,
  accentGlowColor: 'rgba(0,0,0,0.45)',
  statusBarStyle: 'light',

  tabBarBg: 'rgba(30,34,62,0.42)',
  tabBarBlurTint: 'dark',
  tabBarOverlay: 'rgba(255,255,255,0.06)',
  tabBarBorder: 'rgba(255,255,255,0.22)',
  tabBarPill: 'rgba(255,255,255,0.22)',
  tabBarPillFg: '#FFFFFF',
  tabBarFg: 'rgba(255,255,255,0.62)',

  dimBorder: 'rgba(255,255,255,0.18)',
  pressedOverlay: 'rgba(255,255,255,0.1)',
}
